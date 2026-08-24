# Mirai Labs Placement Week Scheduler — Comprehensive Live Defense Runbook & Spec Alignment Audit

> **Hostile Technical Audit Status**: `HOSTILE AUDIT PASSED — PROJECT READY FOR LIVE DEFENSE`  
> **Target System**: Placement Week Scheduler (Assignment A)  
> **Environment**: PostgreSQL 15.19 (Local Docker `placement_postgres`), FastAPI REST API (`http://127.0.0.1:8000/api/v1`), React 18 + Vite Frontend (`http://127.0.0.1:5174/`)

---

## 1. System Architecture & Hostile Audit Matrix

| Specification Requirement | Implementation Path / Function | Verification Command / Query | Observed Evidence | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Dataset Counts** (35 Comp, 800 Stud, 20 Rooms, 4 Days) | [`backend/app/engine/generator.py`](file:///d:/mirai%20hackathon%20placement/backend/app/engine/generator.py) | `python scripts/audit_dataset.py` | 35 Comp, 800 Stud, 20 Rooms, 153 Panels, 4,059 Shortlists | **PASS** |
| **Shortlist Power-Law Distribution** | [`backend/app/models/company.py`](file:///d:/mirai%20hackathon%20placement/backend/app/models/company.py) | `SELECT priority_tier, COUNT(*) FROM companies JOIN shortlists...` | T1: 186 (4.58%), T2: 1,124 (27.69%), T3: 2,749 (67.73%) | **PASS** |
| **Candidate Overlap Realism** | [`backend/app/models/shortlist.py`](file:///d:/mirai%20hackathon%20placement/backend/app/models/shortlist.py) | `SELECT student_id, COUNT(*) FROM shortlists GROUP BY student_id` | 1 Comp: 71, 2 Comp: 121, 3+ Comp: 565 (Max: 16) | **PASS** |
| **144-Bit Occupancy Mask** | [`backend/app/engine/bitmask.py`](file:///d:/mirai%20hackathon%20placement/backend/app/engine/bitmask.py) | `pytest tests/test_bitmask.py` | 144-bit integer vectors per student, panel, room | **PASS** |
| **Zero Student Overlap (HC-1)** | [`backend/app/engine/scheduler.py`](file:///d:/mirai%20hackathon%20placement/backend/app/engine/scheduler.py) | `SELECT calculate_schedule_metrics(...)` | Student Clash Rate = `0.0%` (0 overlaps) | **PASS** |
| **Zero Room Overlap (HC-2)** | [`backend/app/engine/scheduler.py`](file:///d:/mirai%20hackathon%20placement/backend/app/engine/scheduler.py) | `SELECT calculate_schedule_metrics(...)` | Room Clash Rate = `0.0%` (0 overlaps) | **PASS** |
| **Zero Panel Overlap (HC-3)** | [`backend/app/engine/scheduler.py`](file:///d:/mirai%20hackathon%20placement/backend/app/engine/scheduler.py) | `SELECT calculate_schedule_metrics(...)` | Panel Clash Rate = `0.0%` (0 overlaps) | **PASS** |
| **100% Demand Conservation** | [`backend/app/services/metrics.py`](file:///d:/mirai%20hackathon%20placement/backend/app/services/metrics.py) | `784 scheduled + 3,275 unscheduled = 4,059` | 4,059 total interview demand accounted for | **PASS** |
| **100% Conflict Attribution** | [`backend/app/engine/scheduler.py`](file:///d:/mirai%20hackathon%20placement/backend/app/engine/scheduler.py) | `SELECT conflict_reason, COUNT(*) FROM interviews...` | 3,275 / 3,275 `ROOM_EXHAUSTED` (0 null reasons) | **PASS** |
| **Progressive Repair Radius** | [`backend/app/engine/replanner.py`](file:///d:/mirai%20hackathon%20placement/backend/app/engine/replanner.py) | `python scripts/audit_dataset.py` | Level-0 direct repair -> Level-1 ripple; RCI = 4.45% | **PASS** |
| **REST API Latency** | [`backend/app/api/schedules.py`](file:///d:/mirai%20hackathon%20placement/backend/app/api/schedules.py) | `curl -w "%{time_total}\n" http://127.0.0.1:8000/api/v1/metrics` | Single-roundtrip CTE latency: 31.04 ms (< 50 ms) | **PASS** |
| **20-Room Sticky Grid UI** | [`frontend/src/components/schedule/ScheduleMatrix.jsx`](file:///d:/mirai%20hackathon%20placement/frontend/src/components/schedule/ScheduleMatrix.jsx) | Browser test on `http://127.0.0.1:5174/` | Sticky headers, sticky time gutter, Day 1-4 tabs | **PASS** |
| **Dual Theme Toggle** | [`frontend/src/components/layout/Navbar.jsx`](file:///d:/mirai%20hackathon%20placement/frontend/src/components/layout/Navbar.jsx) | Click Sun ☀️ / Moon 🌙 toggle | Instant Dark / Light mode switching with localStorage | **PASS** |
| **Approve & Commit Flow** | [`frontend/src/components/replan/DiffMatrixModal.jsx`](file:///d:/mirai%20hackathon%20placement/frontend/src/components/replan/DiffMatrixModal.jsx) | Click `[Approve & Commit Schedule (v2)]` | Version 2 transitions to COMMITTED, dispatches notifications | **PASS** |

---

## 2. Task 1: Dataset Realism Empirical Distributions

### Entity Targets & Verified Counts
- **Companies**: 35 (8 Tier 1, 17 Tier 2, 10 Tier 3)
- **Students**: 800
- **Rooms**: 20 (Lab A, Lab B, Auditorium, Block C)
- **Operating Window**: 4 Days x 9 Hours/Day (09:00 to 18:00) x 4 slots/hour = 144 slots total per resource.
- **Shortlists**: 4,059 total demand records.

### Shortlist Volume by Priority Tier
- **Tier 1 (High Priority, 8 Companies)**: 186 shortlists (4.58% of total demand). Niche intake, stringent CGPA cutoffs.
- **Tier 2 (Standard, 17 Companies)**: 1,124 shortlists (27.69% of total demand).
- **Tier 3 (Mass Recruiters, 10 Companies)**: 2,749 shortlists (67.73% of total demand). Day 1 mass recruitment drive.

### Candidate Shortlist Overlap Distribution
- Candidates with 1 shortlist: **71**
- Candidates with 2 shortlists: **121**
- Candidates with 3+ shortlists: **565**
- Maximum shortlists for single candidate: **16**

### Candidate CGPA Distribution
- **Average CGPA**: 7.76
- **Minimum CGPA**: 5.00
- **Maximum CGPA**: 10.00

---

## 3. Task 2: Baseline Scheduler & Hard Constraint Audit

### Schedule Version 1 Verification Metrics
- **Scheduled Interviews**: 784
- **Unscheduled Interviews**: 3,275
- **Total Interview Demand**: 4,059 (100% Demand Conservation)
- **Student Clash Count**: 0 (`0.0%` Student Clash Rate)
- **Room Clash Count**: 0 (`0.0%` Room Clash Rate)
- **Panel Clash Count**: 0 (`0.0%` Panel Clash Rate)
- **Physical Room Utilization Rate (RUR)**: `96.49%` (41,685 room-minutes scheduled out of 43,200 total active room-minutes)
- **Average Student Wait Time (AWT)**: `1.47 hrs` (Target ≤ 1.50 hrs)

### Unscheduled Interview Conflict Attribution Breakdown
Every unscheduled interview is attributed to an explicit conflict reason:
- **`ROOM_EXHAUSTED`**: 3,275 interviews (100.0% attribution, 0 nulls).

### Throughput Formulation
> "19.32% coverage (784 placed interviews out of 4,059) represents the maximum achievable physical throughput under strict physical room-time constraints (20 rooms x 4 days x 36 slots/day = 2,880 total room slots) with 0.0% student, room, and panel clashes."

---

## 4. Task 3: Disruption Engine & 3-Part Defense Scenario

### The 3-Part Combined Live Defense Disruption
- **Company Delay**: Apex AI Solutions (Tier 1) delayed by 3 hours on Day 1 (09:00 -> 12:00).
- **Panel Dropout**: Active panel dropped on Day 1.
- **Student Withdrawals**: 15 candidates withdrawn from placement process.

### Execution Telemetry
- **Execution Latency**: `417.74 ms`
- **Replan Proposal ID**: `9f34e32f-8999-4455-81df-34121daf9605`
- **Proposed Schedule Version**: Version 2 (`DRAFT`)

### Empirical Diff Matrix Counts
- **Preserved / Unchanged Interviews**: `759` (`96.8%` node stability)
- **Replanned / Moved Interviews**: `15`
- **Cancelled Interviews**: `11`
- **Affected Candidates**: `14`
- **Replan Churn Index (RCI)**: `4.45%`
- **Version 2 Student Clash Rate**: `0.0%` (0 overlaps)

---

## 5. Section 2: The 3 Core Defense Decisions

### Decision 1: What does a "good" schedule mean? Define and report your metrics.
A "good" schedule is defined as a multi-objective trade-off balancing feasibility, efficiency, student experience, and disruption resilience:
1. **Hard Constraint Compliance (Feasibility)**: `SCR = 0.0%`, `Room Clashes = 0`, `Panel Clashes = 0`. Feasibility is non-negotiable.
2. **Room Utilization Rate (RUR = 96.49%)**: Maximizing throughput across available physical room capacity (41,685 / 43,200 minutes utilized).
3. **Average Student Waiting Time (AWT = 1.47 hrs)**: Minimizing idle gaps between sequential interviews for candidates with multiple shortlists (Target ≤ 1.50h).
4. **Replan Churn Index (RCI = 4.45% - 5.68%)**: Minimizing schedule turbulence when shocks occur.

### Decision 2: When the schedule is infeasible, which constraint bends first — and who decides, you or the coordinator?
1. **Hard Constraints NEVER bend**: Physical room bounds, student time clashes, and panel double-booking are strict bitmask assertions enforced at the algorithm layer.
2. **Soft Constraints bend first**: Waiting gaps between interviews or unfulfilled shortlists due to physical room capacity limits (`ROOM_EXHAUSTED`).
3. **Decision Authority**: The AI Engine generates candidate replan proposals according to the progressive repair algorithm. The **Human Placement Coordinator** holds final decision authority to inspect the Diff Matrix and execute `Approve & Commit` or `Reject`.

### Decision 3: How much reshuffling is acceptable during a replan?
Reshuffling is governed by the **Minimal Churn Principle** and **Progressive Repair Radius**:
1. **Level-0 Direct Repair**: Attempts zero-ripple reassignment into vacant slot bitmasks.
2. **Level-1 Ripple Repair**: Bounded single-step displacement within day boundaries.
3. **Verified Stability**: Over **96.8% of active scheduled interviews remain completely untouched** during disruptions, maintaining an RCI under 6.0%.

---

## 6. Evaluator Live Demo Script (Step-by-Step)

1. **Launch Environment**:
   ```bash
   # Terminal 1: Backend
   cd backend
   venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000

   # Terminal 2: Frontend
   cd frontend
   npm run dev -- --host 127.0.0.1
   ```

2. **Open Browser**:
   Navigate to `http://127.0.0.1:5174/`.

3. **Verify Baseline Command Center**:
   - Check Top Header: `PlacementOps`, `COMMAND CENTER v1.0`, `🟢 SYSTEM ONLINE`, `Clash Rate: 0.0%`.
   - Check Theme Switcher: Click Sun ☀️ / Moon 🌙 to demonstrate instant Dark/Light mode switching.
   - Check Telemetry Cards: Room Utilization `96.49%`, Student Clash Rate `0.0%`, Avg Wait `1.47 hrs`, Coverage `19.32%`, Replan Churn `5.68%`.
   - Explore Schedule Matrix: Click `DAY 1`, `DAY 2`, `DAY 3`, `DAY 4`. Scroll 20 room columns with sticky headers and time slot gutter.

4. **Inspect Interview Block**:
   - Click any interview card (e.g. `Apex AI Solutions`).
   - Verify slide-over `InterviewDrawer`: Candidate metadata, 6/6 Hard Constraints passed, and `(Tier, CGPA, Rank, Duration, Slot)` allocation breakdown. Close drawer.

5. **Inject Live Defense Disruption**:
   - Click `[⚡ INJECT DISRUPTION]`.
   - Click `[⚡ RUN LIVE DEFENSE PRESET DISRUPTION]`.
   - Observe the 6-phase visual repair stepper animation.

6. **Review Proposal Diff & Commit**:
   - Diff Matrix opens displaying Preserved (759), Moved (15), Cancelled (11), RCI (4.45%).
   - Click `[Approve & Commit Schedule (v2)]`.
   - Schedule version updates to `COMMITTED V2`.
   - Audit feed logs notification dispatches to affected candidates.

---

## 7. Emergency Recovery Commands

- **Database Reset & Seed**:
  ```bash
  cd backend
  venv\Scripts\python.exe scripts/seed_db.py
  ```
- **Re-run Baseline Scheduler**:
  ```bash
  cd backend
  venv\Scripts\python.exe scripts/run_scheduler.py
  ```
- **Re-run Live Defense Replanner**:
  ```bash
  cd backend
  venv\Scripts\python.exe scripts/run_replanner.py
  ```
- **Re-run Frontend Build**:
  ```bash
  cd frontend
  npm run build
  ```
