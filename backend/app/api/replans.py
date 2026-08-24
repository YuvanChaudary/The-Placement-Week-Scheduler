import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import ScheduleVersion, ReplanProposal, Disruption, Notification
from app.services.metrics import calculate_replan_metrics
from app.engine.replanner import generate_replan

router = APIRouter()

@router.get("/replans/{proposal_id}/metrics", summary="Get metrics for a specific replan proposal")
def get_replan_metrics_endpoint(proposal_id: uuid.UUID, db: Session = Depends(get_db)):
    try:
        return calculate_replan_metrics(db, proposal_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/replans/generate", status_code=201, summary="Generate candidate replan proposal from disruption payload")
@router.post("/replan/preview", status_code=200, summary="Preview candidate replan proposal")
def generate_replan_endpoint(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    base_version_id_str = payload.get("base_version_id")
    if base_version_id_str:
        base_version_id = uuid.UUID(str(base_version_id_str))
    else:
        active_version = db.query(ScheduleVersion).filter(ScheduleVersion.status == "COMMITTED").order_by(ScheduleVersion.version_number.desc()).first()
        if not active_version:
            raise HTTPException(status_code=404, detail="No base committed schedule version found.")
        base_version_id = active_version.id

    try:
        new_version, proposal = generate_replan(db, base_version_id, payload)
        replan_metrics = calculate_replan_metrics(db, proposal.id)
        return {
            "replan_proposal_id": str(proposal.id),
            "disruption_id": str(proposal.disruption_id),
            "status": proposal.status,
            "proposed_version_id": str(new_version.id),
            "proposed_version_number": new_version.version_number,
            "diff_matrix": proposal.diff_matrix,
            "churn_summary": proposal.metrics_summary,
            "metrics": replan_metrics["metrics"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/replans/{proposal_id}/approve", summary="Approve replan proposal")
@router.post("/replan/{proposal_id}/approve", summary="Approve replan proposal (alias)")
def approve_replan_proposal(proposal_id: uuid.UUID, db: Session = Depends(get_db)):
    proposal = db.query(ReplanProposal).filter(ReplanProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"ReplanProposal {proposal_id} not found.")

    if proposal.status == "APPROVED":
        return {
            "proposal_id": str(proposal_id),
            "status": "APPROVED",
            "message": "Proposal was already approved."
        }

    proposed_version = db.query(ScheduleVersion).filter(ScheduleVersion.id == proposal.proposed_version_id).first()
    if not proposed_version:
        raise HTTPException(status_code=404, detail="Proposed schedule version not found.")

    previous_committed = db.query(ScheduleVersion).filter(ScheduleVersion.status == "COMMITTED").all()
    for v in previous_committed:
        v.status = "ARCHIVED"

    proposed_version.status = "COMMITTED"
    proposal.status = "APPROVED"

    diff = proposal.diff_matrix or {}
    notification_count = 0

    for item in diff.get("moved", []):
        if "student_id" in item:
            s_id = uuid.UUID(item["student_id"])
            notif = Notification(
                id=uuid.uuid4(),
                replan_proposal_id=proposal.id,
                recipient_type="STUDENT",
                recipient_id=s_id,
                message=f"Your interview schedule has been updated to Day {item.get('new_day')} at {item.get('new_start_time')}.",
                channel="DASHBOARD_PUSH"
            )
            db.add(notif)
            notification_count += 1

    for item in diff.get("cancelled", []):
        if "student_id" in item:
            s_id = uuid.UUID(item["student_id"])
            notif = Notification(
                id=uuid.uuid4(),
                replan_proposal_id=proposal.id,
                recipient_type="STUDENT",
                recipient_id=s_id,
                message=f"Notice: Your interview has been cancelled due to: {item.get('reason')}.",
                channel="DASHBOARD_PUSH"
            )
            db.add(notif)
            notification_count += 1

    db.commit()

    return {
        "proposal_id": str(proposal_id),
        "status": "APPROVED",
        "new_active_version_number": proposed_version.version_number,
        "notifications_dispatched": notification_count
    }

@router.post("/replans/{proposal_id}/reject", summary="Reject replan proposal")
@router.post("/replan/{proposal_id}/reject", summary="Reject replan proposal (alias)")
def reject_replan_proposal(proposal_id: uuid.UUID, db: Session = Depends(get_db)):
    proposal = db.query(ReplanProposal).filter(ReplanProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"ReplanProposal {proposal_id} not found.")

    proposal.status = "REJECTED"
    proposed_version = db.query(ScheduleVersion).filter(ScheduleVersion.id == proposal.proposed_version_id).first()
    if proposed_version:
        proposed_version.status = "REJECTED"

    db.commit()

    return {
        "proposal_id": str(proposal_id),
        "status": "REJECTED"
    }
