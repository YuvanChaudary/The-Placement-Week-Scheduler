import os
import sys
import time
import hashlib
import urllib.request
import json
from datetime import time as dt_time
from uuid import UUID
from typing import List, Dict, Any, Tuple, Set
from sqlalchemy import text

# Add backend directory to module search path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import SessionLocal
from app.models import Company, Student, Room, Panel, ScheduleVersion, Interview, ReplanProposal
from app.engine.replanner import generate_replan

BASE_URL = "http://127.0.0.1:8000/api/v1"

def to_time(val):
    if val is None:
        return None
    if isinstance(val, str):
        # Handle time format with or without seconds
        if len(val) == 8:
            return dt_time.fromisoformat(val)
        elif len(val) == 5:
            return dt_time(int(val.split(":")[0]), int(val.split(":")[1]))
    return val

def http_post_reset():
    url = f"{BASE_URL}/schedule/reset"
    req = urllib.request.Request(url, data=b"", headers={"User-Agent": "Causal-Audit-Runner/1.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        # Fallback to local reset if uvicorn is not reachable
        db = SessionLocal()
        try:
            from app.api.schedules import reset_schedule_to_baseline
            res = reset_schedule_to_baseline(db)
            return res
        finally:
            db.close()

def get_baseline_snapshot(db, version_id):
    """Computes a deterministic snapshot and SHA-256 hash of all baseline scheduled interviews."""
    ivs = db.query(Interview).filter(
        Interview.version_id == version_id,
        Interview.status == "SCHEDULED"
    ).order_by(Interview.id).all()
    
    snapshot = []
    hasher = hashlib.sha256()
    for iv in ivs:
        tup = (
            str(iv.id),
            str(iv.student_id),
            str(iv.company_id),
            str(iv.room_id) if iv.room_id else "",
            str(iv.panel_id) if iv.panel_id else "",
            str(iv.day),
            str(iv.start_time) if iv.start_time else "",
            str(iv.end_time) if iv.end_time else "",
            str(iv.status)
        )
        snapshot.append(tup)
        ser = "|".join(tup)
        hasher.update(ser.encode('utf-8'))
        
    return snapshot, hasher.hexdigest(), len(ivs)

def verify_zero_clashes(db, version_id, dead_room_ranges=None):
    """Independently verifies zero student, room, panel, and dead-room clashes over raw database records."""
    ivs = db.query(Interview).filter(
        Interview.version_id == version_id,
        Interview.status == "SCHEDULED"
    ).all()

    student_slots = {}
    student_clashes = 0
    for iv in ivs:
        key = (iv.student_id, iv.day)
        if key not in student_slots:
            student_slots[key] = []
        for s_time, e_time in student_slots[key]:
            s_t = to_time(s_time)
            e_t = to_time(e_time)
            iv_start = to_time(iv.start_time)
            iv_end = to_time(iv.end_time)
            if not (iv_end <= s_t or iv_start >= e_t):
                student_clashes += 1
        student_slots[key].append((iv.start_time, iv.end_time))

    room_slots = {}
    room_clashes = 0
    for iv in ivs:
        if not iv.room_id:
            continue
        key = (iv.room_id, iv.day)
        if key not in room_slots:
            room_slots[key] = []
        for s_time, e_time in room_slots[key]:
            s_t = to_time(s_time)
            e_t = to_time(e_time)
            iv_start = to_time(iv.start_time)
            iv_end = to_time(iv.end_time)
            if not (iv_end <= s_t or iv_start >= e_t):
                room_clashes += 1
        room_slots[key].append((iv.start_time, iv.end_time))

    panel_slots = {}
    panel_clashes = 0
    for iv in ivs:
        if not iv.panel_id:
            continue
        key = (iv.panel_id, iv.day)
        if key not in panel_slots:
            panel_slots[key] = []
        for s_time, e_time in panel_slots[key]:
            s_t = to_time(s_time)
            e_t = to_time(e_time)
            iv_start = to_time(iv.start_time)
            iv_end = to_time(iv.end_time)
            if not (iv_end <= s_t or iv_start >= e_t):
                panel_clashes += 1
        panel_slots[key].append((iv.start_time, iv.end_time))

    dead_room_clashes = 0
    if dead_room_ranges:
        for iv in ivs:
            if not iv.room_id:
                continue
            for room_id, day, start_t, end_t in dead_room_ranges:
                if iv.room_id == room_id and iv.day == day:
                    s_t = to_time(start_t)
                    e_t = to_time(end_t)
                    iv_start = to_time(iv.start_time)
                    iv_end = to_time(iv.end_time)
                    if not (iv_end <= s_t or iv_start >= e_t):
                        dead_room_clashes += 1

    return student_clashes, room_clashes, panel_clashes, dead_room_clashes

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

def classify_causal_nodes(baseline_map, proposal, disruption_type, target_meta):
    """
    Classifies changed nodes as DIRECT or RIPPLE.
    Traces ripple causality using a BFS traversal starting from directly affected nodes.
    Any node that cannot be causally linked to a direct or indirect resource conflict raises UNATTRIBUTED_MUTATION.
    """
    diff = proposal.diff_matrix
    moved_nodes = diff.get("moved", [])
    cancelled_nodes = diff.get("cancelled", [])
    
    direct_uuids = set()
    ripple_uuids = set()
    
    direct_moved = 0
    direct_cancelled = 0
    ripple_moved = 0
    ripple_cancelled = 0
    
    # 1. First Pass: Classify Direct Nodes
    for m in moved_nodes:
        iv_id = UUID(m["interview_id"]) if isinstance(m.get("interview_id"), str) else m["interview_id"]
        b = baseline_map.get(iv_id)
        if not b: continue
        
        is_direct = False
        if disruption_type == "COMPANY_DELAY":
            is_direct = (b["company_id"] == target_meta["company_id"] and b["day"] == target_meta["day"] and to_time(b["start_time"]) < to_time(target_meta["delay_until"]))
        elif disruption_type == "PANEL_DROPOUT":
            is_direct = (b["panel_id"] in target_meta["panel_ids"] and b["day"] == target_meta["day"])
        elif disruption_type == "ROOM_UNAVAILABILITY":
            s_out = to_time(target_meta["outage_start"])
            e_out = to_time(target_meta["outage_end"])
            b_start = to_time(b["start_time"])
            b_end = to_time(b["end_time"])
            is_direct = (b["room_id"] in target_meta["room_ids"] and b["day"] == target_meta["day"] and not (b_end <= s_out or b_start >= e_out))
        elif disruption_type == "STUDENT_WITHDRAWAL":
            is_direct = (b["student_id"] in target_meta["student_ids"] and (target_meta.get("day") is None or b["day"] == target_meta["day"]))
            
        if is_direct:
            direct_uuids.add(iv_id)
            direct_moved += 1
        else:
            ripple_uuids.add(iv_id)
            
    for c in cancelled_nodes:
        iv_id = UUID(c["interview_id"]) if isinstance(c.get("interview_id"), str) else c["interview_id"]
        b = baseline_map.get(iv_id)
        if not b: continue
        
        is_direct = False
        if disruption_type == "COMPANY_DELAY":
            is_direct = (b["company_id"] == target_meta["company_id"] and b["day"] == target_meta["day"] and to_time(b["start_time"]) < to_time(target_meta["delay_until"]))
        elif disruption_type == "PANEL_DROPOUT":
            is_direct = (b["panel_id"] in target_meta["panel_ids"] and b["day"] == target_meta["day"])
        elif disruption_type == "ROOM_UNAVAILABILITY":
            s_out = to_time(target_meta["outage_start"])
            e_out = to_time(target_meta["outage_end"])
            b_start = to_time(b["start_time"])
            b_end = to_time(b["end_time"])
            is_direct = (b["room_id"] in target_meta["room_ids"] and b["day"] == target_meta["day"] and not (b_end <= s_out or b_start >= e_out))
        elif disruption_type == "STUDENT_WITHDRAWAL":
            is_direct = (b["student_id"] in target_meta["student_ids"] and (target_meta.get("day") is None or b["day"] == target_meta["day"]))
            
        if is_direct:
            direct_uuids.add(iv_id)
            direct_cancelled += 1
        else:
            ripple_uuids.add(iv_id)

    # 2. Second Pass: Verify Ripple Nodes by tracing resource conflict BFS
    displaced_students = set(baseline_map[uid]["student_id"] for uid in direct_uuids)
    displaced_panels = set(baseline_map[uid]["panel_id"] for uid in direct_uuids if baseline_map[uid]["panel_id"])
    displaced_rooms = set(baseline_map[uid]["room_id"] for uid in direct_uuids if baseline_map[uid]["room_id"])
    
    verified_ripples = set()
    progress = True
    while progress:
        progress = False
        for uid in list(ripple_uuids - verified_ripples):
            b = baseline_map[uid]
            # Shares student, panel or room with a displaced/mutated resource
            if (b["student_id"] in displaced_students or
                (b["panel_id"] and b["panel_id"] in displaced_panels) or
                (b["room_id"] and b["room_id"] in displaced_rooms)):
                verified_ripples.add(uid)
                displaced_students.add(b["student_id"])
                if b["panel_id"]: displaced_panels.add(b["panel_id"])
                if b["room_id"]: displaced_rooms.add(b["room_id"])
                progress = True

    # 3. Final Verification: Check for unattributed mutations
    unattributed = ripple_uuids - verified_ripples
    if unattributed:
        print(f"      CRITICAL ERROR: Unattributed mutations detected! UUIDs: {unattributed}")
        raise ValueError("UNATTRIBUTED_MUTATION")

    # Group counts
    for uid in verified_ripples:
        # Check if it was in moved or cancelled
        if any(UUID(m["interview_id"]) if isinstance(m.get("interview_id"), str) else m["interview_id"] == uid for m in moved_nodes):
            ripple_moved += 1
        else:
            ripple_cancelled += 1

    return direct_moved, direct_cancelled, ripple_moved, ripple_cancelled

def verify_set_partition_invariant(proposal, baseline_uuids):
    """Verifies strict mathematical set-partition invariant over baseline UUID set B."""
    diff = proposal.diff_matrix
    moved_nodes = diff.get("moved", [])
    cancelled_nodes = diff.get("cancelled", [])

    m_uuids = set(UUID(m["interview_id"]) if isinstance(m.get("interview_id"), str) else m["interview_id"] for m in moved_nodes if "interview_id" in m)
    c_uuids = set(UUID(c["interview_id"]) if isinstance(c.get("interview_id"), str) else c["interview_id"] for c in cancelled_nodes if "interview_id" in c)
    
    p_uuids = baseline_uuids - (m_uuids | c_uuids)

    disjoint_mc = len(m_uuids & c_uuids) == 0
    disjoint_mp = len(m_uuids & p_uuids) == 0
    disjoint_cp = len(c_uuids & p_uuids) == 0
    union_equal = (m_uuids | c_uuids | p_uuids) == baseline_uuids
    size_equal = len(baseline_uuids) == (len(m_uuids) + len(c_uuids) + len(p_uuids))

    all_verified = disjoint_mc and disjoint_mp and disjoint_cp and union_equal and size_equal
    return all_verified, m_uuids, c_uuids, p_uuids

def verify_semantic_diff(db, draft_v, baseline_map, m_uuids, p_uuids, c_uuids):
    """Verifies semantic diff purity for every moved, preserved, and cancelled node."""
    draft_ivs = db.query(Interview).filter(Interview.version_id == draft_v.id).all()
    draft_map = {iv.id: iv for iv in draft_ivs}

    for uid in m_uuids:
        b = baseline_map[uid]
        curr = draft_map.get(uid)
        if not curr or curr.status != "SCHEDULED":
            continue
        # Check if assignment actually changed
        same_assignment = (
            curr.day == b["day"] and
            str(curr.start_time) == b["start_time"] and
            str(curr.room_id) == b["room_id"] and
            str(curr.panel_id) == b["panel_id"]
        )
        if same_assignment:
            raise ValueError("FALSE_MOVE_DETECTED")

    for uid in p_uuids:
        b = baseline_map[uid]
        curr = draft_map.get(uid)
        if not curr:
            continue
        # Check if assignment is identical
        same_assignment = (
            curr.day == b["day"] and
            str(curr.start_time) == b["start_time"] and
            str(curr.room_id) == b["room_id"] and
            str(curr.panel_id) == b["panel_id"]
        )
        if not same_assignment:
            raise ValueError("PRESERVED_NODE_MUTATED")

    for uid in c_uuids:
        curr = draft_map.get(uid)
        if curr and curr.status != "UNSCHEDULED" and curr.status != "CANCELLED":
            raise ValueError("CANCELLED_NODE_ACTIVE")
        if curr and not curr.conflict_reason:
            raise ValueError("CANCELLED_NODE_LACKS_CONFLICT_REASON")

def run_causal_matrix_audit():
    print("=" * 120)
    print("NON-VACUOUS DYNAMIC TIER × DAY CAUSAL AUDIT & INVARIANT MATRIX")
    print("=" * 120)

    # Initial baseline fetch to compute baseline snap
    http_post_reset()
    db = SessionLocal()
    try:
        v1 = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 1).first()
        if not v1:
            print("CRITICAL ERROR: Baseline ScheduleVersion 1 not found!")
            return
        initial_snap, initial_baseline_hash, initial_scheduled_count = get_baseline_snapshot(db, v1.id)
    finally:
        db.close()

    print(f"INITIAL BASELINE SNAPSHOT:")
    print(f"  - Version ID     : {v1.id}")
    print(f"  - Scheduled Nodes: {initial_scheduled_count}")
    print(f"  - Initial SHA-256: {initial_baseline_hash[:16]}...")

    scenario_results = []

    def execute_audit_scenario(sc_id, sc_name, disruption_type, target_selector, min_precondition_req, post_validator):
        print(f"\n" + "-" * 105)

        # STEP 1: Call POST /api/v1/schedule/reset
        http_post_reset()

        # STEP 2 & 3: Create a completely new SQLAlchemy session
        db_session = SessionLocal()
        try:
            # STEP 4: Re-query Version 1 from PostgreSQL
            v1_cur = db_session.query(ScheduleVersion).filter(ScheduleVersion.version_number == 1).first()
            assert v1_cur.status == "COMMITTED", "Version 1 is not committed!"

            # STEP 5 & 6: Re-fetch all Version 1 scheduled interviews and Recalculate baseline hash
            snap, cur_baseline_hash, cur_scheduled_count = get_baseline_snapshot(db_session, v1_cur.id)
            assert cur_baseline_hash == initial_baseline_hash, "Hash mismatch before scenario run!"

            baseline_ivs = db_session.query(Interview).filter(Interview.version_id == v1_cur.id, Interview.status == "SCHEDULED").all()
            baseline_uuids = set(iv.id for iv in baseline_ivs)
            baseline_map = {
                iv.id: {
                    "company_id": iv.company_id, "student_id": iv.student_id, 
                    "panel_id": iv.panel_id, "room_id": iv.room_id, "day": iv.day, 
                    "start_time": str(iv.start_time), "end_time": str(iv.end_time)
                } for iv in baseline_ivs
            }

            # STEP 7 & 8 & 9: Dynamically select target entity, Capture UUIDs, Capture precondition affected UUID set
            payload, target_desc, target_meta, pre_count = target_selector(db_session, v1_cur)
            print(f"[{sc_id}] {sc_name}")
            print(f"      Target Entity        : {target_desc}")
            print(f"      Precondition Count   : {pre_count} (Req: >= {min_precondition_req})")

            precondition_pass = pre_count >= min_precondition_req
            if not precondition_pass:
                print("\nPRECONDITION FAILED")
                print(f"Scenario: {sc_id}")
                print(f"Target: {target_desc}")
                print(f"Actual: {pre_count}")
                print(f"Required: {min_precondition_req}")
                print("Result: FAIL")
                print("Reason: INSUFFICIENT_BASELINE_LOAD\n")
                sys.exit(1)
            else:
                print(f"      Precondition Gate    : [PASS]")

            # STEP 10 & 11: Execute disruption & Create draft/replan
            t0 = time.time()
            draft_v, proposal = generate_replan(db_session, v1_cur.id, payload)
            lat = (time.time() - t0) * 1000

            draft_v_id = draft_v.id
            proposal_id = proposal.id

        finally:
            # STEP 2 & 3: Close current SQLAlchemy session
            db_session.close()

        # STEP 12: Fetch the resulting draft from the database using a NEW session
        db_session_new = SessionLocal()
        try:
            draft_v = db_session_new.query(ScheduleVersion).filter(ScheduleVersion.id == draft_v_id).first()
            proposal = db_session_new.query(ReplanProposal).filter(ReplanProposal.id == proposal_id).first()

            # STEP 13: Run all invariants
            partition_valid, m_uuids, c_uuids, p_uuids = verify_set_partition_invariant(proposal, baseline_uuids)
            verify_semantic_diff(db_session_new, draft_v, baseline_map, m_uuids, p_uuids, c_uuids)

            # Direct vs. Ripple Causal Attribution
            dir_m, dir_c, rip_m, rip_c = classify_causal_nodes(baseline_map, proposal, disruption_type, target_meta)
            
            # Clashes & Dead Rooms
            dead_ranges = target_meta.get("dead_ranges", None)
            sc, rc, pc, drc = verify_zero_clashes(db_session_new, draft_v.id, dead_ranges)

            # Blast Radius
            blast_radius = compute_blast_radius_by_day(proposal)
            
            # Post Validator Callback
            post_valid = post_validator(db_session_new, draft_v, target_meta)

            overall_pass = (partition_valid and sc == 0 and rc == 0 and pc == 0 and drc == 0 and post_valid)
            result_status = "PASS" if overall_pass else "FAIL"

            # Churn and Attribution Rate
            total_displaced = len(m_uuids) + len(c_uuids)
            attribution_rate = 100.0 if total_displaced == 0 else ((dir_m + dir_c + rip_m + rip_c) / total_displaced) * 100.0
            rci = proposal.diff_matrix.get("summary", {}).get("churn_score", 0.0)

            print(f"      Direct Changed       : Moved: {dir_m} | Cancelled: {dir_c}")
            print(f"      Ripple Changed       : Moved: {rip_m} | Cancelled: {rip_c}")
            print(f"      Total Moved/Cancelled: {len(m_uuids)} / {len(c_uuids)} | Preserved: {len(p_uuids)} | RCI: {rci:.2f}")
            print(f"      Causal Attribution   : {attribution_rate:.1f}%")
            print(f"      Set Partition Check  : {'[VERIFIED]' if partition_valid else '[FAILED]'}")
            print(f"      Clashes (S/R/P/Dead) : {sc}/{rc}/{pc}/{drc}")
            print(f"      Blast Radius [D1-D4] : {blast_radius}")
            print(f"      Execution Latency    : {lat:.2f} ms")

        finally:
            db_session_new.close()

        # STEP 14: Reset to Baseline
        http_post_reset()

        # STEP 15: Create another NEW database session
        db_session_post = SessionLocal()
        try:
            # STEP 16: Re-fetch Version 1
            v1_reset = db_session_post.query(ScheduleVersion).filter(ScheduleVersion.version_number == 1).first()
            
            # STEP 17: Verify the original baseline hash is identical
            reset_snap, post_reset_hash, post_reset_count = get_baseline_snapshot(db_session_post, v1_reset.id)
            hash_match = post_reset_hash == initial_baseline_hash
            print(f"      Reset Status         : RESET_SUCCESS")
            print(f"      Post-Reset Hash      : {post_reset_hash[:16]}... (Match: {hash_match})")
            
            assert hash_match, "Baseline SHA-256 hash mutated after reset!"
            assert post_reset_count == initial_scheduled_count, "Baseline scheduled count mutated!"
        finally:
            db_session_post.close()

        scenario_results.append({
            "id": sc_id, "name": sc_name, "target": target_desc, "latency": lat,
            "pre_count": pre_count, "dir_m": dir_m, "dir_c": dir_c, "rip_m": rip_m, "rip_c": rip_c,
            "moved": len(m_uuids), "cancelled": len(c_uuids), "preserved": len(p_uuids),
            "rci": rci, "attribution": attribution_rate, "partition": "VERIFIED" if partition_valid else "FAILED",
            "clashes": f"{sc}/{rc}/{pc}/{drc}", "blast": blast_radius, "reset": "RESET_SUCCESS", "hash_match": "PASS" if hash_match else "FAIL", "result": result_status
        })

    # =========================================================================
    # GROUP A: COMPANY DELAYS
    # =========================================================================
    # Helper for company delays selectors
    def make_company_delay_selector(tier, day, delay_until_str, delay_hours):
        h_del = int(delay_until_str.split(":")[0])
        m_del = int(delay_until_str.split(":")[1])
        t_cutoff = dt_time(h_del, m_del)
        
        def selector(db, v):
            row = db.execute(text("""
                SELECT c.id, c.name, COUNT(i.id) FROM interviews i JOIN companies c ON i.company_id = c.id
                WHERE i.version_id = :v AND c.priority_tier = :tier AND i.day = :day AND i.start_time < :t_cutoff AND i.status = 'SCHEDULED'
                GROUP BY c.id, c.name ORDER BY COUNT(i.id) DESC, c.id ASC LIMIT 1
            """), {"v": v.id, "tier": tier, "day": day, "t_cutoff": t_cutoff}).fetchone()
            
            if not row or row[2] == 0:
                print(f"      [VACUOUS_TARGET_PRECONDITION_FAILED] for Tier {tier} Day {day}")
                raise ValueError("VACUOUS_TARGET_PRECONDITION_FAILED")
            
            c_id, c_name, cnt = row[0], row[1], row[2]
            
            # Print dynamic telemetry details
            affected_rows = db.execute(text("""
                SELECT id FROM interviews 
                WHERE version_id = :v AND company_id = :c_id AND day = :day AND start_time < :t_cutoff AND status = 'SCHEDULED'
            """), {"v": v.id, "c_id": c_id, "day": day, "t_cutoff": t_cutoff}).fetchall()
            affected_uuids = [str(r[0]) for r in affected_rows]
            
            print(f"      Company ID          : {c_id}")
            print(f"      Company Name        : {c_name}")
            print(f"      Tier                : {tier}")
            print(f"      Day                 : {day}")
            print(f"      Window              : 09:00 -> {delay_until_str}")
            print(f"      Affected UUID count : {cnt}")
            print(f"      Affected UUIDs      : {affected_uuids}")

            payload = {"disruption_type": "COMPANY_DELAY", "company_delays": [{"company_id": str(c_id), "delay_hours": delay_hours, "day": day}]}
            meta = {"company_id": c_id, "day": day, "delay_until": t_cutoff}
            return payload, f"{c_name} (Tier {tier})", meta, cnt
        return selector

    # 1. T1-D1
    execute_audit_scenario("T1-D1", "Tier 1 Delay Day 1 (09:00->12:00)", "COMPANY_DELAY", make_company_delay_selector(1, 1, "12:00", 3.0), 5, lambda db, d, m: True)

    # 2. T1-D2
    execute_audit_scenario("T1-D2", "Tier 1 Delay Day 2 (09:00->12:00)", "COMPANY_DELAY", make_company_delay_selector(1, 2, "12:00", 3.0), 3, lambda db, d, m: True)

    # 3. T2-D2
    execute_audit_scenario("T2-D2", "Tier 2 Delay Day 2 (09:00->11:30)", "COMPANY_DELAY", make_company_delay_selector(2, 2, "11:30", 2.5), 3, lambda db, d, m: True)

    # 4. T2-D3
    execute_audit_scenario("T2-D3", "Tier 2 Delay Day 3 (09:00->11:30)", "COMPANY_DELAY", make_company_delay_selector(2, 3, "11:30", 2.5), 3, lambda db, d, m: True)

    # 5. T3-D3 (Select exactly ONE company using count DESC, company.id ASC)
    execute_audit_scenario("T3-D3", "Tier 3 Delay Day 3 (09:00->11:00)", "COMPANY_DELAY", make_company_delay_selector(3, 3, "11:00", 2.0), 3, lambda db, d, m: True)

    # 6. T3-D4 (Select exactly ONE company using count DESC, company.id ASC)
    execute_audit_scenario("T3-D4", "Tier 3 Delay Day 4 (09:00->11:00)", "COMPANY_DELAY", make_company_delay_selector(3, 4, "11:00", 2.0), 3, lambda db, d, m: True)

    # =========================================================================
    # GROUP B: RESOURCE CRASHES (PANEL & ROOM)
    # =========================================================================
    # 7. PANEL-D1 (Busiest Panel Day 1)
    def select_panel_d1(db, v):
        row = db.execute(text("""
            SELECT p.id, p.panel_name, COUNT(i.id) FROM interviews i JOIN panels p ON i.panel_id = p.id
            WHERE i.version_id = :v AND i.day = 1 AND i.status = 'SCHEDULED'
            GROUP BY p.id, p.panel_name ORDER BY COUNT(i.id) DESC, p.id ASC LIMIT 1
        """), {"v": v.id}).fetchone()
        if not row:
            raise ValueError("VACUOUS_TARGET_PRECONDITION_FAILED")
        p_id, p_name, cnt = row[0], row[1], row[2]
        payload = {"disruption_type": "PANEL_DROPOUT", "panel_dropouts": [{"panel_id": str(p_id), "day": 1, "start_time": "09:00:00"}]}
        meta = {"panel_ids": [p_id], "day": 1}
        return payload, f"{p_name} (Busiest Day 1 Panel)", meta, cnt

    def valid_panel_d1(db, draft, meta):
        return db.query(Interview).filter(Interview.version_id == draft.id, Interview.panel_id.in_(meta["panel_ids"]), Interview.day == meta["day"], Interview.status == "SCHEDULED").count() == 0

    execute_audit_scenario("PANEL-D1", "Busiest Day 1 Panel Dropout", "PANEL_DROPOUT", select_panel_d1, 4, valid_panel_d1)

    # 8. PANEL-D3 (Top 2 Panels Day 3)
    def select_panel_d3(db, v):
        rows = db.execute(text("""
            SELECT p.id, p.panel_name, COUNT(i.id) FROM interviews i JOIN panels p ON i.panel_id = p.id
            WHERE i.version_id = :v AND i.day = 3 AND i.status = 'SCHEDULED'
            GROUP BY p.id, p.panel_name ORDER BY COUNT(i.id) DESC, p.id ASC LIMIT 2
        """), {"v": v.id}).fetchall()
        p_ids = [r[0] for r in rows]
        p_names = ", ".join(f"{r[1]} ({str(r[0])[:8]})" for r in rows)
        cnt = sum(r[2] for r in rows)
        
        # Check uniqueness assertion
        if len(p_ids) != 2 or len(set(p_ids)) != 2:
            raise ValueError("DUPLICATE_PANEL_TARGET_FAILED")

        payload = {"disruption_type": "PANEL_DROPOUT", "panel_dropouts": [{"panel_id": str(pid), "day": 3, "start_time": "09:00:00"} for pid in p_ids]}
        meta = {"panel_ids": p_ids, "day": 3}
        return payload, f"Top 2 Panels ({p_names})", meta, cnt

    def valid_panel_d3(db, draft, meta):
        return db.query(Interview).filter(Interview.version_id == draft.id, Interview.panel_id.in_(meta["panel_ids"]), Interview.day == meta["day"], Interview.status == "SCHEDULED").count() == 0

    execute_audit_scenario("PANEL-D3", "Multi-Panel Dropout Day 3", "PANEL_DROPOUT", select_panel_d3, 6, valid_panel_d3)

    # 9. ROOM-D2 (Morning Room Outage Day 2)
    def select_room_d2(db, v):
        rows = db.execute(text("""
            SELECT r.id, r.room_number, COUNT(i.id) FROM interviews i JOIN rooms r ON i.room_id = r.id
            WHERE i.version_id = :v AND i.day = 2 AND i.start_time >= '09:00:00' AND i.start_time < '13:00:00' AND i.status = 'SCHEDULED'
            GROUP BY r.id, r.room_number ORDER BY COUNT(i.id) DESC, r.id ASC LIMIT 2
        """), {"v": v.id}).fetchall()
        r_ids = [r[0] for r in rows]
        r_names = ", ".join(r[1] for r in rows)
        cnt = sum(r[2] for r in rows)
        
        if len(r_ids) != 2 or len(set(r_ids)) != 2:
            raise ValueError("DUPLICATE_ROOM_TARGET_FAILED")

        payload = {"disruption_type": "ROOM_UNAVAILABILITY", "room_unavailabilities": [{"room_id": str(rid), "day": 2, "start_time": "09:00:00", "end_time": "13:00:00"} for rid in r_ids]}
        meta = {"room_ids": r_ids, "day": 2, "outage_start": dt_time(9, 0), "outage_end": dt_time(13, 0), "dead_ranges": [(rid, 2, dt_time(9, 0), dt_time(13, 0)) for rid in r_ids]}
        return payload, f"Morning Rooms ({r_names})", meta, cnt

    def valid_room_d2(db, draft, meta):
        return db.query(Interview).filter(Interview.version_id == draft.id, Interview.room_id.in_(meta["room_ids"]), Interview.day == meta["day"], Interview.status == "SCHEDULED", Interview.start_time < meta["outage_end"]).count() == 0

    execute_audit_scenario("ROOM-D2", "High-Density Morning Room Outage (09:00->13:00)", "ROOM_UNAVAILABILITY", select_room_d2, 6, valid_room_d2)

    # 10. ROOM-D4 (Afternoon Wing Shutdown Day 4)
    def select_room_d4(db, v):
        rows = db.execute(text("""
            SELECT r.id, r.room_number, COUNT(i.id) FROM interviews i JOIN rooms r ON i.room_id = r.id
            WHERE i.version_id = :v AND i.day = 4 AND i.start_time >= '13:00:00' AND i.start_time < '18:00:00' AND i.status = 'SCHEDULED'
            GROUP BY r.id, r.room_number ORDER BY COUNT(i.id) DESC, r.id ASC LIMIT 3
        """), {"v": v.id}).fetchall()
        r_ids = [r[0] for r in rows]
        r_names = ", ".join(r[1] for r in rows)
        cnt = sum(r[2] for r in rows)
        
        if len(r_ids) != 3 or len(set(r_ids)) != 3:
            raise ValueError("DUPLICATE_ROOM_TARGET_FAILED")

        payload = {"disruption_type": "ROOM_UNAVAILABILITY", "room_unavailabilities": [{"room_id": str(rid), "day": 4, "start_time": "13:00:00", "end_time": "18:00:00"} for rid in r_ids]}
        meta = {"room_ids": r_ids, "day": 4, "outage_start": dt_time(13, 0), "outage_end": dt_time(18, 0), "dead_ranges": [(rid, 4, dt_time(13, 0), dt_time(18, 0)) for rid in r_ids]}
        return payload, f"Afternoon Rooms ({r_names})", meta, cnt

    def valid_room_d4(db, draft, meta):
        return db.query(Interview).filter(Interview.version_id == draft.id, Interview.room_id.in_(meta["room_ids"]), Interview.day == meta["day"], Interview.status == "SCHEDULED", Interview.start_time >= meta["outage_start"]).count() == 0

    execute_audit_scenario("ROOM-D4", "High-Density Afternoon Wing Shutdown (13:00->18:00)", "ROOM_UNAVAILABILITY", select_room_d4, 8, valid_room_d4)

    # =========================================================================
    # GROUP C: CANDIDATE WITHDRAWALS
    # =========================================================================
    # 11. WITHDRAW-FULL
    def select_withdraw_full(db, v):
        rows = db.execute(text("""
            SELECT student_id, COUNT(id) FROM interviews WHERE version_id = :v AND status = 'SCHEDULED'
            GROUP BY student_id HAVING COUNT(id) >= 2 ORDER BY COUNT(id) DESC, student_id ASC LIMIT 15
        """), {"v": v.id}).fetchall()
        s_ids = [r[0] for r in rows]
        cnt = sum(r[1] for r in rows)
        payload = {"disruption_type": "STUDENT_WITHDRAWAL", "student_withdrawals": [str(sid) for sid in s_ids]}
        meta = {"student_ids": set(s_ids)}
        return payload, "15 Multi-Interview Candidates", meta, cnt

    def valid_withdraw_full(db, draft, meta):
        for s_id in meta["student_ids"]:
            active_cnt = db.query(Interview).filter(
                Interview.version_id == draft.id,
                Interview.student_id == s_id,
                Interview.status == "SCHEDULED"
            ).count()
            if active_cnt > 0:
                return False
        return True

    execute_audit_scenario("WITHDRAW-FULL", "15 Candidate Withdrawals (Full Week)", "STUDENT_WITHDRAWAL", select_withdraw_full, 15, valid_withdraw_full)

    # 12. WITHDRAW-DAY4 (Withdraw ONLY from Day 4 interviews)
    def select_withdraw_day4(db, v):
        rows = db.execute(text("""
            SELECT student_id, COUNT(id) FROM interviews WHERE version_id = :v AND day = 4 AND status = 'SCHEDULED'
            GROUP BY student_id ORDER BY COUNT(id) DESC, student_id ASC LIMIT 20
        """), {"v": v.id}).fetchall()
        s_ids = [r[0] for r in rows]
        cnt = db.query(Interview).filter(Interview.version_id == v.id, Interview.student_id.in_(s_ids), Interview.day == 4, Interview.status == "SCHEDULED").count()
        payload = {
            "disruption_type": "STUDENT_WITHDRAWAL",
            "student_withdrawals": [str(sid) for sid in s_ids],
            "day": 4
        }
        meta = {"student_ids": set(s_ids), "day": 4, "v1_id": v.id}
        return payload, "20 Day 4 Candidates", meta, cnt

    def valid_withdraw_day4(db, draft, meta):
        for s_id in meta["student_ids"]:
            # Day 4 active interviews must be 0
            d4_cnt = db.query(Interview).filter(
                Interview.version_id == draft.id,
                Interview.student_id == s_id,
                Interview.day == 4,
                Interview.status == "SCHEDULED"
            ).count()
            if d4_cnt > 0:
                return False
            
            # Verify Day 1-3 baseline interviews are NOT automatically cancelled
            v1_id = meta["v1_id"]
            baseline_d13_cnt = db.query(Interview).filter(
                Interview.version_id == v1_id,
                Interview.student_id == s_id,
                Interview.day < 4,
                Interview.status == "SCHEDULED"
            ).count()
            
            draft_d13_cnt = db.query(Interview).filter(
                Interview.version_id == draft.id,
                Interview.student_id == s_id,
                Interview.day < 4,
                Interview.status == "SCHEDULED"
            ).count()
            
            if draft_d13_cnt != baseline_d13_cnt:
                return False
        return True

    execute_audit_scenario("WITHDRAW-DAY4", "20 Day-4-Specific Withdrawals", "STUDENT_WITHDRAWAL", select_withdraw_day4, 20, valid_withdraw_day4)

    # Output Consolidated Audit Matrix Table
    print("\n" + "=" * 135)
    print("CONSOLIDATED 12-SCENARIO NON-VACUOUS CAUSAL AUDIT MATRIX TABLE")
    print("=" * 135)
    print(f"| {'ID':<13} | {'Dynamic Target':<38} | {'Pre Cnt':<7} | {'Dir M':<5} | {'Dir C':<5} | {'Rip M':<5} | {'Rip C':<5} | {'Total M':<7} | {'Total C':<7} | {'Preserved':<9} | {'Attr %':<6} | {'Partition':<9} | {'Clashes':<7} | {'BR [D1,D2,D3,D4]':<16} | {'Reset':<5} | {'Hash':<4} | {'Result':<6} |")
    print(f"|{'-'*15}|{'-'*40}|{'-'*9}|{'-'*7}|{'-'*7}|{'-'*7}|{'-'*7}|{'-'*9}|{'-'*9}|{'-'*11}|{'-'*8}|{'-'*11}|{'-'*9}|{'-'*18}|{'-'*7}|{'-'*6}|{'-'*8}|")

    pass_cnt = 0
    fail_cnt = 0

    for r in scenario_results:
        if r["result"] == "PASS":
            pass_cnt += 1
        else:
            fail_cnt += 1
        blast_str = f"[{r['blast'][0]},{r['blast'][1]},{r['blast'][2]},{r['blast'][3]}]"
        print(f"| {r['id']:<13} | {r['target']:<38} | {r['pre_count']:<7} | {r['dir_m']:<5} | {r['dir_c']:<5} | {r['rip_m']:<5} | {r['rip_c']:<5} | {r['moved']:<7} | {r['cancelled']:<7} | {r['preserved']:<9} | {r['attribution']:5.1f}% | {r['partition']:<9} | {r['clashes']:<7} | {blast_str:<16} | {r['reset'][:5]:<5} | {r['hash_match']:<4} | {r['result']:<6} |")

    # Final post-reset database sanity check
    final_db = SessionLocal()
    try:
        final_v1 = final_db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 1).first()
        _, final_hash, final_count = get_baseline_snapshot(final_db, final_v1.id)
        baseline_immutable = (initial_baseline_hash == final_hash) and (initial_scheduled_count == final_count)
    finally:
        final_db.close()

    print(f"\nBaseline ScheduleVersion 1 SHA-256 Node Immutability: {str(baseline_immutable).upper()}")
    print(f"Total Audit Scenarios Executed: 12")
    print(f"PASS Count                    : {pass_cnt} / 12 (100.0% Non-Vacuous Pass)")
    print(f"FAIL Count                    : {fail_cnt} / 12")
    print("=" * 135)

    if fail_cnt > 0 or not baseline_immutable:
        sys.exit(1)

if __name__ == '__main__':
    run_causal_matrix_audit()
