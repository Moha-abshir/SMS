import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Users, LogOut, BookOpen, ShieldCheck, CalendarCheck, Calculator, UserPlus
} from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';
import { OverviewView } from './OverviewView';
import { StaffManagementView } from '../staff/StaffManagementView';
import { Modal } from '../../components/Modal';
import { toast } from 'react-toastify';

interface DashboardPageProps {
  user: any;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'admissions' | 'attendance' | 'academics' | 'finance' | 'audit'>('overview');

  // Unified Admission Form Modal State (For Overview placeholder)
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'staff', label: 'Staff Management', icon: Users },
    { id: 'admissions', label: 'Admissions', icon: UserPlus },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'academics', label: 'Academics', icon: BookOpen },
    { id: 'finance', label: 'Finance', icon: Calculator },
    { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Premium Top Bar */}
      <header className="sticky top-0 z-30 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/25">
            SMS
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight text-slate-900 dark:text-white">Kenyan Primary & Junior Secondary</h1>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full inline-block mt-1">{user.roleName || user.role || 'HEAD_TEACHER'} PORTAL</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />
          <div className="hidden sm:block text-right mr-2">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-2.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2 text-xs font-bold shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 flex flex-col gap-8">
        
        {/* Sleek Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 hide-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl shadow-slate-900/10'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? '' : 'opacity-70'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <OverviewView 
                onAddLearner={() => setShowAdmissionModal(true)} 
                onRecordExpense={() => setShowExpenseModal(true)} 
              />
            </motion.div>
          )}

          {activeTab === 'staff' && (
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

          {/* Placeholders for other tabs for now */}
          {['admissions', 'attendance', 'academics', 'finance', 'audit'].includes(activeTab) && (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center h-64 bg-slate-100/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 border-dashed"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 capitalize">{activeTab} Module</h3>
                <p className="text-sm text-slate-500 mt-1">This module is scheduled for the next phase of development.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Placeholders for Overview Actions */}
      <Modal isOpen={showAdmissionModal} onClose={() => setShowAdmissionModal(false)} title="Unified Admission (Preview)">
        <div className="p-4 text-sm text-slate-600 dark:text-slate-400">
          Admission workflow will be implemented in Phase 2.
        </div>
      </Modal>

      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Record Expense (Preview)">
        <div className="p-4 text-sm text-slate-600 dark:text-slate-400">
          Expense recording will be implemented in Phase 3.
        </div>
      </Modal>
    </div>
  );
};
