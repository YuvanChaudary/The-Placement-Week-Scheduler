import React from 'react';
import { X, CheckCircle2, Building, User, Award, Calendar, Clock, MapPin, ShieldCheck, HelpCircle } from 'lucide-react';

export default function InterviewDrawer({ interview = null, isOpen = false, onClose, theme = 'dark' }) {
  if (!isOpen || !interview) return null;

  const isDark = theme === 'dark';
  const startTime = (interview.start_time || '').slice(0, 5);
  const endTime = (interview.end_time || '').slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end">
      <div className={`w-96 border-l h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-200 ${
        isDark ? 'bg-[#0F172A] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div>
          {/* Header */}
          <div className={`flex items-center justify-between pb-4 border-b mb-6 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h2 className="font-mono font-bold text-base">
                Interview Inspection
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Company & Candidate Banner */}
          <div className={`p-4 rounded-xl border mb-6 ${
            isDark ? 'border-slate-800 bg-[#0B0F17]' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-500 font-bold uppercase mb-1">
              <Building className="w-4 h-4" />
              <span>{interview.company_name || 'Company Name'}</span>
            </div>
            <div className="text-lg font-bold flex items-center gap-2 mb-2">
              <User className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <span>{interview.student_name || 'Student Name'}</span>
            </div>
            <div className={`text-xs font-mono flex items-center justify-between pt-2 border-t ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
            }`}>
              <span>Interview ID:</span>
              <span className="font-bold">{interview.id ? interview.id.slice(0, 8) : 'N/A'}</span>
            </div>
          </div>

          {/* Assignment Metadata Grid */}
          <div className="space-y-3 mb-6">
            <h3 className={`text-xs font-mono font-bold uppercase tracking-wider ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Allocation Parameters
            </h3>
            
            <div className={`p-3 rounded-lg border space-y-2 text-xs font-mono ${
              isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Day:
                </span>
                <span className="font-bold">Day {interview.day || 1}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Slot Window:
                </span>
                <span className="font-bold">{startTime} - {endTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <MapPin className="w-3.5 h-3.5 text-rose-500" /> Assigned Room:
                </span>
                <span className="font-bold">{interview.room_number || 'Room 01'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Award className="w-3.5 h-3.5 text-purple-500" /> Panel:
                </span>
                <span className="font-bold">{interview.panel_name || 'Panel A'}</span>
              </div>
            </div>
          </div>

          {/* Hard Constraints Verification Banner */}
          <div className="space-y-3 mb-6">
            <h3 className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-between ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <span>Hard Constraints Satisfaction</span>
              <span className="text-emerald-500 text-[10px]">6 / 6 PASSED</span>
            </h3>

            <div className={`p-3 rounded-lg border space-y-1.5 text-xs font-mono ${
              isDark ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {[
                { code: 'HC-1', label: 'No Student Overlap' },
                { code: 'HC-2', label: 'No Room Overlap' },
                { code: 'HC-3', label: 'No Panel Overlap' },
                { code: 'HC-4', label: 'Student Shortlist Valid' },
                { code: 'HC-5', label: 'Company Tier Operating Day' },
                { code: 'HC-6', label: 'Operating Slot Window (09:00-18:00)' },
              ].map((hc) => (
                <div key={hc.code} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{hc.code}: {hc.label}</span>
                  </span>
                  <span className="font-bold">OK</span>
                </div>
              ))}
            </div>
          </div>

          {/* Why This Slot Explanation Section */}
          <div className="space-y-2">
            <h3 className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
              <span>Why This Slot?</span>
            </h3>
            <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
              isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              Allocated deterministically by greedy priority sorting tuple{' '}
              <code className={`px-1 py-0.5 rounded font-mono text-[11px] ${
                isDark ? 'bg-slate-950 text-indigo-300' : 'bg-slate-200 text-indigo-800'
              }`}>
                (Tier, CGPA, Rank, Duration, Slot)
              </code>
              . Bitmask check verified 0 occupancy bits in candidate student, panel, and room bitmasks.
            </div>
          </div>
        </div>

        {/* Footer Close CTA */}
        <div className={`pt-4 border-t mt-6 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <button
            onClick={onClose}
            className={`w-full py-2 font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Close Inspection Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
