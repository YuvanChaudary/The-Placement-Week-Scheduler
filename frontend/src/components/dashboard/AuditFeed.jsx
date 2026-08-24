import React from 'react';
import { Terminal, Bell, Activity } from 'lucide-react';

export default function AuditFeed({ notifications = [], versions = [], theme = 'dark' }) {
  const isDark = theme === 'dark';

  return (
    <div className={`mx-6 my-6 p-3 rounded-xl border shadow-inner text-xs font-mono flex items-center justify-between overflow-hidden transition-colors ${
      isDark
        ? 'border-slate-800 bg-[#0B0F17] text-slate-400'
        : 'border-slate-200 bg-white text-slate-600 shadow-sm'
    }`}>
      <div className="flex items-center gap-3 truncate">
        <div className="flex items-center gap-1.5 text-amber-500 font-bold shrink-0">
          <Terminal className="w-4 h-4 text-amber-500" />
          <span>AUDIT LOG</span>
        </div>
        <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>|</span>

        <div className={`flex items-center gap-4 truncate text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <span className="truncate flex items-center gap-1.5">
            <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>[13:42:05]</span>
            <span>Baseline schedule loaded successfully</span>
          </span>
          <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>|</span>
          <span className="truncate flex items-center gap-1.5 text-emerald-500">
            <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>[13:40:12]</span>
            <span>DB connection verified (latency: 12ms)</span>
          </span>
          {notifications.length > 0 && (
            <>
              <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>|</span>
              <span className="truncate flex items-center gap-1.5 text-indigo-500 font-semibold">
                <Bell className="w-3 h-3" />
                <span>{notifications.length} Candidate Notifications Dispatched</span>
              </span>
            </>
          )}
        </div>
      </div>

      <div className={`flex items-center gap-2 shrink-0 text-[10px] pl-4 border-l ${
        isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
      }`}>
        <Activity className="w-3 h-3 text-emerald-500" />
        <span>PostgreSQL 15.19 Connected</span>
      </div>
    </div>
  );
}
