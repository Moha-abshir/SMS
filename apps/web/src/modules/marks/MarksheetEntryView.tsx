import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, CheckCircle2, AlertCircle, Save, Send, Printer,
  FileText, Sparkles, ChevronRight, Lock, RotateCcw, HelpCircle,
  TrendingUp, Award, CheckCheck, MessageSquare, ArrowDown, ArrowUp
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';
import { printElement } from '../../lib/printElement';

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
  subject: any;
  submission: any;
  status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CORRECTION_REQUESTED' | 'APPROVED' | 'LOCKED';
  correctionReason?: string | null;
  canEdit: boolean;
  scores: StudentScoreRow[];
  summary: {
    totalStudents: number;
    scoredStudents: number;
    averageMark: number;
    highestMark: number;
    lowestMark: number;
    rubricBreakdown: { EE: number; ME: number; AE: number; BE: number };
  };
}

export const MarksheetEntryView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Allocations & Selection State
  const [workstation, setWorkstation] = useState<any>(null);
  const [activeExams, setActiveExams] = useState<any[]>([]);
  const [teachingAreas, setTeachingAreas] = useState<any[]>([]);

  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Marksheet Data State
  const [sheetData, setSheetData] = useState<MarksheetData | null>(null);
  const [studentRows, setStudentRows] = useState<StudentScoreRow[]>([]);

  // Correction Request Modal
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [requestingCorrection, setRequestingCorrection] = useState(false);

  // Printable Marksheet Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Initial Load: Fetch Workstation & Exams
  useEffect(() => {
    const fetchInit = async () => {
      setLoading(true);
      try {
        const [wsRes, examsRes, settingsRes] = await Promise.all([
          apiClient.get('/api/teacher/workstation'),
          apiClient.get('/api/exams'),
          apiClient.get('/api/settings/public').catch(() => ({ data: { data: null } })),
        ]);

        const ws = wsRes.data?.data;
        const exams = examsRes.data?.data || [];
        setWorkstation(ws);
        setActiveExams(exams);
        setSchoolSettings(settingsRes.data?.data || null);

        const areas = ws?.subjectAllocations || [];
        setTeachingAreas(areas);

        if (exams.length > 0 && !selectedExamId) {
          setSelectedExamId(exams[0].id);
        }

        if (areas.length > 0 && !selectedClassId) {
          setSelectedClassId(areas[0].classId);
          setSelectedSubjectId(areas[0].subjectId);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load teacher allocations');
      } finally {
        setLoading(false);
      }
    };

    fetchInit();
  }, []);

  // 2. Fetch Marksheet Entry Sheet when Exam, Class, or Subject changes
  useEffect(() => {
    if (!selectedExamId || !selectedClassId || !selectedSubjectId) return;

    const fetchSheet = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(
          `/api/mark-submissions/entry-sheet?examId=${selectedExamId}&classId=${selectedClassId}&subjectId=${selectedSubjectId}`
        );
        const data = res.data?.data as MarksheetData;
        setSheetData(data);
        setStudentRows(data.scores || []);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load marksheet');
        setSheetData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSheet();
  }, [selectedExamId, selectedClassId, selectedSubjectId]);

  // Helper to calculate CBC rubric level and points dynamically on the client
  const calculateCbc = (markNum: number, maxMarks: number = 100) => {
    const pct = maxMarks > 0 ? (markNum / maxMarks) * 100 : markNum;
    if (pct >= 80) return { rubric: 'EE' as const, points: 8 };
    if (pct >= 65) return { rubric: 'ME' as const, points: 6 };
    if (pct >= 50) return { rubric: 'AE' as const, points: 4 };
    return { rubric: 'BE' as const, points: 2 };
  };

  // Score change handler with instant rubric computation
  const handleScoreChange = (index: number, val: string) => {
    setStudentRows((prev) => {
      const copy = [...prev];
      const row = { ...copy[index] };

      if (val.trim() === '') {
        row.marksObtained = '';
        row.cbcRubricLevel = null;
        row.juniorPoints = null;
      } else {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          const clamped = Math.max(0, Math.min(row.maxMarks || 100, num));
          row.marksObtained = clamped;
          const { rubric, points } = calculateCbc(clamped, row.maxMarks || 100);
          row.cbcRubricLevel = rubric;
          row.juniorPoints = points;
        }
      }

      copy[index] = row;
      return copy;
    });
  };

  // Remarks change handler
  const handleRemarkChange = (index: number, val: string) => {
    setStudentRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], teacherRemarks: val };
      return copy;
    });
  };

  // Quick keyboard navigation: Enter or Down Arrow moves to next student's score input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (index + 1 < inputRefs.current.length) {
        inputRefs.current[index + 1]?.focus();
        inputRefs.current[index + 1]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index - 1 >= 0) {
        inputRefs.current[index - 1]?.focus();
        inputRefs.current[index - 1]?.select();
      }
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!selectedExamId || !selectedClassId || !selectedSubjectId) return;
    setSaving(true);
    try {
      const payload = {
        examId: selectedExamId,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        scores: studentRows.map((s) => ({
          studentId: s.studentId,
          marksObtained: s.marksObtained === '' ? null : s.marksObtained,
          maxMarks: s.maxMarks,
          teacherRemarks: s.teacherRemarks,
        })),
      };

      await apiClient.post('/api/mark-submissions/save-draft', payload);
      toast.success('Marksheet draft saved successfully!');

      // Refresh sheet
      const res = await apiClient.get(
        `/api/mark-submissions/entry-sheet?examId=${selectedExamId}&classId=${selectedClassId}&subjectId=${selectedSubjectId}`
      );
      setSheetData(res.data?.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save marksheet draft');
    } finally {
      setSaving(false);
    }
  };

  // Submit Marksheet
  const handleSubmit = async () => {
    if (!selectedExamId || !selectedClassId || !selectedSubjectId) return;

    // Check for missing scores
    const missing = studentRows.filter(
      (s) => s.marksObtained === null || s.marksObtained === '' || s.marksObtained === undefined
    );
    if (missing.length > 0) {
      toast.error(
        `All ${studentRows.length} active learners must have a mark entered before submitting. Missing scores for ${missing.length} learner(s).`
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        examId: selectedExamId,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        scores: studentRows.map((s) => ({
          studentId: s.studentId,
          marksObtained: s.marksObtained,
          maxMarks: s.maxMarks,
          teacherRemarks: s.teacherRemarks,
        })),
      };

      const res = await apiClient.post('/api/mark-submissions/submit', payload);
      toast.success(res.data?.message || 'Marksheet submitted successfully for review!');

      // Refresh sheet
      const refreshed = await apiClient.get(
        `/api/mark-submissions/entry-sheet?examId=${selectedExamId}&classId=${selectedClassId}&subjectId=${selectedSubjectId}`
      );
      setSheetData(refreshed.data?.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit marksheet');
    } finally {
      setSubmitting(false);
    }
  };

  // Request Correction
  const handleRequestCorrection = async () => {
    if (!correctionReason.trim()) {
      toast.error('Please enter a reason for the correction request');
      return;
    }

    setRequestingCorrection(true);
    try {
      await apiClient.post('/api/mark-submissions/request-correction-by-teacher', {
        examId: selectedExamId,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        reason: correctionReason.trim(),
      });
      toast.success('Correction request submitted to Deputy Head!');
      setShowCorrectionModal(false);
      setCorrectionReason('');

      // Refresh sheet
      const res = await apiClient.get(
        `/api/mark-submissions/entry-sheet?examId=${selectedExamId}&classId=${selectedClassId}&subjectId=${selectedSubjectId}`
      );
      setSheetData(res.data?.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit correction request');
    } finally {
      setRequestingCorrection(false);
    }
  };

  // Real-time metrics
  const scoredCount = studentRows.filter(
    (s) => s.marksObtained !== null && s.marksObtained !== '' && s.marksObtained !== undefined
  ).length;

  let totalScoreSum = 0;
  let highestScore = 0;
  let lowestScore = 100;
  const rubricCounts = { EE: 0, ME: 0, AE: 0, BE: 0 };

  studentRows.forEach((s) => {
    if (s.marksObtained !== null && s.marksObtained !== '' && s.marksObtained !== undefined) {
      const num = parseFloat(s.marksObtained as string);
      totalScoreSum += num;
      if (num > highestScore) highestScore = num;
      if (num < lowestScore) lowestScore = num;
      if (s.cbcRubricLevel && s.cbcRubricLevel in rubricCounts) {
        rubricCounts[s.cbcRubricLevel]++;
      }
    }
  });

  const averageScore = scoredCount > 0 ? Math.round((totalScoreSum / scoredCount) * 10) / 10 : 0;
  const isEditable = sheetData?.canEdit ?? true;
  const status = sheetData?.status || 'NOT_STARTED';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-sky-100 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                CBC Marksheet Engine
              </span>

              {/* Status Badge */}
              {status === 'APPROVED' || status === 'LOCKED' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {status} (Finalized)
                </span>
              ) : status === 'SUBMITTED' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  <Lock className="w-3.5 h-3.5 text-sky-600" />
                  SUBMITTED (Under Review)
                </span>
              ) : status === 'CORRECTION_REQUESTED' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  CORRECTION REQUESTED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  {status === 'DRAFT' ? 'DRAFT (In Progress)' : 'NOT STARTED'}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Electronic Mark Entry
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Enter assessment marks with real-time CBC rubric calculation (`EE`, `ME`, `AE`, `BE`) and Junior Secondary points.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPrintModal(true)}
              disabled={studentRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-700 hover:text-sky-600 hover:bg-sky-50 border border-sky-200 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-sky-500" />
              Print Marksheet
            </button>

            {status === 'SUBMITTED' && (
              <button
                onClick={() => setShowCorrectionModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-amber-600" />
                Request Correction
              </button>
            )}

            {isEditable && (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={loading || saving || studentRows.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-sky-700 hover:bg-sky-50 border border-sky-300 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-sky-600" />
                  {saving ? 'Saving Draft...' : 'Save as Draft'}
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={loading || submitting || studentRows.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting...' : 'Submit for Review'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Deputy Feedback / Correction Notice Banner */}
        {status === 'CORRECTION_REQUESTED' && sheetData?.correctionReason && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">Deputy Head Correction Notes:</h4>
              <p className="text-xs text-amber-800 mt-1 font-medium">{sheetData.correctionReason}</p>
              <p className="text-[11px] text-amber-700 mt-1">
                Please make the necessary score adjustments below and click &quot;Submit for Review&quot; once completed.
              </p>
            </div>
          </div>
        )}

        {/* Selectors: Examination, Class, and Subject */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-sky-100">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Examination
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-hidden cursor-pointer"
            >
              {activeExams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Teaching Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                const newClassId = e.target.value;
                setSelectedClassId(newClassId);
                // Filter subjects for this class
                const firstSubj = teachingAreas.find((a) => a.classId === newClassId);
                if (firstSubj) setSelectedSubjectId(firstSubj.subjectId);
              }}
              className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-hidden cursor-pointer"
            >
              {Array.from(new Set(teachingAreas.map((a) => a.classId))).map((clsId) => {
                const area = teachingAreas.find((a) => a.classId === clsId);
                return (
                  <option key={clsId} value={clsId}>
                    {area?.className}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Subject / Learning Area
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-hidden cursor-pointer"
            >
              {teachingAreas
                .filter((a) => a.classId === selectedClassId)
                .map((a) => (
                  <option key={a.subjectId} value={a.subjectId}>
                    {a.subjectName} ({a.subjectCode})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Live Metrics & CBC Rubric Distribution Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-3.5 border border-sky-100 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completion</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
            {scoredCount} <span className="text-xs text-slate-400 font-normal">/ {studentRows.length}</span>
          </div>
          <div className="text-[10px] text-sky-600 font-semibold mt-0.5">
            {studentRows.length > 0 ? Math.round((scoredCount / studentRows.length) * 100) : 0}% filled
          </div>
        </div>

        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-3.5 border border-sky-100 shadow-xs">
          <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">Class Average</div>
          <div className="text-xl sm:text-2xl font-black text-sky-700 mt-0.5">{averageScore}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            High: {highestScore}% • Low: {scoredCount > 0 ? lowestScore : 0}%
          </div>
        </div>

        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-100 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">EE (80-100%)</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">{rubricCounts.EE}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Exceeding Exp.</div>
        </div>

        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-3.5 border border-sky-100 shadow-xs">
          <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">ME (65-79%)</div>
          <div className="text-xl sm:text-2xl font-black text-sky-700 mt-0.5">{rubricCounts.ME}</div>
          <div className="text-[10px] text-sky-600 mt-0.5">Meeting Exp.</div>
        </div>

        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-3.5 border border-amber-100 shadow-xs">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">AE (50-64%)</div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5">{rubricCounts.AE}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Approaching Exp.</div>
        </div>

        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-3.5 border border-rose-100 shadow-xs">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">BE (0-49%)</div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5">{rubricCounts.BE}</div>
          <div className="text-[10px] text-rose-600 mt-0.5">Below Exp.</div>
        </div>
      </div>

      {/* Spreadsheet-Style Mark Entry Grid */}
      <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-sky-100 shadow-glass overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Loading learner marksheet...
          </div>
        ) : studentRows.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            No active learners found in this class.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sky-50/70 text-slate-600 border-b border-sky-100 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="py-3 px-3.5 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[180px]">Learner Name</th>
                  <th className="py-3 px-3 w-28">Assess / Adm #</th>
                  <th className="py-3 px-3 w-16">Gender</th>
                  <th className="py-3 px-4 w-36">
                    Marks / 100 <span className="text-[9px] text-slate-400 lowercase">(↓ or enter)</span>
                  </th>
                  <th className="py-3 px-3 w-24">CBC Rubric</th>
                  <th className="py-3 px-3 w-20">Points</th>
                  <th className="py-3 px-4 min-w-[200px]">Teacher Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/60 font-medium">
                {studentRows.map((row, idx) => (
                  <tr
                    key={row.studentId}
                    className={`hover:bg-sky-50/40 transition-colors ${
                      row.cbcRubricLevel === 'BE'
                        ? 'bg-rose-50/20'
                        : row.cbcRubricLevel === 'EE'
                        ? 'bg-emerald-50/15'
                        : ''
                    }`}
                  >
                    <td className="py-2.5 px-3.5 text-center text-slate-400 font-bold text-xs">
                      {idx + 1}
                    </td>

                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {row.fullName}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      {row.assessmentNumber || row.admissionNumber || '—'}
                    </td>

                    <td className="py-2.5 px-3 capitalize text-slate-500">
                      {row.gender?.toLowerCase()}
                    </td>

                    {/* Score Input */}
                    <td className="py-2.5 px-4">
                      <div className="relative">
                        <input
                          ref={(el) => (inputRefs.current[idx] = el)}
                          type="number"
                          min="0"
                          max={row.maxMarks || 100}
                          step="0.5"
                          disabled={!isEditable}
                          value={row.marksObtained !== null && row.marksObtained !== undefined ? row.marksObtained : ''}
                          onChange={(e) => handleScoreChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx)}
                          placeholder="—"
                          className={`w-24 px-3 py-1.5 text-center font-black text-sm rounded-xl border transition-all outline-hidden ${
                            row.marksObtained === null || row.marksObtained === ''
                              ? 'bg-slate-50 border-sky-200 text-slate-400'
                              : row.cbcRubricLevel === 'EE'
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-800'
                              : row.cbcRubricLevel === 'ME'
                              ? 'bg-sky-50/80 border-sky-300 text-sky-800'
                              : row.cbcRubricLevel === 'AE'
                              ? 'bg-amber-50/80 border-amber-300 text-amber-800'
                              : 'bg-rose-50/80 border-rose-300 text-rose-800'
                          } ${
                            isEditable
                              ? 'focus:bg-white focus:ring-2 focus:ring-sky-400'
                              : 'cursor-not-allowed opacity-80'
                          }`}
                        />
                      </div>
                    </td>

                    {/* CBC Rubric Pill */}
                    <td className="py-2.5 px-3">
                      {row.cbcRubricLevel ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            row.cbcRubricLevel === 'EE'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : row.cbcRubricLevel === 'ME'
                              ? 'bg-sky-100 text-sky-800 border-sky-200'
                              : row.cbcRubricLevel === 'AE'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}
                        >
                          {row.cbcRubricLevel}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Junior Secondary Points */}
                    <td className="py-2.5 px-3 font-bold text-slate-700">
                      {row.juniorPoints ? `${row.juniorPoints} pts` : '—'}
                    </td>

                    {/* Remarks Input */}
                    <td className="py-2.5 px-4">
                      <input
                        type="text"
                        disabled={!isEditable}
                        value={row.teacherRemarks || ''}
                        onChange={(e) => handleRemarkChange(idx, e.target.value)}
                        placeholder="Individual remarks..."
                        className="w-full bg-slate-50 border border-sky-100 rounded-lg px-2.5 py-1 text-xs text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-sky-400 outline-hidden transition-all disabled:opacity-60"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Teacher Correction Request Modal */}
      {showCorrectionModal && (
        <Modal
          isOpen={showCorrectionModal}
          onClose={() => setShowCorrectionModal(false)}
          title="Request Marksheet Correction"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              This marksheet has already been submitted to the Deputy Head. Explain why corrections are necessary (e.g. data entry error, reassessment of paper). Upon approval, the marksheet will be reopened for editing.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Correction Request <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Describe the scores requiring correction and why..."
                className="w-full bg-slate-50 border border-sky-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-400 outline-hidden transition-all"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-sky-100">
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestCorrection}
                disabled={requestingCorrection || !correctionReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {requestingCorrection ? 'Submitting...' : 'Submit Request to Deputy'}
              </button>
            </div>
          </div>
        </Modal>
      )}

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
                onClick={() => printElement('official-marksheet-printable', `${schoolSettings?.schoolName || 'Eldoret Muslim Academy'} - Official Examination Marksheet`)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Now
              </button>
            </div>

            {/* Printable Paper Canvas */}
            <div id="official-marksheet-printable" className="p-6 bg-white border border-slate-300 rounded-lg text-slate-900 font-serif printable-sheet">
              {/* Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                <h2 className="text-lg font-black uppercase tracking-wider">
                  {schoolSettings?.schoolName || 'Eldoret Muslim Academy'}
                </h2>
                <div className="text-xs text-slate-600">
                  {schoolSettings?.postalAddress || 'P.O. Box 1234, Eldoret, Kenya'} • Tel: {schoolSettings?.primaryPhone || '0700000000'}
                </div>
                <div className="text-sm font-bold uppercase mt-2 text-slate-800 tracking-wide">
                  Official Examination Marksheet
                </div>
              </div>

              {/* Metadata Info */}
              <div className="grid grid-cols-2 text-xs mb-4 gap-2 border-b border-slate-200 pb-3">
                <div>
                  <span className="font-bold">Examination:</span> {sheetData?.examination?.title}
                </div>
                <div>
                  <span className="font-bold">Class:</span> {sheetData?.class?.name}
                </div>
                <div>
                  <span className="font-bold">Subject:</span> {sheetData?.subject?.name} ({sheetData?.subject?.code})
                </div>
                <div>
                  <span className="font-bold">Date Printed:</span> {new Date().toLocaleDateString()}
                </div>
              </div>

              {/* Printable Table */}
              <table className="w-full text-xs text-left border-collapse mb-6">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-100 font-bold">
                    <th className="py-1.5 px-2 w-8 text-center border">#</th>
                    <th className="py-1.5 px-2 border">Learner Name</th>
                    <th className="py-1.5 px-2 border w-24">Assess #</th>
                    <th className="py-1.5 px-2 border w-16 text-center">Marks / 100</th>
                    <th className="py-1.5 px-2 border w-16 text-center">CBC Level</th>
                    <th className="py-1.5 px-2 border">Teacher Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((r, i) => (
                    <tr key={r.studentId} className="border-b border-slate-200">
                      <td className="py-1.5 px-2 text-center border">{i + 1}</td>
                      <td className="py-1.5 px-2 font-semibold border">{r.fullName}</td>
                      <td className="py-1.5 px-2 border">{r.assessmentNumber || '—'}</td>
                      <td className="py-1.5 px-2 text-center font-bold border">
                        {r.marksObtained !== null && r.marksObtained !== '' ? r.marksObtained : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-center font-bold border">
                        {r.cbcRubricLevel || '—'}
                      </td>
                      <td className="py-1.5 px-2 text-[11px] border">{r.teacherRemarks || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary & Signatures */}
              <div className="grid grid-cols-2 text-xs pt-4 border-t border-slate-300 gap-8">
                <div>
                  <div><span className="font-bold">Class Average:</span> {averageScore}%</div>
                  <div><span className="font-bold">Highest Score:</span> {highestScore}%</div>
                  <div><span className="font-bold">Lowest Score:</span> {scoredCount > 0 ? lowestScore : 0}%</div>
                </div>
                <div className="space-y-4">
                  <div className="border-b border-slate-900 pb-1 flex justify-between">
                    <span>Teacher Signature:</span>
                    <span>Date: ____________</span>
                  </div>
                  <div className="border-b border-slate-900 pb-1 flex justify-between">
                    <span>Deputy Head Signature:</span>
                    <span>Date: ____________</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default MarksheetEntryView;
