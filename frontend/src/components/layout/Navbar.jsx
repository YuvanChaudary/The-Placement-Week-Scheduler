import React from 'react';
import { Zap, ShieldCheck, Activity, ChevronDown, Sun, Moon, RotateCcw } from 'lucide-react';

export default function Navbar({
  isHealthy = true,
  selectedVersion = 1,
  onVersionChange,
  availableVersions = [],
  onOpenDisruptionModal,
  onResetBaseline,
  clashRate = 0.0,
  theme = 'dark',
  onToggleTheme,
}) {
  const isDark = theme === 'dark';

  return (
    <header className={`sticky top-0 z-40 h-16 backdrop-blur-md px-6 flex items-center justify-between transition-colors duration-200 border-b ${
      isDark
        ? 'bg-[#0B0F17]/90 border-slate-800 text-slate-100'
        : 'bg-white/90 border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Brand & System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500">
            <Zap className="w-5 h-5 fill-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold tracking-tight text-base ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                PlacementOps
              </span>
              <span className={`text-xs font-mono hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                • AI Scheduling Command Center
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-mono font-semibold uppercase rounded-md border ${
                isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                v1.0
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Controls & Status Indicators */}
      <div className="flex items-center gap-3">
        {/* System Online Pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border ${
          isDark
            ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold tracking-wide">
            {isHealthy ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
          </span>
        </div>

        {/* Clash Rate Badge */}
        <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-300'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Clash Rate:</span>
          <span className="text-emerald-500 font-bold">{clashRate.toFixed(1)}%</span>
        </div>

        {/* Schedule Version Selector */}
        <div className={`relative flex items-center border rounded-lg px-3 py-1.5 text-xs shadow-sm transition-colors ${
          isDark
            ? 'bg-slate-900 border-slate-700/60 text-slate-200 hover:border-slate-600'
            : 'bg-slate-50 border-slate-300 text-slate-800 hover:border-slate-400'
        }`}>
          <Activity className="w-3.5 h-3.5 text-indigo-500 mr-2" />
          <span className={`font-mono mr-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Schedule:</span>
          <select
            value={selectedVersion}
            onChange={(e) => onVersionChange && onVersionChange(Number(e.target.value))}
            className={`bg-transparent font-semibold focus:outline-none cursor-pointer pr-5 appearance-none font-mono ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            {availableVersions.length > 0 ? (
              availableVersions.map((v) => (
                <option key={v.version_number} value={v.version_number} className={isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>
                  LIVE V{v.version_number} ({v.status === 'COMMITTED' ? 'Baseline' : v.status})
                </option>
              ))
            ) : (
              <option value={1} className={isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>
                LIVE V1 (Baseline)
              </option>
            )}
          </select>
          <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
        </div>

        {/* Theme Mode Toggle Button */}
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800 hover:border-slate-700'
              : 'bg-slate-100 border-slate-300 text-indigo-600 hover:bg-slate-200 hover:border-slate-400'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Action CTAs */}
      <div className="flex items-center gap-2">
        <button
          onClick={onResetBaseline}
          title="Reset to Baseline Version 1"
          className={`border text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
            isDark
              ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
              : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>↺ Reset Baseline</span>
        </button>

        <button
          onClick={onOpenDisruptionModal}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
        >
          <Zap className="w-4 h-4 fill-slate-950" />
          <span>⚡ INJECT DISRUPTION</span>
        </button>
      </div>
    </header>
  );
}
