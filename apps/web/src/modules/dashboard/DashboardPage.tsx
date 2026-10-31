import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '../../components/Sidebar';
import { OverviewView } from './OverviewView';
import { DeputyDashboardView } from './DeputyDashboardView';
import { DosDashboardView } from './DosDashboardView';
import { StaffManagementView } from '../staff/StaffManagementView';
import { SettingsView } from '../settings/SettingsView';
import { FeeStructureView } from '../finance/FeeStructureView';
import { FinancialManagementView } from '../finance/FinancialManagementView';
import { StudentAdmissionView } from '../admissions/StudentAdmissionView';
import { OfficialLetterView } from '../letters/OfficialLetterView';
import { AllocationView } from '../allocations/AllocationView';
import { LeaveManagementView } from '../leave/LeaveManagementView';
import { InventoryView } from '../inventory/InventoryView';
import { AttendanceOversightView } from '../attendance/AttendanceOversightView';
import { MarkReviewView } from '../marks/MarkReviewView';
import { ExamTimetableView } from '../exams/ExamTimetableView';
import { MarkingAllocationView } from '../exams/MarkingAllocationView';
import { ReportCardLockView } from '../exams/ReportCardLockView';
import { SubjectPerformanceView } from '../dos/SubjectPerformanceView';

interface DashboardPageProps {
  user: any;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [activeView, setActiveView] = useState<string>('overview');
  const userRole = user?.roleName || 'HEAD_TEACHER';

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50/40 via-white to-sky-50/30 text-slate-800 flex font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        activeView={activeView}
        onNavigate={(viewId) => setActiveView(viewId)}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 lg:overflow-y-auto lg:h-screen">
        <div className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          <AnimatePresence mode="wait">
            {activeView === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {userRole === 'DEPUTY_HEAD' || userRole === 'DEPUTY_HEAD_TEACHER' ? (
                  <DeputyDashboardView onNavigate={(viewId) => setActiveView(viewId)} />
                ) : userRole === 'DOS' ? (
                  <DosDashboardView onNavigate={(viewId) => setActiveView(viewId)} />
                ) : (
                  <OverviewView onNavigate={(viewId) => setActiveView(viewId)} />
                )}
              </motion.div>
            )}

            {activeView === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SettingsView />
              </motion.div>
            )}

            {activeView === 'fee_structure' && (
              <motion.div
                key="fee_structure"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <FeeStructureView />
              </motion.div>
            )}

            {activeView === 'finance' && (
              <motion.div
                key="finance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <FinancialManagementView />
              </motion.div>
            )}

            {activeView === 'admissions' && (
              <motion.div
                key="admissions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <StudentAdmissionView />
              </motion.div>
            )}

            {activeView === 'letters' && (
              <motion.div
                key="letters"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <OfficialLetterView />
              </motion.div>
            )}

            {activeView === 'allocations' && (
              <motion.div
                key="allocations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <AllocationView />
              </motion.div>
            )}

            {activeView === 'leave_requests' && (
              <motion.div
                key="leave_requests"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <LeaveManagementView />
              </motion.div>
            )}

            {activeView === 'inventory' && (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <InventoryView />
              </motion.div>
            )}

            {activeView === 'attendance_oversight' && (
              <motion.div
                key="attendance_oversight"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <AttendanceOversightView />
              </motion.div>
            )}

            {activeView === 'mark_review' && (
              <motion.div
                key="mark_review"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <MarkReviewView />
              </motion.div>
            )}

            {activeView === 'exams' && (
              <motion.div
                key="exams"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ExamTimetableView />
              </motion.div>
            )}

            {activeView === 'marking_allocations' && (
              <motion.div
                key="marking_allocations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <MarkingAllocationView />
              </motion.div>
            )}

            {activeView === 'report_locks' && (
              <motion.div
                key="report_locks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ReportCardLockView />
              </motion.div>
            )}

            {activeView === 'subject_analytics' && (
              <motion.div
                key="subject_analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SubjectPerformanceView />
              </motion.div>
            )}

            {activeView === 'staff' && (
              <motion.div
                key="staff"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <StaffManagementView />
              </motion.div>
            )}

            {/* Dynamic View Router Container for remaining sub-pages */}
            {activeView !== 'overview' && activeView !== 'settings' && activeView !== 'fee_structure' && activeView !== 'admissions' && activeView !== 'letters' && activeView !== 'allocations' && activeView !== 'leave_requests' && activeView !== 'inventory' && activeView !== 'attendance_oversight' && activeView !== 'mark_review' && activeView !== 'exams' && activeView !== 'invigilation' && activeView !== 'marking_allocations' && activeView !== 'report_locks' && activeView !== 'subject_analytics' && activeView !== 'staff' && (
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center min-h-[50vh] bg-white/85 backdrop-blur-md rounded-3xl border border-sky-100 p-8 text-center shadow-glass"
              >
                <div className="w-16 h-16 bg-sky-50 border border-sky-100 text-sky-600 rounded-2xl flex items-center justify-center font-bold text-xl mb-4 shadow-sm">
                  {activeView.substring(0, 2).toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-slate-800 capitalize">
                  {activeView.replace('_', ' ')} Module
                </h3>
                <p className="text-xs text-slate-500 mt-2 max-w-md">
                  This page route is active in the Sidebar Navigation layout and will be populated as we execute the Bursar and Secretary mini-modules.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
