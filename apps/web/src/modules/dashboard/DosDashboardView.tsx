import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, UserCheck, Award, Lock, BarChart3, BookOpen } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

interface DosDashboardViewProps {
  onNavigate?: (viewId: string) => void;
}

export const DosDashboardView: React.FC<DosDashboardViewProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalExams: number;
    invigilationsCount: number;
    markingCount: number;
    releasedReportsCount: number;
    schoolName: string;
    academicYear: number;
    currentTermNumber: number;
  }>({
    totalExams: 0,
    invigilationsCount: 0,
    markingCount: 0,
    releasedReportsCount: 0,
    schoolName: 'Eldoret Muslim Academy',
    academicYear: 2026,
    currentTermNumber: 1,
  });

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/dashboard/dos');
      if (res.data.data) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load DoS workstation stats', error);
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
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl text-white shadow-xl shadow-blue-600/20">
        <div>
          <div className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-2">
            Director of Studies (DoS) Workstation — Year {data.academicYear} Term {data.currentTermNumber}
          </div>
          <h2 className="text-xl font-bold">{data.schoolName} Academic & Examination Hub</h2>
          <p className="text-xs text-blue-100 mt-1">
            Manage exam timetabling, invigilation supervision, paper marking allocations, report card release locks, and subject analytics.
          </p>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Term Examinations</span>
            <Calendar className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.totalExams}</div>
          <p className="text-xs text-slate-500 mt-1">Mid-Term & End of Term Series</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Invigilation Slots</span>
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.invigilationsCount}</div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Allocated Supervisor Slots</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Marking Allocations</span>
            <Award className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.markingCount}</div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Assigned Script Examiners</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Published Report Cards</span>
            <Lock className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.releasedReportsCount}</div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Classes Released for Viewing</p>
        </div>
      </div>

      {/* Quick DoS Shortcuts */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          Director of Studies Management Hub Shortcuts
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate?.('exams')}
            className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all group"
          >
            <Calendar className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Exam Timetabling</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Schedule paper dates & times</p>
          </button>

          <button
            onClick={() => onNavigate?.('invigilation')}
            className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all group"
          >
            <UserCheck className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Invigilator Allocation</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Assign room supervisors</p>
          </button>

          <button
            onClick={() => onNavigate?.('marking_allocations')}
            className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-amber-50 dark:hover:bg-amber-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all group"
          >
            <Award className="w-6 h-6 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Marking Allocations</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Assign paper examiners</p>
          </button>

          <button
            onClick={() => onNavigate?.('report_locks')}
            className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all group"
          >
            <Lock className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Report Card Lock Control</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Toggle report publication</p>
          </button>

          <button
            onClick={() => onNavigate?.('subject_analytics')}
            className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all group"
          >
            <BarChart3 className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">CBC & Subject Analytics</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Rubrics (EE, ME, AE, BE) & JSS</p>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
