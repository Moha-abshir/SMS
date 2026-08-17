import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle2, BookOpen, Wallet, UserPlus, FileText, Settings, ShieldCheck, TrendingUp } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

interface OverviewViewProps {
  onNavigate?: (viewId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalLearners: number;
    totalStaff: number;
    todayAttendancePercentage: number;
    absentCount: number;
    totalFeePaid: number;
    totalFeeBilled: number;
    totalOutstandingBalance: number;
    feeCollectionRate: number;
    schoolName: string;
    academicYear: number;
    currentTermNumber: number;
  }>({
    totalLearners: 0,
    totalStaff: 0,
    todayAttendancePercentage: 98.2,
    absentCount: 0,
    totalFeePaid: 0,
    totalFeeBilled: 0,
    totalOutstandingBalance: 0,
    feeCollectionRate: 0,
    schoolName: 'Eldoret Muslim Academy',
    academicYear: 2026,
    currentTermNumber: 1,
  });

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/dashboard/head-teacher');
      if (res.data.data) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load head teacher overview stats', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-950 dark:via-slate-900 dark:to-slate-900 text-white rounded-3xl shadow-xl shadow-blue-600/15 dark:shadow-none border border-blue-500/30 dark:border-blue-900/40">
        <div>
          <div className="flex items-center gap-2 text-blue-100 dark:text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
            <TrendingUp className="w-4 h-4 text-blue-200 dark:text-blue-400" />
            Executive Oversight & System Dashboard
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{data.schoolName} Executive Dashboard</h2>
          <p className="text-xs text-blue-100 dark:text-slate-400 mt-1 font-medium max-w-xl">
            Real-time operational summary of student admissions, attendance, staff, and financial oversight.
          </p>
        </div>

        <div className="flex items-center gap-4 px-5 py-3 bg-white/10 dark:bg-slate-900/80 border border-white/20 dark:border-slate-800 rounded-2xl backdrop-blur-md shrink-0">
          <div className="text-center">
            <span className="block text-xl font-bold text-white dark:text-blue-400 leading-none">{data.academicYear}</span>
            <span className="text-[10px] font-bold tracking-wider text-blue-100 dark:text-slate-400 uppercase mt-1 block">Academic Year</span>
          </div>
          <div className="w-[1px] h-8 bg-white/20 dark:bg-slate-800" />
          <div className="text-center">
            <span className="block text-xl font-bold text-emerald-300 dark:text-emerald-400 leading-none">Term {data.currentTermNumber}</span>
            <span className="text-[10px] font-bold tracking-wider text-blue-100 dark:text-slate-400 uppercase mt-1 block">Active Term</span>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Active Learners</span>
            <Users className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.totalLearners}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">PPE, Lower, Upper & JSS</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Today Attendance</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.todayAttendancePercentage}%</div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{data.absentCount} Absences Recorded Today</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Staff Directory</span>
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.totalStaff}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Teachers & Administrative Staff</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Term Fee Collection Rate</span>
            <Wallet className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.feeCollectionRate}%</div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
            KES {data.totalOutstandingBalance.toLocaleString()} Outstanding
          </p>
        </div>
      </div>

      {/* Quick Administrative Shortcuts */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          Executive Shortcuts & Module Navigation
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate?.('admissions')}
            className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all group"
          >
            <UserPlus className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Admit New Learner</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">KNEC Assessment Number registration</p>
          </button>

          <button
            onClick={() => onNavigate?.('letters')}
            className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all group"
          >
            <FileText className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Official Letterhead</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Draft & print official school letters</p>
          </button>

          <button
            onClick={() => onNavigate?.('settings')}
            className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all group"
          >
            <Settings className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">School Profile Settings</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Motto, address & academic terms</p>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
