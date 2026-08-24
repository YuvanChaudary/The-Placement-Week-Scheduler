import os
import sys
import time
import hashlib
from datetime import time as dt_time
from uuid import UUID
from typing import List, Dict, Any, Tuple, Set
from sqlalchemy import text

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import SessionLocal
from app.models import Company, Student, Room, Panel, Shortlist, ScheduleVersion, Interview, ReplanProposal
from app.services.metrics import calculate_schedule_metrics
from app.engine.replanner import generate_replan
from app.api.schedules import reset_schedule_to_baseline

def compute_baseline_hash(db, version_id):
    """Computes a deterministic SHA-256 hash of all scheduled baseline interview node tuples for byte-for-byte immutability verification."""
    ivs = db.query(Interview).filter(
        Interview.version_id == version_id,
        Interview.status == "SCHEDULED"
    ).order_by(Interview.id).all()
    
    hasher = hashlib.sha256()
    for iv in ivs:
        node_str = f"{iv.id}|{iv.student_id}|{iv.company_id}|{iv.room_id}|{iv.panel_id}|{iv.day}|{iv.start_time}|{iv.end_time}"
        hasher.update(node_str.encode('utf-8'))
    return hasher.hexdigest(), len(ivs)

def verify_zero_clashes(db, version_id):
    """Independently verifies zero student, room, and panel clashes over raw database interview records."""
    ivs = db.query(Interview).filter(
        Interview.version_id == version_id,
        Interview.status == "SCHEDULED"
    ).all()

    # 1. Student Clashes
    student_slots = {}
    student_clashes = 0
    for iv in ivs:
        key = (iv.student_id, iv.day)
        if key not in student_slots:
            student_slots[key] = []
        for s_time, e_time in student_slots[key]:
            if not (iv.end_time <= s_time or iv.start_time >= e_time):
                student_clashes += 1
        student_slots[key].append((iv.start_time, iv.end_time))

    # 2. Room Clashes
    room_slots = {}
    room_clashes = 0
    for iv in ivs:
        if not iv.room_id:
            continue
        key = (iv.room_id, iv.day)
        if key not in room_slots:
            room_slots[key] = []
        for s_time, e_time in room_slots[key]:
            if not (iv.end_time <= s_time or iv.start_time >= e_time):
                room_clashes += 1
        room_slots[key].append((iv.start_time, iv.end_time))

    # 3. Panel Clashes
    panel_slots = {}
    panel_clashes = 0
    for iv in ivs:
        if not iv.panel_id:
            continue
        key = (iv.panel_id, iv.day)
        if key not in panel_slots:
            panel_slots[key] = []
        for s_time, e_time in panel_slots[key]:
            if not (iv.end_time <= s_time or iv.start_time >= e_time):
                panel_clashes += 1
        panel_slots[key].append((iv.start_time, iv.end_time))

    return student_clashes, room_clashes, panel_clashes

def compute_blast_radius_by_day(proposal):
    """Computes total blast radius (moved + cancelled) grouped by day [D1, D2, D3, D4]."""
    blast_by_day = {1: 0, 2: 0, 3: 0, 4: 0}
    moved_list = proposal.diff_matrix.get("moved", [])
    cancelled_list = proposal.diff_matrix.get("cancelled", [])

    for m in moved_list:
        d = m.get("day") or m.get("new_day") or m.get("old_day")
        if d in blast_by_day:
            blast_by_day[d] += 1

    for c in cancelled_list:
        d = c.get("day")
        if d in blast_by_day:
            blast_by_day[d] += 1

    return [blast_by_day[1], blast_by_day[2], blast_by_day[3], blast_by_day[4]]

def verify_diff_conservation(proposal, baseline_count):
    """Verifies strict 100% diff universe conservation (|B| == |moved| + |cancelled| + |unaffected_preserved|)."""
    summary = proposal.diff_matrix.get("summary", {})
    moved_cnt = summary.get("total_moved", 0)
    cancelled_cnt = summary.get("total_cancelled", 0)
    preserved_cnt = summary.get("total_unaffected_preserved", 0)

    math_equal = (moved_cnt + cancelled_cnt + preserved_cnt) == baseline_count
    return math_equal, moved_cnt, cancelled_cnt, preserved_cnt

