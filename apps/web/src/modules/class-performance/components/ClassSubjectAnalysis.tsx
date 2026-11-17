import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { DistributionMicroBar } from '../../dos/components/DistributionMicroBar';
import { SubjectCatDrilldownModal } from './SubjectCatDrilldownModal';
import { isNationalExamClass } from '@school/shared/types';

export interface CatSummaryItem {
  id: string;
  catNumber: number;
  maxMarks: number;
  meanPct: number | null;
  scoredCount: number;
  totalCount: number;
}

export interface SubjectAnalysisItem {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  submissionState: 'SUBMITTED' | 'PENDING';
  examMeanPct: number | null;
  examDeltaPct: number | null;
  examMeanPointsOrRubric: string;
  catMeanPct: number | null;
  catsList?: CatSummaryItem[];
  catToExamVariancePct: number | null;
  distributionCounts: Record<string, number>;
  beCount: number;
}

export interface ClassSubjectAnalysisProps {
  subjects: SubjectAnalysisItem[];
  isJuniorSecondary: boolean;
  classId?: string;
  className?: string;
  levelCategory?: string;
  numericOrder?: number;
  onFilterStrugglingSubject?: (subjectId: string) => void;
  deltaLoading?: boolean;
}

export const ClassSubjectAnalysis: React.FC<ClassSubjectAnalysisProps> = ({
  subjects,
  isJuniorSecondary,
  classId,
  className,
  levelCategory,
  numericOrder,
  onFilterStrugglingSubject,
  deltaLoading = false,
}) => {
  const [selectedDrilldownSubject, setSelectedDrilldownSubject] = useState<SubjectAnalysisItem | null>(null);

  const isNationalTransition = isNationalExamClass({
    name: className,
    levelCategory,
    numericOrder,
  });

  if (subjects.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-12 text-center shadow-xs">
        <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No subject analysis data recorded</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          No learning areas or marks found for the selected examination.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 font-bold text-[11px] text-slate-600 dark:text-slate-400 select-none">
                <th className="px-4 py-3 min-w-[200px]">LEARNING AREA & TEACHER</th>
                <th className="px-3.5 py-3 text-center min-w-[90px]">SUBMISSION</th>
                {isNationalTransition && (
                  <th className="px-3.5 py-3 text-center min-w-[140px]">
                    CONTINUOUS ASSESSMENT (CATS)
                  </th>
                )}
                <th className="px-3.5 py-3 text-center min-w-[120px]">
                  {isNationalTransition ? 'MAIN EXAM MEAN' : 'EXAM MEAN'}
                </th>
                {isNationalTransition && (
                  <th className="px-3.5 py-3 text-center min-w-[125px]">EXAM VS CAT</th>
                )}
                <th className="px-3.5 py-3 text-center min-w-[95px]">VS PREV EXAM</th>
                <th className="px-4 py-3 text-center min-w-[160px]">SCORE SPREAD</th>
                <th className="px-4 py-3 text-right min-w-[120px]">
                  {isJuniorSecondary ? 'REMEDIAL (≤2 PTS)' : 'REMEDIAL (BE)'}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {subjects.map((sub) => {
                const isSubmitted = sub.submissionState === 'SUBMITTED';
                const catVariance = sub.catToExamVariancePct;

                return (
                  <tr
                    key={sub.subjectId}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* 1. Learning Area & Teacher */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {sub.subjectCode ? sub.subjectCode.substring(0, 2) : 'SB'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs">
                            {sub.subjectName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {sub.teacherName}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 2. Submission State */}
                    <td className="px-3.5 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isSubmitted
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSubmitted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {isSubmitted ? 'Submitted' : 'Pending'}
                      </span>
                    </td>

                    {/* 3. Continuous Assessment (CATs) - Only for National Transition Cohorts (Grades 3, 6, 9) */}
                    {isNationalTransition && (
                      <td className="px-3.5 py-3 text-center">
                        {sub.catsList && sub.catsList.length > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center justify-center gap-1 flex-wrap max-w-[170px]">
                              {sub.catsList.map((c) => (
                                <span
                                  key={c.id}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60"
                                  title={`CAT ${c.catNumber}: ${c.meanPct !== null ? c.meanPct + '%' : 'Pending'} (${c.scoredCount}/${c.totalCount} marked, out of ${c.maxMarks})`}
                                >
                                  CAT {c.catNumber}: {c.meanPct !== null ? `${c.meanPct}%` : '—'}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {sub.catMeanPct !== null && (
                                <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">
                                  Avg: {sub.catMeanPct}%
                                </span>
                              )}
                              {classId && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedDrilldownSubject(sub)}
                                  className="text-[10px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 hover:underline cursor-pointer"
                                  title="View individual learner marks across CATs"
                                >
                                  Details →
                                </button>
                              )}
                            </div>
                          </div>
                        ) : sub.catMeanPct !== null ? (
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                              {sub.catMeanPct}%
                            </span>
                            {classId && (
                              <button
                                type="button"
                                onClick={() => setSelectedDrilldownSubject(sub)}
                                className="text-[10px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 hover:underline cursor-pointer mt-0.5"
                              >
                                Details →
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-500/90 dark:text-amber-400/90 font-medium">
                            No CATs
                          </span>
                        )}
                      </td>
                    )}

                    {/* 4. Main Exam Mean */}
                    <td className="px-3.5 py-3 text-center">
                      {sub.examMeanPct !== null ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-black text-xs text-slate-900 dark:text-slate-100">
                            {sub.examMeanPct}%
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {sub.examMeanPointsOrRubric}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* 5. Exam vs CAT Variance - Only for National Transition Cohorts (Grades 3, 6, 9) */}
                    {isNationalTransition && (
                      <td className="px-3.5 py-3 text-center">
                        {catVariance !== null ? (
                          <div className="inline-flex items-center gap-1 font-bold text-xs">
                            {catVariance > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <TrendingUp className="w-3 h-3" />
                                +{catVariance}%
                              </span>
                            ) : catVariance < 0 ? (
                              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                                <TrendingDown className="w-3 h-3" />
                                {catVariance}%
                              </span>
                            ) : (
                              <span className="text-slate-500 flex items-center gap-0.5">
                                <Minus className="w-3 h-3" />
                                0.0%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                    )}

                    {/* 6. vs Previous Exam */}
                    <td className="px-3.5 py-3 text-center">
                      {deltaLoading ? (
                        <span className="inline-block w-8 h-3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                      ) : sub.examDeltaPct !== null ? (
                        <span
                          className={`inline-flex items-center gap-0.5 font-bold text-xs ${
                            sub.examDeltaPct > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : sub.examDeltaPct < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {sub.examDeltaPct > 0 ? '+' : ''}
                          {sub.examDeltaPct}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>

                    {/* 7. Score Spread (Distribution) */}
                    <td className="px-4 py-3 text-center">
                      <div className="max-w-[140px] mx-auto">
                        <DistributionMicroBar
                          distribution={sub.distributionCounts as any}
                          isJunior={isJuniorSecondary}
                        />
                      </div>
                    </td>

                    {/* 8. Remedial (BE) Count */}
                    <td className="px-4 py-3 text-right">
                      {sub.beCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => onFilterStrugglingSubject?.(sub.subjectId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40 hover:bg-rose-100 cursor-pointer transition-colors"
                          title="Click to view struggling learners in broadsheet"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {sub.beCount} BE
                          <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          0 BE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subject CAT Drilldown Modal (National Transition Cohorts: Grades 3, 6, 9 Only) */}
      {isNationalTransition && selectedDrilldownSubject && classId && (
        <SubjectCatDrilldownModal
          isOpen={selectedDrilldownSubject !== null}
          onClose={() => setSelectedDrilldownSubject(null)}
          classId={classId}
          className={className || 'Class'}
          subjectId={selectedDrilldownSubject.subjectId}
          subjectName={selectedDrilldownSubject.subjectName}
          subjectCode={selectedDrilldownSubject.subjectCode}
          teacherName={selectedDrilldownSubject.teacherName}
          isJuniorSecondary={isJuniorSecondary}
        />
      )}
    </>
  );
};
