import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Save,
  Printer,
  Sparkles,
  Trash2,
  Search,
  Award,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { printElement } from '../../lib/printElement';
import { PageLoadingProgress } from '../../components/PageLoadingProgress';
import { calculateCbcRubric, calculateJuniorPoints } from '@school/shared/types';

interface LearnerScoreItem {
  studentId: string;
  admissionNumber?: string;
  assessmentNumber?: string;
  fullName: string;
  gender: string;
  marksObtained: number | null;
  remarks: string;
  percentage: number | null;
  rubric: 'EE' | 'ME' | 'AE' | 'BE' | null;
  juniorPoints: number | null;
}

interface CatMarksheetData {
  cat: {
    id: string;
    termId: string;
    classId: string;
    className: string;
    isJuniorSecondary: boolean;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    catNumber: number;
    maxMarks: number;
    createdAt: string;
    academicYear: number;
    termNumber: number;
  };
  learners: LearnerScoreItem[];
  summary: {
    totalStudents: number;
    scoredStudents: number;
    averagePct: number | null;
    highestPct: number | null;
    lowestPct: number | null;
    rubricBreakdown: { EE: number; ME: number; AE: number; BE: number };
  };
}

interface CatMarksheetSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  catId: string | null;
  onSaved?: () => void;
  onDeleted?: () => void;
}

