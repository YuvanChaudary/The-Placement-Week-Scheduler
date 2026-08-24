import React from 'react';
import { History, Bell, Send, ShieldCheck, Activity } from 'lucide-react';

export default function AuditFeed({ notifications = [], versions = [] }) {
  return (
    <div className="px-6 py-8 border-t border-slate-800/80 bg-slate-950/60 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2 font-mono">
                Audit Feed & Real-Time Dispatch Logs
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Version Transition Tracking • Live Channel Alerts Dispatched
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-slate-400">
            Dispatched Alerts: <strong className="text-indigo-400 font-bold">{notifications.length}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Version Transitions */}
          <div className="glass-panel rounded-2xl p-5 border-slate-800/80 shadow-xl">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between font-mono">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Schedule Version History
              </span>
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
            </h4>
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {versions.length === 0 ? (
                <div className="text-xs text-slate-400 font-mono py-6 text-center">No versions recorded.</div>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.version_number}
                    className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs font-mono shadow-inner hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-indigo-300">Version {v.version_number}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          v.status === 'COMMITTED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[10px]">{v.created_by || 'Greedy Scheduler Engine'}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dispatch Notifications */}
          <div className="glass-panel rounded-2xl p-5 border-slate-800/80 shadow-xl">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between font-mono">
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                Dispatched Student Notifications
              </span>
              <span className="text-[10px] text-slate-400">SMS / Email / Push</span>
            </h4>
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="text-xs text-slate-400 font-mono py-6 text-center leading-relaxed">
                  No notifications dispatched yet. Approving a replan proposal automatically triggers student notifications.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs font-mono flex items-start gap-3 shadow-inner"
                  >
                    <Send className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-slate-200 text-[11px] leading-tight font-medium">{n.message}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-mono">
                        <span>Target: <strong className="text-slate-300">{n.recipient_type}</strong></span>
                        <span>•</span>
                        <span>Channel: <strong className="text-indigo-400">{n.channel}</strong></span>
                      </div>
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
