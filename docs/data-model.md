# Relational Data Model & Schema Specification

> **Document Version:** 1.0.0  
> **Status:** Approved Source of Truth  
> **Target Database:** PostgreSQL 15+

---

The relational schema for **The Placement Week Scheduler** is designed around immutable schedule versioning, high-throughput indexing on time-slot queries, and complete auditability for real-time disruptions.

### Database Environment Architecture
There are NOT two competing database schemas. The application uses a single unified PostgreSQL schema across all environments:
- **Development / Local Testing:** Docker PostgreSQL (or local SQLite/PostgreSQL instance).
- **Production / Cloud Deployment:** Supabase PostgreSQL.
- **Connection Routing:** The backend connects to PostgreSQL via SQLAlchemy using `DATABASE_URL`.
- **Credential Isolation:** `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are **backend-only** environment variables and must NEVER be exposed in frontend React code or public repositories. Supabase REST API keys (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) are optional and strictly decoupled from the core database connection.

```mermaid
erdiagram
    STUDENTS ||--o{ SHORTLISTS : "shortlisted in"
    COMPANIES ||--o{ SHORTLISTS : "creates"
    COMPANIES ||--o{ PANELS : "owns"
    PANELS ||--o{ INTERVIEWS : "conducts"
    ROOMS ||--o{ INTERVIEWS : "hosts"
    STUDENTS ||--o{ INTERVIEWS : "attends"
    COMPANIES ||--o{ INTERVIEWS : "requests"
    
    SCHEDULE_VERSIONS ||--o{ INTERVIEWS : "contains"
    DISRUPTIONS ||--o{ REPLAN_PROPOSALS : "causes"
    SCHEDULE_VERSIONS ||--o{ REPLAN_PROPOSALS : "base for"
    REPLAN_PROPOSALS ||--o{ NOTIFICATIONS : "generates"

    STUDENTS {
        uuid id PK
        string name
        decimal cgpa
        string branch
        string email
        string status
    }

    COMPANIES {
        uuid id PK
        string name
        decimal cgpa_cutoff
        integer priority_tier
        integer panel_count
        integer interview_duration_mins
        integer day_availability_mask
    }

    ROOMS {
        uuid id PK
        string building
        string room_number
        integer capacity
        boolean is_active
    }

    PANELS {
        uuid id PK
        uuid company_id FK
        string panel_name
        boolean is_active
    }

    SHORTLISTS {
        uuid id PK
        uuid company_id FK
        uuid student_id FK
        integer priority_rank
    }

    SCHEDULE_VERSIONS {
        uuid id PK
        integer version_number
        string status
        uuid created_by
        timestamp created_at
    }

    INTERVIEWS {
        uuid id PK
        uuid version_id FK
        uuid shortlist_id FK
        uuid company_id FK
        uuid student_id FK
        uuid panel_id FK
        uuid room_id FK
        integer day
        time start_time
        time end_time
        string status
        string conflict_reason
    }

    DISRUPTIONS {
        uuid id PK
        string disruption_type
        string target_entity_type
        uuid target_entity_id
        jsonb parameters
        timestamp injected_at
    }

    REPLAN_PROPOSALS {
        uuid id PK
        uuid disruption_id FK
        uuid base_version_id FK
        uuid proposed_version_id FK
        jsonb diff_matrix
        jsonb metrics_summary
        string status
    }

    NOTIFICATIONS {
        uuid id PK
        uuid replan_proposal_id FK
        string recipient_type
        uuid recipient_id
        text message
        string channel
        timestamp sent_at
    }
```

---

## 2. Comprehensive Schema Definitions

### 2.1 Table: `students`
Stores student academic credentials and placement status.

| Field | Type | PK/FK | Nullable | Purpose / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PK** | No | Primary Key (`gen_random_uuid()`) |
| `name` | `VARCHAR(100)` | - | No | Full Name |
| `roll_number` | `VARCHAR(20)` | - | No | Unique Institutional ID (`UNIQUE`) |
| `cgpa` | `NUMERIC(4,2)` | - | No | Cumulative Grade Point Average ($0.00 \le \text{cgpa} \le 10.00$) |
| `branch` | `VARCHAR(50)` | - | No | Academic Branch (`CSE`, `ECE`, `MECH`, `CIVIL`, `EEE`) |
| `email` | `VARCHAR(150)`| - | No | Campus Email (`UNIQUE`) |
| `status` | `VARCHAR(20)` | - | No | Student status (`ELIGIBLE`, `PLACED`, `WITHDRAWN`). Default: `ELIGIBLE` |
| `created_at` | `TIMESTAMPTZ` | - | No | Record creation timestamp |

---

### 2.2 Table: `companies`
Stores recruiting company parameters, priority tiers, and slot requirements.

| Field | Type | PK/FK | Nullable | Purpose / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PK** | No | Primary Key |
| `name` | `VARCHAR(100)` | - | No | Corporate Name (`UNIQUE`) |
| `cgpa_cutoff` | `NUMERIC(4,2)` | - | No | Minimum CGPA required ($0.00 \le \text{cutoff} \le 10.00$) |
| `priority_tier` | `INTEGER` | - | No | Placement Priority ($1 = \text{Top Tier/Niche}$, $2 = \text{Product}$, $3 = \text{Mass Recruiter}$) |
| `panel_count` | `INTEGER` | - | No | Total interview panels provided ($1 \le \text{count} \le 10$) |
| `interview_duration_mins` | `INTEGER` | - | No | Interview duration ($30, 45, 60, 90$) |
| `day_availability_mask` | `INTEGER` | - | No | Bitmask of operating days (Bit 0 = Day 1, Bit 3 = Day 4. Default: `15` = All 4 Days) |
| `arrival_delay_mins` | `INTEGER` | - | No | Delay tracking for Day 1. Default: `0` |

---

### 2.3 Table: `rooms`
Stores interview room availability and physical capacity.

| Field | Type | PK/FK | Nullable | Purpose / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PK** | No | Primary Key |
| `building` | `VARCHAR(50)` | - | No | Building Name / Block |
| `room_number` | `VARCHAR(20)` | - | No | Unique Room Identifier (`UNIQUE`) |
| `capacity` | `INTEGER` | - | No | Maximum occupancy. Default: `6` |
| `is_active` | `BOOLEAN` | - | No | Administrative toggle for hardware availability. Default: `TRUE` |

---

### 2.4 Table: `panels`
Stores individual company interview panel units.

| Field | Type | PK/FK | Nullable | Purpose / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PK** | No | Primary Key |
| `company_id` | `UUID` | **FK** | No | References `companies(id)` |
| `panel_name` | `VARCHAR(50)` | - | No | Panel identifier (e.g., `Panel A`, `Panel B`) |
| `is_active` | `BOOLEAN` | - | No | Panel active status. Default: `TRUE` |

---

### 2.5 Table: `shortlists`
Mapping table representing company shortlist selections for eligible students.

| Field | Type | PK/FK | Nullable | Purpose / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PK** | No | Primary Key |
| `company_id` | `UUID` | **FK** | No | References `companies(id)` |
| `student_id` | `UUID` | **FK** | No | References `students(id)` |
| `priority_rank` | `INTEGER` | - | No | Rank of student within company shortlist ($1 = \text{Top Rank}$) |
| `created_at` | `TIMESTAMPTZ` | - | No | Shortlist submission timestamp |

*Constraint:* `UNIQUE(company_id, student_id)`

---

### 2.6 Table: `schedule_versions`
Tracks immutable version snapshots of the global schedule.

| Field | Type | PK/FK | Nullable | Purpose / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PK** | No | Primary Key |
| `version_number` | `INTEGER` | - | No | Monotonically increasing version counter |
| `status` | `VARCHAR(20)` | - | No | Version state (`DRAFT`, `COMMITTED`, `ARCHIVED`, `REJECTED`) |
| `created_by` | `VARCHAR(50)` | - | No | User/System ID |
| `disruption_id` | `UUID` | **FK** | Yes | Optional link to triggering `disruptions(id)` |
| `created_at` | `TIMESTAMPTZ` | - | No | Snapshot timestamp |

---

### 2.7 Table: `interviews`
Core operational table storing scheduled and unscheduled interview appointments.

| Field | Type | PK/FK | Nullable | Purpose / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PK** | No | Primary Key |
| `version_id` | `UUID` | **FK** | No | References `schedule_versions(id)` |
| `shortlist_id` | `UUID` | **FK** | No | References `shortlists(id)` |
| `company_id` | `UUID` | **FK** | No | References `companies(id)` |
| `student_id` | `UUID` | **FK** | No | References `students(id)` |
| `panel_id` | `UUID` | **FK** | Yes | References `panels(id)`. Null if unscheduled |
| `room_id` | `UUID` | **FK** | Yes | References `rooms(id)`. Null if unscheduled |
| `day` | `INTEGER` | - | Yes | Placement Day ($1, 2, 3, 4$). Null if unscheduled |
| `start_time` | `TIME` | - | Yes | Appointment start time. Null if unscheduled |
| `end_time` | `TIME` | - | Yes | Appointment end time. Null if unscheduled |
| `status` | `VARCHAR(20)` | - | No | Interview state (`SCHEDULED`, `UNSCHEDULED`, `MOVED`, `CANCELLED`, `COMPLETED`) |
| `conflict_reason`| `VARCHAR(100)`| - | Yes | Explicit failure reason if status is `UNSCHEDULED` |

---

### 2.8 Table: `disruptions`
Stores incoming real-world disruption events injected by the coordinator.

| Field | Type | PK/FK | Nullable | Purpose / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PK** | No | Primary Key |
| `disruption_type`| `VARCHAR(30)` | - | No | Enum: `COMPANY_DELAY`, `PANEL_DROPOUT`, `STUDENT_WITHDRAWAL`, `ROOM_UNAVAILABLE` |
| `target_entity_type`| `VARCHAR(20)`| - | No | Enum: `COMPANY`, `PANEL`, `STUDENT`, `ROOM` |
| `target_entity_id`| `UUID` | - | No | UUID of the targeted entity |
| `parameters` | `JSONB` | - | No | Disruption payload (e.g. `{"delay_hours": 3}`, `{"start_time": "10:00", "end_time": "14:00"}`) |
| `injected_at` | `TIMESTAMPTZ` | - | No | Timestamp when disruption was registered |

---

### 2.9 Table: `replan_proposals`
Stores generated candidate replans and their computed diff matrices prior to coordinator approval.

| Field | Type | PK/FK | Nullable | Purpose / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PK** | No | Primary Key |
| `disruption_id` | `UUID` | **FK** | No | References `disruptions(id)` |
| `base_version_id`| `UUID` | **FK** | No | References `schedule_versions(id)` (The active schedule being modified) |
| `proposed_version_id`| `UUID`| **FK** | No | References `schedule_versions(id)` (The candidate draft schedule) |
| `diff_matrix` | `JSONB` | - | No | JSON payload detailing added, cancelled, and moved interviews |
| `metrics_summary`| `JSONB` | - | No | Pre vs Post replan metrics comparison |
| `status` | `VARCHAR(20)` | - | No | Proposal state (`PROPOSED`, `APPROVED`, `REJECTED`). Default: `PROPOSED` |
| `created_at` | `TIMESTAMPTZ` | - | No | Proposal generation timestamp |

---

### 2.10 Table: `notifications`
Stores generated notification messages for affected parties post-replan commitment.

| Field | Type | PK/FK | Nullable | Purpose / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PK** | No | Primary Key |
| `replan_proposal_id`| `UUID`| **FK** | No | References `replan_proposals(id)` |
| `recipient_type` | `VARCHAR(20)`| - | No | Enum: `STUDENT`, `COMPANY_RECRUITER`, `ROOM_COORDINATOR` |
| `recipient_id` | `UUID` | - | No | Recipient entity UUID |
| `message` | `TEXT` | - | No | Formatted notification text |
| `channel` | `VARCHAR(20)`| - | No | Dispatch channel (`SMS`, `EMAIL`, `DASHBOARD_PUSH`) |
| `sent_at` | `TIMESTAMPTZ` | - | Yes | Timestamp when notification was dispatched |

---

## 3. High-Performance Indexing Strategy

To ensure sub-second schedule validation and interval collision queries, the database relies on compound and GIST indexes:

```sql
-- 1. Compound Index for Student Interval Collision Queries
CREATE INDEX idx_interviews_student_slot 
ON interviews (version_id, student_id, day, start_time, end_time) 
WHERE status = 'SCHEDULED';

-- 2. Compound Index for Room Interval Collision Queries
CREATE INDEX idx_interviews_room_slot 
ON interviews (version_id, room_id, day, start_time, end_time) 
WHERE status = 'SCHEDULED';

-- 3. Compound Index for Panel Interval Collision Queries
CREATE INDEX idx_interviews_panel_slot 
ON interviews (version_id, panel_id, day, start_time, end_time) 
WHERE status = 'SCHEDULED';

-- 4. Fast Lookup for Shortlist Eligibility
CREATE INDEX idx_shortlists_company_student 
ON shortlists (company_id, student_id);

-- 5. Fast Query for Active Schedule Snapshot
CREATE INDEX idx_interviews_version_lookup 
ON interviews (version_id, status);
```

---

## 4. Schedule Versioning & Historical Audit Model

The system maintains absolute historical fidelity across multiple disruptions using an **Immutable Append-Only Versioning Strategy**:

1. **Initial Creation:** When initial scheduling completes, a row is created in `schedule_versions` with `version_number = 1`, `status = 'COMMITTED'`. All initial 800-student interviews are inserted with `version_id = version_1.id`.
2. **Replan Preview:** When a disruption occurs, the replanning engine creates a draft snapshot `version_number = 2`, `status = 'DRAFT'`. It populates `interviews` for `version_2.id` with the repaired state.
3. **Approval:** If the coordinator clicks **Approve**, `version_1` status changes to `'ARCHIVED'` and `version_2` status changes to `'COMMITTED'`.
4. **Rejection:** If the coordinator clicks **Reject**, `version_2` status changes to `'REJECTED'`. `version_1` remains `'COMMITTED'`. No live schedule records are mutated.
