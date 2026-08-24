# System Operational Metrics Specification

> **Document Version:** 1.0.0  
> **Status:** Approved Source of Truth  
> **Module:** Analytics & Performance Engine

---

## 1. Overview & Operational Goals

Evaluating schedule quality and replanning efficiency requires rigorous, mathematically unambiguous metrics. In campus placement operations, a schedule must balance **high resource efficiency** with **low operational stress** for students and placement coordinators.

This document defines the 10 core operational metrics monitored by **The Placement Week Scheduler**.

---

## 2. Core Metrics Summary Table

| Metric Name | Symbol | Desired Direction | Target Threshold | Primary Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Room Utilization Rate** | $\text{RUR}$ | **Maximize ($\uparrow$)** | $\ge 75.0\%$ | Measures physical room capacity efficiency |
| **Student Clash Rate** | $\text{SCR}$ | **Zero ($0.0\%$)** | **Must be $0.0\%$** | Audits hard constraint violations |
| **Average Student Waiting Time** | $\text{AWT}$ | **Minimize ($\downarrow$)** | $\le 1.2 \text{ hours}$ | Measures student schedule convenience |
| **Replan Churn Index** | $\text{RCI}$ | **Minimize ($\downarrow$)** | $\le 15.0\%$ | Quantifies schedule disruption volatility |
| **Schedule Coverage** | $\text{SC}$ | **Maximize ($\uparrow$)** | $\ge 85.0\%$ | Percentage of total requested interviews scheduled |
| **Scheduled Interviews Count** | $N_{\text{sched}}$ | **Maximize ($\uparrow$)** | Max feasible | Absolute volume of completed bookings |
| **Unscheduled Interviews Count** | $N_{\text{unsched}}$ | **Minimize ($\downarrow$)** | Min possible | Count of unassigned interview requests |
| **Affected Students Count** | $N_{\text{affected\_students}}$ | **Minimize ($\downarrow$)** | Min possible | Number of students whose schedules changed |
| **Unchanged Interviews Count** | $N_{\text{unchanged}}$ | **Maximize ($\uparrow$)** | Maximize | Count of frozen, undisturbed interviews |
| **Moved Interviews Count** | $N_{\text{moved}}$ | **Minimize ($\downarrow$)** | Min possible | Count of relocated appointments |

---

## 3. Mathematical Definitions & Formulas

### 3.1 Room Utilization Rate ($\text{RUR}$)
- **Operational Meaning:** The percentage of available interview room operating hours that are actively hosting interviews.
- **Formula:**
  $$\text{RUR} = \left( \frac{\sum_{i \in \mathcal{I}_{\text{sched}}} \text{Duration}(i)}{\sum_{r \in \mathcal{R}} \text{ActiveOperatingMinutes}(r)} \right) \times 100\%$$
- **Denominator Breakdown:**
  - Total Available Room Minutes = 20 Rooms $\times$ 4 Days $\times$ 9 Hours/Day $\times$ 60 Mins/Hour = **43,200 total room-minutes**.
  - If a room $r$ is flagged inactive for $H$ hours due to disruption, its active operating minutes decrease accordingly.
- **Desired Direction:** Maximize ($\uparrow$).
- **Edge Cases:** If all rooms are disabled, $\text{Denominator} = 0 \implies \text{RUR} = 0.0\%$.

---

### 3.2 Student Clash Rate ($\text{SCR}$)
- **Operational Meaning:** The percentage of scheduled interviews that overlap in time for the same student. Serves as a **Hard Constraint Audit Metric**.
- **Formula:**
  $$\text{SCR} = \left( \frac{\sum_{s \in \mathcal{S}} \text{CountOverlappingInterviews}(s)}{N_{\text{sched}}} \right) \times 100\%$$
- **Desired Direction:** Strictly $0.0\%$. Any value $> 0.0\%$ indicates a critical engine bug.
- **Edge Cases:** If $N_{\text{sched}} = 0 \implies \text{SCR} = 0.0\%$.

---

### 3.3 Average Student Waiting Time ($\text{AWT}$)
- **Operational Meaning:** The average idle gap time a student spends waiting on campus between consecutive interviews on the same day.
- **Formula:**
  $$\text{AWT} = \frac{1}{|\mathcal{S}_{\text{multi}}|} \sum_{s \in \mathcal{S}_{\text{multi}}} \sum_{d=1}^{4} \left( \sum_{k=1}^{M_{s,d}-1} \max\left(0, \text{Start}(i_{k+1}) - \text{End}(i_k)\right) \right)$$
