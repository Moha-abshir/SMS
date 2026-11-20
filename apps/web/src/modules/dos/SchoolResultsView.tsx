import React, { useState, useEffect } from 'react';
import {
  Award,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal,
  Lock,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';
import { RequestError } from '../../components/RequestError';
import { SchoolwideSummaryRibbon, SummaryRibbonData } from './components/SchoolwideSummaryRibbon';
import { GradePerformanceMatrix, GradeRowData } from './components/GradePerformanceMatrix';
import { GradeDrilldownDrawer } from './components/GradeDrilldownDrawer';

export const SchoolResultsView: React.FC = () => {


  // Exam Selection & Baseline Selection
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [compareExamId, setCompareExamId] = useState<string>('auto');

  // Level Filter Pills: ALL | PRIMARY | JUNIOR
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'PRIMARY' | 'JUNIOR'>('ALL');

  // Drawer state
  const [selectedDrawerClassId, setSelectedDrawerClassId] = useState<string | null>(null);

  const { data: overview, loading, error, refresh: refreshOverview } = useApiResource<any>(
    `/api/examinations/schoolwide-overview?${new URLSearchParams({ ...(selectedExamId ? { examId: selectedExamId } : {}), compareExamId })}`
  );
  const deltaLoading = loading;
  const availableExams: Array<{ id: string; label: string }> = overview?.availableExams || [];
  const selectedExam = overview?.selectedExam;
  const compareExam = overview?.compareExam;
  const summaryRibbon: SummaryRibbonData | null = overview?.summaryRibbon || null;
  const primaryClasses: GradeRowData[] = overview?.primaryClasses || [];
  const juniorClasses: GradeRowData[] = overview?.juniorClasses || [];
  const allGradeRows: GradeRowData[] = overview?.allGradeRows || [];

  // Current logged in user info (to highlight assigned class and check permissions)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [assignedClassId, setAssignedClassId] = useState<string | null>(null);

  // Conclude / Terminate Exam Modal State
  const [showTerminateModal, setShowTerminateModal] = useState<boolean>(false);
  const [isTerminating, setIsTerminating] = useState<boolean>(false);

  // Fetch logged in user & workstation info once
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setCurrentUserId(u.id || null);
        setCurrentUserRole(u.roleName || u.role || '');
      }
      const storedWs = localStorage.getItem('teacher_workstation');
      if (storedWs) {
        const ws = JSON.parse(storedWs);
        if (ws?.classTeacher?.classId) {
          setAssignedClassId(ws.classTeacher.classId);
        }
      }
    } catch (e) {
      // fallback
    }

    apiClient
      .get('/api/teacher/workstation')
      .then((res) => {
        const ws = res.data?.data || res.data;
        if (ws?.classTeacher?.classId) {
          setAssignedClassId(ws.classTeacher.classId);
        }
      })
      .catch(() => {});
  }, []);

  const handleCompareChange = (newCompareId: string) => setCompareExamId(newCompareId);

  const allGradesList = allGradeRows.map((g) => ({ id: g.classId, name: g.gradeName }));

  const isLeadershipOrDos = ['DOS', 'HEAD_TEACHER'].includes(currentUserRole);

  const handleTerminateExamPeriod = async () => {
    if (!selectedExam?.id) return;
    setIsTerminating(true);
    try {
      const res = await apiClient.post('/api/exams/terminate-period', {
        examId: selectedExam.id,
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Examination period concluded successfully.');
        setShowTerminateModal(false);
        refreshOverview();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to conclude examination period');
    } finally {
      setIsTerminating(false);
    }
  };

  return (
    <div className="min-w-0 max-w-7xl mx-auto space-y-4">
      {error && <RequestError message={error} onRetry={refreshOverview} />}
      {/* 1. Compact Header & Controls Bar (No extra CTAs) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Title & Subtitle */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Award className="w-6 h-6 text-sky-500" />
              Schoolwide Performance
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Curriculum-aware CBC analytics: Pre-Primary & Primary 4-tier rubric and Junior Secondary 8-point scale
          </p>
        </div>

        {/* Right: Selectors & Level Filter Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Conclude Exam Action for DoS / Leadership */}
          {isLeadershipOrDos && selectedExam && (
            selectedExam.status === 'LOCKED' ? (
              <div
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5"
                title="This examination period has been concluded and locked."
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Exam Concluded</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowTerminateModal(true)}
                className="h-8 px-3 rounded-lg border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Conclude / Terminate Examination Period"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Conclude Exam Period</span>
              </button>
            )
          )}

          {/* Primary Exam Selector */}
          <div className="relative min-w-0 max-w-full">
            <label className="sr-only">Select Examination</label>
            <select
              value={selectedExamId || selectedExam?.id || ''}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="max-w-full appearance-none text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-8 py-2 cursor-pointer shadow-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              {availableExams.length === 0 ? (
                <option value="">No examinations available</option>
              ) : (
                availableExams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    Exam: {exam.label}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Comparison Baseline Selector */}
          <div className="relative min-w-0 max-w-full">
            <label className="sr-only">Comparison Baseline</label>
            <select
              value={compareExamId}
              onChange={(e) => handleCompareChange(e.target.value)}
              className="max-w-full appearance-none text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-8 py-2 cursor-pointer shadow-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              <option value="auto">
                Compare: Auto (Preceding Exam)
                {compareExam ? ` [${compareExam.title}]` : ''}
              </option>
              <option value="none">Single Exam (No Comparison)</option>
              {availableExams
                .filter((e) => e.id !== selectedExamId)
                .map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    vs: {exam.label}
                  </option>
                ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Level Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
            <button
              type="button"
              onClick={() => setLevelFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                levelFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111827] dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              All Levels
            </button>
            <button
              type="button"
              onClick={() => setLevelFilter('PRIMARY')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                levelFilter === 'PRIMARY'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111827] dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Primary (Rubric)
            </button>
            <button
              type="button"
              onClick={() => setLevelFilter('JUNIOR')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                levelFilter === 'JUNIOR'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111827] dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Junior School (8-Point)
            </button>
          </div>
        </div>
      </div>

      {/* 2. Minimalist Summary Ribbon (~52px height) */}
      <SchoolwideSummaryRibbon
        data={summaryRibbon}
        loading={loading}
        onFilterRemedial={() => {
          const classWithBe = allGradeRows.find(
            (c) => (c.rubricCounts && c.rubricCounts.BE > 0) || (c.pointCounts && (c.pointCounts[1] + c.pointCounts[2] > 0))
          );
          if (classWithBe) {
            setSelectedDrawerClassId(classWithBe.classId);
          } else {
            toast.info('No learners currently in Below Expectations (Remedial).');
          }
        }}
      />

      {/* 3. Unified Grade Performance Table (Section A: Primary, Section B: Junior Secondary) */}
      <GradePerformanceMatrix
        primaryClasses={primaryClasses}
        juniorClasses={juniorClasses}
        selectedLevelFilter={levelFilter}
        assignedClassId={assignedClassId}
        currentUserId={currentUserId}
        onInspectGrade={(classId) => setSelectedDrawerClassId(classId)}
        loading={loading}
        deltaLoading={deltaLoading}
      />

      {/* 4. Slide-Over Deep-Dive Drawer */}
      <GradeDrilldownDrawer
        isOpen={selectedDrawerClassId !== null}
        onClose={() => setSelectedDrawerClassId(null)}
        classId={selectedDrawerClassId}
        examId={selectedExamId}
        compareExamId={compareExamId}
        allGrades={allGradesList}
        onSelectGrade={(newClassId) => setSelectedDrawerClassId(newClassId)}
      />

      {/* 5. Conclude / Terminate Examination Period Modal */}
      {showTerminateModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Conclude Examination Period
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTerminateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs space-y-1.5">
              <p className="font-bold">
                Conclude: {selectedExam.title} (Term {selectedExam.termNumber} {selectedExam.year})
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                Concluding this examination will finalize all academic records, freeze teacher marksheet entry, and lock scores. Dashboards across the school will continue displaying these concluded results as the official standard until the next upcoming examination is initialized, marked, and calculated.
              </p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to conclude and lock this examination cycle?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowTerminateModal(false)}
                disabled={isTerminating}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTerminateExamPeriod}
                disabled={isTerminating}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isTerminating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Confirm & Conclude Exam</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
