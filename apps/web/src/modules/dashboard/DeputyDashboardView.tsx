import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Package, UserX, ClipboardCheck, Award, ArrowUpRight } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

interface DeputyDashboardViewProps {
  onNavigate?: (viewId: string) => void;
}

export const DeputyDashboardView: React.FC<DeputyDashboardViewProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalClasses: number;
    activeAllocations: number;
    totalMarkSubmissions: number;
    approvedMarkSubmissions: number;
    schoolName: string;
    academicYear: number;
    currentTermNumber: number;
  }>({
    totalClasses: 12,
    activeAllocations: 0,
    totalMarkSubmissions: 0,
    approvedMarkSubmissions: 0,
    schoolName: 'Eldoret Muslim Academy',
    academicYear: 2026,
    currentTermNumber: 1,
  });

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/dashboard/deputy');
      if (res.data.data) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load deputy dashboard stats', error);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 text-white rounded-3xl shadow-xl border border-blue-900/40">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
            <TrendingUp className="w-4 h-4" />
            Deputy Headteacher Operational Workstation
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{data.schoolName} Academic & Operational Oversight</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium max-w-xl">
            Oversee teacher class allocations, staff leave permission slips, school inventory, attendance, and exam mark approvals.
          </p>
        </div>

        <div className="flex items-center gap-4 px-5 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md shrink-0">
          <div className="text-center">
            <span className="block text-xl font-bold text-blue-400 leading-none">{data.academicYear}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mt-1 block">Academic Year</span>
          </div>
          <div className="w-[1px] h-8 bg-slate-800" />
          <div className="text-center">
            <span className="block text-xl font-bold text-emerald-400 leading-none">Term {data.currentTermNumber}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mt-1 block">Active Term</span>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Classes</span>
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.totalClasses}</div>
          <p className="text-xs text-slate-500 mt-1">Playgroup to Grade 9</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Teacher Allocations</span>
            <Award className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.activeAllocations}</div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Subject & Class Teachers</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mark Submissions</span>
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.totalMarkSubmissions}</div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{data.approvedMarkSubmissions} Approved Marksheets</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mark Approval Rate</span>
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {data.totalMarkSubmissions > 0 ? Math.round((data.approvedMarkSubmissions / data.totalMarkSubmissions) * 100) : 100}%
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">State Machine Progress</p>
        </div>
      </div>

      {/* Quick Deputy Navigation Shortcuts */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          Deputy Headteacher Quick Management Shortcuts
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate?.('allocations')}
            className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all group"
          >
            <BookOpen className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Class & Teacher Allocations</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">CBC Grade 1-3 & Grade 4-9 rules</p>
          </button>

          <button
            onClick={() => onNavigate?.('leave_requests')}
            className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all group"
          >
            <Clock className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Teacher Leave Permission Slips</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Record leave-outs & print slips</p>
          </button>

          <button
            onClick={() => onNavigate?.('inventory')}
            className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all group"
          >
            <Package className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">School Inventory & Assets</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Textbooks, checkouts & overdue items</p>
          </button>

          <button
            onClick={() => onNavigate?.('attendance_oversight')}
            className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-red-50 dark:hover:bg-red-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all group"
          >
            <UserX className="w-6 h-6 text-red-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Attendance & Parent SMS</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Daily register audit & SMS alerts</p>
          </button>

          <button
            onClick={() => onNavigate?.('mark_review')}
            className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-amber-50 dark:hover:bg-amber-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all group"
          >
            <ClipboardCheck className="w-6 h-6 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Exam Mark Review Workspace</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Approve, request correction, or lock</p>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