- **Definitions:**
  - $\mathcal{S}_{\text{multi}}$: Set of students with $\ge 2$ interviews on the same day.
  - $M_{s,d}$: Total interviews for student $s$ on day $d$, ordered chronologically $i_1, i_2 \dots i_M$.
- **Desired Direction:** Minimize ($\downarrow$).
- **Edge Cases:** Students with only 1 interview per day contribute $0$ wait time.

---

### 3.4 Replan Churn Index ($\text{RCI}$)
- **Operational Meaning:** Measures the relative volatility introduced into a pre-existing schedule during a real-time replan.
- **Formula:**
  $$\text{RCI} = \left( \frac{w_m N_{\text{moved}} + w_r N_{\text{room\_changed}} + w_p N_{\text{panel\_changed}} + w_c N_{\text{cancelled\_unforced}}}{N_{\text{sched\_base}}} \right) \times 100\%$$
- **Definitions:**
  - $N_{\text{moved}}$: Interviews shifted to a new time slot or day.
  - $N_{\text{room\_changed}}$: Interviews kept in same time slot but moved to a new room.
  - $N_{\text{panel\_changed}}$: Interviews kept in same time slot but reassigned panel.
  - $N_{\text{sched\_base}}$: Total interviews scheduled in the base schedule prior to disruption.
  - Weights: $w_m = 1.0, w_r = 0.2, w_p = 0.1, w_c = 1.5$.
- **Desired Direction:** Minimize ($\downarrow$). Internal Operational Target $\le 15.0\%$.

> [!IMPORTANT]
> **Operational Target vs Assignment Requirement:** The $\le 15.0\%$ churn target is an **internal engineering performance objective** selected by the project team to evaluate schedule stability. It is **NOT** imposed by the assignment, **NOT** a hard scheduling constraint, and **NOT** a mathematical feasibility condition. A candidate replan with $\text{RCI} > 15.0\%$ remains fully valid and actionable. If churn exceeds $15.0\%$, the system reports the value, explains the cause, lists the affected interviews and repair cost, and allows the coordinator to evaluate and decide whether to commit.

---

### 3.5 Schedule Coverage ($\text{SC}$)
- **Operational Meaning:** The proportion of total requested student-company shortlist candidate pairs that were successfully assigned a slot.
- **Formula:**
  $$\text{SC} = \left( \frac{N_{\text{sched}}}{N_{\text{total\_eligible\_shortlists}}} \right) \times 100\%$$
- **Desired Direction:** Maximize ($\uparrow$). Target $\ge 85.0\%$.

---

### 3.6 Scheduled vs. Unscheduled Counts
- **Formula:**
  $$N_{\text{total\_shortlists}} = N_{\text{sched}} + N_{\text{unsched}}$$
- **Meaning:** Ensures absolute conservation of interview demand. Every shortlist pairing must be accounted for as either `SCHEDULED` or `UNSCHEDULED`.

---

### 3.7 Affected Students Count ($N_{\text{affected\_students}}$)
- **Formula:**
  $$N_{\text{affected\_students}} = \left| \{ s \in \mathcal{S} \mid \exists i \in \mathcal{I}(s), \text{Status}(i) \in \{\text{MOVED}, \text{CANCELLED}\} \} \right|$$
- **Meaning:** Count of unique individual students who require updated notification alerts post-replan.

---

### 3.8 Unchanged vs. Moved Counts
- **Formula:**
  $$N_{\text{sched\_new}} = N_{\text{unchanged}} + N_{\text{moved}} + N_{\text{newly\_added}}$$
- **Meaning:** Verifies that local repair froze the unaffected schedule subgraph ($N_{\text{unchanged}} \gg N_{\text{moved}}$).

---

## 4. Pre vs. Post Replan Comparison Summary Payload

When a replan proposal is generated, the backend delivers a JSON metrics diff comparison:

```json
{
  "replan_proposal_id": "8f3b2a1c-9d4e-4f8a-b2c1-3e5f7a9b0c2d",
  "metrics": {
    "base_schedule": {
      "room_utilization_rate": 78.4,
      "student_clash_rate": 0.0,
      "avg_waiting_time_hours": 0.85,
      "schedule_coverage": 89.2,
      "scheduled_count": 2854,
      "unscheduled_count": 346
    },
    "proposed_replan": {
      "room_utilization_rate": 77.1,
      "student_clash_rate": 0.0,
      "avg_waiting_time_hours": 0.92,
      "schedule_coverage": 88.5,
      "scheduled_count": 2832,
      "unscheduled_count": 368
    },
    "churn_analysis": {
      "replan_churn_index": 4.2,
      "affected_students_count": 28,
      "unchanged_interviews_count": 2802,
      "moved_interviews_count": 30,
      "cancelled_interviews_count": 22
    }
  }
}
```
