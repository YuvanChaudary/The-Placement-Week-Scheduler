import uuid
from typing import List, Dict, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import (
    Student, Company, Room, Panel, Shortlist, ScheduleVersion, Interview
)
from app.engine.bitmask import (
    TOTAL_SLOTS_PER_DAY, TOTAL_DAYS, TOTAL_SLOTS, _INTERVAL_MASKS_CACHE,
    create_interval_mask, is_slot_feasible, is_day_available, slot_to_time
)

def determine_conflict_reason(
    student_id: uuid.UUID,
    company: Company,
    b_students: Dict[uuid.UUID, int],
    b_panels: Dict[uuid.UUID, int],
    b_rooms: Dict[uuid.UUID, int],
    active_rooms: List[Room],
    company_panels: List[Panel]
) -> str:
    """
    Determines explicit primary failure diagnostic when an interview cannot be scheduled.
    """
    if company.day_availability_mask == 0:
        return "COMPANY_WINDOW_CLOSED"

    length_slots = company.interview_duration_mins // 15
    student_busy_count = 0
    room_busy_count = 0
    panel_busy_count = 0
    total_slots_checked = 0

    b_stud = b_students.get(student_id, 0)
    panel_masks = [b_panels.get(p.id, 0) for p in company_panels]
    room_masks = [b_rooms.get(r.id, 0) for r in active_rooms]

    for day in range(1, TOTAL_DAYS + 1):
        if not is_day_available(company.day_availability_mask, day):
            continue

        day_start = (day - 1) * TOTAL_SLOTS_PER_DAY
        day_end_max = day_start + TOTAL_SLOTS_PER_DAY - length_slots

        for s in range(day_start, day_end_max + 1):
            total_slots_checked += 1
            mask = _INTERVAL_MASKS_CACHE.get((s, length_slots), 0)

            if (b_stud & mask) != 0:
                student_busy_count += 1

            panel_busy = True
            for pm in panel_masks:
                if (pm & mask) == 0:
                    panel_busy = False
                    break
            if panel_busy:
                panel_busy_count += 1

            room_busy = True
            for rm in room_masks:
                if (rm & mask) == 0:
                    room_busy = False
                    break
            if room_busy:
                room_busy_count += 1

    if total_slots_checked == 0:
        return "COMPANY_WINDOW_CLOSED"

    if room_busy_count >= total_slots_checked * 0.5:
        return "ROOM_EXHAUSTED"
    elif student_busy_count >= total_slots_checked * 0.5:
        return "STUDENT_TIME_CLASH"
    elif panel_busy_count >= total_slots_checked * 0.5:
        return "PANEL_EXHAUSTED"
    elif room_busy_count > 0:
        return "ROOM_EXHAUSTED"
    elif student_busy_count > 0:
        return "STUDENT_TIME_CLASH"
    elif panel_busy_count > 0:
        return "PANEL_EXHAUSTED"

    return "ROOM_EXHAUSTED"

