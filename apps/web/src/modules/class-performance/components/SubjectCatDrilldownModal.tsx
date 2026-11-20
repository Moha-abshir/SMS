import React, { useState, useEffect, useRef } from 'react';
import { X, BookOpen, Printer, Search, Sparkles, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApiResource } from '../../../hooks/useApiResource';
import { RequestError } from '../../../components/RequestError';
import { printElement } from '../../../lib/printElement';
import { PageLoadingProgress } from '../../../components/PageLoadingProgress';
import { calculateCbcRubric, calculateJuniorPoints } from '@school/shared/types';

interface SubjectCatDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  isJuniorSecondary: boolean;
}

export const SubjectCatDrilldownModal: React.FC<SubjectCatDrilldownModalProps> = ({
  isOpen,
  onClose,
  classId,
  className,
  subjectId,
  subjectName,
  subjectCode,
  teacherName,
  isJuniorSecondary,
}) => {
  const { data: classCatsData, loading, error, refresh } = useApiResource<{ cats: any[]; learners: any[]; scores: any[] }>(
    isOpen && classId ? `/api/cats/class/${classId}` : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearchQuery(''); }, [classId, subjectId, isOpen]);

  if (!isOpen) return null;

  // Filter CAT assessments for this specific subject
  const subjectCats = (classCatsData?.cats || [])
    .filter((c) => c.subjectId === subjectId)
    .sort((a, b) => a.catNumber - b.catNumber);

  const catIds = new Set(subjectCats.map((c) => c.id));
  const relevantScores = (classCatsData?.scores || []).filter((s) => catIds.has(s.catId));

  // Build map: studentId -> { [catId]: marksObtained }
  const scoreMap = new Map<string, Map<string, number>>();
  for (const s of relevantScores) {
    if (!scoreMap.has(s.studentId)) scoreMap.set(s.studentId, new Map());
    const m = typeof s.marksObtained === 'number' ? s.marksObtained : parseFloat(s.marksObtained as any) || 0;
    scoreMap.get(s.studentId)!.set(s.catId, m);
  }

  // Build learner rows
  const allLearners = classCatsData?.learners || [];
  const processedLearners = allLearners.map((learner) => {
    const sScores = scoreMap.get(learner.id) || new Map<string, number>();
    const catScoresObj: Record<string, { raw: number | null; pct: number | null }> = {};
    const validPcts: number[] = [];

    for (const cat of subjectCats) {
      if (sScores.has(cat.id)) {
        const raw = sScores.get(cat.id)!;
        const pct = cat.maxMarks > 0 ? (raw / cat.maxMarks) * 100 : raw;
        catScoresObj[cat.id] = { raw, pct: +pct.toFixed(1) };
        validPcts.push(pct);
      } else {
        catScoresObj[cat.id] = { raw: null, pct: null };
      }
    }

    const meanPct = validPcts.length > 0 ? +(validPcts.reduce((a, b) => a + b, 0) / validPcts.length).toFixed(1) : null;
    const rubric = meanPct !== null ? calculateCbcRubric(meanPct).code : null;
    const points = meanPct !== null && isJuniorSecondary ? calculateJuniorPoints(meanPct) : null;

    return {
      studentId: learner.id,
      fullName: learner.fullName,
      admissionNumber: learner.admissionNumber,
      assessmentNumber: learner.assessmentNumber,
      catScores: catScoresObj,
      meanPct,
      rubric,
      points,
    };
  });

  // Filter by search query
  const filteredLearners = processedLearners.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.fullName.toLowerCase().includes(q) ||
      (l.admissionNumber && l.admissionNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#091326] border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#162b4d] shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                {className}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {subjectCode || 'CAT'}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Subject Teacher: {teacherName || 'Assigned Specialist'}
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
              {subjectName} • Continuous Assessment Tests (CATs)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Learner-by-learner diagnostic scores across all termly assessments.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (printRef.current) {
                  printElement(printRef.current, `${className} - ${subjectName} CAT Breakdown`);
                }
              }}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-[#162b4d] transition-colors"
              title="Print CAT Marksheet"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search learner name or Adm No..."
              className="w-full h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#081024] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>{subjectCats.length} CATs Administered</span>
            <span>•</span>
            <span>{allLearners.length} Enrolled Learners</span>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto" ref={printRef}>
          {error ? <RequestError message={error} onRetry={refresh} /> : loading ? (
            <div className="p-12 text-center">
              <PageLoadingProgress isLoading={true} />
            </div>
          ) : subjectCats.length === 0 ? (
            <div className="p-12 text-center border border-slate-200 dark:border-[#162b4d] rounded-2xl bg-slate-50 dark:bg-[#0c1830]">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No CAT assessments recorded yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                The subject teacher ({teacherName}) has not yet administered or entered Continuous Assessment Tests for this subject in the current term.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-[#162b4d] rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#162b4d] bg-slate-50 dark:bg-[#0c1830] text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <th className="px-3.5 py-3 w-12 text-center">#</th>
                    <th className="px-4 py-3 min-w-[180px]">LEARNER NAME & ADM</th>
                    {subjectCats.map((cat) => (
                      <th key={cat.id} className="px-3.5 py-3 text-center min-w-[100px]">
                        CAT {cat.catNumber} (/{cat.maxMarks})
                      </th>
                    ))}
                    <th className="px-3.5 py-3 text-center min-w-[100px]">CAT AVERAGE</th>
                    <th className="px-3.5 py-3 text-center min-w-[90px]">RUBRIC</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d]/60 font-medium">
                  {filteredLearners.map((learner, idx) => {
                    const isBelow = learner.rubric === 'BE' || (learner.meanPct !== null && learner.meanPct < 50);

                    return (
                      <tr
                        key={learner.studentId}
                        className={`transition-colors ${
                          isBelow
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70 dark:hover:bg-rose-950/30'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="px-3.5 py-2.5 text-center text-slate-400 font-bold text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                            {learner.fullName}
                          </p>
                          <span className="text-[10px] text-slate-400 block">
                            Adm: {learner.admissionNumber || '—'}
                          </span>
                        </td>

                        {subjectCats.map((cat) => {
                          const sc = learner.catScores[cat.id];
                          return (
                            <td key={cat.id} className="px-3.5 py-2.5 text-center font-bold">
                              {sc && sc.raw !== null ? (
                                <div>
                                  <span className="text-slate-800 dark:text-slate-200 text-xs">
                                    {sc.raw}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block font-normal">
                                    {sc.pct}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="px-3.5 py-2.5 text-center font-black text-xs">
                          {learner.meanPct !== null ? (
                            <span className={isBelow ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}>
                              {learner.meanPct}%
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="px-3.5 py-2.5 text-center">
                          {learner.rubric ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                learner.rubric === 'EE'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50'
                                  : learner.rubric === 'ME'
                                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/50'
                                  : learner.rubric === 'AE'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/50'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/50'
                              }`}
                            >
                              {learner.rubric} {learner.points !== null ? `(${learner.points} pts)` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-[#162b4d] flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Formative Continuous Assessment Tests are managed by individual subject teachers and do not alter official summative broadsheet results.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
