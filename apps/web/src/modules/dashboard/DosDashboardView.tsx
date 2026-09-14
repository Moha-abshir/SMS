import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, UserCheck, Award, Lock, BarChart3, BookOpen } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

interface DosDashboardViewProps {
  onNavigate?: (viewId: string) => void;
}

export const DosDashboardView: React.FC<DosDashboardViewProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
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
      className="space-y-4 sm:space-y-6"
    >
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-950 dark:via-slate-900 dark:to-slate-900 text-white rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-600/15 dark:shadow-none border border-blue-500/30 dark:border-blue-900/40">
        <div>
          <div className="flex items-center gap-2 text-blue-100 dark:text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
            <BookOpen className="w-4 h-4 text-blue-200 dark:text-blue-400" />
            Director of Studies (DoS) Examination Workstation
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{data.schoolName} Academic & Examination Hub</h2>
          <p className="text-xs text-blue-100 dark:text-slate-400 mt-1 font-medium max-w-xl">
            Manage exam timetabling, invigilation supervision, paper marking allocations, report card release locks, and subject analytics.
          </p>
        </div>

        <div className="flex items-center justify-around sm:justify-start gap-4 px-4 sm:px-5 py-2.5 sm:py-3 bg-white/10 dark:bg-slate-900/80 border border-white/20 dark:border-slate-800 rounded-xl sm:rounded-2xl backdrop-blur-md w-full sm:w-auto shrink-0">
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-bold text-white dark:text-blue-400 leading-none">{data.academicYear}</span>
            <span className="text-[10px] font-bold tracking-wider text-blue-100 dark:text-slate-400 uppercase mt-1 block">Academic Year</span>
          </div>
          <div className="w-[1px] h-8 bg-white/20 dark:bg-slate-800" />
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-bold text-emerald-300 dark:text-emerald-400 leading-none">Term {data.currentTermNumber}</span>
            <span className="text-[10px] font-bold tracking-wider text-blue-100 dark:text-slate-400 uppercase mt-1 block">Active Term</span>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Term Examinations</span>
            <Calendar className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{data.totalExams}</div>
          <p className="text-xs text-slate-500 mt-1">Mid-Term & End of Term Series</p>
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Invigilation Slots</span>
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{data.invigilationsCount}</div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Allocated Supervisor Slots</p>
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Marking Allocations</span>
            <Award className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{data.markingCount}</div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Assigned Script Examiners</p>
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Published Report Cards</span>
            <Lock className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{data.releasedReportsCount}</div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Classes Released for Viewing</p>
        </div>
      </div>

      {/* Quick DoS Shortcuts */}
      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          Director of Studies Management Hub Shortcuts
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          <button
            onClick={() => {
              if (onNavigate) onNavigate('exams');
              navigate('/exams');
            }}
            className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Exam Timetabling</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Schedule paper dates & times</p>
          </button>

          <button
            onClick={() => {
              if (onNavigate) onNavigate('invigilation');
              navigate('/invigilation');
            }}
            className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Invigilator Allocation</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Assign room supervisors</p>
          </button>

          <button
            onClick={() => {
              if (onNavigate) onNavigate('marking_allocations');
              navigate('/marking-allocations');
            }}
            className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950 hover:bg-amber-50 dark:hover:bg-amber-900/30 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Marking Allocations</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Assign paper examiners</p>
          </button>

          <button
            onClick={() => {
              if (onNavigate) onNavigate('report_locks');
              navigate('/report-locks');
            }}
            className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Report Card Lock Control</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Toggle report publication</p>
          </button>

          <button
            onClick={() => {
              if (onNavigate) onNavigate('subject_analytics');
              navigate('/subject-performance');
            }}
            className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer sm:col-span-2 lg:col-span-1"
          >
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">CBC & Subject Analytics</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Rubrics (EE, ME, AE, BE) & JSS</p>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
