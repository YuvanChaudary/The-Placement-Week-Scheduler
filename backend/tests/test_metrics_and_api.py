import time
import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models import ScheduleVersion, ReplanProposal
from app.services.metrics import calculate_schedule_metrics, calculate_replan_metrics

client = TestClient(app)

def test_metrics_service_calculations():
    db = SessionLocal()
    try:
        v1 = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 1).first()
        v2 = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 2).order_by(ScheduleVersion.created_at.desc()).first()
        proposal = db.query(ReplanProposal).first()

        assert v1 is not None, "ScheduleVersion 1 should exist in DB"
        assert v2 is not None, "ScheduleVersion 2 should exist in DB"
        assert proposal is not None, "ReplanProposal should exist in DB"

        m1 = calculate_schedule_metrics(db, v1.id)
        assert m1["metrics"]["student_clash_rate"] == 0.0
        assert m1["metrics"]["room_utilization_rate"] > 0.0
        assert m1["metrics"]["scheduled_count"] > 0

        m_replan = calculate_replan_metrics(db, proposal.id)
        assert "base_schedule" in m_replan["metrics"]
        assert "proposed_replan" in m_replan["metrics"]
        assert "churn_analysis" in m_replan["metrics"]
        assert m_replan["metrics"]["churn_analysis"]["replan_churn_index"] >= 0.0

    finally:
        db.close()

def test_api_schedule_metrics_latency():
    db = SessionLocal()
    v1_id = None
    try:
        v1 = db.query(ScheduleVersion).filter(ScheduleVersion.version_number == 1).first()
        assert v1 is not None
        v1_id = v1.id
    finally:
        db.close()

    url = f"{settings.API_V1_STR}/schedules/{v1_id}/metrics"

    client.get(url)

    latencies = []
    for _ in range(5):
        start = time.perf_counter()
        response = client.get(url)
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        latencies.append(elapsed_ms)
        assert response.status_code == 200

    avg_latency = sum(latencies) / len(latencies)
    print(f"\nAverage HTTP Latency for GET /schedules/{{id}}/metrics: {avg_latency:.2f} ms")
    assert avg_latency < 50.0, f"HTTP Latency {avg_latency:.2f} ms exceeded 50 ms threshold"

def test_api_replan_metrics_latency():
    db = SessionLocal()
    proposal_id = None
    try:
        proposal = db.query(ReplanProposal).first()
        assert proposal is not None
        proposal_id = proposal.id
    finally:
        db.close()

    url = f"{settings.API_V1_STR}/replans/{proposal_id}/metrics"

    client.get(url)

    latencies = []
    for _ in range(5):
        start = time.perf_counter()
        response = client.get(url)
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        latencies.append(elapsed_ms)
        assert response.status_code == 200

    avg_latency = sum(latencies) / len(latencies)
    print(f"\nAverage HTTP Latency for GET /replans/{{id}}/metrics: {avg_latency:.2f} ms")
    assert avg_latency < 50.0, f"HTTP Latency {avg_latency:.2f} ms exceeded 50 ms threshold"
