import React, { useState } from 'react';
import {
  Download,
  Printer,
  ChevronDown,
  Target,
  AlertTriangle,
  Lock,
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
    schoolMeanPct?: number | null;
    schoolModeRubric?: string | null;
    schoolMeanPoints?: number | null;
  };
  targetMean?: {
    targetMeanPercentage: number | null;
    rawTargetPercentage?: number | null;
    targetMeanPoints: number | null;
    isMet: boolean | null;
    diffFromTarget: number | null;
    setByTeacherName: string | null;
    notes?: string | null;
    wasSetBeforeExamStarted?: boolean;
    hasExamStarted?: boolean;
  } | null;
  selectedExam: {
    id: string;
    title: string;
    termNumber: number;
    year: number;
    startDate?: string | null;
    endDate?: string | null;
    status?: string;
    hasStarted?: boolean;
  };
  nextExam?: {
    id: string;
    title: string;
    termNumber: number;
    year: number;
    startDate?: string | null;
    endDate?: string | null;
    status?: string;
    hasStarted?: boolean;
  } | null;
  nextExamTarget?: {
    id?: string;
    targetMeanPercentage: number;
    targetMeanPoints: number | null;
    notes?: string | null;
  } | null;
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
  availableExams: Array<{ id: string; title: string; termNumber: number; year: number; label: string; startDate?: string | null; status?: string }>;
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
  onOpenTargetModal?: (examId?: string) => void;
  deltaLoading?: boolean;
}

