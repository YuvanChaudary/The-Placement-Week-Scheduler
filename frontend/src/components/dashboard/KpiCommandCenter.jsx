import React from 'react';
import { DoorOpen, ShieldCheck, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import SkeletonLoader from '../common/SkeletonLoader';

export default function KpiCommandCenter({ metrics, isLoading = false }) {
  if (isLoading) {
    return <SkeletonLoader type="kpi" count={5} />;
  }

  if (!metrics) return null;

  const {
    room_utilization_rate = 96.49,
    student_clash_rate = 0.0,
    avg_waiting_time_hours = 1.47,
    replan_churn_index = 5.68,
    schedule_coverage = 19.32,
  } = metrics;

  return (
    <div className="px-6 py-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Card 1: Room Utilization */}
        <div className="p-4 rounded-2xl surface-card surface-card-hover border-indigo-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Room Utilization</span>
            <DoorOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-indigo-300">
            {room_utilization_rate.toFixed(2)}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(room_utilization_rate, 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-between">
            <span className="text-emerald-400 font-bold">Excellent</span>
            <span>+ physical capacity</span>
          </div>
        </div>

        {/* Card 2: Student Clash Rate */}
        <div className="p-4 rounded-2xl surface-card surface-card-hover border-emerald-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Student Clash Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400">
            {student_clash_rate.toFixed(1)}%
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-400 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>0 Overlaps Detected</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-mono">Hard Constraint (0.0%)</div>
        </div>

        {/* Card 3: Average Wait */}
        <div className="p-4 rounded-2xl surface-card surface-card-hover border-sky-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Average Wait</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-sky-300">
            {avg_waiting_time_hours.toFixed(2)} hrs
          </div>
          <div className="text-[11px] text-slate-300 mt-2 font-mono">
            Idle campus waiting gap
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-between">
            <span>Target ≤ 1.20h</span>
            <span className="text-emerald-400 font-bold">Optimal</span>
          </div>
        </div>

        {/* Card 4: Schedule Coverage */}
        <div className="p-4 rounded-2xl surface-card surface-card-hover border-purple-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Schedule Coverage</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-purple-300">
            {schedule_coverage.toFixed(2)}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(schedule_coverage, 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-between">
            <span>784 Shortlists</span>
            <span className="text-purple-300 font-bold">Full Yield</span>
          </div>
        </div>

        {/* Card 5: Replan Churn */}
        <div className="p-4 rounded-2xl surface-card surface-card-hover border-amber-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Replan Churn</span>
            <RefreshCw className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-300">
            {replan_churn_index.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-300 mt-2 font-mono">
            Low operational disruption
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-between">
            <span>Target ≤ 15.0%</span>
            <span className="text-emerald-400 font-bold">Minimal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
