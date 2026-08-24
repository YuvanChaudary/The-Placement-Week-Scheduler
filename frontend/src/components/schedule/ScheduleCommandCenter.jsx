import React, { useState, useMemo } from 'react';
import { Calendar, Search, Filter, Layers, LayoutGrid, DoorOpen, User, Building2, Award } from 'lucide-react';
import TimelineGrid from './TimelineGrid';
import SkeletonLoader from '../common/SkeletonLoader';

export default function ScheduleCommandCenter({
  interviews = [],
  rooms = [],
  companies = [],
  selectedDay,
  onDayChange,
  onSelectInterview,
  isLoading = false,
}) {
  const [viewMode, setViewMode] = useState('TIMELINE'); // 'TIMELINE' or 'GRID'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Filter interviews
  const filteredInterviews = useMemo(() => {
    return interviews.filter((iv) => {
      if (iv.day !== selectedDay) return false;
      if (selectedRoom && iv.room_id !== selectedRoom && iv.room_number !== selectedRoom) return false;
      if (selectedCompany && iv.company_id !== selectedCompany && iv.company_name !== selectedCompany) return false;
      if (selectedStatus && iv.status !== selectedStatus) return false;

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
        const idMatch = iv.id ? String(iv.id).toLowerCase().includes(term) : false;
        if (!studMatch && !compMatch && !roomMatch && !idMatch) return false;
      }
      return true;
    });
  }, [interviews, selectedDay, selectedRoom, selectedCompany, selectedTier, selectedStatus, searchTerm, companies]);

  return (
    <div className="px-6 py-4">
      <div className="max-w-7xl mx-auto">
        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-4">
          {/* Day Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {[1, 2, 3, 4].map((d) => (
              <button
                key={d}
                onClick={() => onDayChange(d)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  selectedDay === d
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>DAY {d}</span>
              </button>
            ))}
          </div>

          {/* Controls Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto text-xs font-mono">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800">
              <button
                onClick={() => setViewMode('TIMELINE')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded transition-all cursor-pointer font-bold ${
                  viewMode === 'TIMELINE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Timeline Matrix</span>
              </button>
              <button
                onClick={() => setViewMode('GRID')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded transition-all cursor-pointer font-bold ${
                  viewMode === 'GRID' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid Cards</span>
              </button>
            </div>

            {/* Room Filter */}
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="">ROOM: ALL (20)</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.room_number || r.id}>
                  {r.room_number || `Room ${r.id}`}
                </option>
              ))}
            </select>

            {/* Tier Filter */}
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="">TIER: ALL</option>
              <option value="1">TIER 1 (Cyan)</option>
              <option value="2">TIER 2 (Purple)</option>
              <option value="3">TIER 3 (Teal)</option>
            </select>

            {/* Search Input */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search student, company or interview ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Schedule Display Container */}
        <div className="surface-card rounded-2xl border border-slate-800/80 overflow-hidden">
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between font-mono text-xs">
            <span className="text-slate-300 font-bold flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-indigo-400" />
              Resource Schedule Matrix (Day {selectedDay})
            </span>
            <span className="text-slate-400">
              Showing <strong className="text-indigo-400">{filteredInterviews.length}</strong> scheduled interviews
            </span>
          </div>

          {isLoading ? (
            <SkeletonLoader type="timeline" />
          ) : viewMode === 'TIMELINE' ? (
            <TimelineGrid
              interviews={filteredInterviews}
              rooms={rooms}
              companies={companies}
              selectedDay={selectedDay}
              onSelectInterview={onSelectInterview}
            />
          ) : (
            <div className="p-4 max-h-[600px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
              {filteredInterviews.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400">
                  No interviews match your filters on Day {selectedDay}.
                </div>
              ) : (
                filteredInterviews.map((iv) => (
                  <div
                    key={iv.id}
                    onClick={() => onSelectInterview(iv)}
                    className="p-3.5 rounded-xl surface-card surface-card-hover border border-slate-800 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-100 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        {iv.student_name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        {iv.start_time?.substring(0, 5)} - {iv.end_time?.substring(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-indigo-300 font-bold mb-2">
                      <span>{iv.company_name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{iv.panel_name || 'Panel A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/80">
                      <span>{iv.room_number || 'Room 01'}</span>
                      <span className="text-emerald-400 font-bold">{iv.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
