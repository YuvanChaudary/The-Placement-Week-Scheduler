import React, { useState } from 'react';
import { Zap, AlertTriangle, Clock, UserX, DoorClosed, Play, Sparkles } from 'lucide-react';

export default function LiveDisruptionPanel({
  isOpen,
  onClose,
  companies = [],
  students = [],
  rooms = [],
  onTriggerReplan,
  isSubmitting,
}) {
  const [disruptionType, setDisruptionType] = useState('LIVE_DEFENSE_COMBINED');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [delayHours, setDelayHours] = useState(3);
  const [delayDay, setDelayDay] = useState(1);
  const [withdrawnStudentId, setWithdrawnStudentId] = useState('');

  if (!isOpen) return null;

  const handlePresetLiveDefense = () => {
    const t1Comp = companies.find((c) => c.priority_tier === 1) || companies[0];
    const compId = t1Comp ? t1Comp.id : '';
    const studentIds = students.slice(0, 15).map((s) => s.id);

    const payload = {
      disruption_type: 'LIVE_DEFENSE_COMBINED',
      company_delays: [
        {
          company_id: compId,
          delay_hours: 3,
          day: 1,
        },
      ],
      student_withdrawals: studentIds,
      panel_dropouts: [],
      room_unavailabilities: [],
    };

    onTriggerReplan(payload);
  };

  const handleSubmitCustom = () => {
    let payload = {
      disruption_type: disruptionType,
      company_delays: [],
      student_withdrawals: [],
      panel_dropouts: [],
      room_unavailabilities: [],
    };

    if (disruptionType === 'COMPANY_DELAY') {
      const compId = selectedCompanyId || (companies[0] ? companies[0].id : '');
      payload.company_delays.push({
        company_id: compId,
        delay_hours: Number(delayHours),
        day: Number(delayDay),
      });
    } else if (disruptionType === 'STUDENT_WITHDRAWAL') {
      const studId = withdrawnStudentId || (students[0] ? students[0].id : '');
      payload.student_withdrawals.push(studId);
    } else if (disruptionType === 'LIVE_DEFENSE_COMBINED') {
      handlePresetLiveDefense();
      return;
    }

    onTriggerReplan(payload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 shadow-2xl overflow-hidden glass-panel">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 rounded-2xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                Live Disruption Simulator
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              </h2>
              <p className="text-xs text-slate-400 font-mono">Inject real-time placement week disruptions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Live Defense Scenario Preset Banner */}
        <div className="my-5 p-4 bg-gradient-to-r from-amber-950/60 via-orange-950/40 to-slate-900 border border-amber-500/50 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 text-[10px] font-mono bg-amber-500/30 text-amber-300 rounded-full font-extrabold uppercase border border-amber-500/40">
                Official Live Defense Scenario
              </span>
              <h3 className="text-sm font-bold text-amber-200 mt-2">
                Preset: Tier 1 Company Delay + 15 Withdrawals
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Delays Apex AI Solutions by 3 hours on Day 1 (09:00 → 12:00) and triggers 15 student withdrawals.
              </p>
            </div>
            <button
              onClick={handlePresetLiveDefense}
              disabled={isSubmitting}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/30 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{isSubmitting ? 'Simulating...' : 'Run Defense Preset'}</span>
            </button>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 font-mono">
          Or Configure Custom Disruption
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setDisruptionType('COMPANY_DELAY')}
            className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-bold cursor-pointer transition-all ${
              disruptionType === 'COMPANY_DELAY'
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-950/40'
                : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Company Delay</span>
          </button>

          <button
            onClick={() => setDisruptionType('STUDENT_WITHDRAWAL')}
            className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-bold cursor-pointer transition-all ${
              disruptionType === 'STUDENT_WITHDRAWAL'
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-950/40'
                : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <UserX className="w-4 h-4 text-rose-400" />
            <span>Student Withdrawal</span>
          </button>
        </div>

        {disruptionType === 'COMPANY_DELAY' && (
          <div className="space-y-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 mb-6 font-mono">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Company:</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 focus:outline-none"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Tier {c.priority_tier})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Delay Duration:</label>
                <select
                  value={delayHours}
                  onChange={(e) => setDelayHours(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5"
                >
                  <option value={1}>1 Hour Delay</option>
                  <option value={2}>2 Hours Delay</option>
                  <option value={3}>3 Hours Delay (09:00 → 12:00)</option>
                  <option value={4}>4 Hours Delay</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Day of Delay:</label>
                <select
                  value={delayDay}
                  onChange={(e) => setDelayDay(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5"
                >
                  <option value={1}>Day 1</option>
                  <option value={2}>Day 2</option>
                  <option value={3}>Day 3</option>
                  <option value={4}>Day 4</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {disruptionType === 'STUDENT_WITHDRAWAL' && (
          <div className="space-y-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 mb-6 font-mono">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Student to Withdraw:</label>
              <select
                value={withdrawnStudentId}
                onChange={(e) => setWithdrawnStudentId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.roll_number}) - {s.branch}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitCustom}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl font-extrabold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Generating Replan...' : 'Execute Replan Engine'}
          </button>
        </div>
      </div>
    </div>
  );
}
