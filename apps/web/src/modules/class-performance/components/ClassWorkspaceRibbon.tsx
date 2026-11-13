import React, { useState } from 'react';
import {
  Award,
  Calendar,
  Download,
  Printer,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  Unlock,
  Users,
  Layers,
  ArrowRight,
} from 'lucide-react';

export interface ClassWorkspaceRibbonProps {
  classInfo: {
    id: string;
    name: string;
    levelCategory: string;
    isJuniorSecondary: boolean;
    classTeacherName: string;
    enrolledCount: number;
    satCount: number;
  };
  academicSummary: {
    meanPct: number;
    deltaPct: number | null;
    modeRubric?: 'EE' | 'ME' | 'AE' | 'BE';
    meanPoints?: number;
    deltaPoints?: number | null;
    masteryRatePct: number;
    beLearnerCount: number;
  };
  submissionStatus: {
    submittedSubjectsCount: number;
    totalSubjectsCount: number;
    pendingSubjects: Array<{ subjectId: string; subjectName: string; teacherName: string }>;
  };
  trajectoryCounts: {
    improvedCount: number;
    stableCount: number;
    droppedCount: number;
  };
  reportLockStatus: {
    isLocked: boolean;
    lockedAt: string | null;
    remarksCompletedCount: number;
    totalLearnersCount: number;
  };
  availableExams: Array<{ id: string; title: string; termNumber: number; year: number; label: string }>;
  selectedExamId: string;
  onSelectExam: (examId: string) => void;
  availableClasses?: Array<{ id: string; name: string; levelCategory: string }>;
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
  isLeadership?: boolean;
  compareExamId: string;
  onSelectCompareExam: (compareId: string) => void;
  onExportCsv: () => void;
  onPrint: () => void;
  onFilterRemedial?: () => void;
  deltaLoading?: boolean;
}

