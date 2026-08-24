import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import Company, Student, Room, Disruption, Notification

router = APIRouter()

@router.get("/companies", summary="Get all companies")
def get_companies(
    tier: Optional[int] = Query(None, ge=1, le=3),
    min_cgpa: Optional[float] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Company)
    if tier is not None:
        query = query.filter(Company.priority_tier == tier)
    if min_cgpa is not None:
        query = query.filter(Company.cgpa_cutoff <= min_cgpa)

    companies = query.order_by(Company.priority_tier, Company.name).all()
    return {
        "count": len(companies),
        "companies": [
            {
                "id": str(c.id),
                "name": c.name,
                "cgpa_cutoff": float(c.cgpa_cutoff),
                "priority_tier": c.priority_tier,
                "panel_count": c.panel_count,
                "interview_duration_mins": c.interview_duration_mins,
                "day_availability_mask": c.day_availability_mask
            }
            for c in companies
        ]
    }

@router.get("/students", summary="Get students list")
def get_students(
    branch: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    query = db.query(Student)
    if branch:
        query = query.filter(Student.branch == branch)
    if status:
        query = query.filter(Student.status == status)

    total = query.count()
    students = query.order_by(Student.roll_number).offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "students": [
            {
                "id": str(s.id),
                "name": s.name,
                "roll_number": s.roll_number,
                "cgpa": float(s.cgpa),
                "branch": s.branch,
                "status": s.status
            }
            for s in students
        ]
    }

@router.get("/rooms", summary="Get active rooms list")
def get_rooms(db: Session = Depends(get_db)):
    rooms = db.query(Room).order_by(Room.building, Room.room_number).all()
    return {
        "rooms": [
            {
                "id": str(r.id),
                "building": r.building,
                "room_number": r.room_number,
                "capacity": r.capacity,
                "is_active": r.is_active
            }
            for r in rooms
        ]
    }

@router.get("/notifications", summary="List notifications")
def get_notifications(
    recipient_type: Optional[str] = None,
    recipient_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Notification)
    if recipient_type:
        query = query.filter(Notification.recipient_type == recipient_type)
    if recipient_id:
        query = query.filter(Notification.recipient_id == recipient_id)

    notifs = query.order_by(Notification.sent_at.desc()).all()
    return {
        "count": len(notifs),
        "notifications": [
            {
                "id": str(n.id),
                "replan_proposal_id": str(n.replan_proposal_id),
                "recipient_type": n.recipient_type,
                "recipient_id": str(n.recipient_id),
                "message": n.message,
                "channel": n.channel,
                "sent_at": str(n.sent_at) if n.sent_at else None
            }
            for n in notifs
        ]
    }
