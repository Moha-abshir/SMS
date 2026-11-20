import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronUp,
  ChevronDown,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Award,
  BookOpen,
  Lock,
  Unlock,
  Save,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../../lib/apiClient';
import { useApiResource } from '../../../hooks/useApiResource';
import { RequestError } from '../../../components/RequestError';
import { isNationalExamClass } from '@school/shared/types';

export interface Learner360DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  studentId: string | null;
  examId?: string;
  allLearners: Array<{
    studentId: string;
    fullName: string;
    admissionNo: string;
    rank: number;
    meanPct: number;
    overallRubricOrPoints: string;
    deltaPct: number | null;
  }>;
  classInfo?: any;
  onSelectStudent: (newStudentId: string) => void;
  onRemarkSaved?: (studentId: string, remark: string) => void;
}

export const Learner360Drawer: React.FC<Learner360DrawerProps> = ({
  isOpen,
  onClose,
  classId,
  studentId,
  examId,
  allLearners,
  classInfo,
  onSelectStudent,
  onRemarkSaved,
}) => {
  const { data, loading, error, refresh } = useApiResource<any>(
    isOpen && classId && studentId ? `/api/examinations/class-workspace/${classId}/learners/${studentId}?${new URLSearchParams(examId ? { examId } : {})}` : null,
    (value: any) => value?.studentProfile?.id === studentId && Array.isArray(value?.subjectComparison)
  );
  const [remarkText, setRemarkText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRequestingUnlock, setIsRequestingUnlock] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const isNationalTransition = isNationalExamClass(data?.classInfo || classInfo);

  // Find index of current student for Next/Prev navigation
  const currentIndex = allLearners.findIndex((l) => l.studentId === studentId);
  const currentStudentMeta = currentIndex !== -1 ? allLearners[currentIndex] : null;

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onSelectStudent(allLearners[currentIndex - 1].studentId);
    }
  }, [currentIndex, allLearners, onSelectStudent]);

  const handleNext = useCallback(() => {
    if (currentIndex < allLearners.length - 1) {
      onSelectStudent(allLearners[currentIndex + 1].studentId);
    }
  }, [currentIndex, allLearners, onSelectStudent]);

  // Keyboard navigation support: Arrow Up/Left for Prev, Arrow Down/Right for Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      // Don't intercept if typing in textarea or input
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  useEffect(() => {
    setRemarkText(data?.reportCardState?.classTeacherRemark || '');
    setShowUnlockModal(false);
    setUnlockReason('');
  }, [data, studentId]);

  const handleSaveRemark = async (advanceToNext: boolean = false) => {
    if (!classId || !studentId) return;
    setIsSaving(true);
    try {
      const res = await apiClient.post(
        `/api/examinations/class-workspace/${classId}/learners/${studentId}/remark`,
        {
          examId,
          remark: remarkText,
          action: 'save',
        }
      );
      if (res.data?.success) {
        toast.success('Report card remark saved!');
        onRemarkSaved?.(studentId, remarkText);
        if (advanceToNext && currentIndex < allLearners.length - 1) {
          handleNext();
        }
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setShowUnlockModal(true);
      } else {
        toast.error(err.response?.data?.message || 'Failed to save remark');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlockRequest = async () => {
    if (!classId || !studentId) return;
    setIsRequestingUnlock(true);
    try {
      const res = await apiClient.post(
        `/api/examinations/class-workspace/${classId}/learners/${studentId}/remark`,
        {
          examId,
          action: 'request_unlock',
          reason: unlockReason || 'Class Teacher requesting unlock to update learner remark.',
        }
      );
      if (res.data?.success) {
        toast.success(res.data.message || 'Unlock request submitted successfully!');
        setShowUnlockModal(false);
        setUnlockReason('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit unlock request');
    } finally {
      setIsRequestingUnlock(false);
    }
  };

  if (!isOpen) return null;

  const profile = data?.studentProfile || currentStudentMeta;
  const attendance = data?.attendanceSummary;
  const subjects = data?.subjectComparison || [];
  const history = data?.examHistory || [];
  const reportState = data?.reportCardState;
  const isLocked = reportState?.isLocked ?? false;

  // Compute strongest and primary intervention area from subjectComparison
  let strongestArea: any = null;
  let weakestArea: any = null;
  if (subjects.length > 0) {
    const validScores = subjects.filter((s: any) => s.learnerExamMarks !== null);
    if (validScores.length > 0) {
      strongestArea = [...validScores].sort((a, b) => b.learnerExamMarks - a.learnerExamMarks)[0];
      weakestArea = [...validScores].sort((a, b) => a.learnerExamMarks - b.learnerExamMarks)[0];
    }
  }

  const quickRemarks = [
    'Demonstrates exemplary concept mastery and active participation.',
    'Shows steady academic progress with consistent application.',
    'Has potential to excel; needs closer supervision in homework.',
    'Requires targeted remedial support in foundational competencies.',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#111827] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        
        {/* 1. Drawer Header & Quick Navigation */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/70 dark:bg-slate-900/60">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300">
                Rank #{profile?.rank || '—'} of {allLearners.length}
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Adm: {profile?.admissionNo}
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 truncate">
              {profile?.fullName || 'Loading Learner...'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Prev / Next buttons */}
            <div className="flex items-center bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Previous Learner (↑ Arrow)"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono px-1 font-bold text-slate-400">
                {currentIndex + 1}/{allLearners.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= allLearners.length - 1}
                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Next Learner (↓ Arrow)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close Drawer (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {error ? <RequestError message={error} onRetry={refresh} /> : loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-3 gap-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                ))}
              </div>
              <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            </div>
          ) : (
            <>
              {/* 2. Holistic Context Strip (3 Compact Inline Pills) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                
                {/* Term Attendance */}
                <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                  (attendance?.attendancePct ?? 100) < 85
                    ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                }`}>
                  <CalendarCheck className={`w-4 h-4 shrink-0 ${
                    (attendance?.attendancePct ?? 100) < 85 ? 'text-rose-500' : 'text-sky-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Term Attendance
                    </p>
                    <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                      {attendance ? `${attendance.attendancePct}% (${attendance.daysAbsent} absent)` : 'Not recorded'}
                    </p>
                  </div>
                </div>

                {/* Strongest Area */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Strongest Area
                    </p>
                    <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                      {strongestArea ? `${strongestArea.subjectName} (${strongestArea.learnerExamMarks}%)` : '—'}
                    </p>
                  </div>
                </div>

                {/* Primary Intervention Area */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      Primary Intervention
                    </p>
                    <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                      {weakestArea ? `${weakestArea.subjectName} (${weakestArea.learnerExamMarks}%)` : '—'}
                    </p>
                  </div>
                </div>

              </div>

              {/* 3. Historical Trajectory Strip */}
              {history.length > 0 && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Academic Trajectory (Chronological Exams)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Mean % & Movement
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {history.map((h: any, idx: number) => {
                      const isCurrent = idx === history.length - 1;
                      return (
                        <div
                          key={h.examId}
                          className={`p-2.5 rounded-lg border text-center ${
                            isCurrent
                              ? 'border-sky-500/50 bg-sky-50/50 dark:border-sky-700/60 dark:bg-sky-950/30'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50'
                          }`}
                        >
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate">
                            {h.termName}
                          </p>
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100 mt-0.5">
                            {h.meanPct}%
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                            {h.rubricOrPoints}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Subject-by-Subject Diagnostic Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {isNationalTransition
                      ? 'Learning Area Breakdown (Learner vs Class Mean & CATs)'
                      : 'Learning Area Breakdown (Learner vs Class Mean)'}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    {subjects.length} Subjects Evaluated
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                          <th className="px-3.5 py-2.5">SUBJECT</th>
                          {isNationalTransition && (
                            <th className="px-2.5 py-2.5 text-center">CAT AVG</th>
                          )}
                          <th className="px-2.5 py-2.5 text-center">EXAM SCORE</th>
                          <th className="px-2.5 py-2.5 text-center">CLASS MEAN</th>
                          <th className="px-3 py-2.5 text-center">VS CLASS MEAN</th>
                          <th className="px-2.5 py-2.5 text-center">VS PREV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {subjects.map((sub: any) => {
                          const diff = sub.varianceFromClassMean;
                          const delta = sub.subjectDelta;
                          const hasScore = sub.learnerExamMarks !== null;

                          return (
                            <tr key={sub.subjectId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                              <td className="px-3.5 py-2.5">
                                <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                  {sub.subjectName}
                                </p>
                                <p className="text-[10px] text-slate-400">{sub.teacherName}</p>
                              </td>

                              {isNationalTransition && (
                                <td className="px-2.5 py-2.5 text-center font-mono">
                                  {sub.learnerCatAvgPct !== null ? `${sub.learnerCatAvgPct}%` : '—'}
                                </td>
                              )}

                              <td className="px-2.5 py-2.5 text-center">
                                {hasScore ? (
                                  <div className="flex items-center justify-center gap-1 font-bold">
                                    <span>{sub.learnerExamMarks}%</span>
                                    <span className="text-[10px] text-slate-400">
                                      ({sub.learnerRubricOrPoints?.split(' ')[0]})
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-mono">—</span>
                                )}
                              </td>

                              <td className="px-2.5 py-2.5 text-center text-slate-600 dark:text-slate-400 font-mono">
                                {sub.classSubjectMeanPct}%
                              </td>

                              {/* vs Class Mean Diff */}
                              <td className="px-3 py-2.5 text-center">
                                {diff !== null ? (
                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black ${
                                    diff > 0
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : diff < 0
                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}>
                                    {diff > 0 ? `+${diff}%` : `${diff}%`}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* vs Prev Exam */}
                              <td className="px-2.5 py-2.5 text-center">
                                {delta !== null ? (
                                  <span className={`text-[10px] font-black ${
                                    delta > 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : delta < 0
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-slate-400'
                                  }`}>
                                    {delta > 0 ? `+${delta}%` : `${delta}%`}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 5. Inline Report Card Remark & Lock Footer (Sticky bottom) */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <label htmlFor="remark-textarea" className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Class Teacher's Report Remark
              </label>
            </div>
            {isLocked && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
          </div>

          {/* Quick-insert phrase chips */}
          {!isLocked && (
            <div className="flex flex-wrap gap-1.5">
              {quickRemarks.map((phrase, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRemarkText((prev) => (prev ? `${prev} ${phrase}` : phrase))}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                >
                  + {phrase.substring(0, 32)}...
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <textarea
              id="remark-textarea"
              rows={2}
              value={remarkText}
              disabled={isLocked || isSaving}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder={isLocked ? 'Report cards for this term are locked. Request unlock to edit remarks.' : 'Enter official report card remarks for this learner...'}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b1120] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            {isLocked ? (
              <button
                type="button"
                onClick={() => setShowUnlockModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Request Report Unlock</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSaveRemark(false)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Remark</span>
              </button>
            )}

            {!isLocked && currentIndex < allLearners.length - 1 && (
              <button
                type="button"
                onClick={() => handleSaveRemark(true)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <span>Save & Next Learner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Unlock Request Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Submit Report Card Unlock Request
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Report cards for this class and academic term are currently locked by administration. Please provide a reason to request unlock.
            </p>
            <textarea
              rows={3}
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="e.g. Need to update learner remark following parent consultation..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b1120] text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUnlockModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnlockRequest}
                disabled={isRequestingUnlock}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {isRequestingUnlock && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Submit Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
