import React, { useState } from 'react';
import { X, Zap, Building, Users, Play, ShieldAlert } from 'lucide-react';
import ReplanStepper from './ReplanStepper';

export default function DisruptionModal({
  isOpen = false,
  onClose,
  companies = [],
  students = [],
  rooms = [],
  onTriggerReplan,
  isSubmitting = false,
  theme = 'dark',
}) {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('PRESET');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [delayHours, setDelayHours] = useState(3);
  const [delayDay, setDelayDay] = useState(1);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [replanStep, setReplanStep] = useState(0);

  if (!isOpen) return null;

  const handleRunPreset = async () => {
    const t1Comp = companies.find((c) => c.priority_tier === 1) || companies[0];
    const compId = t1Comp ? t1Comp.id : '';
    const withdrawStudentIds = students.slice(0, 15).map((s) => s.id);

    const payload = {
      disruption_type: 'LIVE_DEFENSE_COMBINED',
      company_delays: [
        {
          company_id: compId,
          delay_hours: 3,
          day: 1,
        },
      ],
      student_withdrawals: withdrawStudentIds,
      panel_dropouts: [],
      room_unavailabilities: [],
    };

    simulateStepperAndSubmit(payload);
  };

  const handleCustomSubmit = () => {
    const payload = {
      disruption_type: 'CUSTOM',
      company_delays: selectedCompanyId
        ? [{ company_id: selectedCompanyId, delay_hours: Number(delayHours), day: Number(delayDay) }]
        : [],
      student_withdrawals: selectedStudentIds,
      panel_dropouts: [],
      room_unavailabilities: [],
    };

    simulateStepperAndSubmit(payload);
  };

  const simulateStepperAndSubmit = async (payload) => {
    setReplanStep(1);
    await new Promise((r) => setTimeout(r, 200));
    setReplanStep(2);
    await new Promise((r) => setTimeout(r, 200));
    setReplanStep(3);
    await new Promise((r) => setTimeout(r, 200));
    setReplanStep(4);
    await new Promise((r) => setTimeout(r, 200));
    setReplanStep(5);
    
    if (onTriggerReplan) {
      await onTriggerReplan(payload);
    }
    setReplanStep(6);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
        isDark ? 'bg-[#0F172A] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500">
              <Zap className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h2 className="font-mono font-bold text-base tracking-tight">
                Disruption Injector & Replan Engine
              </h2>
              <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Inject schedule shocks to trigger progressive repair radius
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {isSubmitting ? (
            <ReplanStepper activeStep={replanStep} />
          ) : (
            <>
              {/* Tab Navigation */}
              <div className={`flex items-center gap-2 p-1 border rounded-xl ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  onClick={() => setActiveTab('PRESET')}
                  className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'PRESET'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>⚡ LIVE DEFENSE PRESET</span>
                </button>
                <button
                  onClick={() => setActiveTab('COMPANY')}
                  className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'COMPANY'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>COMPANY DELAY</span>
                </button>
                <button
                  onClick={() => setActiveTab('STUDENT')}
                  className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'STUDENT'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>WITHDRAWALS</span>
                </button>
              </div>

              {/* Tab 1: Live Defense Preset */}
              {activeTab === 'PRESET' && (
                <div className={`p-5 rounded-xl border space-y-4 ${
                  isDark ? 'border-amber-900/40 bg-amber-950/10' : 'border-amber-200 bg-amber-50'
                }`}>
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-mono font-bold text-amber-500 text-sm">
                        Standard Live Defense Test Scenario
                      </h3>
                      <p className={`text-xs font-sans mt-1 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Injects a simultaneous multi-point disruption:
                      </p>
                      <ul className="text-xs font-mono text-amber-500 list-disc list-inside mt-2 space-y-1">
                        <li><strong>Apex AI Solutions:</strong> 3-Hour Delay on Day 1</li>
                        <li><strong>Student Withdrawals:</strong> 15 Candidates Withdrawn</li>
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={handleRunPreset}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>⚡ RUN LIVE DEFENSE PRESET DISRUPTION</span>
                  </button>
                </div>
              )}

              {/* Tab 2: Custom Company Delay */}
              {activeTab === 'COMPANY' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className={`text-xs font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Target Company:
                    </label>
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className={`w-full border rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-amber-500 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="">Select a company...</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Tier {c.priority_tier})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={`text-xs font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Delay Duration (Hours):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={delayHours}
                        onChange={(e) => setDelayHours(e.target.value)}
                        className={`w-full border rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-amber-500 ${
                          isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={`text-xs font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Impact Day:
                      </label>
                      <select
                        value={delayDay}
                        onChange={(e) => setDelayDay(e.target.value)}
                        className={`w-full border rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-amber-500 ${
                          isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        {[1, 2, 3, 4].map((d) => (
                          <option key={d} value={d}>Day {d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleCustomSubmit}
                    disabled={!selectedCompanyId}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>EXECUTE COMPANY DELAY DISRUPTION</span>
                  </button>
                </div>
              )}

              {/* Tab 3: Student Withdrawals */}
              {activeTab === 'STUDENT' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className={`text-xs font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Select Withdrawing Candidates (Multi-Select):
                    </label>
                    <div className={`max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1 ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      {students.map((s) => {
                        const isSelected = selectedStudentIds.includes(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedStudentIds(selectedStudentIds.filter((id) => id !== s.id));
                              } else {
                                setSelectedStudentIds([...selectedStudentIds, s.id]);
                              }
                            }}
                            className={`p-2 rounded text-xs font-mono flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                                : isDark
                                ? 'text-slate-300 hover:bg-slate-800'
                                : 'text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <span>{s.name} ({s.roll_number})</span>
                            <span className="text-[10px] opacity-70">CGPA: {s.cgpa}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleCustomSubmit}
                    disabled={selectedStudentIds.length === 0}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>WITHDRAW {selectedStudentIds.length} SELECTED CANDIDATES</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
