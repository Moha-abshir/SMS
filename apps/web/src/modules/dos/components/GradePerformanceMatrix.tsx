import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  Award,
  Sparkles,
  BookOpen,
  UserCheck,
} from 'lucide-react';
import { PrimaryDistribution, JuniorDistribution } from './DistributionMicroBar';

export interface GradeRowData {
  classId: string;
  gradeName: string;
  levelCategory: string;
  numericOrder: number;
  isJunior: boolean;
  classTeacherId: string | null;
  classTeacherName: string;
  enrolledCount: number;
  satCount: number;
  hasMarks: boolean;
  meanPercentage: number;
  deltaPercentage: number | null;
  rubricMode: 'EE' | 'ME' | 'AE' | 'BE' | null;
  rubricCounts: PrimaryDistribution | null;
  meanPoints: number | null;
  deltaPoints: number | null;
  pointCounts: JuniorDistribution | null;
  strongestSubject: { name: string; meanPct: number; pointsOrRubric: string } | null;
  weakestSubject: { name: string; meanPct: number; pointsOrRubric: string } | null;
  topLearner: { id: string; name: string; meanPct: number; pointsOrRubric: string } | null;
}

interface GradePerformanceMatrixProps {
  primaryClasses: GradeRowData[];
  juniorClasses: GradeRowData[];
  selectedLevelFilter: 'ALL' | 'PRIMARY' | 'JUNIOR';
  assignedClassId?: string | null;
  currentUserId?: string | null;
  onInspectGrade: (classId: string) => void;
  loading?: boolean;
  deltaLoading?: boolean;
}

