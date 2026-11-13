import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export interface BroadsheetLearner {
  studentId: string;
  admissionNo: string;
  fullName: string;
  gender: string | null;
  rank: number;
  previousRank: number | null;
  rankDelta: number | null;
  totalMarks: number;
  maxMarks: number;
  meanPct: number;
  deltaPct: number | null;
  overallRubricOrPoints: string;
  points: number;
  deltaPoints: number | null;
  missingSubjectsCount: number;
  personalBottleneckSubject: {
    subjectId: string;
    name: string;
    code: string;
    marks: number;
    rubricOrPoints: string;
    varianceFromLearnerMean: number;
  } | null;
  scoresBySubject: Record<
    string,
    {
      marks: number | null;
      rubricOrPoints: string;
      isMissing: boolean;
      isBelowExpectations: boolean;
    }
  >;
}

export interface BroadsheetSubject {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
}

export interface ClassStudentBroadsheetProps {
  learners: BroadsheetLearner[];
  subjects: BroadsheetSubject[];
  isJuniorSecondary: boolean;
  onInspectLearner: (studentId: string) => void;
  deltaLoading?: boolean;
}

export const ClassStudentBroadsheet: React.FC<ClassStudentBroadsheetProps> = ({
  learners,
  subjects,
  isJuniorSecondary,
  onInspectLearner,
  deltaLoading = false,
}) => {
  const [sortField, setSortField] = useState<string>('rank');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'rank' || field === 'name');
    }
  };

  const sortedLearners = useMemo(() => {
    const list = [...learners];

    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'rank') {
        valA = a.rank;
        valB = b.rank;
      } else if (sortField === 'name') {
        valA = a.fullName.toLowerCase();
        valB = b.fullName.toLowerCase();
      } else if (sortField === 'mean') {
        valA = a.meanPct;
        valB = b.meanPct;
      } else if (sortField === 'total') {
        valA = a.totalMarks;
        valB = b.totalMarks;
      } else if (sortField === 'delta') {
        valA = a.deltaPct ?? -999;
        valB = b.deltaPct ?? -999;
      } else if (sortField.startsWith('sub_')) {
        const subId = sortField.replace('sub_', '');
        valA = a.scoresBySubject[subId]?.marks ?? -1;
        valB = b.scoresBySubject[subId]?.marks ?? -1;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [learners, sortField, sortAsc]);

  if (learners.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-12 text-center shadow-xs">
        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No learners match the selected filter</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try switching quick-filters or clearing your search term.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 font-bold text-[11px] text-slate-600 dark:text-slate-400 select-none">
              
              {/* Sticky Column 1: Rank & Movement */}
              <th
                onClick={() => handleSort('rank')}
                className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 px-3.5 py-3 w-16 cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 transition-colors shadow-[1px_0_0_0_rgba(0,0,0,0.06)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]"
              >
                <div className="flex items-center gap-1">
                  <span>RANK</span>
                  {sortField === 'rank' ? (
                    sortAsc ? <ChevronUp className="w-3 h-3 text-sky-500" /> : <ChevronDown className="w-3 h-3 text-sky-500" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                  )}
                </div>
              </th>

              {/* Sticky Column 2: Learner Details */}
              <th
                onClick={() => handleSort('name')}
                className="sticky left-16 z-20 bg-slate-50 dark:bg-slate-900 px-3.5 py-3 min-w-[210px] cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 transition-colors shadow-[2px_0_3px_-1px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_3px_-1px_rgba(0,0,0,0.2)]"
              >
                <div className="flex items-center gap-1">
                  <span>LEARNER</span>
                  {sortField === 'name' ? (
                    sortAsc ? <ChevronUp className="w-3 h-3 text-sky-500" /> : <ChevronDown className="w-3 h-3 text-sky-500" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                  )}
                </div>
              </th>

              {/* Dynamic Subject Columns */}
              {subjects.map((sub) => {
                const isSelected = sortField === `sub_${sub.subjectId}`;
                return (
                  <th
                    key={sub.subjectId}
                    onClick={() => handleSort(`sub_${sub.subjectId}`)}
                    className="px-3 py-3 text-center min-w-[95px] max-w-[120px] cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors border-l border-slate-100 dark:border-slate-800/60"
                    title={`${sub.subjectName} (${sub.teacherName}) - Click to sort`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="truncate max-w-[85px] font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                        {sub.subjectCode || sub.subjectName.substring(0, 5)}
                      </span>
                      <div className="flex items-center gap-0.5 text-[9px] font-normal text-slate-400">
                        <span className="truncate max-w-[70px]">{sub.teacherName.split(' ')[0]}</span>
                        {isSelected && (
                          sortAsc ? <ChevronUp className="w-2.5 h-2.5 text-sky-500 shrink-0" /> : <ChevronDown className="w-2.5 h-2.5 text-sky-500 shrink-0" />
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}

              {/* Sticky Right Column 1: Total & Mean */}
              <th
                onClick={() => handleSort('mean')}
                className="sticky right-72 z-20 bg-slate-50 dark:bg-slate-900 px-3.5 py-3 text-right min-w-[105px] cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 border-l border-slate-200 dark:border-slate-800 shadow-[-1px_0_0_0_rgba(0,0,0,0.06)] dark:shadow-[-1px_0_0_0_rgba(255,255,255,0.05)]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>TOTAL & MEAN</span>
                  {sortField === 'mean' ? (
                    sortAsc ? <ChevronUp className="w-3 h-3 text-sky-500" /> : <ChevronDown className="w-3 h-3 text-sky-500" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                  )}
                </div>
              </th>

              {/* Sticky Right Column 2: CBC Scale Badge */}
              <th className="sticky right-48 z-20 bg-slate-50 dark:bg-slate-900 px-3 py-3 text-center min-w-[90px]">
                <span>{isJuniorSecondary ? 'CBC SCALE' : 'RUBRIC'}</span>
              </th>

              {/* Sticky Right Column 3: vs Baseline Delta */}
              <th
                onClick={() => handleSort('delta')}
                className="sticky right-28 z-20 bg-slate-50 dark:bg-slate-900 px-3 py-3 text-center min-w-[80px] cursor-pointer hover:text-sky-600 dark:hover:text-sky-400"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>VS PREV</span>
                  {sortField === 'delta' ? (
                    sortAsc ? <ChevronUp className="w-3 h-3 text-sky-500" /> : <ChevronDown className="w-3 h-3 text-sky-500" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                  )}
                </div>
              </th>

              {/* Sticky Right Column 4: Personal Bottleneck */}
              <th className="sticky right-0 z-20 bg-slate-50 dark:bg-slate-900 px-3 py-3 text-left min-w-[125px] shadow-[-2px_0_3px_-1px_rgba(0,0,0,0.08)] dark:shadow-[-2px_0_3px_-1px_rgba(0,0,0,0.2)]">
                <span>BOTTLENECK</span>
              </th>

            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {sortedLearners.map((learner) => {
              const { rank, rankDelta, fullName, admissionNo, totalMarks, maxMarks, meanPct, deltaPct, deltaPoints, overallRubricOrPoints, personalBottleneckSubject, scoresBySubject } = learner;

              return (
                <tr
                  key={learner.studentId}
                  onClick={() => onInspectLearner(learner.studentId)}
                  className="group cursor-pointer hover:bg-sky-50/60 dark:hover:bg-sky-950/20 transition-colors"
                >
                  {/* Sticky 1: Rank & Movement */}
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-sky-50/60 dark:bg-[#111827] dark:group-hover:bg-[#132038] px-3.5 py-2.5 shadow-[1px_0_0_0_rgba(0,0,0,0.06)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-black text-xs ${
                        rank <= 3
                          ? 'text-sky-600 dark:text-sky-400'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        #{rank}
                      </span>
                      {rankDelta !== null && rankDelta !== 0 ? (
                        rankDelta > 0 ? (
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center" title={`Moved up ${rankDelta} places`}>
                            ▲{rankDelta}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 flex items-center" title={`Dropped ${Math.abs(rankDelta)} places`}>
                            ▼{Math.abs(rankDelta)}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[10px]" title="Rank unchanged">—</span>
                      )}
                    </div>
                  </td>

                  {/* Sticky 2: Learner Details */}
                  <td className="sticky left-16 z-10 bg-white group-hover:bg-sky-50/60 dark:bg-[#111827] dark:group-hover:bg-[#132038] px-3.5 py-2.5 shadow-[2px_0_3px_-1px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_3px_-1px_rgba(0,0,0,0.2)]">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        {fullName}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
                        Adm: {admissionNo}
                      </p>
                    </div>
                  </td>

                  {/* Dynamic Subject Cells */}
                  {subjects.map((sub) => {
                    const score = scoresBySubject[sub.subjectId];
                    if (!score || score.isMissing) {
                      return (
                        <td
                          key={sub.subjectId}
                          className="px-2.5 py-2.5 text-center border-l border-slate-100 dark:border-slate-800/60"
                        >
                          <span className="inline-block px-1.5 py-0.5 rounded border border-dashed border-slate-300 dark:border-slate-700 text-[10px] text-slate-400 font-mono" title="Mark missing">
                            —
                          </span>
                        </td>
                      );
                    }

                    const isBe = score.isBelowExpectations;
                    const marks = score.marks;

                    return (
                      <td
                        key={sub.subjectId}
                        className={`px-2 py-2.5 text-center border-l border-slate-100 dark:border-slate-800/60 transition-colors ${
                          isBe ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-bold text-xs">{marks}%</span>
                          <span className={`text-[10px] font-black uppercase ${
                            isBe ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            {isJuniorSecondary ? score.rubricOrPoints.split(' ')[0] : score.rubricOrPoints}
                          </span>
                        </div>
                      </td>
                    );
                  })}

                  {/* Sticky Right 1: Total & Mean */}
                  <td className="sticky right-72 z-10 bg-white group-hover:bg-sky-50/60 dark:bg-[#111827] dark:group-hover:bg-[#132038] px-3.5 py-2.5 text-right border-l border-slate-200 dark:border-slate-800 shadow-[-1px_0_0_0_rgba(0,0,0,0.06)] dark:shadow-[-1px_0_0_0_rgba(255,255,255,0.05)]">
                    <div className="text-right">
                      <span className="font-black text-xs text-slate-900 dark:text-slate-100">
                        {meanPct}%
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {totalMarks} / {maxMarks}
                      </p>
                    </div>
                  </td>

                  {/* Sticky Right 2: CBC Scale Badge */}
                  <td className="sticky right-48 z-10 bg-white group-hover:bg-sky-50/60 dark:bg-[#111827] dark:group-hover:bg-[#132038] px-3 py-2.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      isJuniorSecondary
                        ? learner.points >= 7
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : learner.points >= 5
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300'
                          : learner.points >= 3
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                        : overallRubricOrPoints === 'EE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : overallRubricOrPoints === 'ME'
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300'
                        : overallRubricOrPoints === 'AE'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                    }`}>
                      {overallRubricOrPoints}
                    </span>
                  </td>

                  {/* Sticky Right 3: vs Baseline Delta */}
                  <td className="sticky right-28 z-10 bg-white group-hover:bg-sky-50/60 dark:bg-[#111827] dark:group-hover:bg-[#132038] px-3 py-2.5 text-center">
                    {deltaPct !== null ? (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-black ${deltaLoading ? 'animate-pulse' : ''} ${
                        deltaPct > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : deltaPct < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      }`}>
                        {deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </td>

                  {/* Sticky Right 4: Personal Bottleneck */}
                  <td className="sticky right-0 z-10 bg-white group-hover:bg-sky-50/60 dark:bg-[#111827] dark:group-hover:bg-[#132038] px-3 py-2.5 shadow-[-2px_0_3px_-1px_rgba(0,0,0,0.08)] dark:shadow-[-2px_0_3px_-1px_rgba(0,0,0,0.2)]">
                    {personalBottleneckSubject ? (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40 truncate max-w-[115px]"
                        title={`${personalBottleneckSubject.name} (${personalBottleneckSubject.marks}%) is ${personalBottleneckSubject.varianceFromLearnerMean}% relative to learner's average`}
                      >
                        {personalBottleneckSubject.code || personalBottleneckSubject.name.split(' ')[0]} ({personalBottleneckSubject.marks}%)
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
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
