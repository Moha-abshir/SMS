import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  ArrowRight,
} from 'lucide-react';
import { DistributionMicroBar } from '../../dos/components/DistributionMicroBar';

export interface SubjectAnalysisItem {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  submissionState: 'SUBMITTED' | 'PENDING';
  examMeanPct: number;
  examDeltaPct: number | null;
  examMeanPointsOrRubric: string;
  catMeanPct: number | null;
  catToExamVariancePct: number | null;
  distributionCounts: Record<string, number>;
  beCount: number;
}

export interface ClassSubjectAnalysisProps {
  subjects: SubjectAnalysisItem[];
  isJuniorSecondary: boolean;
  onFilterStrugglingSubject?: (subjectId: string) => void;
  deltaLoading?: boolean;
}

export const ClassSubjectAnalysis: React.FC<ClassSubjectAnalysisProps> = ({
  subjects,
  isJuniorSecondary,
  onFilterStrugglingSubject,
  deltaLoading = false,
}) => {
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
    <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 font-bold text-[11px] text-slate-600 dark:text-slate-400 select-none">
              <th className="px-4 py-3 min-w-[200px]">LEARNING AREA & TEACHER</th>
              <th className="px-3.5 py-3 text-center min-w-[90px]">SUBMISSION</th>
              <th className="px-3.5 py-3 text-center min-w-[100px]">CAT AVERAGE</th>
              <th className="px-3.5 py-3 text-center min-w-[120px]">MAIN EXAM MEAN</th>
              <th className="px-3.5 py-3 text-center min-w-[125px]">EXAM VS CAT</th>
              <th className="px-3.5 py-3 text-center min-w-[95px]">VS PREV EXAM</th>
              <th className="px-4 py-3 text-center min-w-[160px]">SCORE SPREAD</th>
              <th className="px-4 py-3 text-right min-w-[120px]">REMEDIAL (BE)</th>
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
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      isSubmitted
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isSubmitted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {isSubmitted ? 'Submitted' : 'Pending'}
                    </span>
                  </td>

                  {/* 3. CAT Average */}
                  <td className="px-3.5 py-3 text-center">
                    {sub.catMeanPct !== null ? (
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {sub.catMeanPct}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        No CATs
                      </span>
                    )}
                  </td>

                  {/* 4. Main Exam Mean */}
                  <td className="px-3.5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="font-black text-xs text-slate-900 dark:text-slate-100">
                        {sub.examMeanPct}%
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {sub.examMeanPointsOrRubric}
                      </span>
                    </div>
                  </td>

                  {/* 5. Exam vs CAT Variance */}
                  <td className="px-3.5 py-3 text-center">
                    {catVariance !== null ? (
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          catVariance >= 0
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : catVariance <= -10
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                        title={`Exam Mean (${sub.examMeanPct}%) vs CAT Mean (${sub.catMeanPct}%) gap: ${catVariance > 0 ? `+${catVariance}` : catVariance}%`}
                      >
                        {catVariance > 0 ? `+${catVariance}%` : `${catVariance}%`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </td>

                  {/* 6. vs Previous Exam Delta */}
                  <td className="px-3.5 py-3 text-center">
                    {sub.examDeltaPct !== null ? (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-black ${deltaLoading ? 'animate-pulse' : ''} ${
                        sub.examDeltaPct > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : sub.examDeltaPct < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      }`}>
                        {sub.examDeltaPct > 0 ? `+${sub.examDeltaPct}%` : `${sub.examDeltaPct}%`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </td>

                  {/* 7. Class Spread Micro-Bar */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <DistributionMicroBar
                        isJunior={isJuniorSecondary}
                        distribution={sub.distributionCounts as any}
                        className="w-32 sm:w-36"
                      />
                    </div>
                  </td>

                  {/* 8. Remedial (BE) Headcount */}
                  <td className="px-4 py-3 text-right">
                    {sub.beCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => onFilterStrugglingSubject?.(sub.subjectId)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                        title="Filter broadsheet to learners struggling in this subject"
                      >
                        <span>{sub.beCount} in BE</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        0 in BE
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
  );
};
