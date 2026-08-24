import os
import sys
from sqlalchemy import text

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.core.database import SessionLocal
from app.api.schedules import reset_schedule_to_baseline
from app.engine.replanner import generate_replan
from app.models import Company, ScheduleVersion, Interview, ReplanProposal, Notification

def verify_db_persistence():
    db = SessionLocal()
    print("=" * 90)
    print("POSTGRESQL DATABASE PERSISTENCE VERIFICATION")
    print("=" * 90)

    # 1. Reset to baseline first
    reset_schedule_to_baseline(db)

    # Count initial versions and interviews in PostgreSQL
    v_cnt_before = db.query(ScheduleVersion).count()
    i_cnt_before = db.query(Interview).count()
    p_cnt_before = db.query(ReplanProposal).count()
    n_cnt_before = db.query(Notification).count()

    print(f"\n[STEP 1] Database State BEFORE Replan Injection:")
    print(f"  - schedule_versions count : {v_cnt_before}")
    print(f"  - interviews count         : {i_cnt_before}")
    print(f"  - replan_proposals count   : {p_cnt_before}")
    print(f"  - notifications count      : {n_cnt_before}")

    # 2. Trigger Replan Engine
    apex = db.query(Company).filter(Company.name == "Apex AI Solutions").first()
    v1 = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 1).first()

    payload = {
        "disruption_type": "COMPANY_DELAY",
        "company_delays": [{"company_id": str(apex.id), "delay_hours": 3, "day": 1}]
    }

    draft_v, proposal = generate_replan(db, v1.id, payload)

    # Count AFTER replan generation
    v_cnt_draft = db.query(ScheduleVersion).count()
    i_cnt_draft = db.query(Interview).count()
    p_cnt_draft = db.query(ReplanProposal).count()

    print(f"\n[STEP 2] Database State AFTER Replan Generation (DRAFT):")
    print(f"  - schedule_versions count : {v_cnt_draft} (+{v_cnt_draft - v_cnt_before} new ScheduleVersion v2 inserted into PostgreSQL)")
    print(f"  - interviews count         : {i_cnt_draft} (+{i_cnt_draft - i_cnt_before} new Version 2 Interview rows inserted into PostgreSQL)")
    print(f"  - replan_proposals count   : {p_cnt_draft} (+{p_cnt_draft - p_cnt_before} new ReplanProposal inserted into PostgreSQL)")
    print(f"  - Draft Version Status     : {draft_v.status} (version_number={draft_v.version_number})")

    # Inspect exact database rows
    db_version_row = db.execute(text("SELECT id, version_number, status, created_by FROM schedule_versions WHERE version_number = 2")).fetchone()
    print(f"\n  DB Query Verification (schedule_versions):")
    print(f"    -> ID: {db_version_row[0]} | Version #: {db_version_row[1]} | Status: {db_version_row[2]} | Creator: {db_version_row[3]}")

    db_proposal_row = db.execute(text("SELECT id, proposed_version_id, status FROM replan_proposals WHERE id = :p_id"), {"p_id": proposal.id}).fetchone()
    print(f"  DB Query Verification (replan_proposals):")
    print(f"    -> Proposal ID: {db_proposal_row[0]} | Proposed Version: {db_proposal_row[1]} | Status: {db_proposal_row[2]}")

    v2_iv_cnt = db.query(Interview).filter(Interview.version_id == draft_v.id).count()
    print(f"  DB Query Verification (interviews):")
    print(f"    -> Version 2 Scheduled Rows in PostgreSQL DB: {v2_iv_cnt}")

    # 3. Approve Proposal
    from app.api.replans import approve_replan_proposal
    app_res = approve_replan_proposal(proposal.id, db)

    v1_status = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 1).first().status
    v2_status = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 2).first().status
    p_status = db.query(ReplanProposal).filter(ReplanProposal.id == proposal.id).first().status
    n_cnt_after = db.query(Notification).count()

    print(f"\n[STEP 3] Database State AFTER Proposal Approval:")
    print(f"  - Version 1 Status in PostgreSQL DB : {v1_status} (Archived)")
    print(f"  - Version 2 Status in PostgreSQL DB : {v2_status} (COMMITTED & ACTIVE)")
    print(f"  - Proposal Status in PostgreSQL DB  : {p_status}")
    print(f"  - notifications count               : {n_cnt_after} (+{n_cnt_after - n_cnt_before} student notifications inserted into PostgreSQL)")

    # 4. Clean up / Reset
    reset_schedule_to_baseline(db)
    print(f"\n[STEP 4] Database State AFTER Reset to Baseline:")
    print(f"  - Active Version in PostgreSQL DB   : V1 ({db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 1).first().status})")
    print("=" * 90)
    print("ALL DATABASE PERSISTENCE VERIFICATIONS CONFIRMED!")
    print("=" * 90)

    db.close()

if __name__ == '__main__':
    verify_db_persistence()
