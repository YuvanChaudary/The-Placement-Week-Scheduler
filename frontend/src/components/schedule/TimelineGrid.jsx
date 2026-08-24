import React from 'react';
import { DoorOpen, User, Building2, Clock, Award } from 'lucide-react';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
];

export default function TimelineGrid({
  interviews = [],
  rooms = [],
  companies = [],
  selectedDay,
  onSelectInterview,
}) {
  // Sort rooms
  const activeRooms = rooms.length > 0 ? rooms : Array.from({ length: 20 }, (_, i) => ({
    id: `room-${i + 1}`,
    room_number: `Room ${String(i + 1).padStart(2, '0')}`
  }));

  const getTierAccent = (companyName) => {
    const comp = companies.find((c) => c.name === companyName);
    const tier = comp ? comp.priority_tier : (companyName?.includes('Apex') ? 1 : 2);
    if (tier === 1) return 'border-cyan-500/50 bg-cyan-950/20 text-cyan-200';
    if (tier === 2) return 'border-purple-500/50 bg-purple-950/20 text-purple-200';
    return 'border-teal-500/50 bg-teal-950/20 text-teal-200';
  };

  return (
    <div className="overflow-x-auto p-4 max-h-[600px] overflow-y-auto font-mono text-xs">
      <div className="min-w-[1100px]">
        {/* Time Axis Header */}
        <div className="grid grid-cols-[140px_1fr] border-b border-slate-800 pb-2 mb-2">
          <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Resource / Lab</div>
          <div className="grid grid-cols-18 gap-1 text-[10px] text-slate-400 text-center font-bold">
            {TIME_SLOTS.map((slot) => (
              <div key={slot} className="truncate">{slot}</div>
            ))}
          </div>
        </div>

        {/* Room Rows */}
        {activeRooms.map((r) => {
          const roomIvs = interviews.filter(
            (iv) => iv.room_number === r.room_number || iv.room_id === r.id
          );

          return (
            <div
              key={r.id || r.room_number}
              className="grid grid-cols-[140px_1fr] items-center border-b border-slate-800/40 py-2 hover:bg-slate-900/40 transition-all"
            >
              <div className="flex items-center gap-2 font-bold text-slate-200 text-xs">
                <DoorOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>{r.room_number || r.name || `Room ${r.id}`}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {roomIvs.length === 0 ? (
                  <span className="text-[10px] text-slate-400 italic">No scheduled interviews</span>
                ) : (
                  roomIvs.map((iv) => (
                    <div
                      key={iv.id}
                      onClick={() => onSelectInterview(iv)}
                      className={`px-3 py-1.5 rounded-xl border cursor-pointer transition-all hover:scale-105 hover:z-10 shadow-sm flex items-center gap-2 ${getTierAccent(
                        iv.company_name
                      )} ${
                        iv.status === 'MOVED'
                          ? 'border-amber-500/70 bg-amber-950/30 text-amber-200'
                          : iv.status === 'CANCELLED'
                          ? 'opacity-40 line-through border-rose-500/40 bg-rose-950/20 text-rose-300'
                          : ''
                      }`}
                    >
                      <span className="font-extrabold">{iv.company_name}</span>
                      <span className="text-slate-300">({iv.student_name})</span>
                      <span className="text-[10px] opacity-75 bg-slate-950/50 px-1.5 py-0.5 rounded">
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
  );
}
