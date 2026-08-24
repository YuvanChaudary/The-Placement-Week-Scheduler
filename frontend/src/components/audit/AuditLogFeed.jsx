import React from 'react';
import { History, Bell, Send, ShieldCheck, Activity, Cpu } from 'lucide-react';

export default function AuditLogFeed({ notifications = [], versions = [] }) {
  return (
    <div className="px-6 py-6 border-t border-slate-800/80 bg-slate-950/80 font-mono text-xs">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <History className="w-4 h-4 text-indigo-400" />
            <span>AUDIT LOG & DISPATCH FEED</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Dispatched Alerts: <strong className="text-indigo-400">{notifications.length}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Version Transitions */}
          <div className="surface-card rounded-xl p-4 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Schedule Audit Trail
              </span>
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {versions.length === 0 ? (
                <div className="text-[11px] text-slate-500 py-3 text-center">● Baseline schedule loaded</div>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.version_number}
                    className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-300">Version {v.version_number}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.status === 'COMMITTED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[10px]">{v.created_by || 'Greedy Scheduler Engine'}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dispatch Notifications */}
          <div className="surface-card rounded-xl p-4 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-indigo-400" />
                Dispatched Student Notifications
              </span>
              <span className="text-[10px] text-slate-500">Live Channels</span>
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="text-[11px] text-slate-500 py-3 text-center">
                  No notifications dispatched yet. Approving a replan dispatches student alerts.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-2.5"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-300 text-[11px] leading-tight font-medium">{n.message}</p>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Target: {n.recipient_type} • Channel: {n.channel}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
