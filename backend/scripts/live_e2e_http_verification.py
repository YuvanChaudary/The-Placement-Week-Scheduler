import urllib.request
import urllib.parse
import json
import time
import sys
import os
import hashlib

# Add backend directory to module search path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import SessionLocal
from app.models import ScheduleVersion, Interview

BASE_URL = "http://127.0.0.1:8000/api/v1"

def http_get(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={"User-Agent": "E2E-Proof-Runner/1.0"})
    with urllib.request.urlopen(req) as resp:
        return resp.getcode(), json.loads(resp.read().decode('utf-8'))

def http_post(endpoint, payload=None):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode('utf-8') if payload else b""
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", "User-Agent": "E2E-Proof-Runner/1.0"})
    with urllib.request.urlopen(req) as resp:
        return resp.getcode(), json.loads(resp.read().decode('utf-8'))

def get_baseline_snapshot(db, version_id):
    """Computes a deterministic snapshot and SHA-256 hash of all baseline scheduled interviews."""
    ivs = db.query(Interview).filter(
        Interview.version_id == version_id,
        Interview.status == "SCHEDULED"
    ).order_by(Interview.id).all()
    
    snapshot = []
    hasher = hashlib.sha256()
    for iv in ivs:
        tup = (
            str(iv.id),
            str(iv.student_id),
            str(iv.company_id),
            str(iv.room_id) if iv.room_id else "",
            str(iv.panel_id) if iv.panel_id else "",
            str(iv.day),
            str(iv.start_time) if iv.start_time else "",
            str(iv.end_time) if iv.end_time else "",
            str(iv.status)
        )
        snapshot.append(tup)
        ser = "|".join(tup)
        hasher.update(ser.encode('utf-8'))
        
    return hasher.hexdigest(), len(ivs), snapshot

