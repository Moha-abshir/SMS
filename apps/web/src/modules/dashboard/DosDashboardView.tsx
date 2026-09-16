import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, UserCheck, Award, Lock, BarChart3, BookOpen, Clock, ShieldCheck, TrendingUp, FileText, ChevronRight } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

interface DosDashboardViewProps {
  onNavigate?: (viewId: string) => void;
}

export const DosDashboardView: React.FC<DosDashboardViewProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalExams: number;
    publishedExams: number;
    scheduledSessions: number;
    invigilationsCount: number;
    markingCount: number;
    totalReportLocks: number;
    activeLocksCount: number;
    releasedReportsCount: number;
    schoolAverage: number;
    totalScoresEntered: number;
    schoolName: string;
    academicYear: number;
    currentTermNumber: number;
  }>({
    totalExams: 0,
    publishedExams: 0,
    scheduledSessions: 0,
    invigilationsCount: 0,
    markingCount: 0,
    totalReportLocks: 0,
    activeLocksCount: 0,
    releasedReportsCount: 0,
    schoolAverage: 0,
    totalScoresEntered: 0,
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

  const handleNav = (viewId: string, path: string) => {
    if (onNavigate) {
      onNavigate(viewId);
    }
    navigate(path);
  };

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
      className="space-y-4 sm:space-y-6 max-w-6xl mx-auto"
    >
      {/* Welcome Glass Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <BookOpen className="w-4 h-4 text-sky-500" />
            Director of Studies (DoS) Examination & Academic Workstation
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            {data.schoolName} Academic Operations Center
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Real-time control over term examinations, invigilator duty allocations, paper marking oversight, CBC grading analytics, and report release security.
          </p>
        </div>

        <div className="flex items-center justify-around sm:justify-start gap-4 px-4 sm:px-5 py-2.5 sm:py-3 bg-sky-50/70 border border-sky-100 rounded-xl sm:rounded-2xl w-full sm:w-auto shrink-0 shadow-xs">
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-black text-slate-800 leading-none">{data.academicYear}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-1 block">Academic Year</span>
          </div>
          <div className="w-[1px] h-8 bg-sky-200/60" />
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-black text-sky-600 leading-none">Term {data.currentTermNumber}</span>
            <span className="text-[10px] font-bold tracking-wider text-sky-700 uppercase mt-1 block">Active Term</span>
          </div>
        </div>
      </div>

      {/* 5 Live KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Exams */}
        <div className="p-4 sm:p-5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Term Exams</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{data.totalExams}</div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            {data.publishedExams} Published / Approved
          </p>
        </div>

        {/* Scheduled Sessions */}
        <div className="p-4 sm:p-5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Paper Sessions</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{data.scheduledSessions}</div>
          <p className="text-[11px] text-sky-700 font-semibold mt-1">
            Timetable Slot Schedules
          </p>
        </div>

        {/* Invigilation Slots */}
        <div className="p-4 sm:p-5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Invigilators</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{data.invigilationsCount}</div>
          <p className="text-[11px] text-sky-700 font-semibold mt-1">
            Assigned Room Duties
          </p>
        </div>

        {/* Marking Allocations */}
        <div className="p-4 sm:p-5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Paper Marking</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{data.markingCount}</div>
          <p className="text-[11px] text-sky-700 font-semibold mt-1">
            Designated Examiners
          </p>
        </div>

        {/* Academic Score Mean */}
        <div className="p-4 sm:p-5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass hover:border-sky-200 transition-all col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">School Mean</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-700 font-mono">
            {data.schoolAverage > 0 ? `${data.schoolAverage}%` : '—'}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            {data.totalScoresEntered} Test Records
          </p>
        </div>
      </div>

      {/* Quick DoS Workstation Hub Navigation Cards */}
      <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <div className="flex items-center justify-between border-b border-sky-100/80 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-600" />
            Examination & Academic Operations Workspace Modules
          </h3>
          <span className="text-xs font-semibold text-slate-400">5 Direct Workstations</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {/* 1. Exam Timetabling */}
          <button
            onClick={() => handleNav('exams', '/exams')}
            className="p-4 sm:p-5 bg-sky-50/40 hover:bg-sky-50/90 border border-sky-100 hover:border-sky-300 rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-white border border-sky-200 text-sky-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Calendar className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
            </div>
            <h4 className="text-sm font-black text-slate-900">Master Exam Timetabling</h4>
            <p className="text-xs text-slate-500 mt-1">
              Create exam series, schedule subject sessions, manage publication status, and print noticeboard schedules.
            </p>
          </button>

          {/* 2. Invigilator Allocation */}
          <button
            onClick={() => handleNav('invigilation', '/invigilation')}
            className="p-4 sm:p-5 bg-sky-50/40 hover:bg-sky-50/90 border border-sky-100 hover:border-sky-300 rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-white border border-sky-200 text-sky-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <UserCheck className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
            </div>
            <h4 className="text-sm font-black text-slate-900">Invigilator Allocation & Conflicts</h4>
            <p className="text-xs text-slate-500 mt-1">
              Assign supervisors to classrooms, automatically prevent double-booking conflicts, and generate printable duty rosters.
            </p>
          </button>

          {/* 3. Marking Allocation */}
          <button
            onClick={() => handleNav('marking_allocations', '/marking-allocations')}
            className="p-4 sm:p-5 bg-sky-50/40 hover:bg-sky-50/90 border border-sky-100 hover:border-sky-300 rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-white border border-sky-200 text-sky-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Award className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
            </div>
            <h4 className="text-sm font-black text-slate-900">Marking Allocation Matrix</h4>
            <p className="text-xs text-slate-500 mt-1">
              Assign qualified subject examiners to mark exam papers per class, prevent duplicate assignments, and print schedules.
            </p>
          </button>

          {/* 4. Subject Analytics & Drill-Down */}
          <button
            onClick={() => handleNav('subject_analytics', '/subject-performance')}
            className="p-4 sm:p-5 bg-sky-50/40 hover:bg-sky-50/90 border border-sky-100 hover:border-sky-300 rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-white border border-sky-200 text-sky-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <BarChart3 className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
            </div>
            <h4 className="text-sm font-black text-slate-900">Academic Intelligence & Drill-Down</h4>
            <p className="text-xs text-slate-500 mt-1">
              Multi-tier drill-down (School → Class → Learner), identify subject bottlenecks, remedial registries, and staff meeting briefings.
            </p>
          </button>

          {/* 5. Report Card Locks */}
          <button
            onClick={() => handleNav('report_locks', '/report-locks')}
            className="p-4 sm:p-5 bg-sky-50/40 hover:bg-sky-50/90 border border-sky-100 hover:border-sky-300 rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer shadow-xs sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-white border border-sky-200 text-sky-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Lock className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
            </div>
            <h4 className="text-sm font-black text-slate-900">Report Card Lock Control</h4>
            <p className="text-xs text-slate-500 mt-1">
              Audit score entry completion, toggle class report card visibility, and review unlock requests from teachers.
            </p>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

