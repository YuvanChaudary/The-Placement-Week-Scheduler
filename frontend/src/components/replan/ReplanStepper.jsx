import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, Cpu, ShieldAlert, RefreshCw, Sparkles, Layers } from 'lucide-react';

export default function ReplanStepper({ activeStep = 0, latencyMs = null }) {
  const steps = [
    { title: 'Blast Radius Detection', desc: 'Identifying affected downstream interviews & student bitmasks', icon: ShieldAlert },
    { title: 'Slot Invalidation', desc: 'Unsetting occupied 144-bit vectors for impacted nodes', icon: Cpu },
    { title: 'Bitmask Reclaim', desc: 'Reclaiming room and panel availability intervals', icon: Layers },
    { title: 'Level-0 Direct Repair', desc: 'Attempting zero-ripple direct slot reassignment', icon: RefreshCw },
    { title: 'Level-1 Ripple Repair', desc: 'Progressive ripple displacement within day boundary', icon: Sparkles },
    { title: 'Diff Proposal Synthesis', desc: 'Constructing candidate version & calculating Replan Churn Index', icon: CheckCircle2 },
  ];

  return (
    <div className="p-6 rounded-xl border border-amber-900/40 bg-amber-950/10 backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
          <h3 className="font-mono font-bold text-amber-400 text-sm tracking-wide">
            PROGRESSIVE REPAIR ENGINE EXECUTING...
          </h3>
        </div>
        {latencyMs !== null && (
          <span className="text-xs font-mono bg-slate-900 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
            Latency: <strong className="text-amber-400">{latencyMs} ms</strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {steps.map((step, idx) => {
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;
          const Icon = step.icon;

          return (
            <div
              key={step.title}
              className={`p-3 rounded-lg border text-xs transition-all duration-300 flex items-start gap-3 ${
                isDone
                  ? 'border-emerald-800/50 bg-emerald-950/20 text-emerald-300'
                  : isCurrent
                  ? 'border-amber-500/60 bg-amber-950/30 text-amber-300 animate-pulse shadow-md'
                  : 'border-slate-800/60 bg-slate-900/40 text-slate-500'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 text-slate-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono font-bold flex items-center justify-between">
                  <span className="truncate">Phase {idx + 1}: {step.title}</span>
                  {isDone && <span className="text-[10px] text-emerald-400">DONE</span>}
                </div>
                <div className="text-[11px] text-slate-400 font-sans mt-0.5 truncate">
                  {step.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