export const ClassWorkspaceRibbon: React.FC<ClassWorkspaceRibbonProps> = ({
  classInfo,
  academicSummary,
  submissionStatus,
  trajectoryCounts,
  reportLockStatus,
  availableExams,
  selectedExamId,
  onSelectExam,
  availableClasses = [],
  selectedClassId,
  onSelectClass,
  isLeadership = false,
  compareExamId,
  onSelectCompareExam,
  onExportCsv,
  onPrint,
  onFilterRemedial,
  deltaLoading = false,
}) => {
  const [showPendingModal, setShowPendingModal] = useState(false);

  const { isJuniorSecondary, name, levelCategory, classTeacherName, enrolledCount, satCount } = classInfo;
  const { meanPct, deltaPct, modeRubric, meanPoints, deltaPoints, masteryRatePct, beLearnerCount } = academicSummary;
  const { submittedSubjectsCount, totalSubjectsCount, pendingSubjects } = submissionStatus;
  const { improvedCount, stableCount, droppedCount } = trajectoryCounts;
  const { isLocked, remarksCompletedCount, totalLearnersCount } = reportLockStatus;

  const isAllSubmitted = totalSubjectsCount > 0 && submittedSubjectsCount >= totalSubjectsCount;

  return (
    <div className="space-y-4">
      {/* 1. Header Row */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 sm:p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold tracking-wider uppercase bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/50">
              <Award className="w-3.5 h-3.5" />
              {isJuniorSecondary ? 'Junior Secondary (8-Point Scale)' : `${levelCategory.replace('_', ' ')} (4-Tier Rubric)`}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Class Teacher: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{classTeacherName}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              {name} Performance Workspace
            </h1>

            {/* Class switcher for Leadership or Multi-Class users */}
            {isLeadership && availableClasses.length > 1 && (
              <div className="relative">
                <select
                  value={selectedClassId}
                  onChange={(e) => onSelectClass(e.target.value)}
                  className="text-xs font-bold pl-2.5 pr-7 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0b1120] text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-1 focus:ring-sky-500 appearance-none cursor-pointer"
                  title="Switch Grade Level"
                >
                  {availableClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational broadsheet intelligence, competency mastery spread, and Learner 360° diagnostics.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Active Exam Selector */}
          <div className="relative">
            <select
              value={selectedExamId}
              onChange={(e) => onSelectExam(e.target.value)}
              className="text-xs font-bold pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
            >
              {availableExams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Compare Baseline Selector */}
          <div className="relative">
            <select
              value={compareExamId}
              onChange={(e) => onSelectCompareExam(e.target.value)}
              className="text-xs font-bold pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
            >
              <option value="auto">Compare: Auto (Preceding Exam)</option>
              {availableExams
                .filter((ex) => ex.id !== selectedExamId)
                .map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    vs {ex.title} (T{ex.termNumber})
                  </option>
                ))}
              <option value="none">No Comparison (Raw Only)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Download Broadsheet in CSV format"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Print Broadsheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* 2. Single-Row Operational & Academic Summary Ribbon (~52px, divide-x layout, zero big cards) */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800/80 dark:bg-[#111827] shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:divide-x divide-slate-100 dark:divide-slate-800/80">
          
          {/* Slot 1: Mark Readiness */}
          <div className="flex items-center gap-2.5 lg:pr-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isAllSubmitted
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
            }`}>
              {isAllSubmitted ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Mark Readiness
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                  {submittedSubjectsCount}/{totalSubjectsCount} Ready
                </span>
                {!isAllSubmitted && (
                  <button
                    type="button"
                    onClick={() => setShowPendingModal(true)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 hover:underline cursor-pointer"
                    title="Click to view pending subjects and allocated teachers"
                  >
                    {pendingSubjects.length} Pending
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Slot 2: Class Central Tendency */}
          <div className="flex items-center gap-2.5 lg:px-3">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Class Mean & Scale
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {isJuniorSecondary ? (
                  <>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                      {meanPoints !== undefined ? `${meanPoints} / 8.0` : '—'} pts
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      ({meanPct}%)
                    </span>
                    {deltaPoints !== undefined && deltaPoints !== null && (
                      <span className={`text-[10px] font-extrabold ${deltaLoading ? 'animate-pulse' : ''} ${
                        deltaPoints > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : deltaPoints < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      }`}>
                        {deltaPoints > 0 ? `+${deltaPoints}` : deltaPoints} pts
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                      {meanPct}%
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
                      {modeRubric || 'ME'}
                    </span>
                    {deltaPct !== null && (
                      <span className={`text-[10px] font-extrabold ${deltaLoading ? 'animate-pulse' : ''} ${
                        deltaPct > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : deltaPct < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      }`}>
                        {deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Slot 3: Competency Mastery */}
          <div className="flex items-center gap-2.5 lg:px-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Competency Mastery
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                  {masteryRatePct}% Mastery
                </span>
                {beLearnerCount > 0 ? (
                  <button
                    type="button"
                    onClick={onFilterRemedial}
                    className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                    title="Click to isolate remedial watchlist"
                  >
                    {beLearnerCount} in BE
                  </button>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    0 in BE
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Slot 4: Class Momentum */}
          <div className="flex items-center gap-2.5 lg:px-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Class Momentum
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5" title="Learners with >= +2% gain">
                  ↑ {improvedCount}
                </span>
                <span className="text-slate-400 dark:text-slate-500">·</span>
                <span className="text-slate-600 dark:text-slate-400 inline-flex items-center gap-0.5" title="Learners within -2% to +2%">
                  → {stableCount}
                </span>
                <span className="text-slate-400 dark:text-slate-500">·</span>
                <span className="text-rose-600 dark:text-rose-400 inline-flex items-center gap-0.5" title="Learners with <= -2% drop">
                  ↓ {droppedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Slot 5: Report Cards */}
          <div className="flex items-center gap-2.5 lg:pl-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isLocked
                ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
            }`}>
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Report Cards
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                  {remarksCompletedCount}/{totalLearnersCount} Remarks
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                  isLocked
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                }`}>
                  {isLocked ? 'Locked' : 'Open'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Pending Subjects Popover Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Pending Mark Submissions ({pendingSubjects.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPendingModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
              {pendingSubjects.map((sub) => (
                <div key={sub.subjectId} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{sub.subjectName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{sub.teacherName}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                    Awaiting Entry
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowPendingModal(false)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
