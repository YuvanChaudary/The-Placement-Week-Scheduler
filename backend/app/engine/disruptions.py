import uuid
from datetime import time
from typing import List, Set
from app.models import Interview

def to_time(val):
    if val is None:
        return None
    if isinstance(val, str):
        return time.fromisoformat(val)
    return val

class DisruptionHandler:
    """
    Parses disruption events and computes the impact blast radius (affected Interview records).
    Ensures robust string-based UUID and datetime.time matching across ORM instances.
    """

    @staticmethod
    def analyze_company_delay(
        interviews: List[Interview],
        company_id: uuid.UUID,
        delay_hours: float,
        day: int = 1
    ) -> List[Interview]:
        total_mins = int((9 + delay_hours) * 60)
        h = total_mins // 60
        m = total_mins % 60
        cutoff_time = time(h, m)
        target_cid = str(company_id)

        affected = []
        for iv in interviews:
            if iv.status == "SCHEDULED" and str(iv.company_id) == target_cid and iv.day == day:
                iv_start = to_time(iv.start_time)
                if iv_start is not None and iv_start < cutoff_time:
                    affected.append(iv)
        return affected

    @staticmethod
    def analyze_student_withdrawal(
        interviews: List[Interview],
        student_ids: Set[uuid.UUID],
        day: int = None
    ) -> List[Interview]:
        target_sids = {str(sid) for sid in student_ids}
        affected = []
        for iv in interviews:
            if iv.status == "SCHEDULED" and str(iv.student_id) in target_sids:
                if day is None or iv.day == day:
                    affected.append(iv)
        return affected

    @staticmethod
    def analyze_panel_dropout(
        interviews: List[Interview],
        panel_id: uuid.UUID,
        day: int,
        start_time: time
    ) -> List[Interview]:
        target_pid = str(panel_id)
        start_t = to_time(start_time)
        affected = []
        for iv in interviews:
            if iv.status == "SCHEDULED" and str(iv.panel_id) == target_pid and iv.day == day:
                iv_end = to_time(iv.end_time)
                if start_t is None or (iv_end is not None and iv_end > start_t):
                    affected.append(iv)
        return affected

    @staticmethod
    def analyze_room_unavailability(
        interviews: List[Interview],
        room_id: uuid.UUID,
        day: int,
        start_time: time,
        end_time: time
    ) -> List[Interview]:
        target_rid = str(room_id)
        s_time = to_time(start_time)
        e_time = to_time(end_time)
        affected = []
        for iv in interviews:
            if iv.status == "SCHEDULED" and str(iv.room_id) == target_rid and iv.day == day:
                iv_start = to_time(iv.start_time)
                iv_end = to_time(iv.end_time)
                if iv_start is not None and iv_end is not None:
                    if not (iv_end <= s_time or iv_start >= e_time):
                        affected.append(iv)
        return affected
