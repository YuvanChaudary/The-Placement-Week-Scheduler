import time
import sys
import os
from sqlalchemy import text
from app.core.database import SessionLocal
from app.models import ScheduleVersion, Interview, Shortlist
from app.engine.scheduler import generate_baseline_schedule

def run_scheduler():
    """
    Idempotent execution script for baseline scheduler.
    Clears existing schedule versions & interviews, generates baseline schedule,
    and prints execution summary.
    """
    db = SessionLocal()
    try:
        print("Clearing existing schedules and interviews...")
        db.execute(text("TRUNCATE notifications, replan_proposals, interviews, schedule_versions CASCADE;"))
        db.commit()

        shortlist_count = db.query(Shortlist).count()
        print(f"Total Shortlist Candidates (Demand): {shortlist_count}")
        print("Starting baseline greedy scheduling engine...")

        start_t = time.perf_counter()
        version, scheduled_cnt, unscheduled_cnt = generate_baseline_schedule(db)
        elapsed_ms = (time.perf_counter() - start_t) * 1000.0

        print("\n================ SCHEDULER EXECUTION SUMMARY ================")
        print(f"Schedule Version  : {version.version_number} (ID: {version.id})")
        print(f"Status            : {version.status}")
        print(f"Total Demand      : {shortlist_count}")
        print(f"Scheduled         : {scheduled_cnt} ({scheduled_cnt / shortlist_count * 100.0:.2f}%)" if shortlist_count > 0 else f"Scheduled : {scheduled_cnt}")
        print(f"Unscheduled       : {unscheduled_cnt} ({unscheduled_cnt / shortlist_count * 100.0:.2f}%)" if shortlist_count > 0 else f"Unscheduled : {unscheduled_cnt}")
        print(f"Execution Time    : {elapsed_ms:.2f} ms")

        if unscheduled_cnt > 0:
            reasons = db.query(Interview.conflict_reason, text("COUNT(*)")).\
                filter(Interview.version_id == version.id, Interview.status == "UNSCHEDULED").\
                group_by(Interview.conflict_reason).all()
            print("\nUnscheduled Conflict Diagnostic Breakdown:")
            for reason, count in reasons:
                print(f"  - {reason}: {count}")
        print("============================================================\n")

    except Exception as e:
        db.rollback()
        print(f"Error executing scheduler: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_scheduler()
