import React, { useState, useMemo } from 'react';
import { Search, Calendar, Building, Layers } from 'lucide-react';
import InterviewCard from './InterviewCard';

export default function ScheduleMatrix({
  interviews = [],
  rooms = [],
  companies = [],
  selectedDay = 1,
  onDayChange,
  onSelectInterview,
  isLoading = false,
  theme = 'dark',
}) {
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('ALL');
  const [selectedTier, setSelectedTier] = useState('ALL');

  // Map companies by ID for fast lookup
  const companyMap = useMemo(() => {
    const map = {};
    companies.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [companies]);

  // Generate 15-min time slots from 09:00 to 18:00 (36 slots)
  const timeSlots = useMemo(() => {
    const slots = [];
    const startHour = 9;
    const endHour = 18;
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  }, []);

  const timeToSlotIndex = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const totalMins = h * 60 + m - 540;
    return Math.max(0, Math.floor(totalMins / 15));
  };

  const calculateSpan = (startStr, endStr) => {
    if (!startStr || !endStr) return 4;
    const startIdx = timeToSlotIndex(startStr);
    const endIdx = timeToSlotIndex(endStr);
    return Math.max(1, endIdx - startIdx);
  };

  const displayedRooms = useMemo(() => {
    if (selectedRoomId === 'ALL') {
      if (rooms.length > 0) return rooms;
      return Array.from({ length: 20 }, (_, i) => ({
        id: `room-${i + 1}`,
        room_number: `Room ${(i + 1).toString().padStart(2, '0')}`,
        building: i < 5 ? 'Lab A' : i < 10 ? 'Lab B' : i < 15 ? 'Auditorium' : 'Block C',
      }));
    }
    return rooms.filter((r) => r.id === selectedRoomId);
  }, [rooms, selectedRoomId]);

  const filteredInterviews = useMemo(() => {
    return interviews.filter((iv) => {
      if (iv.day !== selectedDay) return false;
      if (selectedRoomId !== 'ALL' && iv.room_id !== selectedRoomId) return false;

      const comp = companyMap[iv.company_id];
      const tier = comp?.priority_tier ?? 1;
      if (selectedTier !== 'ALL' && tier !== Number(selectedTier)) return false;

      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const sName = (iv.student_name || '').toLowerCase();
        const cName = (iv.company_name || comp?.name || '').toLowerCase();
        return sName.includes(query) || cName.includes(query);
      }

      return true;
    });
  }, [interviews, selectedDay, selectedRoomId, selectedTier, searchTerm, companyMap]);

  const interviewsByRoom = useMemo(() => {
    const map = {};
    displayedRooms.forEach((r) => {
      map[r.id] = [];
    });

    filteredInterviews.forEach((iv) => {
      if (iv.room_id && map[iv.room_id]) {
        map[iv.room_id].push(iv);
      } else if (displayedRooms.length > 0) {
        const match = displayedRooms.find((r) => r.id === iv.room_id || r.room_number === iv.room_number);
        if (match && map[match.id]) {
          map[match.id].push(iv);
        }
      }
    });
    return map;
  }, [filteredInterviews, displayedRooms]);

  return (
    <div className="mx-6 mt-4 flex flex-col gap-3">
      {/* Navigation & Controls Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl border backdrop-blur-sm transition-colors ${
        isDark
          ? 'border-slate-800 bg-[#0F172A]/90'
          : 'border-slate-200 bg-white shadow-sm'
      }`}>
        {/* Day Selector Tabs */}
        <div className={`flex items-center gap-1.5 p-1 rounded-lg border ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          {[1, 2, 3, 4].map((d) => (
            <button
              key={d}
              onClick={() => onDayChange && onDayChange(d)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                selectedDay === d
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>DAY {d}</span>
            </button>
          ))}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          {/* Room Filter */}
          <div className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <Building className="w-3.5 h-3.5 text-indigo-500" />
            <span className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Room:</span>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className={`bg-transparent font-semibold focus:outline-none cursor-pointer pr-2 appearance-none font-mono ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              <option value="ALL" className={isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>
                ALL 20 ROOMS
              </option>
              {rooms.map((r, i) => (
                <option key={r.id} value={r.id} className={isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>
                  {r.room_number || `Room ${(i + 1).toString().padStart(2, '0')}`} ({r.building || 'Main'})
                </option>
              ))}
            </select>
          </div>

          {/* Tier Filter */}
          <div className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <Layers className="w-3.5 h-3.5 text-purple-500" />
            <span className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tier:</span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className={`bg-transparent font-semibold focus:outline-none cursor-pointer pr-2 appearance-none font-mono ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              <option value="ALL" className={isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>
                ALL TIERS
              </option>
              <option value="1" className={isDark ? 'bg-slate-900 text-cyan-300' : 'bg-white text-cyan-700'}>
                TIER 1 (High Priority)
              </option>
              <option value="2" className={isDark ? 'bg-slate-900 text-purple-300' : 'bg-white text-purple-700'}>
                TIER 2 (Standard)
              </option>
              <option value="3" className={isDark ? 'bg-slate-900 text-emerald-300' : 'bg-white text-emerald-700'}>
                TIER 3 (Normal)
              </option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative w-64">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 pointer-events-none ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`} />
            <input
              type="text"
              placeholder="Search student or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full border rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-amber-500/50 transition-colors ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
        </div>
      </div>

      {/* 20-Room Sticky Timeline Grid */}
      <div className={`relative overflow-auto max-h-[640px] border rounded-xl shadow-xl transition-colors ${
        isDark ? 'border-slate-800 bg-[#0B0F17]' : 'border-slate-200 bg-white'
      }`}>
        {isLoading ? (
          <div className={`h-96 flex items-center justify-center font-mono text-sm ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Loading Day {selectedDay} Schedule Matrix...</span>
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse table-fixed">
            {/* Sticky Header Row */}
            <thead className={`sticky top-0 z-20 backdrop-blur-sm border-b ${
              isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-100/95 border-slate-200'
            }`}>
              <tr>
                <th className={`sticky left-0 z-30 w-20 min-w-[80px] p-2 text-center text-xs font-mono font-bold border-r shadow-md ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  TIME
                </th>
                {displayedRooms.map((room, idx) => (
                  <th
                    key={room.id}
                    className={`w-48 min-w-[190px] px-3 py-2 text-xs font-semibold border-r text-left font-mono ${
                      isDark ? 'border-slate-800/60 text-slate-300' : 'border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className={`truncate font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      {room.room_number || `ROOM ${(idx + 1).toString().padStart(2, '0')}`}
                    </div>
                    <div className={`text-[10px] font-normal truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {room.building ? `${room.building}` : `Capacity: ${room.capacity || 1}`}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Matrix Body with Sticky Time Slot Gutter */}
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/40' : 'divide-slate-200/60'}`}>
              {timeSlots.map((slotTime, slotIdx) => (
                <tr key={slotTime} className="h-10">
                  <td className={`sticky left-0 z-10 font-mono text-xs text-center border-r px-2 h-10 flex items-center justify-center font-medium shadow-sm ${
                    isDark ? 'bg-[#0B0F17] border-slate-800/60 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    {slotTime}
                  </td>

                  {displayedRooms.map((room) => {
                    const roomInterviews = interviewsByRoom[room.id] || [];
                    const startingInterview = roomInterviews.find(
                      (iv) => timeToSlotIndex(iv.start_time) === slotIdx
                    );

                    if (startingInterview) {
                      const span = calculateSpan(startingInterview.start_time, startingInterview.end_time);
                      const comp = companyMap[startingInterview.company_id];

                      return (
                        <td
                          key={room.id}
                          rowSpan={span}
                          className={`p-1 border-r border-b align-top relative z-10 ${
                            isDark ? 'border-slate-800/40' : 'border-slate-200'
                          }`}
                          style={{ height: `${span * 40}px` }}
                        >
                          <InterviewCard
                            interview={startingInterview}
                            company={comp}
                            onClick={onSelectInterview}
                            theme={theme}
                          />
                        </td>
                      );
                    }

                    const isCovered = roomInterviews.some((iv) => {
                      const sIdx = timeToSlotIndex(iv.start_time);
                      const span = calculateSpan(iv.start_time, iv.end_time);
                      return slotIdx > sIdx && slotIdx < sIdx + span;
                    });

                    if (isCovered) return null;

                    return (
                      <td
                        key={room.id}
                        className={`border-r border-b h-10 transition-colors ${
                          isDark
                            ? 'border-slate-800/30 hover:bg-slate-900/30'
                            : 'border-slate-200/60 hover:bg-slate-50'
                        }`}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
