import React, { useState } from 'react';
import { Zap, Clock, UserX, Play, AlertTriangle } from 'lucide-react';

export default function LiveDisruptionModal({
  isOpen,
  onClose,
  companies = [],
  students = [],
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl overflow-hidden surface-card">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-100">
                Live Disruption Simulator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Inject real-time placement week disruptions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Defense Preset Banner */}
        <div className="my-5 p-4 bg-amber-950/30 border border-amber-500/40 rounded-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 rounded font-bold uppercase">
                Official Live Defense Scenario
              </span>
              <h3 className="text-sm font-bold text-amber-200 mt-1.5">
                Apex AI Delay (3h, Day 1) + 15 Withdrawals
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Delays Apex AI Solutions by 3 hours on Day 1 (09:00 → 12:00) and triggers 15 student withdrawals.
              </p>
            </div>
            <button
              onClick={handlePresetLiveDefense}
              disabled={isSubmitting}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Run Defense Preset</span>
            </button>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Custom Disruption Configuration
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5 text-xs font-bold">
          <button
            onClick={() => setDisruptionType('COMPANY_DELAY')}
            className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
              disruptionType === 'COMPANY_DELAY'
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Company Delay</span>
          </button>

          <button
            onClick={() => setDisruptionType('STUDENT_WITHDRAWAL')}
            className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
              disruptionType === 'STUDENT_WITHDRAWAL'
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}
          >
            <UserX className="w-4 h-4 text-rose-400" />
            <span>Student Withdrawal</span>
          </button>
        </div>

        {disruptionType === 'COMPANY_DELAY' && (
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 mb-6 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Target Company:</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2"
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
                <label className="block text-slate-300 font-bold mb-1">Delay Duration:</label>
                <select
                  value={delayHours}
                  onChange={(e) => setDelayHours(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2"
                >
                  <option value={1}>1 Hour Delay</option>
                  <option value={2}>2 Hours Delay</option>
                  <option value={3}>3 Hours Delay (09:00 → 12:00)</option>
                  <option value={4}>4 Hours Delay</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Day of Delay:</label>
                <select
                  value={delayDay}
                  onChange={(e) => setDelayDay(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2"
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

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitCustom}
            disabled={isSubmitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl font-extrabold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Evaluating...' : 'Execute Replan Engine'}
          </button>
        </div>
      </div>
    </div>
  );
}
