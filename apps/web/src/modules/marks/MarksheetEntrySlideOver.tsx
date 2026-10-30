import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowLeft, CheckCircle2, AlertCircle, Save, Send, Printer,
  FileText, Lock, RotateCcw, Search, Sparkles, AlertTriangle, ShieldCheck, Phone, Award, Clock
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';
import { printElement } from '../../lib/printElement';
import { PageLoadingProgress } from '../../components/PageLoadingProgress';
import {
  calculateCbcRubric,
  calculateJuniorPoints,
  isJuniorSecondaryClass,
} from '@school/shared/types';

interface StudentScoreRow {
  studentId: string;
  admissionNumber?: string;
  assessmentNumber?: string;
  fullName: string;
  gender: string;
  marksObtained: number | string | null;
  maxMarks: number;
  cbcRubricLevel: 'EE' | 'ME' | 'AE' | 'BE' | null;
  juniorPoints: number | null;
  teacherRemarks: string;
}

interface MarksheetData {
  examination: any;
  class: any;
  classTeacher?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | null;
  } | null;
  marker?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | null;
    email?: string | null;
  } | null;
  subject: any;
  submission: any;
  status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CORRECTION_REQUESTED' | 'APPROVED' | 'LOCKED';
  correctionReason?: string | null;
  canEdit: boolean;
  isJunior?: boolean;
  gradingType?: 'POINTS' | 'RUBRIC';
  scores: StudentScoreRow[];
  summary: {
    gradingType?: 'POINTS' | 'RUBRIC';
    isJunior?: boolean;
    totalStudents: number;
    scoredStudents: number;
    averageMark: number;
    highestMark: number;
    lowestMark: number;
    rubricBreakdown?: { EE: number; ME: number; AE: number; BE: number } | null;
    pointsBreakdown?: Record<number, number> | null;
  };
}

interface MarksheetEntrySlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string | null;
  classId: string | null;
  subjectId: string | null;
  onSaved?: () => void;
  onSubmitted?: () => void;
  schoolSettings?: any;
  isClassTeacherOversight?: boolean;
}

interface LocalDraftData {
  updatedAt: number;
  scores: Record<
    string,
    {
      marksObtained: number | string | null;
      teacherRemarks: string;
    }
  >;
}

const getDraftStorageKey = (eId: string, cId: string, sId: string) =>
  `marksheet_draft_${eId}_${cId}_${sId}`;

