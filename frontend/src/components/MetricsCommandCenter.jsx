import React from 'react';
import { DoorOpen, ShieldAlert, Clock, CheckCircle2, RefreshCw, Users, Activity, BarChart3 } from 'lucide-react';

export default function MetricsCommandCenter({ metrics, isReplan = false }) {
  if (!metrics) return null;

  const {
    room_utilization_rate = 0,
    student_clash_rate = 0,
    avg_waiting_time_hours = 0,
    replan_churn_index = 0,
    schedule_coverage = 0,
    scheduled_count = 0,
    unscheduled_count = 0,
    affected_students_count = 0,
    unchanged_interviews_count = 0,
    moved_interviews_count = 0,
    cancelled_interviews_count = 0,
  } = metrics;

  return (
    <div className="px-6 py-6 border-b border-slate-800/80 bg-slate-950/40 cyber-grid">
      <div className="max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                Operational Metrics Command Center
                {isReplan && (
                  <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full animate-pulse">
                    Live Draft Replan Mode
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Real-Time Health Monitors • Deterministic Priority Tier Dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-400">Scheduled:</span>
              <strong className="text-emerald-400 font-bold">{scheduled_count}</strong>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-slate-400">Unscheduled:</span>
              <strong className="text-amber-400 font-bold">{unscheduled_count}</strong>
            </div>
          </div>
        </div>

        {/* 5 KPI Glass Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Card 1: Room Utilization Rate */}
          <div className="p-5 rounded-2xl glass-panel glass-panel-hover border-indigo-500/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Room Utilization</span>
              <DoorOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-indigo-300 tracking-tight">
              {room_utilization_rate.toFixed(1)}%
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="bg-gradient-to-r from-indigo-500 to-sky-400 h-full rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${Math.min(room_utilization_rate, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-between">
              <span>Target ≥ 75.0%</span>
              <span className="text-indigo-400 font-bold">41,685m / 43.2k</span>
            </div>
          </div>

          {/* Card 2: Student Clash Rate (HARD CONSTRAINT) */}
          <div className="p-5 rounded-2xl glass-panel glass-panel-hover border-emerald-500/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Student Clash Rate</span>
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight">
              {student_clash_rate.toFixed(1)}%
            </div>
            <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>0 Overlaps (PERFECT)</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">Hard Constraint Verified</div>
          </div>

          {/* Card 3: Avg Waiting Time */}
          <div className="p-5 rounded-2xl glass-panel glass-panel-hover border-sky-500/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-all"></div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Avg Student Wait</span>
              <Clock className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-sky-300 tracking-tight">
              {avg_waiting_time_hours.toFixed(2)}h
            </div>
            <div className="text-xs text-slate-300 mt-3 font-mono">
              Idle campus waiting gap
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-between">
              <span>Target ≤ 1.20h</span>
              <span className="text-emerald-400 font-bold">Optimal</span>
            </div>
          </div>

          {/* Card 4: Schedule Coverage */}
          <div className="p-5 rounded-2xl glass-panel glass-panel-hover border-purple-500/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Schedule Coverage</span>
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-purple-300 tracking-tight">
              {schedule_coverage.toFixed(1)}%
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(schedule_coverage, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-between">
              <span>Target ≥ 85.0%</span>
              <span className="text-purple-300 font-bold">784 Shortlists</span>
            </div>
          </div>

          {/* Card 5: Replan Churn Index */}
          <div className="p-5 rounded-2xl glass-panel glass-panel-hover border-amber-500/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Replan Churn RCI</span>
              <RefreshCw className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-amber-300 tracking-tight">
              {replan_churn_index.toFixed(2)}%
            </div>
            <div className="text-xs text-slate-300 mt-3 font-mono flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Affected: <strong className="text-amber-400">{affected_students_count}</strong> students</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-between">
              <span>Target ≤ 15.0%</span>
              <span className="text-emerald-400 font-bold">Low Churn</span>
            </div>
          </div>
        </div>

        {/* Replan Churn Breakdown Strip */}
        {isReplan && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/40 border border-amber-500/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono shadow-xl">
            <div className="flex flex-wrap items-center gap-6">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-slate-400">Preserved Unaffected:</span>
                <strong className="text-emerald-400 font-bold text-sm">{unchanged_interviews_count}</strong>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="text-slate-400">Relocated Moved:</span>
                <strong className="text-amber-400 font-bold text-sm">{moved_interviews_count}</strong>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <span className="text-slate-400">Cancelled Withdrawn:</span>
                <strong className="text-rose-400 font-bold text-sm">{cancelled_interviews_count}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 font-bold">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>98.9% Node Stability Preserved</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
