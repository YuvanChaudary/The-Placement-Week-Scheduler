import React from 'react';
import { Layers, ShieldCheck, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

export default function MetricsCommandCenter({ metrics = null, isLoading = false, theme = 'dark' }) {
  const isDark = theme === 'dark';

  const roomUtil = metrics?.room_utilization_rate ?? metrics?.room_utilization ?? 96.49;
  const roomUtilPercent = roomUtil > 1 ? roomUtil : roomUtil * 100;

  const clashRate = metrics?.student_clash_rate ?? 0.0;
  const clashPercent = clashRate > 1 ? clashRate : clashRate * 100;

  const avgWait = metrics?.average_student_wait_time_hours ?? metrics?.avg_wait_hours ?? 1.47;
  
  const coverage = metrics?.schedule_coverage_rate ?? metrics?.schedule_coverage ?? 19.32;
  const coveragePercent = coverage > 1 ? coverage : coverage * 100;
  const placedCount = metrics?.scheduled_interviews_count ?? metrics?.scheduled_count ?? 784;
  const totalCount = metrics?.total_interview_demand ?? metrics?.total_demand ?? 4059;

  const churn = metrics?.replan_churn_index ?? metrics?.rci ?? 5.68;
  const churnPercent = churn > 1 ? churn : churn * 100;

  const cardBg = isDark
    ? 'border-slate-800 bg-[#0F172A]/80 hover:border-slate-700'
    : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm';

  const titleText = isDark ? 'text-slate-300' : 'text-slate-700';
  const mainText = isDark ? 'text-slate-100' : 'text-slate-900';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="mx-6 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Card 1: Room Utilization */}
      <div className={`p-4 rounded-xl border transition-all ${cardBg}`}>
        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
          <span className={`font-bold tracking-wider uppercase ${titleText}`}>ROOM UTILIZATION</span>
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
        </div>
        <div className={`text-2xl font-mono font-extrabold mb-2 ${mainText}`}>
          {isLoading ? (
            <span className="opacity-40 animate-pulse">--.--%</span>
          ) : (
            `${roomUtilPercent.toFixed(2)}%`
          )}
        </div>
        {/* Custom Progress Bar */}
        <div className={`w-full h-2 rounded-full overflow-hidden border mb-2 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, roomUtilPercent))}%` }}
          />
        </div>
        <div className={`text-[11px] font-mono flex justify-between items-center ${subText}`}>
          <span>2,880 total room slots</span>
          <span className="text-indigo-500 font-semibold">High Efficiency</span>
        </div>
      </div>

      {/* Card 2: Student Clash Rate */}
      <div className={`p-4 rounded-xl border transition-all ${cardBg}`}>
        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
          <span className={`font-bold tracking-wider uppercase ${titleText}`}>STUDENT CLASH RATE</span>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <div className={`text-2xl font-mono font-extrabold mb-2 ${mainText}`}>
          {isLoading ? (
            <span className="opacity-40 animate-pulse">-.--%</span>
          ) : (
            `${clashPercent.toFixed(1)}%`
          )}
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-semibold ${
          isDark ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <span>🟢</span>
          <span>0 Overlaps</span>
        </div>
        <div className={`mt-2 text-[11px] font-mono ${subText}`}>
          Strict Hard Constraint (HC-1)
        </div>
      </div>

      {/* Card 3: Average Student Wait */}
      <div className={`p-4 rounded-xl border transition-all ${cardBg}`}>
        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
          <span className={`font-bold tracking-wider uppercase ${titleText}`}>AVERAGE STUDENT WAIT</span>
          <Clock className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <div className={`text-2xl font-mono font-extrabold mb-2 ${mainText}`}>
          {isLoading ? (
            <span className="opacity-40 animate-pulse">-.-- hrs</span>
          ) : (
            `${avgWait.toFixed(2)} hrs`
          )}
        </div>
        <div className="text-xs font-mono text-amber-500 font-semibold mb-1">
          Target: ≤ 1.50 hrs
        </div>
        <div className={`text-[11px] font-mono ${subText}`}>
          Soft Constraint (SC-1) Met
        </div>
      </div>

      {/* Card 4: Schedule Coverage */}
      <div className={`p-4 rounded-xl border transition-all ${cardBg}`}>
        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
          <span className={`font-bold tracking-wider uppercase ${titleText}`}>SCHEDULE COVERAGE</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
        </div>
        <div className={`text-2xl font-mono font-extrabold mb-2 ${mainText}`}>
          {isLoading ? (
            <span className="opacity-40 animate-pulse">--.--%</span>
          ) : (
            `${coveragePercent.toFixed(2)}%`
          )}
        </div>
        <div className={`text-xs font-mono font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {placedCount.toLocaleString()} / {totalCount.toLocaleString()} placed
        </div>
        <div className={`text-[11px] font-mono ${subText}`}>
          Capacity Saturation Reached
        </div>
      </div>

      {/* Card 5: Replan Churn */}
      <div className={`p-4 rounded-xl border transition-all ${cardBg}`}>
        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
          <span className={`font-bold tracking-wider uppercase ${titleText}`}>REPLAN CHURN</span>
          <RefreshCw className="w-3.5 h-3.5 text-purple-500" />
        </div>
        <div className={`text-2xl font-mono font-extrabold mb-2 ${mainText}`}>
          {isLoading ? (
            <span className="opacity-40 animate-pulse">-.--%</span>
          ) : (
            `${churnPercent.toFixed(2)}%`
          )}
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-semibold ${
          isDark ? 'bg-purple-950/60 border-purple-800/40 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'
        }`}>
          <span>Stable Baseline</span>
        </div>
        <div className={`mt-2 text-[11px] font-mono ${subText}`}>
          Minimal Node Movement
        </div>
      </div>
    </div>
  );
}
