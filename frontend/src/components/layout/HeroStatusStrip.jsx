import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export default function HeroStatusStrip({
  isDisrupted = false,
  disruptionSummary = '',
  studentClashes = 0,
  roomClashes = 0,
  panelClashes = 0,
  theme = 'dark',
}) {
  const isDark = theme === 'dark';

  if (isDisrupted) {
    return (
      <div className={`mx-6 mt-4 p-3 rounded-lg border text-sm flex items-center justify-between transition-all duration-300 shadow-sm ${
        isDark
          ? 'border-amber-900/50 bg-amber-950/20 text-amber-400'
          : 'border-amber-300 bg-amber-50 text-amber-900'
      }`}>
        <div className="flex items-center gap-2.5 font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            <strong className="font-bold">DISRUPTION INJECTED:</strong> {disruptionSummary || 'Apex AI 3h delay + 15 student withdrawals detected.'} (Replan proposal active)
          </span>
        </div>
        <div className={`flex items-center gap-3 font-mono text-xs ${isDark ? 'text-amber-300/80' : 'text-amber-800'}`}>
          <span>Student: <strong className="font-bold">{studentClashes}</strong></span>
          <span>|</span>
          <span>Room: <strong className="font-bold">{roomClashes}</strong></span>
          <span>|</span>
          <span>Panel: <strong className="font-bold">{panelClashes}</strong></span>
        </div>
      </div>
    );
  }

  return (
    <div className={`mx-6 mt-4 p-3 rounded-lg border text-sm flex items-center justify-between transition-all duration-300 shadow-sm ${
      isDark
        ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-400'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
    }`}>
      <div className="flex items-center gap-2.5 font-medium">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>
          <strong className="font-bold">🛡️ SYSTEM HEALTHY:</strong> All active interviews satisfy Hard Constraints (HC-1 to HC-6)
        </span>
      </div>
      <div className={`flex items-center gap-3 font-mono text-xs ${isDark ? 'text-emerald-300/80' : 'text-emerald-800'}`}>
        <span>Student: <strong className="font-bold">{studentClashes}</strong></span>
        <span>|</span>
        <span>Room: <strong className="font-bold">{roomClashes}</strong></span>
        <span>|</span>
        <span>Panel: <strong className="font-bold">{panelClashes}</strong></span>
      </div>
    </div>
  );
}
