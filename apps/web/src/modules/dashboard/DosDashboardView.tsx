import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Award, BookOpen, Clock, ShieldCheck, TrendingUp,
  FileText, ChevronRight, ClipboardCheck, Sparkles,
  CheckCircle2, Layers, CheckCheck, BarChart3, ChevronDown
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
      <div className="space-y-3.5 max-w-7xl mx-auto">
        {/* 1. Flattened Header Row with Integrated Examination Scope (Max Height: ~48px) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Left: Role title + user details + active term badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              DOS
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {data.schoolName} · Academic Operations Center
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80">
                Director of Studies (DoS)
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                Term {data.currentTermNumber} · {data.academicYear}
              </span>
            </div>
          </div>

          {/* Right: Merged Examination Scope Filter */}
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 self-start lg:self-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Calendar className="w-3.5 h-3.5 text-sky-500" />
              <span>Exam:</span>
            </div>

            <div className="flex max-w-full items-center gap-1 overflow-x-auto bg-slate-100 dark:bg-[#0c1830] p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleSelectExam('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  selectedExamId === 'all'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All Exams ({data.examSeries?.total || 0})
              </button>

              {data.examsList?.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => handleSelectExam(ex.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    selectedExamId === ex.id
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="truncate max-w-[120px]">{ex.title}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                    ex.status === 'APPROVED'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {ex.status === 'APPROVED' ? 'Active' : ex.status === 'LOCKED' ? 'Done' : ex.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Sleek 5-Slot Analytical Ribbon (Max Height: ~44px) */}
        {data.activeMode === 'EXAMS' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]/70 px-3 py-2 text-xs shadow-xs">
            {/* 1. Exam Series */}
            <div className="flex items-center gap-2.5 px-2 py-1">
              <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                    {data.examSeries.active > 0 ? `${data.examSeries.active} Active` : `${data.examSeries.total}`}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                    Exam Series
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block truncate">
                  {data.examSeries.total} Total · {data.examSeries.concluded} Concluded
                </span>
              </div>
            </div>

            {/* 2. Session Progress */}
            <div className="flex items-center gap-2.5 px-2 py-1">
              <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                    {data.sessionProgress.completionRate}%
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                    Session Progress
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block truncate">
                  {data.sessionProgress.completedSessions}/{data.sessionProgress.totalSessions} Sessions
                </span>
              </div>
            </div>

            {/* 3. Marks Submission */}
            <div className="flex items-center gap-2.5 px-2 py-1">
              <FileText className="w-4 h-4 text-sky-500 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                    {data.marksSubmission.submissionRate}%
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                    Marksheets In
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block truncate">
                  {data.marksSubmission.submittedCount}/{data.marksSubmission.totalExpected} Papers
                </span>
              </div>
            </div>

            {/* 4. DoS Verification */}
            <div className="flex items-center gap-2.5 px-2 py-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                    {data.dosVerification.verificationRate}%
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                    Verification
                  </span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block truncate font-medium">
                  {data.dosVerification.verifiedCount} Approved · {data.dosVerification.pendingCount} Pending
                </span>
              </div>
            </div>

            {/* 5. School Mean Score */}
            <div className="flex items-center gap-2.5 px-2 py-1 col-span-2 sm:col-span-1">
              <Award className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sky-600 dark:text-sky-400 text-sm leading-tight font-mono">
                    {data.schoolAverage > 0 ? `${data.schoolAverage}%` : 'Pending'}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                    School Mean
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block truncate">
                  {data.totalScoresEntered > 0 ? `${data.totalScoresEntered} Scores` : 'Awaiting entries'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]/70 px-3 py-2 text-xs shadow-xs">
            <div className="flex items-center gap-2.5 px-2 py-1">
              <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm font-mono block">
                  {data.catsMetrics.activeCatAssessments} Series
                </span>
                <span className="text-[10px] text-slate-400">CAT Assessments</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-2 py-1">
              <Layers className="w-4 h-4 text-sky-500 shrink-0" />
              <div>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm font-mono block">
                  {data.catsMetrics.catsClassCoverageRate}%
                </span>
                <span className="text-[10px] text-slate-400">Class Coverage</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-2 py-1">
              <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm font-mono block">
                  {data.catsMetrics.catScoresCount}
                </span>
                <span className="text-[10px] text-slate-400">Score Records</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-2 py-1">
              <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm font-mono block">
                  {data.catsMetrics.rubricMeetingRate}%
                </span>
                <span className="text-[10px] text-slate-400">Proficiency Rate</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-2 py-1">
              <TrendingUp className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm font-mono block">
                  {data.catsMetrics.catsAverage > 0 ? `${data.catsMetrics.catsAverage}%` : `${data.schoolAverage}%`}
                </span>
                <span className="text-[10px] text-slate-400">Academic Mean</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Compact High-Density Operations Modules Grid (5 Workstations) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] p-3 shadow-xs">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Examination & Academic Operations Modules
              </h2>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">5 Direct Workstations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {/* 1. Master Exam Timetable */}
            <button
              onClick={() => handleNav('exams', '/exams')}
              className="flex flex-col justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-sky-50/60 dark:hover:bg-[#122444] hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Master Exam Timetable & Progress
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  Create series, schedule sessions, and track live progress
                </p>
              </div>
            </button>

            {/* 2. Marking Allocation Matrix */}
            <button
              onClick={() => handleNav('marking_allocations', '/marking-allocations')}
              className="flex flex-col justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-sky-50/60 dark:hover:bg-[#122444] hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Award className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Marking Allocation Matrix
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  Assign qualified subject examiners to mark exam papers per class
                </p>
              </div>
            </button>

            {/* 3. Exam Mark Review */}
            <button
              onClick={() => handleNav('mark_review', '/mark-review')}
              className="flex flex-col justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-sky-50/60 dark:hover:bg-[#122444] hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ClipboardCheck className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Exam Mark Review & Lock
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  Verify submitted marksheets, approve scores, and manage locks
                </p>
              </div>
            </button>

            {/* 4. Schoolwide Results */}
            <button
              onClick={() => handleNav('school_results', '/school-results')}
              className="flex flex-col justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-sky-50/60 dark:hover:bg-[#122444] hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Award className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Schoolwide Results & Broadsheet
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  Cross-class rankings, subject league tables & CBC rubrics
                </p>
              </div>
            </button>

            {/* 5. Subject Performance Drill-Down */}
            <button
              onClick={() => handleNav('subject_analytics', '/subject-performance')}
              className="flex flex-col justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-sky-50/60 dark:hover:bg-[#122444] hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left cursor-pointer group shadow-2xs sm:col-span-2 lg:col-span-1"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Academic Intelligence & Drill-Down
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  Multi-tier diagnostics, subject bottlenecks & remedial lists
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </PageLoadingWrapper>
  );
};

export default DosDashboardView;
