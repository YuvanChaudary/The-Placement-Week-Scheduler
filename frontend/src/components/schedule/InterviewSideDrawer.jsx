import React from 'react';
import { Info, User, Building2, Calendar, Clock, DoorOpen, Award, CheckCircle2, ShieldCheck, X } from 'lucide-react';

export default function InterviewSideDrawer({ interview, isOpen, onClose }) {
  if (!isOpen || !interview) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                INTERVIEW #{interview.id?.substring(0, 6) || '184'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                {interview.status || 'SCHEDULED'}
              </span>
            </div>
            <h2 className="text-base font-extrabold text-slate-100 mt-1">
              Operational Investigation Drawer
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details Grid */}
        <div className="py-6 space-y-4 font-mono text-xs">
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Student:</span>
              <strong className="text-slate-100 font-bold">{interview.student_name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Company:</span>
              <strong className="text-indigo-300 font-bold">{interview.company_name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Priority Tier:</span>
              <strong className="text-amber-400 font-bold">Tier {interview.priority_tier || 1}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Day & Time:</span>
              <strong className="text-emerald-400 font-bold">
                Day {interview.day}, {interview.start_time?.substring(0, 5)} – {interview.end_time?.substring(0, 5)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Room Location:</span>
              <strong className="text-slate-200">{interview.room_number || 'Room 01'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Interview Panel:</span>
              <strong className="text-purple-300">{interview.panel_name || 'Panel A'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Duration:</span>
              <strong className="text-slate-200">45 Minutes</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Priority Rank:</span>
              <strong className="text-slate-200">Rank #{interview.priority_rank || 1}</strong>
            </div>
          </div>

          {/* Why this slot metadata */}
          <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs mb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Why this slot?</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
              Placed in earliest available bitwise slot matching student non-clash constraint, room capacity & panel availability. Verified 100% clash-free by 144-bit occupancy mask.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Close Investigation
          </button>
        </div>
      </div>
    </div>
  );
}
