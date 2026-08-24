import uuid
from uuid import UUID
from typing import List, Dict, Any, Tuple, Set
from datetime import datetime, timezone, time
from sqlalchemy.orm import Session
from app.models import (
    Student, Company, Room, Panel, Shortlist, ScheduleVersion, Interview, Disruption, ReplanProposal
)
from app.engine.bitmask import (
    TOTAL_SLOTS_PER_DAY, TOTAL_DAYS, TOTAL_SLOTS, _INTERVAL_MASKS_CACHE,
    offset_to_slot, slot_to_time, create_interval_mask, is_slot_feasible, is_day_available
)
from app.engine.disruptions import DisruptionHandler

CONFIGURABLE_REPLAN_WEIGHTS = {
    "w_m": 100.0,       # Churn penalty for moving time slot / day
    "w_w": 10.0,        # Penalty for increased student idle wait time
    "w_p": 50.0,        # Penalty for lost company priority
    "w_r": 5.0,         # Minor penalty for room change in same slot
    "w_panel": 2.0,     # Minimal penalty for panel swap in same company/slot
    "w_u": 1000.0,      # Severe penalty for unscheduling an interview
}

def generate_replan(
    db: Session,
    base_version_id: UUID,
    disruption_payload: Dict[str, Any]
) -> Tuple[ScheduleVersion, ReplanProposal]:
    """
    Executes Progressive Repair Radius replanning under disruption events.
    Enforces safe bitmask evictions, active node migration into unutilized room/slot capacity,
    preserves baseline schedule nodes (minimal churn), maintains 100% diff universe conservation
    (|B| == |moved| + |cancelled| + |unaffected_preserved|), and creates a new draft ScheduleVersion and ReplanProposal.
    """
    # 1. Fetch base ScheduleVersion & current interviews
    base_version = db.query(ScheduleVersion).filter(ScheduleVersion.id == base_version_id).first()
    if not base_version:
        raise ValueError(f"Base schedule version {base_version_id} not found.")

    base_interviews = db.query(Interview).filter(Interview.version_id == base_version_id).all()
    scheduled_base_interviews = [iv for iv in base_interviews if iv.status == "SCHEDULED"]

    students = {s.id: s for s in db.query(Student).all()}
    companies = {c.id: c for c in db.query(Company).all()}
    active_rooms = db.query(Room).filter(Room.is_active == True).order_by(Room.building, Room.room_number).all()
    all_panels = db.query(Panel).filter(Panel.is_active == True).order_by(Panel.panel_name).all()

    company_panels_map: Dict[UUID, List[Panel]] = {}
    for p in all_panels:
        company_panels_map.setdefault(p.company_id, []).append(p)

    # 2. Record Disruption in Database
    disruption = Disruption(
        id=uuid.uuid4(),
        disruption_type=disruption_payload.get("disruption_type", "LIVE_DEFENSE_COMBINED"),
        target_entity_type=disruption_payload.get("target_entity_type", "MULTIPLE"),
        target_entity_id=disruption_payload.get("target_entity_id", base_version_id),
        parameters=disruption_payload,
        injected_at=datetime.now(timezone.utc)
    )
    db.add(disruption)
    db.flush()

    # 3. Analyze Disruption Blast Radius (Impact Analysis)
    impacted_interviews_list: List[Interview] = []
    withdrawn_student_ids: Set[UUID] = set()

    # Process Company Delays
    for delay_info in disruption_payload.get("company_delays", []):
        comp_id = UUID(str(delay_info["company_id"])) if isinstance(delay_info["company_id"], str) else delay_info["company_id"]
        delay_hrs = delay_info["delay_hours"]
        day_num = delay_info.get("day", 1)
        impacted_interviews_list.extend(
            DisruptionHandler.analyze_company_delay(base_interviews, comp_id, delay_hrs, day_num)
        )

    # Process Student Withdrawals
    raw_withdrawals = disruption_payload.get("student_withdrawals", [])
    w_day = disruption_payload.get("day")
    for s_id in raw_withdrawals:
        w_id = UUID(str(s_id)) if isinstance(s_id, str) else s_id
        withdrawn_student_ids.add(w_id)

    withdrawn_interviews = DisruptionHandler.analyze_student_withdrawal(base_interviews, withdrawn_student_ids, w_day)

    # Process Panel Dropouts
    for panel_info in disruption_payload.get("panel_dropouts", []):
        p_id = UUID(str(panel_info["panel_id"])) if isinstance(panel_info["panel_id"], str) else panel_info["panel_id"]
        p_day = panel_info.get("day", 1)
        p_start_str = panel_info.get("start_time", "09:00")
        p_start = time.fromisoformat(p_start_str) if isinstance(p_start_str, str) else p_start_str
        impacted_interviews_list.extend(
            DisruptionHandler.analyze_panel_dropout(base_interviews, p_id, p_day, p_start)
        )

    # Process Room Unavailabilities
    for room_info in disruption_payload.get("room_unavailabilities", []):
        r_id = UUID(str(room_info["room_id"])) if isinstance(room_info["room_id"], str) else room_info["room_id"]
        r_day = room_info.get("day", 1)
        r_start = time.fromisoformat(room_info["start_time"]) if isinstance(room_info["start_time"], str) else room_info["start_time"]
        r_end = time.fromisoformat(room_info["end_time"]) if isinstance(room_info["end_time"], str) else room_info["end_time"]
        impacted_interviews_list.extend(
            DisruptionHandler.analyze_room_unavailability(base_interviews, r_id, r_day, r_start, r_end)
        )

    # Deduplicate impacted interviews by UUID
    unique_impacted_dict: Dict[UUID, Interview] = {iv.id: iv for iv in impacted_interviews_list}
    impacted_interviews = list(unique_impacted_dict.values())

    impacted_set: Set[UUID] = set(unique_impacted_dict.keys())
    withdrawn_set: Set[UUID] = {iv.id for iv in withdrawn_interviews}

    # 4. Rebuild 144-bit occupancy bitmasks for UNAFFECTED SCHEDULED interviews + Mark Disrupted Resource Intervals
    b_students: Dict[UUID, int] = {s_id: 0 for s_id in students.keys()}
    b_rooms: Dict[UUID, int] = {r.id: 0 for r in active_rooms}
    b_panels: Dict[UUID, int] = {p.id: 0 for p in all_panels}

    unaffected_interviews: List[Interview] = []

    for iv in scheduled_base_interviews:
        if iv.id not in impacted_set and iv.id not in withdrawn_set:
            unaffected_interviews.append(iv)
            if iv.day is not None and iv.start_time is not None and iv.company_id in companies:
                comp = companies[iv.company_id]
                length_slots = comp.interview_duration_mins // 15
                slot = offset_to_slot(iv.day, iv.start_time.hour, iv.start_time.minute)
                mask = _INTERVAL_MASKS_CACHE.get((slot, length_slots), create_interval_mask(slot, length_slots))

                b_students[iv.student_id] |= mask
                if iv.room_id in b_rooms:
                    b_rooms[iv.room_id] |= mask
                if iv.panel_id in b_panels:
                    b_panels[iv.panel_id] |= mask

    # Mark unavailable room slot intervals in b_rooms bitmask so repair loop NEVER assigns interviews to down rooms
    for room_info in disruption_payload.get("room_unavailabilities", []):
        r_id = UUID(str(room_info["room_id"])) if isinstance(room_info["room_id"], str) else room_info["room_id"]
        r_day = room_info.get("day", 1)
        r_start = time.fromisoformat(room_info["start_time"]) if isinstance(room_info["start_time"], str) else room_info["start_time"]
        r_end = time.fromisoformat(room_info["end_time"]) if isinstance(room_info["end_time"], str) else room_info["end_time"]

        s_start = offset_to_slot(r_day, r_start.hour, r_start.minute)
        s_end = offset_to_slot(r_day, r_end.hour, r_end.minute)
        length_slots = max(1, s_end - s_start)
        mask = _INTERVAL_MASKS_CACHE.get((s_start, length_slots), create_interval_mask(s_start, length_slots))

        if r_id in b_rooms:
            b_rooms[r_id] |= mask

    # Mark dropped panel slot intervals in b_panels bitmask so repair loop NEVER reassigns to dropped panels
    for panel_info in disruption_payload.get("panel_dropouts", []):
        p_id = UUID(str(panel_info["panel_id"])) if isinstance(panel_info["panel_id"], str) else panel_info["panel_id"]
        p_day = panel_info.get("day", 1)
        p_start_str = panel_info.get("start_time", "09:00")
        p_start = time.fromisoformat(p_start_str) if isinstance(p_start_str, str) else p_start_str

        s_start = offset_to_slot(p_day, p_start.hour, p_start.minute)
        s_end = p_day * TOTAL_SLOTS_PER_DAY
        length_slots = max(1, s_end - s_start)
        mask = _INTERVAL_MASKS_CACHE.get((s_start, length_slots), create_interval_mask(s_start, length_slots))

        if p_id in b_panels:
            b_panels[p_id] |= mask

    # 5. Level 0 & Level 1 Repair Allocation
    repair_queue = [iv for iv in impacted_interviews if iv.id not in withdrawn_set]

    # Sort repair queue by deterministic priority key
    def get_repair_key(iv: Interview):
        comp = companies[iv.company_id]
        stud = students[iv.student_id]
        sl_rank = 1
        return (comp.priority_tier, -float(stud.cgpa), sl_rank, -comp.interview_duration_mins, str(iv.id))

    repair_queue.sort(key=get_repair_key)

    repaired_records: List[Interview] = []
    diff_moved: List[Dict[str, Any]] = []
    diff_cancelled: List[Dict[str, Any]] = []
    diff_unscheduled: List[Dict[str, Any]] = []
    diff_added: List[Dict[str, Any]] = []

    # Handle Withdrawn Candidates (CANCELLED)
    for iv in withdrawn_interviews:
        diff_cancelled.append({
            "interview_id": str(iv.id),
            "student_id": str(iv.student_id),
            "company_id": str(iv.company_id),
            "day": iv.day,
            "reason": "STUDENT_WITHDRAWN"
        })

    # Track Churn Metrics
    moved_count = 0
    room_changed_count = 0
    panel_changed_count = 0
    unscheduled_count = 0
    preserved_repaired_count = 0

    # Allocate Repair Queue
    for iv in repair_queue:
        student = students[iv.student_id]
        company = companies[iv.company_id]
        company_panels = company_panels_map.get(company.id, [])
        length_slots = company.interview_duration_mins // 15

        allocated = False
        b_stud = b_students[student.id]

        company_delay_hrs = 0
        company_delay_day = 1
        for delay_info in disruption_payload.get("company_delays", []):
            delay_comp_id = UUID(str(delay_info["company_id"])) if isinstance(delay_info["company_id"], str) else delay_info["company_id"]
            if delay_comp_id == company.id:
                company_delay_hrs = delay_info["delay_hours"]
                company_delay_day = delay_info.get("day", 1)

        day_order = [iv.day] if iv.day and is_day_available(company.day_availability_mask, iv.day) else []
        for d in range(1, TOTAL_DAYS + 1):
            if d not in day_order and is_day_available(company.day_availability_mask, d):
                day_order.append(d)

        for day in day_order:
            day_start = (day - 1) * TOTAL_SLOTS_PER_DAY
            min_start_hour = 9 + company_delay_hrs if (day == company_delay_day and company_delay_hrs > 0) else 9
            start_slot_min = int((day - 1) * TOTAL_SLOTS_PER_DAY + round((min_start_hour - 9) * 4))
            day_end_max = day_start + TOTAL_SLOTS_PER_DAY - length_slots

            for s in range(start_slot_min, day_end_max + 1):
                mask = _INTERVAL_MASKS_CACHE.get((s, length_slots), create_interval_mask(s, length_slots))

                if (b_stud & mask) != 0:
                    continue

                for panel in company_panels:
                    if (b_panels[panel.id] & mask) != 0:
                        continue

                    for room in active_rooms:
                        if (b_rooms[room.id] & mask) != 0:
                            continue

                        # Feasible Level 0 repair slot found!
                        b_students[student.id] |= mask
                        b_panels[panel.id] |= mask
                        b_rooms[room.id] |= mask

                        day_num, start_t, end_t = slot_to_time(s, company.interview_duration_mins)

                        is_moved_time = (iv.day != day_num or iv.start_time != start_t)
                        is_moved_room = (iv.room_id != room.id)
                        is_moved_panel = (iv.panel_id != panel.id)

                        repaired_iv = Interview(
                            id=uuid.uuid4(),
                            shortlist_id=iv.shortlist_id,
                            company_id=iv.company_id,
                            student_id=iv.student_id,
                            panel_id=panel.id,
                            room_id=room.id,
                            day=day_num,
                            start_time=start_t,
                            end_time=end_t,
                            status="SCHEDULED",
                            conflict_reason=None
                        )
                        repaired_records.append(repaired_iv)

                        if is_moved_time or is_moved_room or is_moved_panel:
                            moved_count += 1
                            if is_moved_room:
                                room_changed_count += 1
                            if is_moved_panel:
                                panel_changed_count += 1

                            diff_moved.append({
                                "interview_id": str(iv.id),
                                "student_id": str(iv.student_id),
                                "company_id": str(iv.company_id),
                                "day": day_num,
                                "old_day": iv.day,
                                "new_day": day_num,
                                "old_start_time": str(iv.start_time) if iv.start_time else None,
                                "new_start_time": str(start_t),
                                "old_room_id": str(iv.room_id) if iv.room_id else None,
                                "new_room_id": str(room.id),
                                "time_shifted": is_moved_time,
                                "room_shifted": is_moved_room,
                                "panel_shifted": is_moved_panel
                            })
                        else:
                            preserved_repaired_count += 1

                        allocated = True
                        break
                    if allocated: break
                if allocated: break
            if allocated: break

        if not allocated:
            unscheduled_count += 1
            cancel_reason = "ROOM_EXHAUSTED"
            if company_delay_hrs > 0:
                cancel_reason = "DELAY_WINDOW_EXHAUSTED"
            elif len(disruption_payload.get("panel_dropouts", [])) > 0:
                cancel_reason = "PANEL_DROPOUT_UNRESOLVED"
            elif len(disruption_payload.get("room_unavailabilities", [])) > 0:
                cancel_reason = "ROOM_OFFLINE_UNRESOLVED"

            diff_cancelled.append({
                "interview_id": str(iv.id),
                "student_id": str(iv.student_id),
                "company_id": str(iv.company_id),
                "day": iv.day,
                "reason": cancel_reason
            })
            diff_unscheduled.append({
                "interview_id": str(iv.id),
                "student_id": str(iv.student_id),
                "company_id": str(iv.company_id),
                "day": iv.day,
                "reason": cancel_reason
            })
            repaired_records.append(Interview(
                id=uuid.uuid4(),
                shortlist_id=iv.shortlist_id,
                company_id=iv.company_id,
                student_id=iv.student_id,
                panel_id=None,
                room_id=None,
                day=None,
                start_time=None,
                end_time=None,
                status="UNSCHEDULED",
                conflict_reason=cancel_reason
            ))

    # 6. Create New ScheduleVersion (status: 'DRAFT', version_number = base_version.version_number + 1)
    new_version = ScheduleVersion(
        id=uuid.uuid4(),
        version_number=base_version.version_number + 1,
        status="DRAFT",
        created_by="replanner_engine",
        disruption_id=disruption.id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_version)
    db.flush()

    # 7. Construct Full New Schedule State for Version 2
    final_interviews_to_insert: List[Interview] = []

    for iv in unaffected_interviews:
        cloned_iv = Interview(
            id=uuid.uuid4(),
            version_id=new_version.id,
            shortlist_id=iv.shortlist_id,
            company_id=iv.company_id,
            student_id=iv.student_id,
            panel_id=iv.panel_id,
            room_id=iv.room_id,
            day=iv.day,
            start_time=iv.start_time,
            end_time=iv.end_time,
            status="SCHEDULED",
            conflict_reason=None
        )
        final_interviews_to_insert.append(cloned_iv)

    for iv in repaired_records:
        iv.version_id = new_version.id
        final_interviews_to_insert.append(iv)

    db.bulk_save_objects(final_interviews_to_insert)
    db.flush()

    total_preserved_cnt = len(unaffected_interviews) + preserved_repaired_count
    total_cancelled_cnt = len(diff_cancelled)

    # 8. Compute Repair Cost Score (J_replan)
    cost_score = (
        CONFIGURABLE_REPLAN_WEIGHTS["w_m"] * moved_count +
        CONFIGURABLE_REPLAN_WEIGHTS["w_r"] * room_changed_count +
        CONFIGURABLE_REPLAN_WEIGHTS["w_panel"] * panel_changed_count +
        CONFIGURABLE_REPLAN_WEIGHTS["w_u"] * total_cancelled_cnt
    )

    diff_matrix = {
        "added": diff_added,
        "moved": diff_moved,
        "cancelled": diff_cancelled,
        "unscheduled": diff_unscheduled,
        "summary": {
            "total_impacted": len(impacted_interviews),
            "total_withdrawn": len(withdrawn_interviews),
            "total_moved": moved_count,
            "total_cancelled": total_cancelled_cnt,
            "total_room_changed": room_changed_count,
            "total_panel_changed": panel_changed_count,
            "total_unscheduled": unscheduled_count,
            "total_unaffected_preserved": total_preserved_cnt,
            "churn_score": cost_score
        }
    }

    # 9. Create ReplanProposal Entry
    proposal = ReplanProposal(
        id=uuid.uuid4(),
        disruption_id=disruption.id,
        base_version_id=base_version.id,
        proposed_version_id=new_version.id,
        diff_matrix=diff_matrix,
        metrics_summary=diff_matrix["summary"],
        status="PROPOSED",
        created_at=datetime.now(timezone.utc)
    )
    db.add(proposal)
    db.commit()

    return new_version, proposal
