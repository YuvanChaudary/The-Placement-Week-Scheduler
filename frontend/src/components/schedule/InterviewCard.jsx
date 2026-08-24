import React from 'react';
import { User, Building, Clock } from 'lucide-react';

export default function InterviewCard({ interview, company, onClick, theme = 'dark' }) {
  if (!interview) return null;

  const isDark = theme === 'dark';
  const tier = company?.priority_tier ?? 1;

  // Tier accent styles for dark vs light modes
  let tierStyle = isDark
    ? 'border-l-cyan-400 bg-cyan-950/30 border-cyan-800/50 hover:bg-cyan-900/40 text-cyan-200'
    : 'border-l-cyan-500 bg-cyan-50 border-cyan-200 hover:bg-cyan-100/80 text-cyan-950 shadow-xs';
  let badgeStyle = isDark
    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    : 'bg-cyan-100 text-cyan-800 border-cyan-300 font-bold';

  if (tier === 2) {
    tierStyle = isDark
      ? 'border-l-purple-400 bg-purple-950/30 border-purple-800/50 hover:bg-purple-900/40 text-purple-200'
      : 'border-l-purple-500 bg-purple-50 border-purple-200 hover:bg-purple-100/80 text-purple-950 shadow-xs';
    badgeStyle = isDark
      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      : 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
  } else if (tier === 3) {
    tierStyle = isDark
      ? 'border-l-emerald-400 bg-emerald-950/30 border-emerald-800/50 hover:bg-emerald-900/40 text-emerald-200'
      : 'border-l-emerald-500 bg-emerald-50 border-emerald-200 hover:bg-emerald-100/80 text-emerald-950 shadow-xs';
    badgeStyle = isDark
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      : 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
  }

  // Format start and end time
  const startTime = (interview.start_time || '').slice(0, 5);
  const endTime = (interview.end_time || '').slice(0, 5);

  return (
    <div
      onClick={() => onClick && onClick(interview)}
      className={`border-l-4 border p-2.5 rounded-r-lg cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.01] overflow-hidden flex flex-col justify-between ${tierStyle}`}
    >
      <div>
        {/* Header: Company Name & Tier Badge */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className={`font-bold text-xs truncate tracking-wide flex items-center gap-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <Building className={`w-3 h-3 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className="truncate">{interview.company_name || company?.name || 'Company'}</span>
          </div>
          <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded border uppercase shrink-0 ${badgeStyle}`}>
            T{tier}
          </span>
        </div>

        {/* Candidate Info */}
        <div className={`text-[11px] font-medium truncate flex items-center gap-1 mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <User className={`w-3 h-3 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <span className="truncate">{interview.student_name || 'Candidate'}</span>
        </div>
      </div>

      {/* Time Range & Details */}
      <div className={`text-[10px] font-mono flex items-center justify-between pt-1 border-t ${
        isDark ? 'text-slate-400 border-slate-700/30' : 'text-slate-600 border-slate-200'
      }`}>
        <span className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {startTime} - {endTime}
        </span>
        {interview.panel_name && (
          <span className="text-[9px] truncate max-w-[80px]">
            {interview.panel_name}
          </span>
        )}
      </div>
    </div>
  );
}
