import React from 'react';
import { Calendar, ShieldCheck, Zap, Activity, ChevronDown, Cpu } from 'lucide-react';

export default function TopNavigation({
  isHealthy,
  selectedVersion,
  onVersionChange,
  availableVersions = [],
  onOpenDisruptionModal,
}) {
  return (
    <header className="sticky top-0 z-40 px-6 py-3 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold tracking-wider uppercase text-slate-400 font-mono">
                Placement Ops
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-bold text-indigo-400 font-mono">
                AI Scheduling Command Center
              </span>
            </div>
            <h1 className="text-base font-extrabold text-slate-100 tracking-tight">
              Placement Week Scheduler
            </h1>
          </div>
        </div>

        {/* Center / Controls */}
        <div className="flex items-center gap-4">
          {/* Health Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 animate-status-pulse' : 'bg-rose-400'}`} />
            <span className={isHealthy ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {isHealthy ? 'SYSTEM ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* Schedule Version Selector */}
          <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono">
            <Activity className="w-3.5 h-3.5 text-indigo-400 mr-2" />
            <span className="text-slate-400 mr-2">Schedule:</span>
            <select
              value={selectedVersion || 1}
              onChange={(e) => onVersionChange(Number(e.target.value))}
              className="bg-transparent text-indigo-300 font-bold focus:outline-none cursor-pointer pr-4"
            >
              {availableVersions.map((v) => (
                <option key={v.version_number} value={v.version_number} className="bg-slate-900 text-slate-200">
                  {v.version_number === 1 ? 'LIVE V1 (Baseline)' : `V${v.version_number} (${v.status})`}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>
        </div>

        {/* Right CTA */}
        <button
          onClick={onOpenDisruptionModal}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all duration-200 cursor-pointer active:scale-95"
        >
          <Zap className="w-4 h-4 fill-slate-950" />
          <span>INJECT DISRUPTION</span>
        </button>
      </div>
    </header>
  );
}
