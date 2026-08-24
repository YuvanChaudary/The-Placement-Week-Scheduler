import React, { useState, useMemo } from 'react';
import { Calendar, Search, Building2, User, Clock, DoorOpen, Info, LayoutGrid, Layers, Award, Sparkles, ChevronRight } from 'lucide-react';

// Hourly Time Slots (09:00 AM to 06:00 PM)
const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
];

export default function ScheduleExplorer({
  interviews = [],
  rooms = [],
  companies = [],
  selectedDay,
  onDayChange,
}) {
  const [viewMode, setViewMode] = useState('GANTT'); // 'GANTT' or 'CARDS'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [selectedInterview, setSelectedInterview] = useState(null);

  // Filter interviews
  const filteredInterviews = useMemo(() => {
    return interviews.filter((iv) => {
      if (iv.day !== selectedDay) return false;
      if (selectedRoom && iv.room_id !== selectedRoom && iv.room_number !== selectedRoom) return false;
      if (selectedCompany && iv.company_id !== selectedCompany && iv.company_name !== selectedCompany) return false;

      // Tier filter
      if (selectedTier) {
        const comp = companies.find((c) => c.name === iv.company_name || c.id === iv.company_id);
        const tier = comp ? comp.priority_tier : (iv.company_name?.includes('Apex') ? 1 : 2);
        if (String(tier) !== String(selectedTier)) return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const studMatch = iv.student_name ? iv.student_name.toLowerCase().includes(term) : false;
        const compMatch = iv.company_name ? iv.company_name.toLowerCase().includes(term) : false;
        const roomMatch = iv.room_number ? iv.room_number.toLowerCase().includes(term) : false;
        if (!studMatch && !compMatch && !roomMatch) return false;
      }
      return true;
    });
  }, [interviews, selectedDay, selectedRoom, selectedCompany, selectedTier, searchTerm, companies]);

  // Active rooms array
  const activeRooms = useMemo(() => {
    if (rooms.length > 0) return rooms;
    const roomSet = new Map();
    interviews.forEach((iv) => {
      if (iv.room_number) {
        roomSet.set(iv.room_number, { id: iv.room_id || iv.room_number, room_number: iv.room_number });
      }
    });
    return Array.from(roomSet.values()).sort((a, b) => a.room_number.localeCompare(b.room_number));
  }, [rooms, interviews]);

  // Color helper based on tier and status
  const getInterviewCardStyle = (iv) => {
    if (iv.status === 'CANCELLED') {
      return 'bg-rose-950/40 border-rose-500/50 text-rose-300 line-through opacity-60';
    }
    if (iv.status === 'MOVED') {
      return 'bg-gradient-to-r from-amber-900/60 to-orange-900/60 border-amber-500/70 text-amber-200 shadow-md shadow-amber-950/50 ring-1 ring-amber-500/40';
    }

    const comp = companies.find((c) => c.name === iv.company_name);
    const tier = comp ? comp.priority_tier : 1;

    if (tier === 1) {
      return 'bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-slate-900 border-amber-500/50 text-amber-200 shadow-lg shadow-amber-950/30 hover:border-amber-400';
    }
    if (tier === 2) {
      return 'bg-gradient-to-r from-indigo-950/40 via-indigo-900/30 to-slate-900 border-indigo-500/50 text-indigo-200 shadow-lg shadow-indigo-950/30 hover:border-indigo-400';
    }
    return 'bg-gradient-to-r from-emerald-950/40 via-teal-900/30 to-slate-900 border-emerald-500/50 text-emerald-200 shadow-lg shadow-emerald-950/30 hover:border-emerald-400';
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      {/* Explorer Controls Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
        {/* 4-Day Selector */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          {[1, 2, 3, 4].map((d) => (
            <button
              key={d}
              onClick={() => onDayChange(d)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                selectedDay === d
                  ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Day {d}</span>
            </button>
          ))}
        </div>

        {/* View Mode Toggle & Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Gantt vs Grid Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setViewMode('GANTT')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                viewMode === 'GANTT'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Gantt Matrix</span>
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                viewMode === 'CARDS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards Grid</span>
            </button>
          </div>

          {/* Tier Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-[11px] font-mono">
            <button
              onClick={() => setSelectedTier('')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                selectedTier === '' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Tiers
            </button>
            <button
              onClick={() => setSelectedTier('1')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 ${
                selectedTier === '1' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Award className="w-3 h-3 text-amber-400" /> Tier 1
            </button>
            <button
              onClick={() => setSelectedTier('2')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                selectedTier === '2' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold' : 'text-slate-400 hover:text-indigo-300'
              }`}
            >
              Tier 2
            </button>
            <button
              onClick={() => setSelectedTier('3')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                selectedTier === '3' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              Tier 3
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter Student / Company / Room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Main Schedule Visualizer */}
      <div className="rounded-3xl glass-panel border-slate-800/80 overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
              <DoorOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Placement Schedule Visualizer • Day {selectedDay}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {activeRooms.length} Physical Interview Labs • 144 Occupancy Slots/Day
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-mono text-indigo-300">
              Showing <strong className="text-white">{filteredInterviews.length}</strong> Interviews
            </span>
          </div>
        </div>

        {/* View Mode 1: Interactive Gantt Matrix */}
        {viewMode === 'GANTT' ? (
          <div className="overflow-x-auto p-4 max-h-[620px] overflow-y-auto">
            <div className="min-w-[1000px]">
              {/* Gantt Header Time slots */}
              <div className="grid grid-cols-[140px_1fr] border-b border-slate-800 pb-2 mb-2">
                <div className="text-xs font-bold text-slate-400 font-mono uppercase">Room / Lab</div>
                <div className="grid grid-cols-18 gap-1 text-[10px] font-mono text-slate-400 text-center">
                  {TIME_SLOTS.map((slot) => (
                    <div key={slot} className="truncate">{slot}</div>
                  ))}
                </div>
              </div>

              {/* Gantt Room Rows */}
              {activeRooms.slice(0, 15).map((r) => {
                const roomIvs = filteredInterviews.filter(
                  (iv) => iv.room_number === r.room_number || iv.room_id === r.id
                );
                return (
                  <div
                    key={r.id || r.room_number}
                    className="grid grid-cols-[140px_1fr] items-center border-b border-slate-800/40 py-2.5 hover:bg-slate-800/30 transition-all"
                  >
                    <div className="flex items-center gap-2 font-mono text-xs text-slate-200 font-bold">
                      <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                      <span>{r.room_number || r.name || `Room ${r.id}`}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {roomIvs.length === 0 ? (
                        <span className="text-[11px] font-mono text-slate-400 italic">No scheduled interviews</span>
                      ) : (
                        roomIvs.map((iv) => (
                          <div
                            key={iv.id}
                            onClick={() => setSelectedInterview(iv)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-mono cursor-pointer transition-all hover:scale-105 hover:z-10 flex items-center gap-2 ${getInterviewCardStyle(iv)}`}
                          >
                            <span className="font-bold">{iv.company_name}</span>
                            <span className="text-slate-300">({iv.student_name})</span>
                            <span className="text-[10px] opacity-80 font-mono px-1.5 py-0.5 rounded bg-black/30">
                              {iv.start_time?.substring(0, 5)} - {iv.end_time?.substring(0, 5)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* View Mode 2: Cards Grid */
          <div className="p-4 max-h-[620px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredInterviews.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 font-mono">
                No interviews match the selected filters on Day {selectedDay}.
              </div>
            ) : (
              filteredInterviews.map((iv) => (
                <div
                  key={iv.id}
                  onClick={() => setSelectedInterview(iv)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] hover:shadow-xl ${getInterviewCardStyle(
                    iv
                  )}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{iv.student_name}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-700 text-indigo-300 font-bold">
                      {iv.start_time ? iv.start_time.substring(0, 5) : '09:00'} - {iv.end_time ? iv.end_time.substring(0, 5) : '09:45'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-200 mb-2">
                    <span className="font-extrabold">{iv.company_name}</span>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {iv.panel_name || 'Panel A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-3 pt-2.5 border-t border-slate-800/80">
                    <span className="flex items-center gap-1.5 font-bold text-slate-300">
                      <DoorOpen className="w-3.5 h-3.5 text-indigo-400" />
                      {iv.room_number || 'Room Lab'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                      {iv.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Interview Detail Modal */}
      {selectedInterview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Info className="w-4 h-4" />
                Interview Details
              </div>
              <button
                onClick={() => setSelectedInterview(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">Student Name:</span>
                <span className="text-slate-100 font-bold">{selectedInterview.student_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">Target Company:</span>
                <span className="text-amber-300 font-bold">{selectedInterview.company_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">Panel & Room:</span>
                <span className="text-indigo-300 font-bold">{selectedInterview.panel_name || 'Panel A'} • {selectedInterview.room_number}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">Time Window:</span>
                <span className="text-emerald-400 font-bold">
                  Day {selectedInterview.day}, {selectedInterview.start_time} - {selectedInterview.end_time}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Lifecycle Status:</span>
                <span className="px-2.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  {selectedInterview.status}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedInterview(null)}
              className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