export const ClassWorkspaceRibbon: React.FC<ClassWorkspaceRibbonProps> = ({
  classInfo,
  academicSummary,
  targetMean,
  selectedExam,
  nextExam,
  nextExamTarget,
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
  onOpenTargetModal,
  deltaLoading = false,
}) => {
  const [showPendingModal, setShowPendingModal] = useState(false);

  const { isJuniorSecondary, name, levelCategory, classTeacherName } = classInfo;
  const { meanPct, deltaPct, modeRubric, meanPoints, deltaPoints, masteryRatePct, beLearnerCount } = academicSummary;
  const { submittedSubjectsCount, totalSubjectsCount, pendingSubjects } = submissionStatus;
  const { improvedCount, stableCount, droppedCount } = trajectoryCounts;
  const { isLocked, remarksCompletedCount, totalLearnersCount } = reportLockStatus;

  const isAllSubmitted = totalSubjectsCount > 0 && submittedSubjectsCount >= totalSubjectsCount;
  const hasPriorExam = compareExamId !== 'none' && deltaPct !== null && (improvedCount > 0 || stableCount > 0 || droppedCount > 0);

  const levelLabel = isJuniorSecondary
    ? 'Junior Secondary · 8-Point Scale'
    : `${levelCategory.replace('_', ' ')} · 4-Tier Rubric`;

  // Determine if next exam exists for target button
  const upcomingExam = nextExam || null;

  return (
    <div className="space-y-2.5">
      {/* 1. Flat Header Bar (Max Height: 44px) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
        {/* Left side */}
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight whitespace-nowrap text-slate-900 dark:text-slate-100">
              {name} Workspace
            </h1>

            {/* Class switcher for Leadership or Multi-Class users */}
            {isLeadership && availableClasses.length > 1 && (
              <div className="relative">
                <select
                  value={selectedClassId}
                  onChange={(e) => onSelectClass(e.target.value)}
                  className="text-xs font-semibold pl-2 pr-6 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0b1120] text-slate-700 dark:text-slate-300 focus:outline-hidden appearance-none cursor-pointer"
                  title="Switch Grade Level"
                >
                  {availableClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>

          <span className="text-[11px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 whitespace-nowrap font-medium">
            {levelLabel}
          </span>

          <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
            · Class Teacher: <strong className="text-slate-700 dark:text-slate-300 font-medium">{classTeacherName}</strong>
          </span>

          {isLocked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
              <Lock className="w-3 h-3" />
              <span>Locked</span>
            </span>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Target Mean CTA - Targets upcoming exam */}
          <button
            type="button"
            onClick={() => onOpenTargetModal?.(upcomingExam ? upcomingExam.id : selectedExam.id)}
            className={`h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
              upcomingExam && nextExamTarget?.targetMeanPercentage !== null && nextExamTarget?.targetMeanPercentage !== undefined
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20'
                : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-sky-500 hover:text-sky-500 dark:hover:text-sky-400'
            }`}
            title={upcomingExam ? `Set target mean expectation for next exam: ${upcomingExam.title}` : 'Set class target mean'}
          >
            <Target className="w-3.5 h-3.5 shrink-0" />
            {upcomingExam ? (
              nextExamTarget?.targetMeanPercentage !== null && nextExamTarget?.targetMeanPercentage !== undefined ? (
                <span>
                  Target Next: <strong>{nextExamTarget.targetMeanPercentage}%</strong>
                </span>
              ) : (
                <span>+ Set Target (Next Exam)</span>
              )
            ) : targetMean?.targetMeanPercentage !== null && targetMean?.targetMeanPercentage !== undefined && targetMean?.wasSetBeforeExamStarted ? (
              <span>
                Target: <strong>{targetMean.targetMeanPercentage}%</strong>
              </span>
            ) : (
              <span>+ Set Target Mean</span>
            )}
          </button>

          {/* Compact Exam Select */}
          <div className="relative">
            <select
              value={selectedExamId}
              onChange={(e) => onSelectExam(e.target.value)}
              className="h-8 text-xs font-medium pl-2.5 pr-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] text-slate-800 dark:text-slate-200 shadow-2xs focus:ring-1 focus:ring-sky-500 appearance-none cursor-pointer"
            >
              {availableExams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Compact Baseline Compare Select */}
          <div className="relative">
            <select
              value={compareExamId}
              onChange={(e) => onSelectCompareExam(e.target.value)}
              className="h-8 text-xs font-medium pl-2.5 pr-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] text-slate-800 dark:text-slate-200 shadow-2xs focus:ring-1 focus:ring-sky-500 appearance-none cursor-pointer"
            >
              <option value="auto">Compare: Auto</option>
              {availableExams
                .filter((ex) => ex.id !== selectedExamId)
                .map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    vs {ex.title}
                  </option>
                ))}
              <option value="none">No Comparison</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Compact Export CSV Button */}
          <button
            type="button"
            onClick={onExportCsv}
            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
            title="Download Broadsheet in CSV format"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Compact Print Button */}
          <button
            type="button"
            onClick={onPrint}
            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
            title="Print Broadsheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* 2. Sleek Single-Line Ticker Ribbon (Max Height: 44px, 5 Slots) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-slate-200 dark:divide-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]/70 px-3 py-2 text-xs shadow-xs">
        
        {/* Slot 1: Target Mean */}
        <div className="flex items-center justify-between px-2.5 min-w-0">
          <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Target Mean:</span>
          <div className="flex items-center gap-1.5 min-w-0">
            {targetMean?.targetMeanPercentage !== null && targetMean?.targetMeanPercentage !== undefined && targetMean?.wasSetBeforeExamStarted ? (
              <>
                <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  {isJuniorSecondary ? `${targetMean.targetMeanPoints || '—'} pts` : `${targetMean.targetMeanPercentage}%`}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    targetMean.isMet
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                  }`}
                >
                  {targetMean.isMet ? 'Met' : 'Missed'}
                </span>
                {targetMean.diffFromTarget !== null && (
                  <span
                    className={`text-[10px] font-bold ${
                      targetMean.diffFromTarget >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {targetMean.diffFromTarget >= 0 ? `+${targetMean.diffFromTarget}%` : `${targetMean.diffFromTarget}%`}
                  </span>
                )}
              </>
            ) : (
              <span
                className="text-slate-400 text-[11px] italic"
                title="Target was not recorded prior to examination start date"
              >
                Not set
              </span>
            )}
          </div>
        </div>

        {/* Slot 2: School Mean & Class Mean */}
        <div className="flex items-center justify-between px-2.5 min-w-0">
          <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            {academicSummary.schoolMeanPct !== undefined && academicSummary.schoolMeanPct !== null
              ? 'Class / Sch Mean:'
              : 'Class Mean:'}
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
              {isJuniorSecondary ? `${meanPoints !== undefined ? meanPoints : '—'} pts` : `${meanPct}%`}
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
              {isJuniorSecondary ? `${meanPct}%` : modeRubric || 'ME'}
            </span>
            {academicSummary.schoolMeanPct !== undefined && academicSummary.schoolMeanPct !== null && (
              <span
                className="text-[10px] text-slate-400 font-medium whitespace-nowrap"
                title={`Curriculum Tier School Mean: ${academicSummary.schoolMeanPct}%`}
              >
                (Sch: {academicSummary.schoolMeanPct}%)
              </span>
            )}
            {hasPriorExam ? (
              <span
                className={`text-[10px] font-bold ${deltaLoading ? 'animate-pulse' : ''} ${
                  deltaPct! > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : deltaPct! < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {deltaPct! > 0 ? `+${deltaPct}%` : `${deltaPct}%`}
              </span>
            ) : null}
          </div>
        </div>

        {/* Slot 3: Readiness */}
        <div className="flex items-center justify-between px-2.5 min-w-0">
          <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Readiness:</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isAllSubmitted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
              {submittedSubjectsCount}/{totalSubjectsCount} Ready
            </span>
            {!isAllSubmitted && (
              <button
                type="button"
                onClick={() => setShowPendingModal(true)}
                className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                ({pendingSubjects.length} pending)
              </button>
            )}
          </div>
        </div>

        {/* Slot 4: Mastery */}
        <div className="flex items-center justify-between px-2.5 min-w-0">
          <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Mastery:</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
              {masteryRatePct}% {isJuniorSecondary ? '5-8 pts' : 'EE/ME'}
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            {beLearnerCount > 0 ? (
              <button
                type="button"
                onClick={onFilterRemedial}
                className="text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
              >
                {beLearnerCount} BE
              </button>
            ) : (
              <span className="text-slate-400 font-medium">0 BE</span>
            )}
          </div>
        </div>

        {/* Slot 5: Momentum */}
        <div className="flex items-center justify-between px-2.5 min-w-0">
          <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Momentum:</span>
          {hasPriorExam ? (
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span className="text-emerald-600 dark:text-emerald-400" title="Improved">↑{improvedCount}</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-slate-500 dark:text-slate-400" title="Stable">→{stableCount}</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-rose-600 dark:text-rose-400" title="Dropped">↓{droppedCount}</span>
            </div>
          ) : (
            <span className="text-slate-400 text-[11px] italic">No prior exam</span>
          )}
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
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
