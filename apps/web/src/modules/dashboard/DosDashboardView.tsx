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
        <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
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
      {/* Welcome Glass Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <BookOpen className="w-4 h-4 text-sky-500" />
            Director of Studies (DoS) Examination Workstation
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{data.schoolName} Academic & Examination Hub</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Manage exam timetabling, invigilation supervision, paper marking allocations, report card release locks, and subject analytics.
          </p>
        </div>

        <div className="flex items-center justify-around sm:justify-start gap-4 px-4 sm:px-5 py-2.5 sm:py-3 bg-sky-50/70 border border-sky-100 rounded-xl sm:rounded-2xl w-full sm:w-auto shrink-0">
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-bold text-slate-800 leading-none">{data.academicYear}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-1 block">Academic Year</span>
          </div>
          <div className="w-[1px] h-8 bg-sky-200/60" />
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-bold text-sky-600 leading-none">Term {data.currentTermNumber}</span>
            <span className="text-[10px] font-bold tracking-wider text-sky-700 uppercase mt-1 block">Active Term</span>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Term Examinations</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{data.totalExams}</div>
          <p className="text-xs text-slate-500 mt-1">Mid-Term & End of Term Series</p>
        </div>

        <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Invigilation Slots</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{data.invigilationsCount}</div>
          <p className="text-xs text-sky-700 mt-1 font-medium">Allocated Supervisor Slots</p>
        </div>

        <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Marking Allocations</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{data.markingCount}</div>
          <p className="text-xs text-sky-700 mt-1 font-medium">Assigned Script Examiners</p>
        </div>

        <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Published Report Cards</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{data.releasedReportsCount}</div>
          <p className="text-xs text-sky-700 mt-1 font-medium">Classes Released for Viewing</p>
        </div>
      </div>

      {/* Quick DoS Shortcuts */}
      <div className="p-4 sm:p-6 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-sky-500" />
          Director of Studies Management Hub Shortcuts
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          <button
            onClick={() => {
              if (onNavigate) onNavigate('exams');
              navigate('/exams');
            }}
            className="p-4 bg-sky-50/40 hover:bg-sky-50/80 border border-sky-100 hover:border-sky-200 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 mb-2 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900">Exam Timetabling</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Schedule paper dates & times</p>
          </button>

          <button
            onClick={() => {
              if (onNavigate) onNavigate('invigilation');
              navigate('/invigilation');
            }}
            className="p-4 bg-sky-50/40 hover:bg-sky-50/80 border border-sky-100 hover:border-sky-200 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 mb-2 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900">Invigilator Allocation</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Assign room supervisors</p>
          </button>

          <button
            onClick={() => {
              if (onNavigate) onNavigate('marking_allocations');
              navigate('/marking-allocations');
            }}
            className="p-4 bg-sky-50/40 hover:bg-sky-50/80 border border-sky-100 hover:border-sky-200 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <Award className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 mb-2 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900">Marking Allocations</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Assign paper examiners</p>
          </button>

          <button
            onClick={() => {
              if (onNavigate) onNavigate('report_locks');
              navigate('/report-locks');
            }}
            className="p-4 bg-sky-50/40 hover:bg-sky-50/80 border border-sky-100 hover:border-sky-200 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 mb-2 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900">Report Card Lock Control</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Toggle report publication</p>
          </button>

          <button
            onClick={() => {
              if (onNavigate) onNavigate('subject_analytics');
              navigate('/subject-performance');
            }}
            className="p-4 bg-sky-50/40 hover:bg-sky-50/80 border border-sky-100 hover:border-sky-200 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer sm:col-span-2 lg:col-span-1"
          >
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 mb-2 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900">CBC & Subject Analytics</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Rubrics (EE, ME, AE, BE) & JSS</p>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
