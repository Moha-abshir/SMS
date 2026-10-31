import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  UserCheck,
  Award,
  Lock,
  BarChart3,
  BookOpen,
  Clock,
  ShieldCheck,
  TrendingUp,
  FileText,
  ChevronRight,
  ClipboardCheck,
  Sparkles,
  Power,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  Layers,
  CheckCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';

interface DosDashboardViewProps {
  onNavigate?: (viewId: string) => void;
}

export const DosDashboardView: React.FC<DosDashboardViewProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string>('all');

  const [data, setData] = useState<{
    activeMode: 'EXAMS' | 'CATS';
    isExamPeriodActive: boolean;
    selectedExamId: string;
    selectedExamTitle: string;
    examsList: Array<{
      id: string;
      title: string;
      status: string;
      startDate?: string | null;
      endDate?: string | null;
    }>;
    examSeries: {
      total: number;
      active: number;
      concluded: number;
    };
    sessionProgress: {
      totalSessions: number;
      completedSessions: number;
      completionRate: number;
    };
    marksSubmission: {
      totalExpected: number;
      submittedCount: number;
      submissionRate: number;
    };
    dosVerification: {
      totalSubmitted: number;
      verifiedCount: number;
      pendingCount: number;
      correctionCount: number;
      verificationRate: number;
    };
    reportRelease: {
      totalClasses: number;
      lockedClasses: number;
      readinessRate: number;
    };
    catsMetrics: {
      activeCatAssessments: number;
      catsClassCoverageRate: number;
      catScoresCount: number;
      rubricMeetingRate: number;
      catsAverage: number;
    };
    schoolAverage: number;
    totalScoresEntered: number;
    schoolName: string;
    academicYear: number;
    currentTermNumber: number;
  }>({
    activeMode: 'EXAMS',
    isExamPeriodActive: true,
    selectedExamId: 'all',
    selectedExamTitle: 'All Term Exams',
    examsList: [],
    examSeries: { total: 0, active: 0, concluded: 0 },
    sessionProgress: { totalSessions: 0, completedSessions: 0, completionRate: 0 },
    marksSubmission: { totalExpected: 0, submittedCount: 0, submissionRate: 0 },
    dosVerification: { totalSubmitted: 0, verifiedCount: 0, pendingCount: 0, correctionCount: 0, verificationRate: 0 },
    reportRelease: { totalClasses: 0, lockedClasses: 0, readinessRate: 0 },
    catsMetrics: { activeCatAssessments: 0, catsClassCoverageRate: 0, catScoresCount: 0, rubricMeetingRate: 0, catsAverage: 0 },
    schoolAverage: 0,
    totalScoresEntered: 0,
    schoolName: 'Eldoret Muslim Academy',
    academicYear: 2026,
    currentTermNumber: 1,
  });

  const fetchOverview = async (examId?: string) => {
    try {
      setLoading(true);
      const targetExam = examId !== undefined ? examId : selectedExamId;
      const res = await apiClient.get('/api/dashboard/dos', {
        params: targetExam && targetExam !== 'all' ? { examId: targetExam } : {},
      });
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

  const handleSelectExam = (id: string) => {
    setSelectedExamId(id);
    fetchOverview(id);
  };

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl shadow-glass dark:shadow-none">
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
            <span className="block text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 leading-none">{data.academicYear}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-0.5 block">Academic Year</span>
          </div>
          <div className="w-[1px] h-7 bg-sky-200/60 dark:bg-[#162b4d]" />
          <div className="text-center">
            <span className="block text-base sm:text-lg font-black text-sky-600 dark:text-sky-400 leading-none">Term {data.currentTermNumber}</span>
            <span className="text-[10px] font-bold tracking-wider text-sky-700 dark:text-sky-300 uppercase mt-0.5 block">Active Term</span>
          </div>
        </div>
      </div>

      {/* Multi-Exam Scope Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
            <Calendar className="w-4 h-4 text-sky-500" />
            <span>Examination Scope:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => handleSelectExam('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs ${
                selectedExamId === 'all'
                  ? 'bg-sky-600 text-white border border-sky-600 shadow-sm shadow-sky-500/20'
                  : 'border border-slate-200 dark:border-[#162b4d] bg-white/90 dark:bg-[#0c1830] text-slate-700 dark:text-slate-300 hover:border-sky-300'
              }`}
            >
              All Term Exams ({data.examSeries?.total || 0})
            </button>

            {data.examsList?.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => handleSelectExam(ex.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5 ${
                  selectedExamId === ex.id
                    ? 'bg-sky-600 text-white border border-sky-600 shadow-sm shadow-sky-500/20'
                    : 'border border-slate-200 dark:border-[#162b4d] bg-white/90 dark:bg-[#0c1830] text-slate-700 dark:text-slate-300 hover:border-sky-300'
                }`}
              >
                <span>{ex.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  ex.status === 'APPROVED'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-500/10 text-slate-500 dark:text-slate-400'
                }`}>
                  {ex.status === 'APPROVED' ? 'Active' : ex.status === 'LOCKED' ? 'Concluded' : ex.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          Scope: <strong className="text-slate-800 dark:text-slate-200">{data.selectedExamTitle || 'All Term Exams'}</strong>
        </div>
      </div>

      {/* 5 High-Impact Live Executive KPIs */}
      {data.activeMode === 'EXAMS' ? (
        /* Option 3: Exam Lifecycle Progress KPIs */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* 1. Exam Series */}
          <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Exam Series</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {data.examSeries.active > 0 ? `${data.examSeries.active} Active` : `${data.examSeries.total} Recorded`}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              {data.examSeries.total} Total • {data.examSeries.concluded} Concluded
            </p>
          </div>

          {/* 2. Paper Sessions Progress */}
          <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Session Progress</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {data.sessionProgress.completionRate}%
            </div>
            <p className="text-[11px] text-sky-700 dark:text-sky-300 font-semibold mt-1">
              {data.sessionProgress.completedSessions} of {data.sessionProgress.totalSessions} Sessions Held
            </p>
          </div>

          {/* 3. Marksheet Submissions Progress */}
          <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Marks Submission</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {data.marksSubmission.submissionRate}%
            </div>
            <p className="text-[11px] text-sky-700 dark:text-sky-300 font-semibold mt-1">
              {data.marksSubmission.submittedCount} of {data.marksSubmission.totalExpected} Class Marksheets In
            </p>
          </div>

          {/* 4. DoS Mark Verification */}
          <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">DoS Verification</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {data.dosVerification.verificationRate}%
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              {data.dosVerification.verifiedCount} Approved • {data.dosVerification.pendingCount} Pending
            </p>
          </div>

          {/* 5. Report Release Readiness */}
          <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Report Release</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-sky-700 dark:text-sky-300 font-mono">
              {data.reportRelease.readinessRate}%
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              {data.reportRelease.lockedClasses} of {data.reportRelease.totalClasses} Classes Locked
            </p>
          </div>
        </div>
      ) : (
        /* Continuous Assessment Tests (CATs) Mode KPIs */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* 1. Active Assessments */}
          <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-indigo-100 dark:border-[#1b2644] rounded-2xl shadow-glass dark:shadow-none transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">CAT Assessments</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-[#121c38] border border-indigo-100 dark:border-[#1b2644] text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {data.catsMetrics.activeCatAssessments} Series
            </div>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
              Continuous Assessment Cycle
            </p>
          </div>

          {/* 2. Class Coverage */}
          <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-indigo-100 dark:border-[#1b2644] rounded-2xl shadow-glass dark:shadow-none transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Class Coverage</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-[#121c38] border border-indigo-100 dark:border-[#1b2644] text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {data.catsMetrics.catsClassCoverageRate}%
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
              Assessed Class Levels Active
            </p>
          </div>

          {/* 3. Score Entries */}
          <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-indigo-100 dark:border-[#1b2644] rounded-2xl shadow-glass dark:shadow-none transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Score Records</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-[#121c38] border border-indigo-100 dark:border-[#1b2644] text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {data.catsMetrics.catScoresCount}
            </div>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
              Learner Task Evaluations
            </p>
          </div>

          {/* 4. CBC Rubric Competency */}
          <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-indigo-100 dark:border-[#1b2644] rounded-2xl shadow-glass dark:shadow-none transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">CBC Proficiency</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-[#121c38] border border-indigo-100 dark:border-[#1b2644] text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CheckCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {data.catsMetrics.rubricMeetingRate}%
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              Meeting / Exceeding Expectations
            </p>
          </div>

          {/* 5. Academic Average */}
          <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-indigo-100 dark:border-[#1b2644] rounded-2xl shadow-glass dark:shadow-none transition-all col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Academic Mean</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-[#121c38] border border-indigo-100 dark:border-[#1b2644] text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-300 font-mono">
              {data.catsMetrics.catsAverage > 0 ? `${data.catsMetrics.catsAverage}%` : `${data.schoolAverage}%`}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              Continuous Assessment Mean
            </p>
          </div>
        </div>
      )}

      {/* CATs Mode Active Notice */}
      {data.activeMode === 'CATS' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-500/10 dark:bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-100">
                Continuous Assessment Tests (CATs) Mode Active
              </h4>
              <p className="mt-0.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                Term examinations have been concluded. Academic operations are currently focused on Continuous Assessment Tests (CATs) and regular classroom lessons.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleNav('exams', '/exams')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>Manage Exam Cycles</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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

