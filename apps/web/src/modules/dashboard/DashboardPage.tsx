import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '../../components/Sidebar';
import { OverviewView } from './OverviewView';
import { StaffManagementView } from '../staff/StaffManagementView';
import { SettingsView } from '../settings/SettingsView';
import { FeeStructureView } from '../finance/FeeStructureView';
import { StudentAdmissionView } from '../admissions/StudentAdmissionView';
import { OfficialLetterView } from '../letters/OfficialLetterView';
import { AllocationView } from '../allocations/AllocationView';
import { LeaveManagementView } from '../leave/LeaveManagementView';
import { InventoryView } from '../inventory/InventoryView';

interface DashboardPageProps {
  user: any;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [activeView, setActiveView] = useState<string>('overview');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        activeView={activeView}
        onNavigate={(viewId) => setActiveView(viewId)}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
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
                <OverviewView onNavigate={(viewId) => setActiveView(viewId)} />
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
            {activeView !== 'overview' && activeView !== 'settings' && activeView !== 'fee_structure' && activeView !== 'admissions' && activeView !== 'letters' && activeView !== 'allocations' && activeView !== 'leave_requests' && activeView !== 'inventory' && activeView !== 'staff' && (
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center min-h-[50vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-sm"
              >
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-bold text-xl mb-4">
                  {activeView.substring(0, 2).toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                  {activeView.replace('_', ' ')} Module
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md">
                  This page route is active in the Sidebar Navigation layout and will be populated as we execute the Deputy Head Teacher mini-modules.
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
