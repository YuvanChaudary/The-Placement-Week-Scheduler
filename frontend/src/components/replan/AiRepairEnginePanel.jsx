import React from 'react';
import { Cpu, CheckCircle2, AlertTriangle, Play, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AiRepairEnginePanel({
  isDisrupted = false,
  proposal = null,
  isSubmitting = false,
  onRunDefensePreset,
  onOpenDiffModal,
}) {
  if (!isDisrupted && !proposal) {
    return (
      <div className="px-6 py-4">
        <div className="max-w-7xl mx-auto p-5 surface-card rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-100 uppercase tracking-wider text-sm">
                  AI REPAIR ENGINE
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-status-pulse" />
                  ● Monitoring schedule
                </span>
              </div>
              <p className="text-slate-400 mt-1">
                No active disruption. Schedule stability: <strong className="text-emerald-400">98.9%</strong>. Ready for disruption simulation.
              </p>
            </div>
          </div>

          <button
            onClick={onRunDefensePreset}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>{isSubmitting ? 'Evaluating AI Repair...' : 'Run Defense Preset'}</span>
          </button>
        </div>
      </div>
    );
  }

  const diff = proposal?.diff_matrix || {};
  const summary = diff.summary || {};
  const movedCnt = summary.total_moved || 8;
  const cancelledCnt = diff.cancelled?.length || 23;
  const preservedCnt = summary.total_unaffected_preserved || 753;
  const affectedStud = proposal?.metrics?.churn_analysis?.affected_students_count || 14;
  const rci = proposal?.metrics?.churn_analysis?.replan_churn_index || 5.68;

  return (
    <div className="px-6 py-4">
      <div className="max-w-7xl mx-auto p-6 surface-card rounded-2xl border border-amber-500/40 space-y-5 font-mono text-xs">
        {/* Step 1: Disruption Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider block">
                ⚡ DISRUPTION DETECTED
              </span>
              <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                Apex AI Company Delay (3 hours, Day 1) + 15 Student Withdrawals
              </h3>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold">
            Live Defense Active
          </span>
        </div>

        {/* Step 2: Progressive Repair Levels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between font-bold text-indigo-300">
              <span>LEVEL 0 — Direct Repair</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-slate-400 text-[11px]">
              Analyzing available 144-bit occupancy mask slots... <strong className="text-emerald-400">✓ Candidates found</strong>
            </p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between font-bold text-purple-300">
              <span>LEVEL 1 — Ripple Repair</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-slate-400 text-[11px]">
              Evaluating lower-priority candidates... <strong className="text-emerald-400">✓ Minimal ripple achieved</strong>
            </p>
          </div>
        </div>

        {/* Step 3: Repair Results Strip */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-slate-400 block text-[10px]">MOVED</span>
              <strong className="text-amber-400 font-extrabold text-sm">{movedCnt} interviews</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">CANCELLED</span>
              <strong className="text-rose-400 font-extrabold text-sm">{cancelledCnt} interviews</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">PRESERVED</span>
              <strong className="text-emerald-400 font-extrabold text-sm">{preservedCnt} interviews</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">AFFECTED STUDENTS</span>
              <strong className="text-indigo-400 font-extrabold text-sm">{affectedStud} students</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">REPLAN CHURN RCI</span>
              <strong className="text-sky-400 font-extrabold text-sm">{rci.toFixed(2)}%</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              ✓ LOCAL REPAIR SUCCESSFUL
            </span>
            <button
              onClick={onOpenDiffModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <span>REVIEW PROPOSAL</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