def run_12_scenario_matrix_test():
    db = SessionLocal()
    print("=" * 110)
    print("EXHAUSTIVE TIER × DAY DISRUPTION MATRIX & RESET FLOW TEST BATTERY")
    print("=" * 110)

    # Fetch Baseline ScheduleVersion 1
    v1 = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 1).first()
    if not v1:
        print("CRITICAL ERROR: Baseline ScheduleVersion 1 not found!")
        return

    baseline_hash, baseline_count = compute_baseline_hash(db, v1.id)
    print(f"\nINITIAL BASELINE SNAPSHOT:")
    print(f"  - Version ID     : {v1.id}")
    print(f"  - Scheduled Nodes: {baseline_count}")
    print(f"  - Initial SHA-256: {baseline_hash[:16]}...")

    companies = {c.id: c for c in db.query(Company).all()}
    panels = {p.id: p for p in db.query(Panel).all()}
    rooms = {r.id: r for r in db.query(Room).all()}

    scenario_results = []

    # Helper function to run and validate a scenario
    def execute_scenario(sc_id, sc_name, target_desc, payload_builder, post_validator):
        print(f"\n" + "-" * 90)

        # Ensure database reset before running scenario
        reset_schedule_to_baseline(db)
        v1_current = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 1).first()
        pre_hash, pre_cnt = compute_baseline_hash(db, v1_current.id)

        payload, pre_target_cnt, dynamic_target_name = payload_builder(v1_current)
        display_target = dynamic_target_name if dynamic_target_name else target_desc
        print(f"[{sc_id}] {sc_name} | Target: {display_target}")
        print(f"      Pre-Disruption Target Count: {pre_target_cnt} (Anti-Vacuous Check: {'PASS' if pre_target_cnt > 0 else 'FAIL'})")

        if pre_target_cnt == 0:
            print(f"      Result: [NOT EXECUTABLE]")
            scenario_results.append({
                "id": sc_id, "name": sc_name, "target": display_target, "latency": 0.0,
                "pre_count": 0, "moved": 0, "cancelled": 0, "preserved": pre_cnt,
                "blast_radius": [0, 0, 0, 0], "clashes": "0/0/0", "result": "NOT EXECUTABLE"
            })
            return

        t0 = time.time()
        draft_v, proposal = generate_replan(db, v1_current.id, payload)
        lat = (time.time() - t0) * 1000

        reconciled, moved, canc, pres = verify_diff_conservation(proposal, pre_cnt)
        sc, rc, pc = verify_zero_clashes(db, draft_v.id)
        blast_radius = compute_blast_radius_by_day(proposal)
        post_valid = post_validator(draft_v)

        pass_cond = (sc == 0 and rc == 0 and pc == 0 and reconciled and post_valid and pre_target_cnt > 0)
        status = "PASS" if pass_cond else "FAIL"

        print(f"      Moved: {moved} | Cancelled: {canc} | Preserved: {pres} | Blast Radius: {blast_radius}")
        print(f"      Clashes (S/R/P): {sc}/{rc}/{pc} | Diff Reconciled: {reconciled} | Post-Safety Check: {'PASS' if post_valid else 'FAIL'}")
        print(f"      Execution Latency: {lat:.2f} ms | Result: [{status}]")

        scenario_results.append({
            "id": sc_id, "name": sc_name, "target": display_target, "latency": lat,
            "pre_count": pre_target_cnt, "moved": moved, "cancelled": canc, "preserved": pres,
            "blast_radius": blast_radius, "clashes": f"{sc}/{rc}/{pc}", "result": status
        })

        # Post-scenario Reset Flow via REST API controller logic
        reset_schedule_to_baseline(db)
        post_hash, post_cnt = compute_baseline_hash(db, v1_current.id)
        assert pre_hash == post_hash, f"Baseline SHA-256 hash mutated after {sc_id} reset!"

    # =========================================================================
    # GROUP A: COMPANY DELAYS
    # =========================================================================
    # 1. SCENARIO T1-D1
    def build_t1_d1(v):
        c = db.query(Company).filter(Company.name == "Apex AI Solutions").first()
        cnt = db.query(Interview).filter(
            Interview.version_id == v.id, Interview.company_id == c.id, Interview.day == 1,
            Interview.status == "SCHEDULED", Interview.start_time < dt_time(12, 0)
        ).count()
        return {"disruption_type": "COMPANY_DELAY", "company_delays": [{"company_id": str(c.id), "delay_hours": 3, "day": 1}]}, cnt, c.name

    execute_scenario("T1-D1", "Tier 1 Co Delay Day 1", "Apex AI Solutions (Tier 1)", build_t1_d1, lambda draft: True)

    # 2. SCENARIO T1-D2
    def build_t1_d2(v):
        c = db.query(Company).filter(Company.name == "Apex AI Solutions").first()
        cnt = db.query(Interview).filter(
            Interview.version_id == v.id, Interview.company_id == c.id, Interview.day == 2,
            Interview.status == "SCHEDULED", Interview.start_time < dt_time(12, 0)
        ).count()
        return {"disruption_type": "COMPANY_DELAY", "company_delays": [{"company_id": str(c.id), "delay_hours": 3, "day": 2}]}, cnt, c.name

    execute_scenario("T1-D2", "Tier 1 Co Delay Day 2", "Apex AI Solutions (Tier 1)", build_t1_d2, lambda draft: True)

    # 3. SCENARIO T2-D2
    def build_t2_d2(v):
        c = db.query(Company).filter(Company.name == "Uber Tech").first()
        cnt = db.query(Interview).filter(
            Interview.version_id == v.id, Interview.company_id == c.id, Interview.day == 2,
            Interview.status == "SCHEDULED", Interview.start_time < dt_time(11, 30)
        ).count()
        return {"disruption_type": "COMPANY_DELAY", "company_delays": [{"company_id": str(c.id), "delay_hours": 2, "day": 2}]}, cnt, c.name

    execute_scenario("T2-D2", "Tier 2 Co Delay Day 2", "Uber Tech (Tier 2)", build_t2_d2, lambda draft: True)

    # 4. SCENARIO T2-D3
    def build_t2_d3(v):
        c = db.query(Company).filter(Company.name == "Uber Tech").first()
        cnt = db.query(Interview).filter(
            Interview.version_id == v.id, Interview.company_id == c.id, Interview.day == 3,
            Interview.status == "SCHEDULED", Interview.start_time < dt_time(11, 30)
        ).count()
        return {"disruption_type": "COMPANY_DELAY", "company_delays": [{"company_id": str(c.id), "delay_hours": 2, "day": 3}]}, cnt, c.name

    execute_scenario("T2-D3", "Tier 2 Co Delay Day 3", "Uber Tech (Tier 2)", build_t2_d3, lambda draft: True)

    # 5. SCENARIO T3-D3
    def build_t3_d3(v):
        c = db.query(Company).filter(Company.name == "TCS Innovation Labs").first()
        cnt = db.query(Interview).filter(
            Interview.version_id == v.id, Interview.company_id == c.id, Interview.day == 3,
            Interview.status == "SCHEDULED", Interview.start_time < dt_time(11, 0)
        ).count()
        return {"disruption_type": "COMPANY_DELAY", "company_delays": [{"company_id": str(c.id), "delay_hours": 2, "day": 3}]}, cnt, c.name

    execute_scenario("T3-D3", "Tier 3 Mass Recruiter Delay Day 3", "TCS Innovation Labs (Tier 3)", build_t3_d3, lambda draft: True)

    # 6. SCENARIO T3-D4
    def build_t3_d4(v):
        target_c = None
        target_cnt = 0
        for c in db.query(Company).filter(Company.priority_tier == 3).all():
            cnt = db.query(Interview).filter(
                Interview.version_id == v.id, Interview.company_id == c.id, Interview.day == 4,
                Interview.status == "SCHEDULED"
            ).count()
            if cnt > 0:
                target_c = c
                target_cnt = cnt
                break
        if target_c:
            return {"disruption_type": "COMPANY_DELAY", "company_delays": [{"company_id": str(target_c.id), "delay_hours": 2, "day": 4}]}, target_cnt, f"{target_c.name} (Tier 3)"
        return {"disruption_type": "COMPANY_DELAY", "company_delays": []}, 0, "No Tier 3 on Day 4"

    execute_scenario("T3-D4", "Tier 3 Mass Recruiter Delay Day 4", "Tier 3 Company (Day 4)", build_t3_d4, lambda draft: True)

    # =========================================================================
    # GROUP B: RESOURCE DISRUPTIONS (PANEL & ROOM)
    # =========================================================================
    # 7. SCENARIO PANEL-D1
    target_p1 = db.query(Panel).filter(Panel.panel_name == "Panel A").first()
    def build_panel_d1(v):
        cnt = db.query(Interview).filter(Interview.version_id == v.id, Interview.panel_id == target_p1.id, Interview.day == 1, Interview.status == "SCHEDULED").count()
        return {"disruption_type": "PANEL_DROPOUT", "panel_dropouts": [{"panel_id": str(target_p1.id), "day": 1, "start_time": "09:00:00"}]}, cnt, "Panel A (Apex AI)"

    def valid_panel_d1(draft):
        return db.query(Interview).filter(Interview.version_id == draft.id, Interview.panel_id == target_p1.id, Interview.day == 1, Interview.status == "SCHEDULED").count() == 0

    execute_scenario("PANEL-D1", "Single Panel Dropout Day 1", "Panel A (Apex AI)", build_panel_d1, valid_panel_d1)

    # 8. SCENARIO PANEL-D3
    uber_panels = db.query(Panel).join(Company).filter(Company.name == "Uber Tech").all()
    target_p_ids = [p.id for p in uber_panels[:2]]
    def build_panel_d3(v):
        cnt = db.query(Interview).filter(Interview.version_id == v.id, Interview.panel_id.in_(target_p_ids), Interview.day == 3, Interview.status == "SCHEDULED").count()
        payload = {"disruption_type": "PANEL_DROPOUT", "panel_dropouts": [{"panel_id": str(pid), "day": 3, "start_time": "09:00:00"} for pid in target_p_ids]}
        return payload, cnt, "2 Panels (Uber Tech)"

    def valid_panel_d3(draft):
        return db.query(Interview).filter(Interview.version_id == draft.id, Interview.panel_id.in_(target_p_ids), Interview.day == 3, Interview.status == "SCHEDULED").count() == 0

    execute_scenario("PANEL-D3", "Multi-Panel Dropout Day 3", "2 Panels (Uber Tech)", build_panel_d3, valid_panel_d3)

    # 9. SCENARIO ROOM-D2
    r4 = db.query(Room).filter(Room.room_number.in_(["M-101", "A-102"])).all()
    r4_ids = [r.id for r in r4]
    def build_room_d2(v):
        cnt = db.query(Interview).filter(Interview.version_id == v.id, Interview.room_id.in_(r4_ids), Interview.day == 2, Interview.status == "SCHEDULED").count()
        payload = {"disruption_type": "ROOM_UNAVAILABILITY", "room_unavailabilities": [{"room_id": str(rid), "day": 2, "start_time": "09:00:00", "end_time": "13:00:00"} for rid in r4_ids]}
        return payload, cnt, "Rooms M-101 & A-102 (09:00-13:00)"

    def valid_room_d2(draft):
        return db.query(Interview).filter(Interview.version_id == draft.id, Interview.room_id.in_(r4_ids), Interview.day == 2, Interview.status == "SCHEDULED", Interview.start_time < dt_time(13, 0)).count() == 0

    execute_scenario("ROOM-D2", "Morning Room Outage Day 2", "Rooms M-101 & A-102 (09:00-13:00)", build_room_d2, valid_room_d2)

    # 10. SCENARIO ROOM-D4
    r_wing = db.query(Room).filter(Room.room_number.in_(["T-103", "B-104", "M-105"])).all()
    r_wing_ids = [r.id for r in r_wing]
    def build_room_d4(v):
        cnt = db.query(Interview).filter(Interview.version_id == v.id, Interview.room_id.in_(r_wing_ids), Interview.day == 4, Interview.status == "SCHEDULED").count()
        payload = {"disruption_type": "ROOM_UNAVAILABILITY", "room_unavailabilities": [{"room_id": str(rid), "day": 4, "start_time": "13:00:00", "end_time": "18:00:00"} for rid in r_wing_ids]}
        return payload, cnt, "Rooms T-103, B-104, M-105 (13:00-18:00)"

    def valid_room_d4(draft):
        return db.query(Interview).filter(Interview.version_id == draft.id, Interview.room_id.in_(r_wing_ids), Interview.day == 4, Interview.status == "SCHEDULED", Interview.start_time >= dt_time(13, 0)).count() == 0

    execute_scenario("ROOM-D4", "Afternoon Wing Shutdown Day 4", "Rooms T-103, B-104, M-105 (13:00-18:00)", build_room_d4, valid_room_d4)

    # =========================================================================
    # GROUP C: STUDENT WITHDRAWAL SURGES
    # =========================================================================
    # 11. SCENARIO WITHDRAW-D2
    w15_ids = []
    def build_withdraw_d2(v):
        nonlocal w15_ids
        w15_ids = [r[0] for r in db.execute(text("SELECT DISTINCT student_id FROM interviews WHERE version_id = :v_id AND day = 2 AND status = 'SCHEDULED' LIMIT 15"), {"v_id": v.id}).fetchall()]
        cnt = db.query(Interview).filter(Interview.version_id == v.id, Interview.student_id.in_(w15_ids), Interview.status == "SCHEDULED").count()
        return {"disruption_type": "STUDENT_WITHDRAWAL", "student_withdrawals": [str(sid) for sid in w15_ids]}, cnt, "15 Scheduled Candidates (Day 2)"

    def valid_withdraw_d2(draft):
        return db.query(Interview).filter(Interview.version_id == draft.id, Interview.student_id.in_(w15_ids), Interview.status == "SCHEDULED").count() == 0

    execute_scenario("WITHDRAW-D2", "15 Student Withdrawals Day 2", "15 Scheduled Candidates (Day 2)", build_withdraw_d2, valid_withdraw_d2)

    # 12. SCENARIO WITHDRAW-D4
    w20_ids = []
    def build_withdraw_d4(v):
        nonlocal w20_ids
        w20_ids = [r[0] for r in db.execute(text("SELECT DISTINCT student_id FROM interviews WHERE version_id = :v_id AND day = 4 AND status = 'SCHEDULED' LIMIT 20"), {"v_id": v.id}).fetchall()]
        cnt = db.query(Interview).filter(Interview.version_id == v.id, Interview.student_id.in_(w20_ids), Interview.status == "SCHEDULED").count()
        return {"disruption_type": "STUDENT_WITHDRAWAL", "student_withdrawals": [str(sid) for sid in w20_ids]}, cnt, "20 Scheduled Candidates (Day 4)"

    def valid_withdraw_d4(draft):
        return db.query(Interview).filter(Interview.version_id == draft.id, Interview.student_id.in_(w20_ids), Interview.status == "SCHEDULED").count() == 0

    execute_scenario("WITHDRAW-D4", "20 Student Withdrawals Day 4", "20 Scheduled Candidates (Day 4)", build_withdraw_d4, valid_withdraw_d4)

    # Final Verification Summary Table
    print("\n" + "=" * 120)
    print("FINAL EXHAUSTIVE TIER × DAY DISRUPTION MATRIX SUMMARY TABLE")
    print("=" * 120)
    print(f"| {'ID':<11} | {'Target (Tier/Day/Entity)':<38} | {'Latency':<8} | {'Pre Count':<9} | {'Moved':<5} | {'Can':<5} | {'Pres':<5} | {'Blast Radius [D1,D2,D3,D4]':<22} | {'Clashes':<7} | {'Result':<6} |")
    print(f"|{'-'*13}|{'-'*40}|{'-'*10}|{'-'*11}|{'-'*7}|{'-'*7}|{'-'*7}|{'-'*24}|{'-'*9}|{'-'*8}|")

    pass_cnt = 0
    fail_cnt = 0

    for r in scenario_results:
        if r["result"] == "PASS":
            pass_cnt += 1
        else:
            fail_cnt += 1
        blast_str = f"[{r['blast_radius'][0]},{r['blast_radius'][1]},{r['blast_radius'][2]},{r['blast_radius'][3]}]"
        print(f"| {r['id']:<11} | {r['target']:<38} | {r['latency']:6.2f}ms | {r['pre_count']:<9} | {r['moved']:<5} | {r['cancelled']:<5} | {r['preserved']:<5} | {blast_str:<22} | {r['clashes']:<7} | {r['result']:<6} |")

    # Baseline SHA-256 Immutability Check
    final_hash, final_count = compute_baseline_hash(db, v1.id)
    baseline_immutable = (baseline_hash == final_hash) and (baseline_count == final_count)

    print(f"\nBaseline ScheduleVersion 1 Node SHA-256 Immutability: {str(baseline_immutable).upper()}")
    print(f"Total Scenarios Executed: 12")
    print(f"PASS Count              : {pass_cnt} / 12")
    print(f"FAIL Count              : {fail_cnt} / 12")
    print("=" * 120)

    db.close()

if __name__ == '__main__':
    run_12_scenario_matrix_test()