const loadDraftFromStorage = (eId: string, cId: string, sId: string): LocalDraftData | null => {
  try {
    const raw = localStorage.getItem(getDraftStorageKey(eId, cId, sId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.scores === 'object') {
      return parsed as LocalDraftData;
    }
    return null;
  } catch (err) {
    console.warn('Failed to read marksheet draft from localStorage', err);
    return null;
  }
};

const saveDraftToStorage = (
  eId: string,
  cId: string,
  sId: string,
  rows: StudentScoreRow[]
) => {
  try {
    const scoreMap: Record<
      string,
      {
        marksObtained: number | string | null;
        teacherRemarks: string;
      }
    > = {};

    for (const r of rows) {
      scoreMap[r.studentId] = {
        marksObtained: r.marksObtained,
        teacherRemarks: r.teacherRemarks || '',
      };
    }

    const draftData: LocalDraftData = {
      updatedAt: Date.now(),
      scores: scoreMap,
    };

    localStorage.setItem(getDraftStorageKey(eId, cId, sId), JSON.stringify(draftData));
  } catch (err) {
    console.warn('Failed to write marksheet draft to localStorage', err);
  }
};

const removeDraftFromStorage = (eId: string, cId: string, sId: string) => {
  try {
    localStorage.removeItem(getDraftStorageKey(eId, cId, sId));
  } catch (err) {
    console.warn('Failed to remove marksheet draft from localStorage', err);
  }
};

export const MarksheetEntrySlideOver: React.FC<MarksheetEntrySlideOverProps> = ({
  isOpen,
  onClose,
  examId,
  classId,
  subjectId,
  onSaved,
  onSubmitted,
  schoolSettings,
  isClassTeacherOversight = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [readyToShow, setReadyToShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [regulatingLock, setRegulatingLock] = useState(false);

  const [sheetData, setSheetData] = useState<MarksheetData | null>(null);
  const [studentRows, setStudentRows] = useState<StudentScoreRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [requestingCorrection, setRequestingCorrection] = useState(false);

  // Print modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cachedKeyRef = useRef<string | null>(null);

  // Prevent background scroll when slide-over is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Load entry sheet data when parameters change (isInitial = true only on drawer open/param change)
  const fetchSheet = async (isInitial: boolean = false) => {
    if (!examId || !classId || !subjectId) return;
    if (isInitial) {
      setLoading(true);
      setReadyToShow(false);
    }
    try {
      const res = await apiClient.get(
        `/api/mark-submissions/entry-sheet?examId=${examId}&classId=${classId}&subjectId=${subjectId}`
      );
      const data = res.data?.data as MarksheetData;

      const isJuniorExam =
        data?.isJunior !== undefined
          ? data.isJunior
          : isJuniorSecondaryClass(data?.class);

      const sheetStatus = data?.status || 'NOT_STARTED';
      const isSheetEditable = isClassTeacherOversight
        ? false
        : sheetStatus === 'CORRECTION_REQUESTED' ||
          sheetStatus === 'SUBMITTED' ||
          sheetStatus === 'LOCKED' ||
          sheetStatus === 'APPROVED'
        ? false
        : (data?.canEdit ?? (sheetStatus === 'DRAFT' || sheetStatus === 'NOT_STARTED'));

      // If editable, check if an unsaved draft exists in localStorage
      const localDraft = isSheetEditable ? loadDraftFromStorage(examId, classId, subjectId) : null;

      if (localDraft && localDraft.scores) {
        // Merge local draft values over server scores
        const mergedScores = (data.scores || []).map((row) => {
          const draftRow = localDraft.scores[row.studentId];
          if (!draftRow) return row;

          const scoreVal = draftRow.marksObtained;
          let rubric = row.cbcRubricLevel;
          let points = row.juniorPoints;
          let marksObtained: number | string | null = row.marksObtained;

          if (scoreVal !== undefined && scoreVal !== null && scoreVal !== '') {
            const num = typeof scoreVal === 'number' ? scoreVal : parseFloat(scoreVal as string);
            if (!isNaN(num)) {
              const clamped = Math.max(0, Math.min(row.maxMarks || 100, num));
              marksObtained = clamped;
              if (isJuniorExam) {
                points = calculateJuniorPoints(clamped, row.maxMarks || 100);
                rubric = null;
              } else {
                rubric = calculateCbcRubric(clamped, row.maxMarks || 100).code;
                points = null;
              }
            } else {
              marksObtained = '';
              rubric = null;
              points = null;
            }
          } else if (scoreVal === '') {
            marksObtained = '';
            rubric = null;
            points = null;
          }

          return {
            ...row,
            marksObtained,
            cbcRubricLevel: rubric,
            juniorPoints: points,
            teacherRemarks:
              draftRow.teacherRemarks !== undefined ? draftRow.teacherRemarks : row.teacherRemarks,
          };
        });

        setSheetData(data);
        setStudentRows(mergedScores);
      } else {
        if (!isSheetEditable) {
          // If sheet is locked / submitted / non-editable, clear any lingering stale draft
          removeDraftFromStorage(examId, classId, subjectId);
        }
        setSheetData(data);
        setStudentRows(data.scores || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load marksheet details');
      if (isInitial) {
        setSheetData(null);
        setStudentRows([]);
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen && examId && classId && subjectId) {
      const currentKey = `${examId}_${classId}_${subjectId}`;
      const isSameSheet =
        cachedKeyRef.current === currentKey &&
        sheetData !== null &&
        studentRows.length > 0;

      if (isSameSheet) {
        // Teacher reopened the exact same sheet (e.g. after accidental backdrop click)
        // Zero reloading delay: keep readyToShow true so it renders immediately with 0ms delay!
        setReadyToShow(true);
      } else {
        // Different sheet or first time opening:
        cachedKeyRef.current = currentKey;
        setReadyToShow(false);
        fetchSheet(true);
      }
    } else if (!isOpen) {
      // When closed, reset the search filter so all rows are visible next time
      setSearchQuery('');
      // Do NOT reset readyToShow or cachedKeyRef so that reopening the same marksheet is instant!
    }
  }, [isOpen, examId, classId, subjectId]);

  const isJunior =
    sheetData?.isJunior !== undefined
      ? sheetData.isJunior
      : isJuniorSecondaryClass(sheetData?.class);

  const status = sheetData?.status || 'NOT_STARTED';
  const isEditable = isClassTeacherOversight
    ? false
    : status === 'CORRECTION_REQUESTED' || status === 'SUBMITTED' || status === 'LOCKED' || status === 'APPROVED'
    ? false
    : (sheetData?.canEdit ?? (status === 'DRAFT' || status === 'NOT_STARTED'));

  // Real-time score change with auto-save to localStorage
  const handleScoreChange = (originalIndex: number, val: string) => {
    const copy = [...studentRows];
    const row = { ...copy[originalIndex] };

    if (val.trim() === '') {
      row.marksObtained = '';
      row.cbcRubricLevel = null;
      row.juniorPoints = null;
    } else {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        const clamped = Math.max(0, Math.min(row.maxMarks || 100, num));
        row.marksObtained = clamped;
        if (isJunior) {
          row.juniorPoints = calculateJuniorPoints(clamped, row.maxMarks || 100);
          row.cbcRubricLevel = null;
        } else {
          row.cbcRubricLevel = calculateCbcRubric(clamped, row.maxMarks || 100).code;
          row.juniorPoints = null;
        }
      }
    }

    copy[originalIndex] = row;
    setStudentRows(copy);

    if (examId && classId && subjectId) {
      saveDraftToStorage(examId, classId, subjectId, copy);
    }
  };

  const handleRemarkChange = (originalIndex: number, val: string) => {
    const copy = [...studentRows];
    copy[originalIndex] = { ...copy[originalIndex], teacherRemarks: val };
    setStudentRows(copy);

    if (examId && classId && subjectId) {
      saveDraftToStorage(examId, classId, subjectId, copy);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, visibleIdx: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (visibleIdx + 1 < inputRefs.current.length) {
        inputRefs.current[visibleIdx + 1]?.focus();
        inputRefs.current[visibleIdx + 1]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (visibleIdx - 1 >= 0) {
        inputRefs.current[visibleIdx - 1]?.focus();
        inputRefs.current[visibleIdx - 1]?.select();
      }
    }
  };

  // Save as Draft (silent, keep page still, release localStorage draft)
  const handleSaveDraft = async () => {
    if (!examId || !classId || !subjectId || saving) return;
    setSaving(true);
    try {
      const payload = {
        examId,
        classId,
        subjectId,
        scores: studentRows.map((s) => ({
          studentId: s.studentId,
          marksObtained: s.marksObtained === '' ? null : s.marksObtained,
          maxMarks: s.maxMarks,
          teacherRemarks: s.teacherRemarks,
        })),
      };

      await apiClient.post('/api/mark-submissions/save-draft', payload);
      // Release draft from localStorage upon successful server save
      removeDraftFromStorage(examId, classId, subjectId);

      toast.success('Marksheet draft saved successfully!');
      setSheetData((prev) =>
        prev ? { ...prev, status: prev.status === 'NOT_STARTED' ? 'DRAFT' : prev.status } : prev
      );
      if (onSaved) onSaved();
      await fetchSheet(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save marksheet draft');
    } finally {
      setSaving(false);
    }
  };

  // Submit Marksheet (silent, keep page still, release localStorage draft)
  const handleSubmit = async () => {
    if (!examId || !classId || !subjectId || submitting) return;

    // Check for missing scores
    const missing = studentRows.filter(
      (s) => s.marksObtained === null || s.marksObtained === '' || s.marksObtained === undefined
    );

    if (missing.length > 0) {
      toast.error(
        `Cannot submit: ${missing.length} learner(s) do not have recorded marks. Please save as draft instead until all marks are entered.`,
        { autoClose: 4000 }
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        examId,
        classId,
        subjectId,
        scores: studentRows.map((s) => ({
          studentId: s.studentId,
          marksObtained: s.marksObtained,
          maxMarks: s.maxMarks,
          teacherRemarks: s.teacherRemarks,
        })),
      };

      await apiClient.post('/api/mark-submissions/submit', payload);
      // Release draft from localStorage upon successful submit
      removeDraftFromStorage(examId, classId, subjectId);

      toast.success('Marksheet submitted to Class Teacher for review!');
      setSheetData((prev) => (prev ? { ...prev, status: 'SUBMITTED', canEdit: false } : prev));
      if (onSubmitted) onSubmitted();
      await fetchSheet(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit marksheet');
    } finally {
      setSubmitting(false);
    }
  };

  // Request correction without needing a modal message (silent, keep page still)
  const handleRequestCorrection = async () => {
    if (!examId || !classId || !subjectId || requestingCorrection) return;
    setRequestingCorrection(true);
    try {
      await apiClient.post('/api/mark-submissions/request-correction-by-teacher', {
        examId,
        classId,
        subjectId,
      });
      toast.success('Correction requested. Your Class Teacher has been notified to unlock this marksheet.');
      setSheetData((prev) => (prev ? { ...prev, status: 'CORRECTION_REQUESTED', canEdit: false } : prev));
      if (onSaved) onSaved();
      await fetchSheet(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to request correction');
    } finally {
      setRequestingCorrection(false);
    }
  };

  // Lock Marksheet (Class Teacher Oversight: silent, keep page still)
  const handleLockSubmission = async () => {
    if (!sheetData?.submission?.id || regulatingLock) return;
    setRegulatingLock(true);
    try {
      await apiClient.put(`/api/mark-submissions/${sheetData.submission.id}/lock`);
      toast.success('Marksheet locked successfully.');
      setSheetData((prev) => (prev ? { ...prev, status: 'LOCKED' } : prev));
      if (onSaved) onSaved();
      await fetchSheet(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to lock marksheet');
    } finally {
      setRegulatingLock(false);
    }
  };

  // Unlock Marksheet (Class Teacher Oversight: silent, keep page still)
  const handleUnlockSubmission = async () => {
    if (!sheetData?.submission?.id || regulatingLock) return;
    setRegulatingLock(true);
    try {
      await apiClient.put(`/api/mark-submissions/${sheetData.submission.id}/unlock`);
      toast.success('Marksheet unlocked. Subject teacher can now edit scores.');
      setSheetData((prev) => (prev ? { ...prev, status: 'DRAFT' } : prev));
      if (onSaved) onSaved();
      await fetchSheet(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to unlock marksheet');
    } finally {
      setRegulatingLock(false);
    }
  };

  // Filtered rows for search
  const filteredRows = studentRows
    .map((row, originalIndex) => ({ row, originalIndex }))
    .filter(({ row }) => {
      const q = searchQuery.toLowerCase();
      return (
        row.fullName.toLowerCase().includes(q) ||
        (row.assessmentNumber && row.assessmentNumber.toLowerCase().includes(q)) ||
        (row.admissionNumber && row.admissionNumber.toLowerCase().includes(q))
      );
    });

  // Calculate live scored metrics
  const scoredCount = studentRows.filter(
    (s) => s.marksObtained !== null && s.marksObtained !== '' && s.marksObtained !== undefined
  ).length;

  let totalScoreSum = 0;
  studentRows.forEach((s) => {
    if (s.marksObtained !== null && s.marksObtained !== '' && s.marksObtained !== undefined) {
      totalScoreSum += parseFloat(s.marksObtained as string);
    }
  });
  const averageScore = scoredCount > 0 ? Math.round((totalScoreSum / scoredCount) * 10) / 10 : 0;
  const isComplete = studentRows.length > 0 && scoredCount === studentRows.length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
        />

        {/* Slide-over panel */}
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="w-screen max-w-4xl bg-white dark:bg-[#081020] border-l border-sky-100 dark:border-[#112038] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-white/95 dark:bg-[#081020]/95 backdrop-blur-md border-b border-sky-100 dark:border-[#112038] shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#0f1f38] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                    aria-label="Back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 truncate">
                        {readyToShow && sheetData?.class?.name && sheetData?.subject?.name
                          ? `${sheetData.class.name} • ${sheetData.subject.name}`
                          : 'Subject Marksheet'}
                      </h2>
                      {readyToShow && sheetData?.subject?.code && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
                          {sheetData.subject.code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      {readyToShow ? (
                        <>
                          <span>{sheetData?.examination?.title || 'Examination'}</span>
                          <span>•</span>
                          <span>{studentRows.length} Enrolled Learners</span>
                        </>
                      ) : (
                        <span>Loading marksheet learners and assessment criteria...</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#0f1f38] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Status and Method Banner & Search Bar: Only show when readyToShow */}
              {readyToShow && (
                <>
                  <div className="mt-3 flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-[#112038]">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Grading badge */}
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                        {isJunior ? 'CBC 8-Point Scale (1–8 pts)' : 'CBC 4-Level Rubrics (EE, ME, AE, BE)'}
                      </span>

                      {/* Submission status badge */}
                      {status === 'LOCKED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <Lock className="w-3.5 h-3.5 text-emerald-600" />
                          Permanently Locked
                        </span>
                      ) : status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Approved & Finalized
                        </span>
                      ) : status === 'SUBMITTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          <Lock className="w-3.5 h-3.5 text-sky-600" />
                          Submitted (Pending Review)
                        </span>
                      ) : status === 'CORRECTION_REQUESTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Unlock Requested
                        </span>
                      ) : status === 'DRAFT' && sheetData?.correctionReason ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                          Fix Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          {status === 'DRAFT' ? 'Draft (In Progress)' : 'Not Started'}
                        </span>
                      )}
                    </div>

                    {status === 'SUBMITTED' && !isClassTeacherOversight && (
                      <button
                        type="button"
                        onClick={handleRequestCorrection}
                        disabled={requestingCorrection}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                      >
                        {requestingCorrection ? (
                          <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        Request Correction
                      </button>
                    )}
                  </div>

                  {/* Search bar inside drawer */}
                  <div className="mt-3 relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search student name or assessment number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-[#091326] focus:border-sky-500 outline-none transition-colors"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Scrollable drawer body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {!readyToShow ? (
                <div className="h-full min-h-[380px] flex items-center justify-center">
                  <PageLoadingProgress
                    isLoading={loading}
                    title={sheetData?.subject?.name ? `${sheetData.subject.name} Marksheet` : 'Subject Marksheet'}
                    subtitle="Retrieving enrolled learners, assessment scores, and rubric criteria..."
                    icon={Award}
                    onComplete={() => setReadyToShow(true)}
                  />
                </div>
              ) : (
                <>
                  {/* Subject teacher permanently locked banner */}
                  {!isClassTeacherOversight && status === 'LOCKED' && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-emerald-950 dark:text-emerald-100">
                          Marksheet Permanently Locked:
                        </span>
                        <p className="text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed font-medium">
                          This marksheet has been submitted by the Class Teacher to the Deputy Head and is under permanent lock. All learner scores are final, archived, and correction requests can no longer be sent.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Subject teacher submission notice with Class Teacher contact info */}
                  {!isClassTeacherOversight && status === 'SUBMITTED' && (
                    <div className="p-3.5 rounded-xl bg-sky-50/90 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <span className="font-bold text-sky-900 dark:text-sky-200">
                            Marksheet Submitted to Class Teacher:
                          </span>
                          <p className="text-sky-800 dark:text-sky-300 mt-0.5 leading-relaxed font-medium">
                            Marks have been submitted and are locked from further editing. If corrections are required, please contact the Class Teacher
                            {sheetData?.classTeacher ? (
                              <>
                                {' '}
                                <strong>
                                  ({sheetData.classTeacher.firstName} {sheetData.classTeacher.lastName})
                                </strong>
                                {sheetData.classTeacher.phoneNumber ? (
                                  <>
                                    {' '}at{' '}
                                    <a
                                      href={`tel:${sheetData.classTeacher.phoneNumber.replace(/\s+/g, '')}`}
                                      className="inline-flex items-center gap-1 font-bold text-sky-700 dark:text-sky-300 underline hover:text-sky-900 dark:hover:text-white"
                                    >
                                      <Phone className="w-3 h-3 text-sky-600" />
                                      {sheetData.classTeacher.phoneNumber}
                                    </a>
                                  </>
                                ) : null}
                              </>
                            ) : null}{' '}
                            or click Request Correction.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRequestCorrection}
                        disabled={requestingCorrection}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
                        title="Request Class Teacher to unlock marksheet for correction"
                      >
                        {requestingCorrection ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Request Correction
                      </button>
                    </div>
                  )}

                  {/* Subject teacher correction requested banner (locked awaiting CT unlock) */}
                  {!isClassTeacherOversight && status === 'CORRECTION_REQUESTED' && (
                    <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-amber-950 dark:text-amber-100">
                          Unlock Requested (Marks Locked):
                        </span>
                        <p className="text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed font-medium">
                          You have requested the Class Teacher to unlock this marksheet for editing. Editing is locked until your Class Teacher reviews and unlocks it.
                          {sheetData?.classTeacher?.phoneNumber && (
                            <span className="block mt-1">
                              Direct CT Contact:{' '}
                              <a
                                href={`tel:${sheetData.classTeacher.phoneNumber.replace(/\s+/g, '')}`}
                                className="inline-flex items-center gap-1 font-bold text-amber-900 dark:text-amber-200 underline"
                              >
                                <Phone className="w-3 h-3 text-amber-700" />
                                {sheetData.classTeacher.phoneNumber}
                              </a>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Subject teacher marksheet unlocked for correction by CT banner */}
                  {!isClassTeacherOversight && status === 'DRAFT' && sheetData?.correctionReason && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-amber-950 dark:text-amber-100">
                          Marksheet Unlocked for Correction:
                        </span>
                        <p className="text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed font-medium">
                          The Class Teacher has unlocked this marksheet for editing. Please update the necessary learner scores and click <strong>"Submit to Class Teacher"</strong> when finished.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Class Teacher Oversight: Specialist Marker Card & Call Link */}
                  {isClassTeacherOversight && (
                    <div className="p-3.5 rounded-xl bg-sky-50/80 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {sheetData?.marker?.firstName ? sheetData.marker.firstName[0] : 'T'}
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Assigned Specialist Marker:
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 ml-1.5 font-medium">
                            {sheetData?.marker ? `${sheetData.marker.firstName} ${sheetData.marker.lastName}` : 'Unassigned'}
                          </span>
                          {sheetData?.marker?.email && (
                            <span className="text-slate-400 text-[11px] ml-1.5 hidden sm:inline">
                              ({sheetData.marker.email})
                            </span>
                          )}
                        </div>
                      </div>

                      {sheetData?.marker?.phoneNumber && (
                        <a
                          href={`tel:${sheetData.marker.phoneNumber.replace(/\s+/g, '')}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/60 dark:hover:bg-sky-800 text-sky-800 dark:text-sky-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
                          title={`Call ${sheetData.marker.firstName} ${sheetData.marker.lastName}`}
                        >
                          <Phone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          Call Marker ({sheetData.marker.phoneNumber})
                        </a>
                      )}
                    </div>
                  )}

                  {/* Class Teacher Oversight: Correction Requested Banner */}
                  {isClassTeacherOversight && status === 'CORRECTION_REQUESTED' && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/80 dark:border-amber-400 flex items-center justify-between gap-3 flex-wrap animate-pulse">
                      <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div className="text-xs">
                          <span className="font-black text-amber-950 dark:text-amber-100 uppercase tracking-wide">
                            Action Required: Subject Teacher Requested Unlock
                          </span>
                          <p className="text-amber-900 dark:text-amber-200 mt-0.5 font-medium leading-relaxed">
                            The subject teacher has requested to unlock this marksheet to correct errors. Click <strong>"Unlock for Correction"</strong> below to permit editing.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {studentRows.length === 0 ? (
                    <div className="py-24 text-center text-slate-400 text-xs">
                      No active enrolled learners found in this class.
                    </div>
                  ) : (
                    <div
                      tabIndex={0}
                      role="region"
                      aria-label="Learner marksheet entry table"
                      className="overflow-x-auto rounded-xl border border-sky-100 dark:border-[#162b4d] focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-sky-50 dark:bg-[#0c1830]">
                          <tr className="border-b border-sky-100 dark:border-[#162b4d] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                            <th scope="col" className="py-3 px-3 w-10 text-center">#</th>
                            <th scope="col" className="py-3 px-3">Learner Name</th>
                            <th scope="col" className="py-3 px-3 w-28 text-center">Marks / 100</th>
                            <th scope="col" className="py-3 px-3 w-32 text-center">
                              {isJunior ? 'Points (1–8)' : 'CBC Rubric'}
                            </th>
                            <th scope="col" className="py-3 px-3">Teacher Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#112038]">
                          {filteredRows.map(({ row, originalIndex }, visibleIdx) => (
                            <tr
                              key={row.studentId}
                              className="hover:bg-sky-50/40 dark:hover:bg-[#0c1830]/60 transition-colors"
                            >
                              <td className="py-2.5 px-3 text-center text-slate-400 font-medium text-[11px]">
                                {originalIndex + 1}
                              </td>

                              <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                <div className="truncate max-w-[240px] sm:max-w-md">{row.fullName}</div>
                                {row.assessmentNumber && (
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {row.assessmentNumber}
                                  </div>
                                )}
                              </td>

                              {/* Score Input */}
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  ref={(el) => (inputRefs.current[visibleIdx] = el)}
                                  type="number"
                                  min="0"
                                  max={row.maxMarks || 100}
                                  step="any"
                                  disabled={!isEditable}
                                  value={
                                    row.marksObtained !== null && row.marksObtained !== undefined
                                      ? row.marksObtained
                                      : ''
                                  }
                                  onChange={(e) => handleScoreChange(originalIndex, e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, visibleIdx)}
                                  placeholder="0-100"
                                  className="w-20 text-center bg-slate-50 dark:bg-[#0c1830] border border-sky-200 dark:border-[#162b4d] rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-[#091326] focus:border-sky-500 focus:ring-1 focus:ring-sky-400 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                              </td>

                              {/* Assessment Outcome Column */}
                              <td className="py-2.5 px-3 text-center">
                                {isJunior ? (
                                  // FOR GRADES 7–9: ONLY display points (1-8)
                                  row.juniorPoints !== null && row.juniorPoints !== undefined ? (
                                    <span
                                      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                                        row.juniorPoints >= 7
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                                          : row.juniorPoints >= 5
                                          ? 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800'
                                          : row.juniorPoints >= 3
                                          ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                                          : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
                                      }`}
                                    >
                                      {row.juniorPoints} pts
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                  )
                                ) : (
                                  // FOR GRADES 4–6: ONLY display CBC Rubrics (EE, ME, AE, BE)
                                  row.cbcRubricLevel ? (
                                    <span
                                      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-black border ${
                                        row.cbcRubricLevel === 'EE'
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                                          : row.cbcRubricLevel === 'ME'
                                          ? 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800'
                                          : row.cbcRubricLevel === 'AE'
                                          ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                                          : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
                                      }`}
                                    >
                                      {row.cbcRubricLevel}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                  )
                                )}
                              </td>

                              {/* Remarks */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  disabled={!isEditable}
                                  value={row.teacherRemarks || ''}
                                  onChange={(e) => handleRemarkChange(originalIndex, e.target.value)}
                                  placeholder="Remarks (e.g. Good progress)..."
                                  className="w-full bg-slate-50 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-[#091326] focus:border-sky-400 outline-none transition-all disabled:opacity-60"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sticky Bottom Actions Bar */}
            <div className="p-4 bg-white/95 dark:bg-[#081020]/95 backdrop-blur-md border-t border-sky-100 dark:border-[#112038] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              {!readyToShow ? (
                <div className="flex items-center justify-end w-full">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0d1c38] transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 flex-wrap">
                    <span>
                      Scored:{' '}
                      <strong className={isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}>
                        {scoredCount} / {studentRows.length}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Class Average:{' '}
                      <strong className="text-sky-600 dark:text-sky-400">{averageScore}%</strong>
                    </span>
                    {!isComplete && studentRows.length > 0 && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                          {studentRows.length - scoredCount} learner(s) remaining
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0d1c38] transition-colors cursor-pointer"
                    >
                      Close
                    </button>

                    {isClassTeacherOversight ? (
                      <div className="flex items-center gap-2">
                        {sheetData?.marker?.phoneNumber && (
                          <a
                            href={`tel:${sheetData.marker.phoneNumber.replace(/\s+/g, '')}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
                            title={`Call Marker (${sheetData.marker.phoneNumber})`}
                          >
                            <Phone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            <span className="hidden sm:inline">Call Marker</span>
                          </a>
                        )}

                        {status === 'LOCKED' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                            <Lock className="w-3.5 h-3.5 text-emerald-600" />
                            Permanently Locked (Submitted to Deputy)
                          </span>
                        ) : (status === 'SUBMITTED' || status === 'CORRECTION_REQUESTED') ? (
                          <button
                            type="button"
                            onClick={handleUnlockSubmission}
                            disabled={loading || regulatingLock}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 active:scale-95"
                            title="Unlock marksheet to allow teacher corrections"
                          >
                            {regulatingLock ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            Unlock for Correction
                          </button>
                        ) : null}

                        {status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={handleLockSubmission}
                            disabled={loading || regulatingLock}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 active:scale-95"
                            title="Lock marksheet"
                          >
                            {regulatingLock ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                            Lock Marksheet
                          </button>
                        )}
                      </div>
                    ) : (
                      isEditable && (
                        <>
                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={loading || saving || studentRows.length === 0}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-[#0c1830] text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-[#122244] border border-sky-300 dark:border-sky-800 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            {saving ? (
                              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                            ) : (
                              <Save className="w-3.5 h-3.5 text-sky-600" />
                            )}
                            {saving ? 'Saving...' : 'Save Draft'}
                          </button>

                          <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading || submitting || !isComplete}
                            title={
                              !isComplete
                                ? `All marks must be entered before submitting (${scoredCount}/${studentRows.length} scored)`
                                : 'Submit marksheet to Class Teacher for verification'
                            }
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                              isComplete && !submitting && !loading
                                ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/20 cursor-pointer active:scale-95'
                                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/60 cursor-not-allowed opacity-60'
                            }`}
                          >
                            {submitting ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            {submitting ? 'Submitting...' : 'Submit to Class Teacher'}
                          </button>
                        </>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Printable Marksheet Stationery Modal */}
      {showPrintModal && (
        <Modal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          title="Printable Official Marksheet"
        >
          <div className="space-y-4">
            <div className="flex justify-end gap-2 mb-2 no-print">
              <button
                onClick={() =>
                  printElement(
                    'official-marksheet-printable',
                    `${schoolSettings?.schoolName || 'Eldoret Muslim Academy'} - Official Marksheet`
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Now
              </button>
            </div>

            <div
              id="official-marksheet-printable"
              className="p-6 bg-white border border-slate-300 rounded-lg text-slate-900 font-serif printable-sheet"
            >
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                <h2 className="text-lg font-black uppercase tracking-wider">
                  {schoolSettings?.schoolName || 'Eldoret Muslim Academy'}
                </h2>
                <div className="text-xs text-slate-600">
                  {schoolSettings?.postalAddress || 'P.O. Box 1234, Eldoret, Kenya'} • Tel:{' '}
                  {schoolSettings?.primaryPhone || '0700000000'}
                </div>
                <div className="text-sm font-bold uppercase mt-2 text-slate-800 tracking-wide">
                  Official Subject Marksheet
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 text-xs mb-4 gap-2 border-b border-slate-200 pb-3">
                <div>
                  <span className="font-bold">Examination:</span> {sheetData?.examination?.title}
                </div>
                <div>
                  <span className="font-bold">Class:</span> {sheetData?.class?.name}
                </div>
                <div>
                  <span className="font-bold">Subject:</span> {sheetData?.subject?.name} (
                  {sheetData?.subject?.code})
                </div>
                <div>
                  <span className="font-bold">Assessment Method:</span>{' '}
                  {isJunior ? 'CBC 8-Point Scale' : 'CBC 4-Level Rubrics'}
                </div>
              </div>

              {/* Printable Table */}
              <table className="w-full text-xs text-left border-collapse mb-6">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-100 font-bold">
                    <th className="py-1.5 px-2 w-8 text-center border">#</th>
                    <th className="py-1.5 px-2 border">Learner Name</th>
                    <th className="py-1.5 px-2 border w-16 text-center">Marks / 100</th>
                    <th className="py-1.5 px-2 border w-24 text-center">
                      {isJunior ? 'Points (1–8)' : 'CBC Rubric'}
                    </th>
                    <th className="py-1.5 px-2 border">Teacher Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((r, i) => (
                    <tr key={r.studentId} className="border-b border-slate-200">
                      <td className="py-1.5 px-2 text-center border">{i + 1}</td>
                      <td className="py-1.5 px-2 font-semibold border">{r.fullName}</td>
                      <td className="py-1.5 px-2 text-center font-bold border">
                        {r.marksObtained !== null && r.marksObtained !== '' ? r.marksObtained : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-center font-bold border">
                        {isJunior
                          ? r.juniorPoints !== null && r.juniorPoints !== undefined
                            ? `${r.juniorPoints} pts`
                            : '—'
                          : r.cbcRubricLevel || '—'}
                      </td>
                      <td className="py-1.5 px-2 text-[11px] border">{r.teacherRemarks || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary & Signatures */}
              <div className="grid grid-cols-2 text-xs pt-4 border-t border-slate-300 gap-8">
                <div>
                  <div>
                    <span className="font-bold">Class Average:</span> {averageScore}%
                  </div>
                  <div>
                    <span className="font-bold">Total Learners:</span> {studentRows.length}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="border-b border-slate-900 pb-1 flex justify-between">
                    <span>Subject Teacher:</span>
                    <span>Date: ____________</span>
                  </div>
                  <div className="border-b border-slate-900 pb-1 flex justify-between">
                    <span>Class Teacher:</span>
                    <span>Date: ____________</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </AnimatePresence>
  );
};
