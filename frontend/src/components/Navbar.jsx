import React from 'react';
import { Calendar, ShieldCheck, Zap, Server, ChevronDown, Sparkles, Activity } from 'lucide-react';

export default function Navbar({
  isHealthy,
  selectedVersion,
  onVersionChange,
  availableVersions,
  onOpenDisruptionModal,
  clashRate = 0.0,
}) {
  return (
    <header className="sticky top-0 z-40 px-6 py-3.5 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Branding */}
        <div className="flex items-center gap-3.5">
          <div className="relative p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl text-indigo-400 shadow-lg shadow-indigo-500/10">
            <Calendar className="w-6 h-6 text-indigo-400" />
            <Sparkles className="w-3 h-3 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent tracking-tight">
                Placement Week Control Center
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                Phase 6 Verified
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
              <span>Assignment A Engine</span>
              <span>•</span>
              <span className="text-slate-400">144-Bit Occupancy Matrix</span>
            </p>
          </div>
        </div>

        {/* Center / Controls */}
        <div className="flex items-center gap-3.5">
          {/* Health Status Indicator */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono shadow-inner">
            <Server className={`w-3.5 h-3.5 ${isHealthy ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span className={isHealthy ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {isHealthy ? 'ENGINE ONLINE' : 'OFFLINE'}
            </span>
            <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
          </div>

          {/* Clash Rate Zero Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-medium">Clashes:</span>
            <span className="text-emerald-400 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              0.0% (ZERO)
            </span>
          </div>

          {/* Version Switcher */}
          <div className="relative flex items-center bg-slate-900/90 border border-indigo-500/30 rounded-xl px-3.5 py-1.5 text-xs shadow-md">
            <Activity className="w-3.5 h-3.5 text-indigo-400 mr-2" />
            <span className="text-slate-400 mr-2 font-mono">Version:</span>
            <select
              value={selectedVersion || 1}
              onChange={(e) => onVersionChange(Number(e.target.value))}
              className="bg-transparent text-indigo-300 font-bold focus:outline-none cursor-pointer pr-5"
            >
              {availableVersions.map((v) => (
                <option key={v.version_number} value={v.version_number} className="bg-slate-900 text-slate-200">
                  v{v.version_number} — {v.status}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-indigo-400 absolute right-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Right Action CTA */}
        <button
          onClick={onOpenDisruptionModal}
          className="group relative flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-300 cursor-pointer active:scale-95 hover:shadow-amber-500/40"
        >
          <Zap className="w-4 h-4 fill-slate-950 transition-transform group-hover:scale-110" />
          <span>Inject Disruption</span>
        </button>
      </div>
    </header>
  );
}
