import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import ScheduleVersion, Interview, Student, Company, Room, Panel, ReplanProposal, Notification
from app.services.metrics import calculate_schedule_metrics
from app.engine.scheduler import generate_baseline_schedule

router = APIRouter()

@router.get("/schedules/{version_id}/metrics", summary="Get metrics for a specific schedule version")
def get_schedule_version_metrics(version_id: uuid.UUID, db: Session = Depends(get_db)):
    try:
        return calculate_schedule_metrics(db, version_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/metrics", summary="Get metrics for the active committed schedule version")
def get_active_schedule_metrics(db: Session = Depends(get_db)):
    active_version = db.query(ScheduleVersion).filter(ScheduleVersion.status == "COMMITTED").order_by(ScheduleVersion.version_number.desc()).first()
    if not active_version:
        raise HTTPException(status_code=404, detail="No active committed schedule version found.")
    return {
        "active_version_number": active_version.version_number,
        "metrics": calculate_schedule_metrics(db, active_version.id)["metrics"]
    }

@router.get("/schedules/{version_id}", summary="Get full schedule details by version ID")
def get_schedule_by_id(
    version_id: uuid.UUID,
    day: Optional[int] = Query(None, ge=1, le=4),
    room_id: Optional[uuid.UUID] = None,
    student_id: Optional[uuid.UUID] = None,
    company_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
):
    version = db.query(ScheduleVersion).filter(ScheduleVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail=f"Schedule version {version_id} not found.")

    query = db.query(Interview).filter(Interview.version_id == version_id)
    if day is not None:
        query = query.filter(Interview.day == day)
    if room_id is not None:
        query = query.filter(Interview.room_id == room_id)
    if student_id is not None:
        query = query.filter(Interview.student_id == student_id)
    if company_id is not None:
        query = query.filter(Interview.company_id == company_id)

    interviews = query.all()
    students = {s.id: s for s in db.query(Student).all()}
    companies = {c.id: c for c in db.query(Company).all()}
    rooms = {r.id: r for r in db.query(Room).all()}
    panels = {p.id: p for p in db.query(Panel).all()}

    formatted = []
    for iv in interviews:
        comp = companies.get(iv.company_id)
        stud = students.get(iv.student_id)
        formatted.append({
            "id": str(iv.id),
            "company_id": str(iv.company_id),
            "company_name": comp.name if comp else "Unknown",
            "priority_tier": comp.priority_tier if comp else 1,
            "student_id": str(iv.student_id),
            "student_name": stud.name if stud else "Unknown",
            "student_roll": stud.roll_number if stud else "",
            "cgpa": float(stud.cgpa) if stud else 0.0,
            "panel_id": str(iv.panel_id) if iv.panel_id else None,
            "panel_name": panels[iv.panel_id].panel_name if iv.panel_id and iv.panel_id in panels else None,
            "room_id": str(iv.room_id) if iv.room_id else None,
            "room_number": rooms[iv.room_id].room_number if iv.room_id and iv.room_id in rooms else None,
            "day": iv.day,
            "start_time": str(iv.start_time) if iv.start_time else None,
            "end_time": str(iv.end_time) if iv.end_time else None,
            "status": iv.status,
            "conflict_reason": iv.conflict_reason
        })

    return {
        "version_id": str(version_id),
        "version_number": version.version_number,
        "status": version.status,
        "interviews_count": len(formatted),
        "interviews": formatted
    }

@router.get("/schedule", summary="Get active committed schedule or filter by query params")
def get_active_schedule(
    version_id: Optional[uuid.UUID] = None,
    day: Optional[int] = Query(None, ge=1, le=4),
    room_id: Optional[uuid.UUID] = None,
    student_id: Optional[uuid.UUID] = None,
    company_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
):
    target_version_id = version_id
    if not target_version_id:
        active_version = db.query(ScheduleVersion).filter(ScheduleVersion.status == "COMMITTED").order_by(ScheduleVersion.version_number.desc()).first()
        if not active_version:
            raise HTTPException(status_code=404, detail="No active committed schedule version found.")
        target_version_id = active_version.id

    return get_schedule_by_id(target_version_id, day, room_id, student_id, company_id, db)

@router.post("/schedule/generate", status_code=201, summary="Generate baseline schedule")
def generate_schedule_endpoint(db: Session = Depends(get_db)):
    version, scheduled_cnt, unscheduled_cnt = generate_baseline_schedule(db)
    metrics_data = calculate_schedule_metrics(db, version.id)
    return {
        "schedule_version_id": str(version.id),
        "version_number": version.version_number,
        "status": version.status,
        "scheduled_interviews_count": scheduled_cnt,
        "unscheduled_interviews_count": unscheduled_cnt,
        "metrics": metrics_data["metrics"]
    }

@router.post("/schedule/reset", summary="Reset schedule to baseline Version 1")
@router.post("/schedules/reset", summary="Reset schedule to baseline Version 1 (Alias)")
def reset_schedule_to_baseline(db: Session = Depends(get_db)):
    try:
        v1 = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 1).first()
        if not v1:
            raise HTTPException(status_code=404, detail="Baseline ScheduleVersion 1 not found.")

        # Clean transient test drafts (version_number > 1)
        non_baseline_versions = db.query(ScheduleVersion).filter(
            ScheduleVersion.version_number > 1
        ).all()

        for dv in non_baseline_versions:
            # Delete notifications linked to proposals that will be deleted
            proposals = db.query(ReplanProposal).filter(
                (ReplanProposal.proposed_version_id == dv.id) | (ReplanProposal.base_version_id == dv.id)
            ).all()
            for prop in proposals:
                db.query(Notification).filter(Notification.replan_proposal_id == prop.id).delete(synchronize_session=False)

            db.query(Interview).filter(Interview.version_id == dv.id).delete(synchronize_session=False)
            db.query(ReplanProposal).filter(
                (ReplanProposal.proposed_version_id == dv.id) | (ReplanProposal.base_version_id == dv.id)
            ).delete(synchronize_session=False)
            db.query(ScheduleVersion).filter(ScheduleVersion.id == dv.id).delete(synchronize_session=False)

        # Set baseline version 1 to COMMITTED
        v1.status = "COMMITTED"
        db.commit()

        return {
            "status": "RESET_SUCCESS",
            "active_version_id": str(v1.id),
            "version_number": 1
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")
