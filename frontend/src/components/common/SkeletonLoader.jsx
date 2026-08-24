import React from 'react';

export default function SkeletonLoader({ type = 'card', count = 1 }) {
  const items = Array.from({ length: count });

  if (type === 'kpi') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {items.map((_, i) => (
          <div key={i} className="p-4 rounded-2xl surface-card border border-slate-800 animate-pulse">
            <div className="h-3 w-24 bg-slate-800 rounded mb-3"></div>
            <div className="h-8 w-16 bg-slate-800 rounded mb-2"></div>
            <div className="h-2 w-full bg-slate-800 rounded mt-3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'timeline') {
    return (
      <div className="p-6 surface-card rounded-2xl border border-slate-800 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-800 rounded"></div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-full bg-slate-800/60 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 surface-card rounded-xl border border-slate-800 animate-pulse">
      <div className="h-4 w-3/4 bg-slate-800 rounded mb-2"></div>
      <div className="h-3 w-1/2 bg-slate-800 rounded"></div>
    </div>
  );
}
