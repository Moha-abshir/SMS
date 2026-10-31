import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, UserCheck, Award, Lock, BarChart3, BookOpen, Clock, ShieldCheck, TrendingUp, FileText, ChevronRight, ClipboardCheck } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';

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

  return (
    <PageLoadingWrapper
      isLoading={loading}
      title="Director of Studies Workstation"
      subtitle="Compiling examination schedules, marking targets, and academic averages..."
      icon={BookOpen}
    >
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* Welcome Glass Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl shadow-glass dark:shadow-none">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-widest mb-1">
            <BookOpen className="w-4 h-4 text-sky-500" />
            Director of Studies (DoS) Examination & Academic Workstation
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {data.schoolName} Academic Operations Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-xl">
            Real-time control over term examinations, invigilator duty allocations, paper marking oversight, CBC grading analytics, and report release security.
          </p>
        </div>

        <div className="flex items-center justify-around sm:justify-start gap-4 px-4 sm:px-5 py-2.5 sm:py-3 bg-sky-50/70 dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] rounded-xl sm:rounded-2xl w-full sm:w-auto shrink-0 shadow-xs">
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-none">{data.academicYear}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-1 block">Academic Year</span>
          </div>
          <div className="w-[1px] h-8 bg-sky-200/60 dark:bg-[#162b4d]" />
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-black text-sky-600 dark:text-sky-400 leading-none">Term {data.currentTermNumber}</span>
            <span className="text-[10px] font-bold tracking-wider text-sky-700 dark:text-sky-300 uppercase mt-1 block">Active Term</span>
          </div>
        </div>
      </div>

      {/* 5 Live KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Exams */}
        <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Term Exams</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">{data.totalExams}</div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {data.publishedExams} Published / Approved
          </p>
        </div>

        {/* Scheduled Sessions */}
        <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Paper Sessions</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">{data.scheduledSessions}</div>
          <p className="text-[11px] text-sky-700 dark:text-sky-300 font-semibold mt-1">
            Timetable Slot Schedules
          </p>
        </div>

        {/* Invigilation Slots */}
        <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Invigilators</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">{data.invigilationsCount}</div>
          <p className="text-[11px] text-sky-700 dark:text-sky-300 font-semibold mt-1">
            Assigned Room Duties
          </p>
        </div>

        {/* Marking Allocations */}
        <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Paper Marking</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">{data.markingCount}</div>
          <p className="text-[11px] text-sky-700 dark:text-sky-300 font-semibold mt-1">
            Designated Examiners
          </p>
        </div>

        {/* Academic Score Mean */}
        <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">School Mean</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-700 dark:text-sky-300 font-mono">
            {data.schoolAverage > 0 ? `${data.schoolAverage}%` : '—'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            {data.totalScoresEntered} Test Records
          </p>
        </div>
      </div>

      {/* Quick DoS Workstation Hub Navigation Cards */}
      <div className="p-4 sm:p-6 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl space-y-4 shadow-glass dark:shadow-none">
        <div className="flex items-center justify-between border-b border-sky-100/80 dark:border-[#162b4d] pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            Examination & Academic Operations Workspace Modules
          </h3>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">5 Direct Workstations</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3.5 sm:gap-4">
          {/* 1. Exam Timetabling & Progress */}
          <button
            onClick={() => handleNav('exams', '/exams')}
            className="p-4 sm:p-5 bg-sky-50/40 dark:bg-[#0c1932]/60 hover:bg-sky-50/90 dark:hover:bg-[#142647] border border-sky-100 dark:border-[#162b4d] hover:border-sky-300 dark:hover:border-sky-700 rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Calendar className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">Master Exam Timetable & Progress</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Create exam series, schedule sessions, track live mark submission progress across classes, and print schedules.
            </p>
          </button>

          {/* 2. Marking Allocation */}
          <button
            onClick={() => handleNav('marking_allocations', '/marking-allocations')}
            className="p-4 sm:p-5 bg-sky-50/40 dark:bg-[#0c1932]/60 hover:bg-sky-50/90 dark:hover:bg-[#142647] border border-sky-100 dark:border-[#162b4d] hover:border-sky-300 dark:hover:border-sky-700 rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Award className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">Marking Allocation Matrix</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Assign qualified subject examiners to mark exam papers per class, prevent duplicate assignments, and print schedules.
            </p>
          </button>

          {/* 3. Exam Mark Review */}
          <button
            onClick={() => handleNav('mark_review', '/mark-review')}
            className="p-4 sm:p-5 bg-sky-50/40 dark:bg-[#0c1932]/60 hover:bg-sky-50/90 dark:hover:bg-[#142647] border border-sky-100 dark:border-[#162b4d] hover:border-sky-300 dark:hover:border-sky-700 rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">Exam Mark Review & Lock</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Review completed class marksheets submitted by Class Teachers, verify subject scores, and inspect permanent lock status.
            </p>
          </button>

          {/* 4. Report Card Locks */}
          <button
            onClick={() => handleNav('report_locks', '/report-locks')}
            className="p-4 sm:p-5 bg-sky-50/40 dark:bg-[#0c1932]/60 hover:bg-sky-50/90 dark:hover:bg-[#142647] border border-sky-100 dark:border-[#162b4d] hover:border-sky-300 dark:hover:border-sky-700 rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Lock className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">Report Card Lock Control</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Audit score entry completion, toggle class report card visibility, and review unlock requests from teachers.
            </p>
          </button>

          {/* 5. Subject Analytics & Drill-Down */}
          <button
            onClick={() => handleNav('subject_analytics', '/subject-performance')}
            className="p-4 sm:p-5 bg-sky-50/40 dark:bg-[#0c1932]/60 hover:bg-sky-50/90 dark:hover:bg-[#142647] border border-sky-100 dark:border-[#162b4d] hover:border-sky-300 dark:hover:border-sky-700 rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer shadow-xs sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <BarChart3 className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">Academic Intelligence & Drill-Down</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Multi-tier drill-down (School → Class → Learner), identify subject bottlenecks, remedial registries, and staff meeting briefings.
            </p>
          </button>
        </div>
      </div>
      </div>
    </PageLoadingWrapper>
  );
};

