import time
import sys
import os
import random
from sqlalchemy import text
from app.core.database import SessionLocal
from app.models import ScheduleVersion, Company, Student, Interview, ReplanProposal
from app.engine.scheduler import generate_baseline_schedule
from app.engine.replanner import generate_replan

def run_replanner_live_defense():
    """
    Executes Live Defense Replanning Scenario:
    1. Fetches baseline ScheduleVersion (version_number = 1). If missing, generates baseline.
    2. Injects combined Live Defense disruption:
       - Tier 1 Company delayed 3 hours on Day 1 (09:00 -> 12:00).
       - 15 random students withdraw.
    3. Runs Progressive Repair Radius Replanning Engine.
    4. Outputs Diff Matrix, Churn Metrics, and Cost Score.
    """
    db = SessionLocal()
    try:
        base_version = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 1).first()
        if not base_version:
            print("Baseline schedule version 1 not found. Generating baseline schedule first...")
            base_version, _, _ = generate_baseline_schedule(db)

        print(f"Base Schedule Version: {base_version.version_number} (ID: {base_version.id})")

        t1_company = db.query(Company).filter(Company.priority_tier == 1).first()
        if not t1_company:
            t1_company = db.query(Company).first()

        all_students = db.query(Student).all()
        random.seed(42)
        withdrawn_students = random.sample(all_students, min(15, len(all_students)))
        withdrawn_ids = [str(s.id) for s in withdrawn_students]

        print("Injecting Live Defense Disruption:")
        print(f"  - Company Delay: '{t1_company.name}' (Tier {t1_company.priority_tier}) delayed 3h on Day 1 (09:00 -> 12:00)")
        print(f"  - Student Withdrawals: {len(withdrawn_ids)} students withdrawn")

        disruption_payload = {
            "disruption_type": "LIVE_DEFENSE_COMBINED",
            "company_delays": [
                {
                    "company_id": str(t1_company.id),
                    "delay_hours": 3,
                    "day": 1
                }
            ],
            "student_withdrawals": withdrawn_ids,
            "panel_dropouts": [],
            "room_unavailabilities": []
        }

        start_t = time.perf_counter()
        new_version, proposal = generate_replan(db, base_version.id, disruption_payload)
        elapsed_ms = (time.perf_counter() - start_t) * 1000.0

        diff_summary = proposal.diff_matrix.get("summary", {})

        print("\n================ LIVE DEFENSE REPLANNING SUMMARY ================")
        print(f"Replan Proposal ID    : {proposal.id}")
        print(f"Base Version          : {base_version.version_number} -> Proposed Version: {new_version.version_number} ({new_version.status})")
        print(f"Total Impacted Nodes  : {diff_summary.get('total_impacted', 0)}")
        print(f"Total Withdrawn Nodes : {diff_summary.get('total_withdrawn', 0)}")
        print(f"Total Moved Nodes     : {diff_summary.get('total_moved', 0)}")
        print(f"Total Room Changed    : {diff_summary.get('total_room_changed', 0)}")
        print(f"Total Panel Changed   : {diff_summary.get('total_panel_changed', 0)}")
        print(f"Unaffected Preserved  : {diff_summary.get('total_unaffected_preserved', 0)}")
        print(f"Replan Cost Score (J) : {proposal.metrics_summary.get('churn_score', 0):.2f}")
        print(f"Execution Latency     : {elapsed_ms:.2f} ms")
        print("=================================================================\n")

    except Exception as e:
        db.rollback()
        print(f"Error executing replanner: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_replanner_live_defense()
