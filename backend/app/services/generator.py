import random
import uuid
from typing import List, Dict, Any, Tuple
from decimal import Decimal
from datetime import datetime, timezone

class DatasetGenerator:
    """
    Deterministic dataset generator for Placement Week Scheduler.
    Generates 800 students, 35 companies, 20 rooms, panels, and realistic shortlists.
    """

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = random.Random(seed)

    def generate_students(self, count: int = 800) -> List[Dict[str, Any]]:
        branches = ["CSE", "ECE", "MECH", "CIVIL", "EEE"]
        students = []

        for i in range(1, count + 1):
            # Normal distribution: mu=7.8, sigma=1.1, clipped between 5.0 and 10.0
            cgpa_raw = self.rng.gauss(7.8, 1.1)
            cgpa_val = round(max(5.00, min(10.00, cgpa_raw)), 2)

            branch = self.rng.choice(branches)
            roll_number = f"2026-ROLL-{i:04d}"
            name = f"Student {i}"
            email = f"student_{i}@campus.edu"

            students.append({
                "id": uuid.uuid4(),
                "name": name,
                "roll_number": roll_number,
                "cgpa": Decimal(str(cgpa_val)),
                "branch": branch,
                "email": email,
                "status": "ELIGIBLE",
                "created_at": datetime.now(timezone.utc)
            })

        return students

    def generate_companies(self, count: int = 35) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Generates 35 companies across 3 priority tiers and their associated panels.
        Tier 1: 8 Companies (Top Tier/Niche, Cutoff 8.0-9.0, Panels 1-3, Duration 45-60)
        Tier 2: 17 Companies (Product, Cutoff 7.0-8.0, Panels 2-5, Duration 45-60)
        Tier 3: 10 Companies (Mass Recruiters, Cutoff 5.0-6.5, Panels 5-10, Duration 30)
        """
        companies = []
        panels = []

        # Tiers distribution: 8 Tier 1, 17 Tier 2, 10 Tier 3 = 35 total
        tiers = [1] * 8 + [2] * 17 + [3] * 10

        company_names_t1 = [
            "Apex AI Solutions", "Quantum Technologies", "Nvidia Labs", "Google R&D",
            "Apple Systems", "Microsoft Core", "Meta AI Research", "Amazon AWS Core"
        ]
        company_names_t2 = [
            "Uber Tech", "Stripe India", "Atlassian Labs", "Salesforce Engineering",
            "Adobe Systems", "Oracle Cloud", "Cisco Systems", "SAP Labs",
            "Goldman Sachs Tech", "Morgan Stanley Dev", "Flipkart Engineering", "Swiggy Tech",
            "Zomato Core", "Razorpay Dev", "PhonePe Engineering", "Intuit India", "ServiceNow Labs"
        ]
        company_names_t3 = [
            "TCS Innovation Labs", "Infosys Technologies", "Wipro Digital", "Cognizant Technology",
            "Accenture Digital", "Capgemini Tech", "HCL Tech", "Tech Mahindra",
            "LTI Mindtree", "IBM Client Innovation"
        ]

        t1_idx = t2_idx = t3_idx = 0

        for i in range(1, count + 1):
            tier = tiers[i - 1]

            if tier == 1:
                name = company_names_t1[t1_idx]
                t1_idx += 1
                cutoff_raw = self.rng.uniform(8.00, 9.00)
                panel_cnt = self.rng.randint(1, 3)
                duration = self.rng.choice([45, 60])
                day_mask = 1 if t1_idx <= 4 else 2
            elif tier == 2:
                name = company_names_t2[t2_idx]
                t2_idx += 1
                cutoff_raw = self.rng.uniform(7.00, 8.00)
                panel_cnt = self.rng.randint(2, 5)
                duration = self.rng.choice([45, 60])
                if t2_idx <= 5:
                    day_mask = 1
                elif t2_idx <= 9:
                    day_mask = 2
                elif t2_idx <= 13:
                    day_mask = 4
                else:
                    day_mask = 8
            else: # tier == 3
                name = company_names_t3[t3_idx]
                t3_idx += 1
                cutoff_raw = self.rng.uniform(5.00, 6.50)
                panel_cnt = self.rng.randint(5, 10)
                duration = 30
                if t3_idx <= 3:
                    day_mask = 1 | 2
                elif t3_idx <= 6:
                    day_mask = 4
                else:
                    day_mask = 8

            comp_id = uuid.uuid4()
            cutoff = Decimal(str(round(cutoff_raw, 2)))

            companies.append({
                "id": comp_id,
                "name": name,
                "cgpa_cutoff": cutoff,
                "priority_tier": tier,
                "panel_count": panel_cnt,
                "interview_duration_mins": duration,
                "day_availability_mask": day_mask,
                "arrival_delay_mins": 0
            })

            # Create panels for company
            for p in range(1, panel_cnt + 1):
                panels.append({
                    "id": uuid.uuid4(),
                    "company_id": comp_id,
                    "panel_name": f"Panel {chr(64 + p)}", # Panel A, Panel B...
                    "is_active": True
                })

        return companies, panels

    def generate_rooms(self, count: int = 20) -> List[Dict[str, Any]]:
        buildings = ["Main Block", "Academic Complex", "Tech Tower"]
        rooms = []
        created_numbers = set()

        idx = 1
        while len(rooms) < count:
            bldg = buildings[(idx - 1) % len(buildings)]
            floor = (idx - 1) // 5 + 1
            room_num = f"{bldg[0]}-{floor}0{(idx - 1) % 5 + 1}"
            if room_num in created_numbers:
                room_num = f"R-{idx:03d}"
            created_numbers.add(room_num)

            rooms.append({
                "id": uuid.uuid4(),
                "building": bldg,
                "room_number": room_num,
                "capacity": 6,
                "is_active": True
            })
            idx += 1

        return rooms

    def generate_shortlists(
        self,
        students: List[Dict[str, Any]],
        companies: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Creates realistic shortlists:
        - High CGPA students are shortlisted by more companies.
        - Only students meeting company CGPA cutoff are eligible.
        - Tier 3 (Mass Recruiters) shortlist 200-400 candidates.
        - Tier 2 shortlists 40-100 candidates.
        - Tier 1 shortlists 15-40 candidates.
        """
        shortlists = []
        now = datetime.now(timezone.utc)

        # Sort students by CGPA descending for ranking
        sorted_students = sorted(students, key=lambda s: float(s["cgpa"]), reverse=True)

        for company in companies:
            tier = company["priority_tier"]
            cutoff = float(company["cgpa_cutoff"])

            eligible_students = [s for s in sorted_students if float(s["cgpa"]) >= cutoff]

            if tier == 1:
                target_count = self.rng.randint(8, min(15, len(eligible_students)))
            elif tier == 2:
                target_count = self.rng.randint(12, min(24, len(eligible_students)))
            else: # tier == 3
                target_count = self.rng.randint(60, min(120, len(eligible_students)))

            if target_count <= 0:
                continue

            top_cutoff_idx = int(len(eligible_students) * 0.4)
            top_pool = eligible_students[:top_cutoff_idx]
            rest_pool = eligible_students[top_cutoff_idx:]

            n_top = min(int(target_count * 0.6), len(top_pool))
            selected_top = self.rng.sample(top_pool, n_top) if top_pool and n_top > 0 else []

            n_rest = target_count - len(selected_top)
            n_rest = min(n_rest, len(rest_pool))
            selected_rest = self.rng.sample(rest_pool, n_rest) if rest_pool and n_rest > 0 else []

            selected = selected_top + selected_rest
            selected.sort(key=lambda s: float(s["cgpa"]), reverse=True)

            for rank, student in enumerate(selected, start=1):
                shortlists.append({
                    "id": uuid.uuid4(),
                    "company_id": company["id"],
                    "student_id": student["id"],
                    "priority_rank": rank,
                    "created_at": now
                })

        return shortlists

    def generate_all(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Generates the full dataset deterministically using the initialized seed.
        """
        self.rng = random.Random(self.seed)

        students = self.generate_students(800)
        companies, panels = self.generate_companies(35)
        rooms = self.generate_rooms(20)
        shortlists = self.generate_shortlists(students, companies)

        return {
            "students": students,
            "companies": companies,
            "panels": panels,
            "rooms": rooms,
            "shortlists": shortlists
        }