export const CatMarksheetSlideOver: React.FC<CatMarksheetSlideOverProps> = ({
  isOpen,
  onClose,
  catId,
  onSaved,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [data, setData] = useState<CatMarksheetData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scoresState, setScoresState] = useState<
    Record<string, { marksObtained: string; remarks: string }>
  >({});
  const [isDirty, setIsDirty] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchMarksheet = async (id: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/cats/${id}/marksheet`);
      const payload: CatMarksheetData = res.data?.data || res.data;
      setData(payload);

      // Populate local input state
      const initialMap: Record<string, { marksObtained: string; remarks: string }> = {};
      for (const l of payload.learners) {
        initialMap[l.studentId] = {
          marksObtained:
            l.marksObtained !== null && l.marksObtained !== undefined
              ? String(l.marksObtained)
              : '',
          remarks: l.remarks || '',
        };
      }
      setScoresState(initialMap);
      setIsDirty(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load CAT marksheet');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && catId) {
      fetchMarksheet(catId);
    } else {
      setData(null);
      setScoresState({});
      setIsDirty(false);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, catId]);

  // Handle score change
  const handleScoreChange = (studentId: string, val: string) => {
    if (data && val !== '') {
      const num = parseFloat(val);
      if (!isNaN(num) && num > data.cat.maxMarks) {
        toast.warn(`Score cannot exceed maximum marks (${data.cat.maxMarks})`);
        return;
      }
      if (!isNaN(num) && num < 0) {
        return;
      }
    }

    setScoresState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marksObtained: val,
      },
    }));
    setIsDirty(true);
  };

  // Handle remark change
  const handleRemarkChange = (studentId: string, val: string) => {
    setScoresState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks: val,
      },
    }));
    setIsDirty(true);
  };

  // Save all scores
  const handleSave = async () => {
    if (!catId || !data) return;

    try {
      setSaving(true);
      const scoresPayload = Object.entries(scoresState).map(([studentId, item]) => ({
        studentId,
        marksObtained: item.marksObtained !== '' ? Number(item.marksObtained) : null,
        remarks: item.remarks || null,
      }));

      await apiClient.put(`/api/cats/${catId}/scores`, { scores: scoresPayload });
      toast.success('Continuous assessment marks saved successfully!');
      setIsDirty(false);
      if (onSaved) onSaved();
      // Refresh summary
      await fetchMarksheet(catId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  // Delete CAT
  const handleDelete = async () => {
    if (!catId) return;
    try {
      setDeleting(true);
      await apiClient.delete(`/api/cats/${catId}`);
      toast.success('Assessment deleted successfully');
      if (onDeleted) onDeleted();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete assessment');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Quick remarks suggestion
  const remarkPresets = ['Good effort', 'Exemplary mastery', 'Needs remedial help', 'Incomplete work'];

  // Filter learners by search
  const filteredLearners = (data?.learners || []).filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.fullName.toLowerCase().includes(q) ||
      (l.admissionNumber && l.admissionNumber.toLowerCase().includes(q)) ||
      (l.assessmentNumber && l.assessmentNumber.toLowerCase().includes(q))
    );
  });

  // Calculate live summary stats from scoresState
  const liveStats = React.useMemo(() => {
    if (!data) return { scored: 0, total: 0, mean: null, rubricBreakdown: { EE: 0, ME: 0, AE: 0, BE: 0 } };
    let scored = 0;
    let sumPct = 0;
    const breakdown = { EE: 0, ME: 0, AE: 0, BE: 0 };

    for (const l of data.learners) {
      const entry = scoresState[l.studentId];
      if (entry && entry.marksObtained !== '' && !isNaN(Number(entry.marksObtained))) {
        const mark = Number(entry.marksObtained);
        const pct = data.cat.maxMarks > 0 ? (mark / data.cat.maxMarks) * 100 : mark;
        scored++;
        sumPct += pct;
        const rub = calculateCbcRubric(pct).code;
        breakdown[rub]++;
      }
    }

    const mean = scored > 0 ? +(sumPct / scored).toFixed(1) : null;
    return {
      scored,
      total: data.learners.length,
      mean,
      rubricBreakdown: breakdown,
    };
  }, [data, scoresState]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="w-full max-w-4xl bg-white dark:bg-[#091326] border-l border-slate-200 dark:border-[#162b4d] shadow-2xl flex flex-col h-full"
      >
        {/* Top Sticky Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#162b4d] bg-white/95 dark:bg-[#091326]/95 backdrop-blur-sm shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {data?.cat.className || 'Loading...'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  CAT {data?.cat.catNumber || '—'}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Max Marks: /{data?.cat.maxMarks || 100}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{data?.cat.subjectName || 'Learning Area'} Marksheet</span>
                {isDirty && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300">
                    Unsaved Changes
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Formative Continuous Assessment Test • Year {data?.cat.academicYear || 2026} Term {data?.cat.termNumber || 1}
              </p>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (printRef.current) {
                    printElement(printRef.current, `${data?.cat.className} - ${data?.cat.subjectName} CAT ${data?.cat.catNumber} Marksheet`);
                  }
                }}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-[#162b4d] transition-colors"
                title="Print Marksheet"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/40 transition-colors"
                title="Delete CAT Assessment"
              >
                <Trash2 className="w-4 h-4" />
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

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-[#162b4d]">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1830] border border-slate-100 dark:border-[#162b4d]">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Completion Rate
              </span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                {liveStats.scored} / {liveStats.total} ({liveStats.total > 0 ? Math.round((liveStats.scored / liveStats.total) * 100) : 0}%)
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1830] border border-slate-100 dark:border-[#162b4d]">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                CAT Mean Score
              </span>
              <span className="text-sm font-black text-sky-600 dark:text-sky-400">
                {liveStats.mean !== null ? `${liveStats.mean}%` : 'Pending'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1830] border border-slate-100 dark:border-[#162b4d]">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Rubric Breakdown
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs font-bold">
                <span className="text-emerald-500">{liveStats.rubricBreakdown.EE} EE</span>
                <span className="text-sky-500">{liveStats.rubricBreakdown.ME} ME</span>
                <span className="text-amber-500">{liveStats.rubricBreakdown.AE} AE</span>
                <span className="text-rose-500">{liveStats.rubricBreakdown.BE} BE</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1830] border border-slate-100 dark:border-[#162b4d]">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Keyboard Navigation
              </span>
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">Enter</kbd> to move down
              </span>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div className="p-4 bg-rose-500/10 dark:bg-rose-950/40 border-b border-rose-500/30 flex items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Are you sure you want to delete <strong>CAT {data?.cat.catNumber}</strong> and all recorded marks? This action cannot be undone.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}

        {/* Marksheet Filter & Search */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-[#162b4d] bg-slate-50/50 dark:bg-[#0c1830]/50 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by learner name, Adm No, or Assessment No..."
              className="w-full h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#081024] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Showing {filteredLearners.length} of {data?.learners.length || 0} learners</span>
          </div>
        </div>

        {/* Learner Scores Table Body */}
        <div className="flex-1 overflow-y-auto p-5" ref={printRef}>
          {loading ? (
            <div className="p-12 text-center">
              <PageLoadingProgress isLoading={true} />
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-[#162b4d] rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#162b4d] bg-slate-50 dark:bg-[#0c1830] text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <th className="px-3.5 py-3 w-12 text-center">#</th>
                    <th className="px-4 py-3 min-w-[180px]">LEARNER NAME & ADM NO</th>
                    <th className="px-3.5 py-3 w-32 text-center">
                      SCORE (/{data?.cat.maxMarks || 100})
                    </th>
                    <th className="px-3.5 py-3 w-28 text-center">NORMALIZED %</th>
                    <th className="px-3.5 py-3 w-28 text-center">CBC RUBRIC</th>
                    <th className="px-4 py-3 min-w-[200px]">TEACHER REMARKS</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d]/60 font-medium">
                  {filteredLearners.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                        No learners match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLearners.map((learner, idx) => {
                      const entry = scoresState[learner.studentId] || { marksObtained: '', remarks: '' };
                      const rawVal = entry.marksObtained;
                      const hasVal = rawVal !== '' && !isNaN(Number(rawVal));
                      const markNum = hasVal ? Number(rawVal) : null;
                      const max = data?.cat.maxMarks || 100;
                      const pct = markNum !== null && max > 0 ? +((markNum / max) * 100).toFixed(1) : null;
                      const rubric = pct !== null ? calculateCbcRubric(pct).code : null;
                      const points = pct !== null && data?.cat.isJuniorSecondary ? calculateJuniorPoints(pct) : null;

                      return (
                        <tr
                          key={learner.studentId}
                          className="hover:bg-sky-50/40 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          {/* Index */}
                          <td className="px-3.5 py-3 text-center text-[11px] text-slate-400 font-bold">
                            {idx + 1}
                          </td>

                          {/* Learner Info */}
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                              {learner.fullName}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {learner.admissionNumber && <span>Adm: {learner.admissionNumber}</span>}
                              {learner.assessmentNumber && <span>• Assess: {learner.assessmentNumber}</span>}
                            </div>
                          </td>

                          {/* Raw Mark Input */}
                          <td className="px-3.5 py-2.5 text-center">
                            <input
                              ref={(el) => (inputRefs.current[learner.studentId] = el)}
                              type="number"
                              min={0}
                              max={data?.cat.maxMarks || 100}
                              step="any"
                              value={rawVal}
                              onChange={(e) => handleScoreChange(learner.studentId, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const nextStudent = filteredLearners[idx + 1];
                                  if (nextStudent && inputRefs.current[nextStudent.studentId]) {
                                    inputRefs.current[nextStudent.studentId]?.focus();
                                  }
                                }
                              }}
                              placeholder="—"
                              className={`w-20 h-9 px-2 text-center text-xs font-black rounded-xl border transition-all ${
                                hasVal
                                  ? 'border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30 text-sky-900 dark:text-sky-100'
                                  : 'border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#081024] text-slate-800 dark:text-slate-200'
                              } focus:outline-hidden focus:ring-2 focus:ring-sky-500`}
                            />
                          </td>

                          {/* Normalized % */}
                          <td className="px-3.5 py-3 text-center font-bold text-xs text-slate-700 dark:text-slate-300">
                            {pct !== null ? `${pct}%` : '—'}
                          </td>

                          {/* CBC Rubric or Junior Scale */}
                          <td className="px-3.5 py-3 text-center">
                            {rubric ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  rubric === 'EE'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50'
                                    : rubric === 'ME'
                                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/50'
                                    : rubric === 'AE'
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/50'
                                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/50'
                                }`}
                              >
                                {rubric} {points !== null ? `(${points} pts)` : ''}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>

                          {/* Teacher Remarks */}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={entry.remarks}
                                onChange={(e) => handleRemarkChange(learner.studentId, e.target.value)}
                                placeholder="Add optional remarks..."
                                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#081024] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom Sticky Action Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-[#162b4d] bg-white/95 dark:bg-[#091326]/95 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isDirty ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                ● You have unsaved score modifications.
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> All scores saved.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span>Saving Scores...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save CAT Marks</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
