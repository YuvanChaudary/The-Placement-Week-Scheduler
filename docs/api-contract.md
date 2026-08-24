# REST API Specification & OpenAPI Contract

> **Document Version:** 1.0.0  
> **Status:** Approved Source of Truth  
> **Protocol:** HTTP / JSON REST APIs  
> **Base Path:** `/api/v1`

---

## 1. Overview & RFC 7807 Standard Error Protocol

All API responses follow consistent JSON formats. Errors utilize the **RFC 7807 Problem Details** standard specification:

```json
{
  "type": "https://api.placement.college.edu/errors/RESOURCE_CONFLICT",
  "title": "Constraint Violation Error",
  "status": 409,
  "detail": "Student INT-802 is already booked in Room 04 from 10:00 to 11:00 on Day 1.",
  "instance": "/api/v1/schedule/generate",
  "code": "STUDENT_DOUBLE_BOOKING"
}
```

---

## 2. API Endpoints Specification

### 2.1 Entities & Master Data APIs

#### `GET /api/v1/companies`
- **Purpose:** Retrieve recruiting companies, CGPA cutoffs, tiers, and panel details.
- **Query Params:** `tier` (optional), `min_cgpa` (optional).
- **Response `200 OK`:**
  ```json
  {
    "count": 35,
    "companies": [
      {
        "id": "c1a2b3c4-0000-0000-0000-000000000001",
        "name": "TechCorp Global",
        "cgpa_cutoff": 8.0,
        "priority_tier": 1,
        "panel_count": 4,
        "interview_duration_mins": 45,
        "day_availability_mask": 15
      }
    ]
  }
  ```

---

#### `GET /api/v1/students`
- **Purpose:** List eligible engineering students and CGPA profiles.
- **Query Params:** `branch` (optional), `status` (optional), `page` (default: 1), `limit` (default: 50).
- **Response `200 OK`:**
  ```json
  {
    "total": 800,
    "page": 1,
    "students": [
      {
        "id": "s9f8e7d6-0000-0000-0000-000000000800",
        "name": "Aarav Sharma",
        "roll_number": "2022CSE0142",
        "cgpa": 9.42,
        "branch": "CSE",
        "status": "ELIGIBLE"
      }
    ]
  }
  ```

---

#### `GET /api/v1/rooms`
- **Purpose:** Fetch list of 20 interview rooms and physical status.
- **Response `200 OK`:**
  ```json
  {
    "rooms": [
      {
        "id": "r1000000-0000-0000-0000-000000000001",
        "building": "Main Academic Block",
        "room_number": "Lab 101",
        "capacity": 6,
        "is_active": true
      }
    ]
  }
  ```

---

### 2.2 Initial Scheduling APIs

#### `POST /api/v1/schedule/generate`
- **Purpose:** Executes the deterministic priority-greedy scheduling algorithm to produce a feasible initial schedule.
- **Request Body:**
  ```json
  {
    "seed_random_data": false,
    "enforce_cgpa_strict": true
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "schedule_version_id": "v1000000-0000-0000-0000-000000000001",
    "version_number": 1,
    "status": "COMMITTED",
    "scheduled_interviews_count": 2854,
    "unscheduled_interviews_count": 346,
    "execution_time_ms": 342.5,
    "metrics": {
      "room_utilization_rate": 78.4,
      "student_clash_rate": 0.0,
      "avg_waiting_time_hours": 0.85
    }
  }
  ```
- **Errors:** `400 Bad Request` (Invalid payload), `500 Internal Server Error`.

---

#### `GET /api/v1/schedule`
- **Purpose:** Fetch active committed schedule or filter by day, room, student, or company.
- **Query Params:** `version_id` (optional), `day` (1-4), `room_id` (optional), `student_id` (optional), `company_id` (optional).
- **Response `200 OK`:**
  ```json
  {
    "version_id": "v1000000-0000-0000-0000-000000000001",
    "interviews": [
      {
        "id": "i5500000-0000-0000-0000-000000000101",
        "company_name": "TechCorp Global",
        "student_name": "Aarav Sharma",
        "panel_name": "Panel A",
        "room_number": "Lab 101",
        "day": 1,
        "start_time": "09:00:00",
        "end_time": "09:45:00",
        "status": "SCHEDULED"
      }
    ]
  }
  ```