export const GradePerformanceMatrix: React.FC<GradePerformanceMatrixProps> = ({
  primaryClasses,
  juniorClasses,
  selectedLevelFilter,
  assignedClassId,
  currentUserId,
  onInspectGrade,
  loading = false,
  deltaLoading = false,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (classId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="space-y-1">
                  <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-2.5 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
              <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded hidden sm:block" />
              <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-3 w-14 bg-slate-200 dark:bg-slate-800 rounded hidden md:block" />
              <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded hidden lg:block" />
              <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderGradeRow = (row: GradeRowData) => {
    const isExpanded = expandedRows.has(row.classId);
    const isAssigned =
      (assignedClassId && row.classId === assignedClassId) ||
      (currentUserId && row.classTeacherId === currentUserId);

    return (
      <React.Fragment key={row.classId}>
        <tr
          onClick={() => onInspectGrade(row.classId)}
          className={`group cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800/60 ${
            isAssigned
              ? 'bg-sky-50/50 hover:bg-sky-50/80 dark:bg-sky-950/20 dark:hover:bg-sky-950/30'
              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
          }`}
        >
          {/* 1. Grade & Teacher */}
          <td className="px-4 py-3 min-w-[200px]">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={(e) => toggleExpand(row.classId, e)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                title={isExpanded ? 'Collapse subject preview' : 'Expand subject preview'}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {row.gradeName}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {row.levelCategory.replace(/_/g, ' ')}
                  </span>
                  {isAssigned && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-1">
                      <UserCheck className="w-2.5 h-2.5" />
                      My Class
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Class Teacher: <span className="font-semibold text-slate-700 dark:text-slate-300">{row.classTeacherName}</span>
                </div>
              </div>
            </div>
          </td>

          {/* 2. Candidacy */}
          <td className="px-3 py-3 text-center whitespace-nowrap">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {row.satCount} / {row.enrolledCount}
            </span>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {row.enrolledCount > 0 ? `${Math.round((row.satCount / row.enrolledCount) * 100)}% Sat` : '0%'}
            </div>
          </td>

          {/* 3. Mean & Scale Rating */}
          <td className="px-3 py-3 whitespace-nowrap">
            {row.hasMarks ? (
              <div className="flex items-center gap-2">
                {row.isJunior ? (
                  <>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                      {row.meanPoints} pts
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      {row.meanPercentage}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                      {row.meanPercentage}%
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                        row.rubricMode === 'EE'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : row.rubricMode === 'ME'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                          : row.rubricMode === 'AE'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {row.rubricMode}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <span className="text-[11px] italic text-slate-400 dark:text-slate-500">Unmarked</span>
            )}
          </td>

          {/* 4. vs Previous Exam Delta */}
          <td className="px-3 py-3 whitespace-nowrap">
            {deltaLoading ? (
              <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            ) : (row.isJunior ? row.deltaPoints : row.deltaPercentage) !== null ? (
              (() => {
                const delta = row.isJunior ? row.deltaPoints! : row.deltaPercentage!;
                const isPositive = delta > 0;
                const isNegative = delta < 0;

                return (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isPositive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : isNegative
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    ) : isNegative ? (
                      <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                    ) : null}
                    {isPositive ? '+' : ''}
                    {delta}
                    {row.isJunior ? ' pts' : '%'}
                  </span>
                );
              })()
            ) : (
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">— (First Exam)</span>
            )}
          </td>

          {/* 5. Needs Attention (Lowest Subject) */}
          <td className="px-3 py-3 max-w-[220px]">
            {row.weakestSubject ? (
              <div className="truncate">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0 text-amber-500" />
                  <span className="truncate">{row.weakestSubject.name}</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block pl-4">
                  {row.weakestSubject.meanPct}% ({row.weakestSubject.pointsOrRubric})
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">—</span>
            )}
          </td>

          {/* 6. Action */}
          <td className="px-4 py-3 text-right whitespace-nowrap">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspectGrade(row.classId);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:text-sky-300 dark:hover:bg-sky-950/60 border border-transparent hover:border-sky-200 dark:hover:border-sky-800 transition-all cursor-pointer"
            >
              <span>Inspect</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </td>
        </tr>

        {/* Inline Expand Row */}
        {isExpanded && (
          <tr className="bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
            <td colSpan={6} className="px-6 py-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Strongest Subject */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800">
                  <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Strongest Subject</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {row.strongestSubject ? `${row.strongestSubject.name} (${row.strongestSubject.meanPct}%)` : '—'}
                    </span>
                  </div>
                </div>

                {/* Lowest Bottleneck Subject */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-amber-500 uppercase block">Needs Attention (Lowest)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {row.weakestSubject ? `${row.weakestSubject.name} (${row.weakestSubject.meanPct}%)` : '—'}
                    </span>
                  </div>
                </div>

                {/* Top Learner */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800">
                  <Award className="w-4 h-4 text-purple-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Top Learner</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {row.topLearner ? `${row.topLearner.name} (${row.topLearner.meanPct}%)` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const showPrimary = selectedLevelFilter === 'ALL' || selectedLevelFilter === 'PRIMARY';
  const showJunior = selectedLevelFilter === 'ALL' || selectedLevelFilter === 'JUNIOR';

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <th className="px-4 py-3">Grade & Teacher</th>
              <th className="px-3 py-3 text-center">Candidacy</th>
              <th className="px-3 py-3">Mean & Scale</th>
              <th className="px-3 py-3" title="Comparison with immediately preceding examination">vs Prev Exam</th>
              <th className="px-3 py-3" title="Lowest-scoring Learning Area in this grade requiring academic intervention">Needs Attention (Lowest)</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
            {/* Section A: Pre-Primary & Primary Levels */}
            {showPrimary && primaryClasses.length > 0 && (
              <>
                <tr className="bg-slate-100/70 dark:bg-slate-900/90">
                  <td
                    colSpan={6}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400"
                  >
                    Section A: Pre-Primary & Primary Levels (4-Tier Rubric: PP1 – Grade 6)
                  </td>
                </tr>
                {primaryClasses.map(renderGradeRow)}
              </>
            )}

            {/* Section B: Junior Secondary Levels */}
            {showJunior && juniorClasses.length > 0 && (
              <>
                <tr className="bg-slate-100/70 dark:bg-slate-900/90">
                  <td
                    colSpan={6}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400"
                  >
                    Section B: Junior Secondary Levels (8-Point Scale: Grade 7 – Grade 9)
                  </td>
                </tr>
                {juniorClasses.map(renderGradeRow)}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
