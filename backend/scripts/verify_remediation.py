import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models import ScheduleVersion, ReplanProposal

def verify_remediation():
    client = TestClient(app)
    db = SessionLocal()

    try:
        # Fetch Version 2
        v2 = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 2).first()
        if not v2:
            print("ERROR: ScheduleVersion 2 not found in DB.")
            sys.exit(1)

        url = f"/api/v1/schedules/{v2.id}/metrics"

        # Warmup
        res_warmup = client.get(url)
        assert res_warmup.status_code == 200

        # Benchmark 5 consecutive HTTP requests
        latencies = []
        payload = None

        for i in range(5):
            t0 = time.perf_counter()
            resp = client.get(url)
            t1 = time.perf_counter()
            elapsed_ms = (t1 - t0) * 1000.0
            latencies.append(elapsed_ms)
            assert resp.status_code == 200
            payload = resp.json()

        min_lat = min(latencies)
        max_lat = max(latencies)
        avg_lat = sum(latencies) / len(latencies)

        metrics = payload.get("metrics", {})

        print("\n================ PHASE 5 REMEDIATION VERIFICATION ================")
        print(f"Version ID                      : {v2.id}")
        print(f"Version Number                  : {v2.version_number} ({v2.status})")
        print("------------------------------------------------------------------")
        print(f"HTTP Latency (5 runs)           : min={min_lat:.2f}ms | max={max_lat:.2f}ms | avg={avg_lat:.2f}ms")
        print(f"Latency Constraint Passed (<50ms): {max_lat < 50.0}")
        print("------------------------------------------------------------------")
        print(f"Moved Interviews Count          : {metrics.get('moved_interviews_count')} (Expected: 8)")
        print(f"Cancelled Interviews Count      : {metrics.get('cancelled_interviews_count')} (Expected: 23)")
        print(f"Unchanged Interviews Count      : {metrics.get('unchanged_interviews_count')} (Expected: 753)")
        print(f"Affected Students Count         : {metrics.get('affected_students_count')}")
        print(f"Replan Churn Index (RCI)        : {metrics.get('replan_churn_index')}%")
        print("==================================================================\n")

        assert max_lat < 50.0, f"Max latency {max_lat:.2f}ms exceeded 50ms!"
        assert metrics.get("moved_interviews_count") == 8, f"Expected 8 moved, got {metrics.get('moved_interviews_count')}"
        assert metrics.get("cancelled_interviews_count") == 23, f"Expected 23 cancelled, got {metrics.get('cancelled_interviews_count')}"
        assert metrics.get("unchanged_interviews_count") == 753, f"Expected 753 unchanged, got {metrics.get('unchanged_interviews_count')}"

        print("ALL REMEDIATION CHECKS PASSED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == "__main__":
    verify_remediation()
