<div align="center">

# 🎓 Placement Week Scheduler

### Production-Grade Intelligent Scheduling & Real-Time Disruption Replanning Engine

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Vite](https://img.shields.io/badge/Vite-5.1-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**Take-Home Technical Assessment · Mirai Labs / Zutawa Studios · Software Developer Intern**

[Live Demo](#) · [API Docs](http://localhost:8000/docs) · [Architecture](docs/architecture.md) · [Algorithm Deep-Dive](docs/scheduling-algorithm.md)

</div>

---

## 🧠 What Is This?

During campus placement week, an engineering college faces an intense real-world constraint satisfaction problem:

- **35 recruiting companies** with priority tiers, CGPA cutoffs, and variable interview durations (30–90 mins)
- **800 eligible students**, many shortlisted across multiple companies simultaneously
- **20 interview rooms** operating over **4 days** (09:00–18:00)
- **Live disruptions**: companies arriving late, panels dropping out, rooms failing, students withdrawing mid-day

Traditional management uses physical whiteboards and spreadsheets. When disruptions hit — a top recruiter arriving 3 hours late — cascading double-bookings, silent schedule drops, and coordinator panic ensue.

**This system replaces that chaos** with a deterministic constraint engine, automated local-repair replanning, and a real-time coordinator dashboard.

---

## ✨ Key Features

| Feature | Details |
|---|---|
| ⚡ **144-Bit Bitmask Engine** | Sub-nanosecond slot feasibility via bitwise `AND` — 0.32s to schedule 800 students × 35 companies |
| 🔄 **Local-Repair Replanner** | Handles 4 disruption types; freezes unaffected schedule, minimally repairs blast radius |
| 📊 **Version-Controlled Schedules** | Immutable `ScheduleVersion` rows — full audit trail, preview before commit, zero-risk rollback |
| 🎯 **Causal Audit Matrix** | 12-scenario non-vacuous chaos test grid across all Tier × Day combinations — **12/12 PASS** |
| 🖥️ **Coordinator Dashboard** | Real-time Gantt timeline, disruption injector, side-by-side diff preview, one-click commit |
| 🧩 **Hard Constraint Guarantee** | Zero double-bookings, zero silent drops — every conflict logged with explicit diagnostic reason |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                React 18 + Vite Dashboard              │
│   Gantt Timeline · Disruption Injector · Diff Modal   │
└────────────────────┬─────────────────────────────────┘
                     │  REST API (HTTP/JSON)
┌────────────────────▼─────────────────────────────────┐
│              FastAPI Application Server               │
│        Pydantic v2 · SQLAlchemy 2.0 · AsyncPG        │
└──────┬──────────────────────────────────┬────────────┘
       │                                  │
┌──────▼──────────────────┐    ┌──────────▼───────────┐
│   Core Scheduling Engine │    │   PostgreSQL 15 DB    │
│  ┌─────────────────────┐│    │  schedule_versions    │
│  │  144-bit Bitmask    ││    │  interviews           │
│  │  Occupancy Registry ││    │  disruptions          │
│  └─────────────────────┘│    │  replan_proposals     │
│  Priority-Greedy Alloc.  │    │  audit_logs (JSONB)  │
│  Local-Repair Replanner  │    └──────────────────────┘
│  Metrics Engine          │
│  Diff Matrix Generator   │
└──────────────────────────┘
```

> **Full layered diagram with Mermaid → [`docs/architecture.md`](docs/architecture.md)**

---

## ⚙️ The Core Algorithm — 144-Bit Bitmask Engine

This is the technical heart of the system. Standard bipartite matching (Hopcroft-Karp, Hungarian Algorithm) **cannot** model multi-dimensional constraints like:

```
Allocation = (Student × Company × Panel × Room × Day × TimeSlot)
```

Instead, we use a **144-bit occupancy bitmask per resource** (4 days × 36 fifteen-minute slots):

```
Day 1: bits  0–35   (09:00→bit 0 ... 17:45→bit 35)
Day 2: bits 36–71
Day 3: bits 72–107
Day 4: bits 108–143
```

**Feasibility check** is a single bitwise AND across three resource masks:

```
IsFeasible(slot, mask) =
    (B_student & mask) == 0   # student is free
 AND (B_room    & mask) == 0   # room is free
 AND (B_panel   & mask) == 0   # panel is free
```

- **Bitset footprint:** 920 resources × 18 bytes = **16.5 KB total**
- **Full schedule generation:** ~2.5 × 10⁷ bitwise checks = **< 0.32 seconds**
- **Replanning:** **< 100ms** per disruption event

> **Full mathematical specification → [`docs/scheduling-algorithm.md`](docs/scheduling-algorithm.md)**

---

## 🔁 Replanning Engine — 5-Phase Local Repair

When a disruption hits, the replanner executes in 5 strict phases:

```
Phase 1 — Impact Analysis     → Identify directly & cascade-impacted interviews
Phase 2 — Subgraph Freeze     → Lock all unaffected schedule nodes (zero churn guarantee)
Phase 3 — Ripple Repair       → Search open slots for displaced interviews (bitmask-guided)
Phase 4 — Candidate Scoring   → Cost function J(S) ranks repair candidates by churn index
Phase 5 — Diff Matrix Output  → Return Added / Removed / Moved diff for coordinator preview
```

**4 Disruption Types Handled:**

| Type | Trigger | Repair Strategy |
|---|---|---|
| `COMPANY_DELAY` | Recruiter arrives N hours late | Shift all company interviews into post-arrival window |
| `PANEL_DROPOUT` | Panel member unavailable | Reassign to remaining panels or reschedule |
| `STUDENT_WITHDRAWAL` | Student accepts offer mid-day | Release all future slots, cascade cleanup |
| `ROOM_UNAVAILABLE` | Room hardware/infrastructure failure | Migrate interviews to available rooms |

> **Full 13-step replanning lifecycle → [`docs/replanning-algorithm.md`](docs/replanning-algorithm.md)**

---

## 📊 Verification — 12-Scenario Causal Audit Matrix

A non-vacuous chaos test grid runs all **3 tiers × 4 days** + edge cases:

```
Scenario Grid:               T1-D1  T1-D2  T1-D3  T1-D4
                             T2-D1  T2-D2  T2-D3  T2-D4
                             T3-D1  T3-D2  T3-D3  T3-D4

Each scenario PASSES only if ALL are true:
  ✅ Precondition ≥ required interview count threshold
  ✅ Target selected dynamically from fresh V1 DB state (no hardcoding)
  ✅ Causal attribution = 100% (every diff node traced to disruption)
  ✅ Set-partition conservation VERIFIED (Baseline node count preserved)
  ✅ Semantic diff VERIFIED (moved ≠ removed + re-added)
  ✅ Hard constraint clashes = 0
  ✅ Reset restores exact V1 baseline (SHA-256 node hash identical)
  ✅ Post-reset fresh DB refetch VERIFIED

Final Result: 12 / 12 PASS (100% Non-Vacuous)
```

```bash
# Run the full audit yourself:
cd backend
venv\Scripts\python.exe scripts\causal_matrix_audit.py
```

> **Full testing strategy → [`docs/testing-strategy.md`](docs/testing-strategy.md)**

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- PostgreSQL 15+ (or Docker)

### 1. Clone & Backend Setup

```bash
git clone https://github.com/YuvanChaudary/The-Placement-Week-Scheduler.git
cd placement-week-scheduler/backend

python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env → set DATABASE_URL to your PostgreSQL connection string
```

### 2. Database Setup & Seed

```bash
# Run migrations
alembic upgrade head

# Generate realistic dataset & run initial schedule
venv\Scripts\python.exe scripts\seed_db.py
venv\Scripts\python.exe scripts\run_scheduler.py
```

### 3. Start Backend

```bash
venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
# API available at: http://127.0.0.1:8000
# Swagger docs at:  http://127.0.0.1:8000/docs
```

### 4. Start Frontend

```bash
cd ../frontend
npm install
npm run dev
# Dashboard at: http://127.0.0.1:5173
```

### 5. Using Docker (PostgreSQL only)

```bash
cd docker
docker-compose up -d
# PostgreSQL running at localhost:5432
```

---

## 🔌 REST API — Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | System health + DB connectivity |
| `GET` | `/api/v1/schedule` | Active committed schedule |
| `GET` | `/api/v1/metrics` | Room utilization, clash rate, coverage |
| `POST` | `/api/v1/schedule/reset` | Reset to pristine Baseline V1 |
| `POST` | `/api/v1/disruptions` | Inject a live disruption |
| `POST` | `/api/v1/replans/generate` | Generate replan proposal with diff |
| `POST` | `/api/v1/replans/{id}/commit` | Commit approved replan → Version N+1 |

> **Full OpenAPI contract → [`docs/api-contract.md`](docs/api-contract.md)**

---

## 📏 Scheduling Metrics

| Metric | Formula | Target |
|---|---|---|
| **Room Utilization Rate (RUR)** | Scheduled slots / Total available room-slots | Maximize |
| **Student Clash Rate (SCR)** | Students with ≥1 conflict / Total students | Minimize → 0 |
| **Average Waiting Time (AWT)** | Avg idle time between consecutive interviews | Minimize |
| **Replan Churn Index (RCI)** | Interviews moved / Total scheduled | Minimize |
| **Schedule Coverage** | Scheduled interviews / Total shortlist pairs | Maximize |

> **Full mathematical definitions → [`docs/metrics.md`](docs/metrics.md)**

---

## 🗂️ Documentation Index

| Document | Purpose |
|---|---|
| [`docs/requirements.md`](docs/requirements.md) | Hard/soft constraints, acceptance criteria, disruption specs |
| [`docs/architecture.md`](docs/architecture.md) | Layered component architecture, ADRs, data flow diagrams |
| [`docs/data-model.md`](docs/data-model.md) | ER diagrams, PostgreSQL schemas, index strategies |
| [`docs/scheduling-algorithm.md`](docs/scheduling-algorithm.md) | 144-bit bitmask engine, pseudocode, complexity analysis |
| [`docs/replanning-algorithm.md`](docs/replanning-algorithm.md) | 13-step repair lifecycle, 4 disruption handlers, cost function |
| [`docs/metrics.md`](docs/metrics.md) | Metric formulas, numerators, denominators, edge cases |
| [`docs/api-contract.md`](docs/api-contract.md) | Full REST OpenAPI contract, JSON payloads, error schemas |
| [`docs/dashboard.md`](docs/dashboard.md) | UI component hierarchy, Gantt rules, diff preview wireframes |
| [`docs/testing-strategy.md`](docs/testing-strategy.md) | Unit tests, chaos audit, constraint verification benchmarks |

---

## 🛠️ Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) 0.110+ — async REST framework
- [SQLAlchemy](https://www.sqlalchemy.org/) 2.0 + AsyncPG — async ORM
- [Alembic](https://alembic.sqlalchemy.org/) — database migrations
- [Pydantic](https://docs.pydantic.dev/) v2 — runtime data validation
- [bitarray](https://github.com/ilanschnell/bitarray) — high-performance bitmask operations

**Frontend**
- [React](https://react.dev/) 18.2 + [Vite](https://vitejs.dev/) 5.1 — modern SPA framework
- [TailwindCSS](https://tailwindcss.com/) — utility-first styling
- [Framer Motion](https://www.framer.com/motion/) — animations & transitions
- [Lucide React](https://lucide.dev/) — icon library
- [Axios](https://axios-http.com/) — HTTP client

**Infrastructure**
- [PostgreSQL](https://www.postgresql.org/) 15 — relational persistence
- [Docker Compose](https://docs.docker.com/compose/) — local database container

---

## 📁 Project Structure

```
placement-week-scheduler/
├── backend/
│   ├── app/
│   │   ├── api/          # REST route handlers
│   │   ├── engine/       # Scheduling & replanning algorithms ← core
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Dataset generator, business logic
│   │   └── core/         # Config, database session
│   ├── scripts/
│   │   ├── seed_db.py              # Database seeding
│   │   ├── run_scheduler.py        # Initial schedule generation
│   │   ├── causal_matrix_audit.py  # 12-scenario chaos test grid
│   │   └── live_e2e_http_verification.py  # Full API + DB E2E checks
│   ├── alembic/          # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/          # Axios API client
│   │   ├── components/   # React UI components
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
├── docker/
│   └── docker-compose.yml
└── docs/                 # 11 detailed design documents
```

---

## ✅ Status

- [x] Realistic dataset generator (35 companies, 800 students, 20 rooms)
- [x] 144-bit bitmask constraint engine — zero double-bookings guaranteed
- [x] Priority-greedy initial scheduler with explicit conflict diagnostics
- [x] Local-repair replanning engine — 4 disruption types
- [x] Immutable schedule versioning with full audit trail
- [x] Metrics engine (RUR, SCR, AWT, RCI, Coverage)
- [x] Complete REST API with OpenAPI docs
- [x] React coordinator dashboard — Gantt, diff modal, disruption injector
- [x] 12-scenario non-vacuous causal audit matrix — **12/12 PASS**
- [x] Live E2E HTTP verification suite

---

<div align="center">

Built with precision for **Mirai Labs / Zutawa Studios** — Software Developer Intern Assessment

</div>
