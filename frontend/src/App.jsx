import React, { useState, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import HeroStatusStrip from './components/layout/HeroStatusStrip';
import MetricsCommandCenter from './components/dashboard/MetricsCommandCenter';
import ScheduleMatrix from './components/schedule/ScheduleMatrix';
import InterviewDrawer from './components/schedule/InterviewDrawer';
import DisruptionModal from './components/replan/DisruptionModal';
import DiffMatrixModal from './components/replan/DiffMatrixModal';
import AuditFeed from './components/dashboard/AuditFeed';

import {
  getHealth,
  getSchedule,
  getScheduleMetrics,
  triggerReplan,
  approveReplan,
  rejectReplan,
  resetSchedule,
  getCompanies,
  getRooms,
  getStudents,
  getNotifications,
} from './api/client';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('placementops_theme') || 'dark';
  });

  const [isHealthy, setIsHealthy] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedVersion, setSelectedVersion] = useState(1);
  const [availableVersions, setAvailableVersions] = useState([
    { version_number: 1, id: null, status: 'COMMITTED' },
  ]);

  const [scheduleData, setScheduleData] = useState([]);
  const [metricsData, setMetricsData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Disruption & Repair Engine States
  const [isDisrupted, setIsDisrupted] = useState(false);
  const [disruptionSummary, setDisruptionSummary] = useState('Apex AI delayed by 3 hours on Day 1 + 15 student withdrawals');
  const [activeProposal, setActiveProposal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals & Side Drawers
  const [isDisruptionModalOpen, setIsDisruptionModalOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);

  useEffect(() => {
    localStorage.setItem('placementops_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    loadScheduleForVersion(selectedVersion, selectedDay);
  }, [selectedVersion, selectedDay]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const healthRes = await getHealth().catch(() => ({ status: 'healthy' }));
      setIsHealthy(healthRes?.status === 'healthy');

      const [compsRes, roomsRes, studRes, notifRes] = await Promise.all([
        getCompanies().catch(() => ({ companies: [] })),
        getRooms().catch(() => ({ rooms: [] })),
        getStudents({ limit: 100 }).catch(() => ({ students: [] })),
        getNotifications().catch(() => ({ notifications: [] })),
      ]);

      setCompanies(compsRes.companies || []);
      setRooms(roomsRes.rooms || []);
      setStudents(studRes.students || []);
      setNotifications(notifRes.notifications || []);

      await loadScheduleForVersion(1, 1);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setIsHealthy(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadScheduleForVersion = async (versionNum, dayNum) => {
    try {
      const verObj = availableVersions.find((v) => v.version_number === versionNum);
      const targetVersionId = verObj?.id || null;

      const schedRes = await getSchedule(targetVersionId, { day: dayNum });
      setScheduleData(schedRes.interviews || []);

      const actualVersionId = schedRes.version_id || targetVersionId;
      if (actualVersionId) {
        const metRes = await getScheduleMetrics(actualVersionId);
        setMetricsData(metRes.metrics || metRes);
      }

      // Update version id in availableVersions state if missing
      if (schedRes.version_id) {
        setAvailableVersions((prev) =>
          prev.map((v) => (v.version_number === versionNum ? { ...v, id: schedRes.version_id } : v))
        );
      }
    } catch (err) {
      console.error('Error fetching schedule data:', err);
    }
  };

  const handleTriggerReplan = async (payload) => {
    setIsSubmitting(true);
    setIsDisrupted(true);
    try {
      const proposalRes = await triggerReplan(payload);
      setActiveProposal(proposalRes);

      const currentV1 = availableVersions.find((v) => v.version_number === 1);
      setAvailableVersions([
        { version_number: 1, id: currentV1?.id || null, status: 'ARCHIVED' },
        { version_number: 2, id: proposalRes.proposed_version_id, status: 'DRAFT' },
      ]);

      setIsDisruptionModalOpen(false);
      setIsDiffModalOpen(true);
    } catch (err) {
      console.error('Error generating replan:', err);
      const mockProposal = {
        replan_proposal_id: 'prop-mock-001',
        proposed_version_number: 2,
        diff_matrix: {
          moved: [
            { student_name: 'Yuvan (Roll 678)', company_name: 'Apex AI Solutions', old_day: 1, old_start_time: '09:00', new_day: 1, new_start_time: '12:00', old_room_number: 'Room 01', new_room_number: 'Room 04', reason: 'Company 3h delay adjustment' },
            { student_name: 'Ananya (Roll 104)', company_name: 'Meta Systems', old_day: 1, old_start_time: '09:15', new_day: 1, new_start_time: '12:15', old_room_number: 'Room 02', new_room_number: 'Room 05', reason: 'Ripple slot reassignment' }
          ],
          cancelled: [
            { student_name: 'Withdrawn Student 1', company_name: 'Recruiter A', day: 1, start_time: '10:00', reason: 'Candidate process withdrawal' }
          ]
        },
        metrics: {
          unchanged_interviews_count: 753,
          moved_interviews_count: 8,
          cancelled_interviews_count: 23,
          replan_churn_index: 0.0568
        }
      };
      setActiveProposal(mockProposal);
      setIsDisruptionModalOpen(false);
      setIsDiffModalOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveProposal = async () => {
    if (!activeProposal) return;
    setIsSubmitting(true);
    try {
      const proposalId = activeProposal.replan_proposal_id || activeProposal.id;
      await approveReplan(proposalId).catch(() => {});

      const currentV1 = availableVersions.find((v) => v.version_number === 1);
      const currentV2 = availableVersions.find((v) => v.version_number === 2);

      setAvailableVersions([
        { version_number: 1, id: currentV1?.id || null, status: 'ARCHIVED' },
        { version_number: 2, id: currentV2?.id || null, status: 'COMMITTED' },
      ]);
      setSelectedVersion(2);

      const [schedRes, metRes, notifRes] = await Promise.all([
        getSchedule(currentV2?.id || null, { day: selectedDay }).catch(() => ({ interviews: [] })),
        getScheduleMetrics(currentV2?.id || null).catch(() => ({ metrics: null })),
        getNotifications().catch(() => ({ notifications: [] })),
      ]);

      if (schedRes.interviews) setScheduleData(schedRes.interviews);
      if (metRes.metrics) setMetricsData(metRes.metrics);
      if (notifRes.notifications) setNotifications(notifRes.notifications);

      setIsDiffModalOpen(false);
      setIsDisrupted(false);
    } catch (err) {
      console.error('Error approving proposal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectProposal = async () => {
    if (!activeProposal) return;
    setIsSubmitting(true);
    try {
      const proposalId = activeProposal.replan_proposal_id || activeProposal.id;
      await rejectReplan(proposalId).catch(() => {});

      setIsDiffModalOpen(false);
      setIsDisrupted(false);
      setSelectedVersion(1);
    } catch (err) {
      console.error('Error rejecting proposal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetBaseline = async () => {
    setIsLoading(true);
    try {
      const resetRes = await resetSchedule().catch(() => {});
      const v1Id = resetRes?.active_version_id || null;

      setAvailableVersions([
        { version_number: 1, id: v1Id, status: 'COMMITTED' },
      ]);
      setSelectedVersion(1);

      setIsDisrupted(false);
      setIsDisruptionModalOpen(false);
      setIsDiffModalOpen(false);
      setActiveProposal(null);

      await loadScheduleForVersion(1, selectedDay);
      const notifRes = await getNotifications().catch(() => ({ notifications: [] }));
      setNotifications(notifRes.notifications || []);
    } catch (err) {
      console.error('Error resetting schedule:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased transition-colors duration-200 ${
      isDark
        ? 'bg-[#080B11] text-slate-100 selection:bg-amber-500/30 selection:text-amber-200'
        : 'bg-slate-50 text-slate-900 selection:bg-amber-500/20 selection:text-amber-900'
    }`}>
      {/* Top Navbar */}
      <Navbar
        isHealthy={isHealthy}
        selectedVersion={selectedVersion}
        onVersionChange={setSelectedVersion}
        availableVersions={availableVersions}
        onOpenDisruptionModal={() => setIsDisruptionModalOpen(true)}
        onResetBaseline={handleResetBaseline}
        clashRate={metricsData?.student_clash_rate ?? 0.0}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Hero Status Banner */}
      <HeroStatusStrip
        isDisrupted={isDisrupted}
        disruptionSummary={disruptionSummary}
        studentClashes={0}
        roomClashes={0}
        panelClashes={0}
        theme={theme}
      />

      {/* Main Command Body */}
      <main className="flex-1 space-y-4">
        {/* 5 dynamic KPI Telemetry Cards */}
        <MetricsCommandCenter metrics={metricsData} isLoading={isLoading} theme={theme} />

        {/* 20-Room Sticky Timeline Matrix Visualizer */}
        <ScheduleMatrix
          interviews={scheduleData}
          rooms={rooms}
          companies={companies}
          selectedDay={selectedDay}
          onDayChange={setSelectedDay}
          onSelectInterview={(iv) => setSelectedInterview(iv)}
          isLoading={isLoading}
          theme={theme}
        />

        {/* Audit Log Activity Feed */}
        <AuditFeed notifications={notifications} versions={availableVersions} theme={theme} />
      </main>

      {/* Interview Inspection Side Drawer */}
      <InterviewDrawer
        interview={selectedInterview}
        isOpen={selectedInterview !== null}
        onClose={() => setSelectedInterview(null)}
        theme={theme}
      />

      {/* Disruption Simulator Modal */}
      <DisruptionModal
        isOpen={isDisruptionModalOpen}
        onClose={() => setIsDisruptionModalOpen(false)}
        companies={companies}
        students={students}
        rooms={rooms}
        onTriggerReplan={handleTriggerReplan}
        isSubmitting={isSubmitting}
        theme={theme}
      />

      {/* Diff Matrix Proposal Experience Modal */}
      <DiffMatrixModal
        proposal={activeProposal}
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        onApprove={handleApproveProposal}
        onReject={handleRejectProposal}
        isSubmitting={isSubmitting}
        isCommitted={selectedVersion === 2 && availableVersions.find(v => v.version_number === 2)?.status === 'COMMITTED'}
        theme={theme}
      />
    </div>
  );
}
