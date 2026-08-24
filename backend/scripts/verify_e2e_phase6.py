import sys
import os
import time
from uuid import UUID
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import SessionLocal
from app.models import ScheduleVersion, ReplanProposal, Interview, Student, Company, Room

client = TestClient(app)

def verify_api_and_db_e2e():
    results = {}

    # Step 1: Fetch DB IDs & close DB connection before HTTP testing
    db = SessionLocal()
    try:
        v1 = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 1).first()
        v2 = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 2, ScheduleVersion.status == "COMMITTED").first()
        if not v2:
            v2 = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 2).order_by(ScheduleVersion.created_at.desc()).first()

        proposal = db.query(ReplanProposal).filter(ReplanProposal.proposed_version_id == v2.id).first() if v2 else None

        v1_id = v1.id if v1 else None
        v2_id = v2.id if v2 else None
        proposal_id = proposal.id if proposal else None

        results["Version 1 Exists"] = v1 is not None
        results["Version 2 Exists"] = v2 is not None
        results["ReplanProposal Exists"] = proposal is not None
    finally:
        db.close()

    # Step 2: HTTP API Warmup
    client.get("/api/v1/health")
    client.get(f"/api/v1/schedules/{v1_id}/metrics")
    client.get(f"/api/v1/schedules/{v2_id}/metrics")
    client.get(f"/api/v1/replans/{proposal_id}/metrics")

    # Step 3: Measure HTTP latency across 5 steady-state requests
    latencies_v1 = []
    for _ in range(5):
        t0 = time.perf_counter()
        resp = client.get(f"/api/v1/schedules/{v1_id}/metrics")
        lat = (time.perf_counter() - t0) * 1000.0
        latencies_v1.append(lat)
    avg_lat_v1 = sum(latencies_v1) / len(latencies_v1)

    latencies_v2 = []
    m2_data = {}
    for _ in range(5):
        t0 = time.perf_counter()
        resp = client.get(f"/api/v1/schedules/{v2_id}/metrics")
        lat = (time.perf_counter() - t0) * 1000.0
        latencies_v2.append(lat)
        m2_data = resp.json()
    avg_lat_v2 = sum(latencies_v2) / len(latencies_v2)

    latencies_replan = []
    for _ in range(5):
        t0 = time.perf_counter()
        resp = client.get(f"/api/v1/replans/{proposal_id}/metrics")
        lat = (time.perf_counter() - t0) * 1000.0
        latencies_replan.append(lat)
    avg_lat_replan = sum(latencies_replan) / len(latencies_replan)

    results["Backend Startup"] = resp.status_code == 200
    results["V1 Metrics API (<50ms)"] = avg_lat_v1 < 50.0
    results["V2 Metrics API (<50ms)"] = avg_lat_v2 < 50.0
    results["Replan Metrics API (<50ms)"] = avg_lat_replan < 50.0

    metrics2 = m2_data.get("metrics", {})
    moved_cnt = metrics2.get("moved_interviews_count", 0)
    cancelled_cnt = metrics2.get("cancelled_interviews_count", 0)
    unaffected_cnt = metrics2.get("unchanged_interviews_count", 0)
    rci = metrics2.get("replan_churn_index", 0.0)
    affected_students_cnt = metrics2.get("affected_students_count", 0)

    results["Diff Matrix Moved = 8"] = moved_cnt == 8
    results["Diff Matrix Cancelled = 23"] = cancelled_cnt == 23
    results["Diff Matrix Unaffected = 753"] = unaffected_cnt == 753
    results["Affected Students = 14"] = affected_students_cnt == 14
    results["Replan Churn Index = 5.68%"] = abs(rci - 5.68) < 0.1

    # Step 4: DB Verification with fresh Session
    db2 = SessionLocal()
    try:
        v2_db = db2.query(ScheduleVersion).filter(ScheduleVersion.id == v2_id).first()
        prop_db = db2.query(ReplanProposal).filter(ReplanProposal.id == proposal_id).first()

        results["Version 2 COMMITTED in DB"] = v2_db is not None and v2_db.status == "COMMITTED"
        results["ReplanProposal APPROVED in DB"] = prop_db is not None and prop_db.status == "APPROVED"

        student_clashes = db2.execute(__import__('sqlalchemy').text("""
            SELECT COUNT(*)
            FROM interviews i1
            JOIN interviews i2 
              ON i1.student_id = i2.student_id 
             AND i1.id != i2.id 
             AND i1.day = i2.day
             AND i1.version_id = :v_id
             AND i2.version_id = :v_id
             AND i1.status = 'SCHEDULED' 
             AND i2.status = 'SCHEDULED'
             AND i1.start_time < i2.end_time 
             AND i1.end_time > i2.start_time
        """), {"v_id": v2_id}).scalar() or 0

        room_clashes = db2.execute(__import__('sqlalchemy').text("""
            SELECT COUNT(*)
            FROM interviews i1
            JOIN interviews i2 
              ON i1.room_id = i2.room_id 
             AND i1.id != i2.id 
             AND i1.day = i2.day
             AND i1.version_id = :v_id
             AND i2.version_id = :v_id
             AND i1.status = 'SCHEDULED' 
             AND i2.status = 'SCHEDULED'
             AND i1.start_time < i2.end_time 
             AND i1.end_time > i2.start_time
        """), {"v_id": v2_id}).scalar() or 0

        panel_clashes = db2.execute(__import__('sqlalchemy').text("""
            SELECT COUNT(*)
            FROM interviews i1
            JOIN interviews i2 
              ON i1.panel_id = i2.panel_id 
             AND i1.id != i2.id 
             AND i1.day = i2.day
             AND i1.version_id = :v_id
             AND i2.version_id = :v_id
             AND i1.status = 'SCHEDULED' 
             AND i2.status = 'SCHEDULED'
             AND i1.start_time < i2.end_time 
             AND i1.end_time > i2.start_time
        """), {"v_id": v2_id}).scalar() or 0

        results["Student Clashes = 0"] = student_clashes == 0
        results["Room Clashes = 0"] = room_clashes == 0
        results["Panel Clashes = 0"] = panel_clashes == 0

        print("\n================ PHASE 6 API & DB E2E VERIFICATION REPORT ================")
        print(f"V1 Metrics Avg Latency     : {avg_lat_v1:.2f} ms")
        print(f"V2 Metrics Avg Latency     : {avg_lat_v2:.2f} ms")
        print(f"Replan Metrics Avg Latency : {avg_lat_replan:.2f} ms")
        print("--------------------------------------------------------------------------")
        for test_name, test_status in results.items():
            print(f"{test_name:<35} : {'PASS' if test_status else 'FAIL'}")
        print("==========================================================================\n")

        return all(results.values())

    finally:
        db2.close()

if __name__ == "__main__":
    success = verify_api_and_db_e2e()
    if not success:
        sys.exit(1)
