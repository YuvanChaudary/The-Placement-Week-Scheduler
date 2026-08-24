from datetime import time

TOTAL_SLOTS_PER_DAY = 36
TOTAL_DAYS = 4
TOTAL_SLOTS = TOTAL_SLOTS_PER_DAY * TOTAL_DAYS  # 144 bits
START_HOUR = 9  # 09:00 AM

# Pre-computed lookup table for interval masks: (start_offset, length_slots) -> int mask
_INTERVAL_MASKS_CACHE: dict[tuple[int, int], int] = {}

for _s in range(TOTAL_SLOTS):
    _start_day = _s // TOTAL_SLOTS_PER_DAY
    for _l in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12):
        _end_day = (_s + _l - 1) // TOTAL_SLOTS_PER_DAY
        if _start_day == _end_day and _s + _l <= TOTAL_SLOTS:
            _base_mask = (1 << _l) - 1
            _INTERVAL_MASKS_CACHE[(_s, _l)] = _base_mask << _s

def offset_to_slot(day: int, hour: int, minute: int) -> int:
    """
    Converts (day, hour, minute) into 144-bit slot index offset.
    offset = (day - 1) * 36 + (hour - 9) * 4 + (minute // 15)
    """
    if not (1 <= day <= TOTAL_DAYS):
        raise ValueError(f"Day must be between 1 and {TOTAL_DAYS}, got {day}")
    if not (9 <= hour <= 18):
        raise ValueError(f"Hour must be between 9 and 18, got {hour}")
    if minute not in (0, 15, 30, 45):
        raise ValueError(f"Minute must be 0, 15, 30, or 45, got {minute}")

    return (day - 1) * TOTAL_SLOTS_PER_DAY + (hour - START_HOUR) * 4 + (minute // 15)

def slot_to_time(slot_offset: int, duration_mins: int) -> tuple[int, time, time]:
    """
    Converts 144-bit slot index offset and duration back to (day, start_time, end_time).
    """
    day = (slot_offset // TOTAL_SLOTS_PER_DAY) + 1
    slot_in_day = slot_offset % TOTAL_SLOTS_PER_DAY

    total_start_mins = START_HOUR * 60 + slot_in_day * 15
    start_h = total_start_mins // 60
    start_m = total_start_mins % 60
    start_t = time(start_h, start_m)

    total_end_mins = total_start_mins + duration_mins
    end_h = total_end_mins // 60
    end_m = total_end_mins % 60
    end_t = time(end_h, end_m)

    return day, start_t, end_t

def create_interval_mask(start_offset: int, length_slots: int) -> int:
    """
    Generates a 144-bit integer mask for an interview spanning `length_slots` contiguous 15-minute slots starting at `start_offset`.
    """
    mask = _INTERVAL_MASKS_CACHE.get((start_offset, length_slots))
    if mask is None:
        start_day = start_offset // TOTAL_SLOTS_PER_DAY
        end_day = (start_offset + length_slots - 1) // TOTAL_SLOTS_PER_DAY
        if start_day != end_day or start_offset + length_slots > TOTAL_SLOTS:
            raise ValueError(f"Interval starting at slot {start_offset} with length {length_slots} crosses day boundary or exceeds 144 slots.")
        base_mask = (1 << length_slots) - 1
        mask = base_mask << start_offset
    return mask

def is_slot_feasible(b_student: int, b_room: int, b_panel: int, mask: int) -> bool:
    """
    Checks zero collision across Student, Room, and Panel 144-bit occupancy bitmasks using fast bitwise AND.
    """
    return (b_student & mask == 0) and (b_room & mask == 0) and (b_panel & mask == 0)

def is_day_available(day_availability_mask: int, day: int) -> bool:
    """
    Checks if company is available on specified day (1..4) via bitmask.
    Bit 0 = Day 1, Bit 1 = Day 2, Bit 2 = Day 3, Bit 3 = Day 4.
    """
    return bool(day_availability_mask & (1 << (day - 1)))