---

### 2.3 Real-Time Disruption & Replanning APIs

#### `POST /api/v1/disruptions`
- **Purpose:** Inject a real-world placement disruption event.
- **Request Body:**
  ```json
  {
    "disruption_type": "COMPANY_DELAY",
    "target_entity_type": "COMPANY",
    "target_entity_id": "c1a2b3c4-0000-0000-0000-000000000001",
    "parameters": {
      "day": 1,
      "delay_hours": 3
    }
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "disruption_id": "d7700000-0000-0000-0000-000000000001",
    "disruption_type": "COMPANY_DELAY",
    "status": "REGISTERED",
    "injected_at": "2026-08-28T09:00:00Z"
  }
  ```

---

#### `POST /api/v1/replan/preview`
- **Purpose:** Execute local repair algorithm to generate a candidate replan proposal without mutating live schedule.
- **Request Body:**
  ```json
  {
    "disruption_id": "d7700000-0000-0000-0000-000000000001",
    "max_ripple_depth": 2
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "replan_proposal_id": "prop9900-0000-0000-0000-000000000001",
    "disruption_id": "d7700000-0000-0000-0000-000000000001",
    "status": "PROPOSED",
    "churn_summary": {
      "replan_churn_index": 4.2,
      "affected_students_count": 24,
      "unchanged_interviews_count": 2830,
      "moved_interviews_count": 24,
      "cancelled_interviews_count": 0
    },
    "diff_matrix": [
      {
        "interview_id": "i5500000-0000-0000-0000-000000000101",
        "student_name": "Aarav Sharma",
        "company_name": "TechCorp Global",
        "change_type": "MOVED",
        "old_slot": "Day 1, 09:00",
        "new_slot": "Day 1, 12:00",
        "old_room": "Lab 101",
        "new_room": "Lab 101"
      }
    ]
  }
  ```

---

#### `POST /api/v1/replan/{proposal_id}/approve`
- **Purpose:** Coordinator approves proposed replan. Promotes draft version to active live schedule and dispatches notifications.
- **Response `200 OK`:**
  ```json
  {
    "proposal_id": "prop9900-0000-0000-0000-000000000001",
    "status": "APPROVED",
    "new_active_version_number": 2,
    "notifications_dispatched": 24
  }
  ```

---

#### `POST /api/v1/replan/{proposal_id}/reject`
- **Purpose:** Coordinator rejects proposed replan. Discards draft version; live schedule remains unchanged.
- **Response `200 OK`:**
  ```json
  {
    "proposal_id": "prop9900-0000-0000-0000-000000000001",
    "status": "REJECTED",
    "active_version_number": 1
  }
  ```

---

### 2.4 Metrics & Notification APIs

#### `GET /api/v1/metrics`
- **Purpose:** Fetch operational metrics for active schedule version.
- **Response `200 OK`:**
  ```json
  {
    "active_version_number": 1,
    "metrics": {
      "room_utilization_rate": 78.4,
      "student_clash_rate": 0.0,
      "avg_waiting_time_hours": 0.85,
      "replan_churn_index": 0.0,
      "schedule_coverage": 89.2,
      "scheduled_count": 2854,
      "unscheduled_count": 346
    }
  }
  ```

---

#### `GET /api/v1/notifications`
- **Purpose:** List dispatched notifications post-replan commitment.
- **Query Params:** `recipient_type` (optional), `recipient_id` (optional).
- **Response `200 OK`:**
  ```json
  {
    "count": 24,
    "notifications": [
      {
        "id": "n1100000-0000-0000-0000-000000000001",
        "recipient_type": "STUDENT",
        "recipient_name": "Aarav Sharma",
        "message": "UPDATED: Your TechCorp interview on Day 1 has been rescheduled to 12:00 in Lab 101.",
        "channel": "SMS",
        "sent_at": "2026-08-28T09:05:00Z"
      }
    ]
  }
  ```