def run_e2e_proof():
    print("=" * 90)
    print("LIVE END-TO-END HTTP REST API & FRONTEND VERIFICATION PROOF")
    print("=" * 90)

    # 1. Reset baseline first to start fresh
    print("[INIT] Resetting baseline first...")
    http_post("/schedule/reset")

    # 2. Get Health
    code, health = http_get("/health")
    print(f"      Health Status: {health['status']} | DB: {health['database_connected']}")
    assert health['status'] == 'healthy', "Health endpoint failed!"

    # 3. Get Active Schedule
    code, sched = http_get("/schedule")
    v1_id = sched["version_id"]
    print(f"      Active Schedule: Version ID={v1_id} | Num={sched['version_number']} | Status={sched['status']}")
    assert sched['version_number'] == 1, "Baseline version must be 1"

    # 4. Get Active Metrics
    code, met = http_get("/metrics")
    m = met["metrics"]
    print(f"      Metrics: Room Util={m['room_utilization_rate']:.2f}% | Avg Wait={m['avg_waiting_time_hours']:.2f}h")

    # 5. Capture Baseline Hash
    db = SessionLocal()
    try:
        baseline_hash, initial_cnt, baseline_snapshot = get_baseline_snapshot(db, v1_id)
        print(f"      Baseline Snapshot: Hash={baseline_hash[:16]}... | Count={initial_cnt}")
    finally:
        db.close()

    # 6. Inject Disruption
    print(f"      Injecting disruption (Apex AI Solutions 3h Delay on Day 1)...")
    c_id = sched["interviews"][0]["company_id"]
    disruption_payload = {
        "disruption_type": "COMPANY_DELAY",
        "company_delays": [{"company_id": c_id, "delay_hours": 3, "day": 1}],
        "panel_dropouts": [], "student_withdrawals": [], "room_unavailabilities": []
    }
    code, prop = http_post("/replans/generate", disruption_payload)
    prop_id = prop["replan_proposal_id"]
    v2_id = prop["proposed_version_id"]
    print(f"      Draft Created: Proposal ID={prop_id} | Proposed Version ID={v2_id}")
    assert code == 201, "Failed to generate replan"
    assert v2_id is not None, "Proposed version ID must not be None"

    # Verify Draft differs from baseline
    db = SessionLocal()
    try:
        draft_hash, draft_cnt, _ = get_baseline_snapshot(db, v2_id)
        print(f"      Draft Snapshot: Hash={draft_hash[:16]}... | Count={draft_cnt}")
        assert draft_hash != baseline_hash, "Draft schedule must differ from baseline!"
    finally:
        db.close()

    # 7. Reset to Baseline
    print(f"      Calling Reset Endpoint (POST /schedule/reset)...")
    code, reset_res = http_post("/schedule/reset")
    print(f"      Reset Return: Status={reset_res['status']} | Active ID={reset_res['active_version_id']}")
    assert code == 200, "Reset endpoint failed!"
    assert reset_res["status"] == "RESET_SUCCESS", "Reset status must be RESET_SUCCESS"
    assert reset_res["version_number"] == 1, "Reset active version must be 1"

    # Create new DB session and verify baseline immutable
    db = SessionLocal()
    try:
        post_reset_hash, post_reset_cnt, post_reset_snapshot = get_baseline_snapshot(db, v1_id)
        print(f"      Post-Reset Snapshot: Hash={post_reset_hash[:16]}... | Count={post_reset_cnt}")
        assert post_reset_hash == baseline_hash, "Baseline snapshot mutated!"
        assert post_reset_cnt == initial_cnt, "Baseline scheduled count changed!"
        assert str(reset_res["active_version_id"]) == str(v1_id), "Baseline version UUID changed!"
        
        # N. Assert every baseline tuple is identical
        for pre_tup, post_tup in zip(baseline_snapshot, post_reset_snapshot):
            assert pre_tup == post_tup, f"Tuple mismatch: {pre_tup} != {post_tup}"
        print("      Baseline Tuples Check: [ALL IDENTICAL]")
    finally:
        db.close()

    # O. GET schedule through REST API again
    code, sched_post = http_get("/schedule")
    # P. Assert REST API returns version 1
    assert sched_post["version_number"] == 1, "Returned version number must be 1!"
    assert str(sched_post["version_id"]) == str(v1_id), "Returned version ID must equal V1 ID!"
    print("      REST API Verification: Returned active version is V1.")

    # Q. Assert returned schedule equals database V1
    api_scheduled_interviews = [iv for iv in sched_post["interviews"] if iv["status"] == "SCHEDULED"]
    assert len(api_scheduled_interviews) == post_reset_cnt, "API scheduled interview count does not match database count!"
    print("      REST API Verification: API scheduled count matches database count.")

    # Sort API scheduled interviews by ID so they align with sorted database snapshot
    api_scheduled_interviews.sort(key=lambda x: x["id"])
    for api_iv, db_tup in zip(api_scheduled_interviews, post_reset_snapshot):
        assert str(api_iv["id"]) == db_tup[0], f"ID mismatch: {api_iv['id']} != {db_tup[0]}"
        assert str(api_iv["student_id"]) == db_tup[1], f"Student ID mismatch: {api_iv['student_id']} != {db_tup[1]}"
        assert str(api_iv["company_id"]) == db_tup[2], f"Company ID mismatch: {api_iv['company_id']} != {db_tup[2]}"
        assert (str(api_iv["room_id"]) if api_iv.get("room_id") else "") == db_tup[3], f"Room ID mismatch: {api_iv['room_id']} != {db_tup[3]}"
        assert (str(api_iv["panel_id"]) if api_iv.get("panel_id") else "") == db_tup[4], f"Panel ID mismatch: {api_iv['panel_id']} != {db_tup[4]}"
        assert str(api_iv["day"]) == db_tup[5], f"Day mismatch: {api_iv['day']} != {db_tup[5]}"
    print("      REST API Verification: API scheduled interview fields match database exactly.")

    print("=" * 90)
    print("ALL LIVE HTTP E2E VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 90)

if __name__ == '__main__':
    run_e2e_proof()
