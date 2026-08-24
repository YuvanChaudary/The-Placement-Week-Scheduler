import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorState({ title = "Unable to load schedule data", message = "Could not connect to backend service.", onRetry }) {
  return (
    <div className="p-8 surface-card rounded-2xl border border-rose-500/30 text-center max-w-lg mx-auto my-8">
      <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl w-fit mx-auto mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-100">{title}</h3>
      <p className="text-xs text-slate-400 font-mono mt-1 mb-5">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
}