def generate_baseline_schedule(db: Session) -> Tuple[ScheduleVersion, int, int]:
    """
    Generates baseline deterministic placement schedule for all shortlists using 144-bit resource occupancy masks.
    Saves ScheduleVersion 1 (COMMITTED) and bulk inserts Interview records.
    """
    # 1. Fetch entities from DB
    students = {s.id: s for s in db.query(Student).all()}
    companies = {c.id: c for c in db.query(Company).all()}
    active_rooms = db.query(Room).filter(Room.is_active == True).order_by(Room.building, Room.room_number).all()
    all_panels = db.query(Panel).filter(Panel.is_active == True).order_by(Panel.panel_name).all()

    company_panels_map: Dict[uuid.UUID, List[Panel]] = {}
    for p in all_panels:
        company_panels_map.setdefault(p.company_id, []).append(p)

    shortlists = db.query(Shortlist).all()

    # 2. Sort candidate queue using exact deterministic priority tuple
    def get_priority_key(sl: Shortlist):
        comp = companies[sl.company_id]
        stud = students[sl.student_id]
        return (
            comp.priority_tier,
            -float(stud.cgpa),
            sl.priority_rank,
            -comp.interview_duration_mins,
            str(sl.id)
        )

    sorted_shortlists = sorted(shortlists, key=get_priority_key)

    # 3. Instantiate 144-bit occupancy bitmasks (initialized to 0)
    b_students: Dict[uuid.UUID, int] = {s_id: 0 for s_id in students.keys()}
    b_rooms: Dict[uuid.UUID, int] = {r.id: 0 for r in active_rooms}
    b_panels: Dict[uuid.UUID, int] = {p.id: 0 for p in all_panels}

    # 4. Create new ScheduleVersion
    version = ScheduleVersion(
        id=uuid.uuid4(),
        version_number=1,
        status="COMMITTED",
        created_by="system",
        created_at=datetime.now(timezone.utc)
    )
    db.add(version)
    db.flush()

    interviews_to_insert = []
    scheduled_count = 0
    unscheduled_count = 0

    # 5. Allocation Loop
    for shortlist in sorted_shortlists:
        student = students[shortlist.student_id]
        company = companies[shortlist.company_id]
        company_panels = company_panels_map.get(company.id, [])

        # Hard Constraint: CGPA Cutoff Check
        if float(student.cgpa) < float(company.cgpa_cutoff):
            interviews_to_insert.append(Interview(
                id=uuid.uuid4(),
                version_id=version.id,
                shortlist_id=shortlist.id,
                company_id=company.id,
                student_id=student.id,
                panel_id=None,
                room_id=None,
                day=None,
                start_time=None,
                end_time=None,
                status="UNSCHEDULED",
                conflict_reason="CGPA_INELIGIBLE"
            ))
            unscheduled_count += 1
            continue

        # Hard Constraint: Student Status Check
        if student.status != "ELIGIBLE":
            interviews_to_insert.append(Interview(
                id=uuid.uuid4(),
                version_id=version.id,
                shortlist_id=shortlist.id,
                company_id=company.id,
                student_id=student.id,
                panel_id=None,
                room_id=None,
                day=None,
                start_time=None,
                end_time=None,
                status="UNSCHEDULED",
                conflict_reason="STUDENT_INACTIVE"
            ))
            unscheduled_count += 1
            continue

        length_slots = company.interview_duration_mins // 15
        allocated = False
        b_stud = b_students[student.id]

        # Search earliest feasible slot across Days 1..4 in deterministic lexicographic order
        for day in range(1, TOTAL_DAYS + 1):
            if not is_day_available(company.day_availability_mask, day):
                continue

            day_start = (day - 1) * TOTAL_SLOTS_PER_DAY
            day_end_max = day_start + TOTAL_SLOTS_PER_DAY - length_slots

            for s in range(day_start, day_end_max + 1):
                mask = _INTERVAL_MASKS_CACHE.get((s, length_slots))
                if mask is None:
                    mask = create_interval_mask(s, length_slots)

                # Student availability check
                if (b_stud & mask) != 0:
                    continue

                # Search Panel & Room in deterministic order
                for panel in company_panels:
                    if (b_panels[panel.id] & mask) != 0:
                        continue

                    for room in active_rooms:
                        if (b_rooms[room.id] & mask) != 0:
                            continue

                        # Feasible slot found!
                        b_students[student.id] |= mask
                        b_panels[panel.id] |= mask
                        b_rooms[room.id] |= mask

                        day_num, start_t, end_t = slot_to_time(s, company.interview_duration_mins)

                        interviews_to_insert.append(Interview(
                            id=uuid.uuid4(),
                            version_id=version.id,
                            shortlist_id=shortlist.id,
                            company_id=company.id,
                            student_id=student.id,
                            panel_id=panel.id,
                            room_id=room.id,
                            day=day_num,
                            start_time=start_t,
                            end_time=end_t,
                            status="SCHEDULED",
                            conflict_reason=None
                        ))
                        scheduled_count += 1
                        allocated = True
                        break
                    if allocated:
                        break
                if allocated:
                    break
            if allocated:
                break

        if not allocated:
            reason = determine_conflict_reason(
                student.id, company, b_students, b_panels, b_rooms, active_rooms, company_panels
            )
            interviews_to_insert.append(Interview(
                id=uuid.uuid4(),
                version_id=version.id,
                shortlist_id=shortlist.id,
                company_id=company.id,
                student_id=student.id,
                panel_id=None,
                room_id=None,
                day=None,
                start_time=None,
                end_time=None,
                status="UNSCHEDULED",
                conflict_reason=reason
            ))
            unscheduled_count += 1

    # 6. Bulk Save Interviews to PostgreSQL
    db.bulk_save_objects(interviews_to_insert)
    db.commit()

    return version, scheduled_count, unscheduled_count
