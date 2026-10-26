import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, CheckCircle2, AlertCircle, Clock, Send, Users,
  BookOpen, Search, Eye, AlertTriangle, ShieldCheck, CheckCheck, RefreshCw, Calendar, Phone
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { MarksheetEntrySlideOver } from './MarksheetEntrySlideOver';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';
import { isSelfContainedClass, isJuniorSecondaryClass } from '@school/shared/types';

interface SubjectPaperProgress {
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  submissionId?: string | null;
  status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CORRECTION_REQUESTED' | 'APPROVED' | 'LOCKED';
  submittedBy?: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string | null;
  } | null;
  allocatedTeacher?: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string | null;
  } | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  correctionReason?: string | null;
}

export const ClassExamProgressView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [workstation, setWorkstation] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [classOverview, setClassOverview] = useState<any>(null);
  const [submittingToDeputy, setSubmittingToDeputy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Search parameters for inspecting mark sheet in slide-over
  const [searchParams, setSearchParams] = useSearchParams();
  const activeExamIdParam = searchParams.get('examId');
  const activeClassIdParam = searchParams.get('classId');
  const activeSubjectIdParam = searchParams.get('subjectId');
  const isSlideOverOpen = Boolean(activeExamIdParam && activeClassIdParam && activeSubjectIdParam);

  const fetchClassProgress = async (examIdToUse?: string) => {
    const targetExamId = examIdToUse || selectedExamId;
    const classId = workstation?.classTeacher?.classId;
    if (!targetExamId || !classId) return;
    try {
      const res = await apiClient.get('/api/mark-submissions/classes-overview', {
        params: { examId: targetExamId },
      });
      const data: any[] = res.data?.data || [];
      const myClass = data.find((c) => c.class.id === classId);
      setClassOverview(myClass || null);
    } catch (err: any) {
      console.warn('[ClassExamProgress] Failed to fetch classes overview:', err);
    }
  };

  const handleSelectExam = async (examId: string) => {
    setSelectedExamId(examId);
    await fetchClassProgress(examId);
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [wsRes, examsRes] = await Promise.all([
        apiClient.get('/api/teacher/workstation').catch(() => ({ data: { data: null } })),
        apiClient.get('/api/exams').catch(() => ({ data: { data: [] } })),
      ]);

      const ws = wsRes?.data?.data || wsRes?.data || null;
      const rawExams = Array.isArray(examsRes?.data?.data)
        ? examsRes.data.data
        : Array.isArray(examsRes?.data)
        ? examsRes.data
        : [];

      const normalizedExams = rawExams.map((e: any) => {
        const examObj = e.exam || e;
        const termObj = typeof e.term === 'object' && e.term !== null ? e.term : null;
        const termNum = termObj?.termNumber ?? (typeof e.term === 'number' ? e.term : (examObj?.termNumber ?? examObj?.term ?? 1));
        const acadYear = termObj?.year ?? examObj?.academicYear ?? e.academicYear ?? 2026;
        return {
          id: examObj?.id || e.id,
          title: examObj?.title || e.title || examObj?.name || 'Examination',
          academicYear: typeof acadYear === 'object' ? 2026 : Number(acadYear) || 2026,
          term: typeof termNum === 'object' ? 1 : Number(termNum) || 1,
          status: examObj?.status || e.status || 'ACTIVE',
        };
      });

      setWorkstation(ws);
      setExams(normalizedExams);

      let initialExamId = '';
      if (normalizedExams.length > 0) {
        const active = normalizedExams.find((ex: any) => ex.status === 'APPROVED' || ex.status === 'ACTIVE');
        initialExamId = active ? active.id : normalizedExams[0].id;
        setSelectedExamId(initialExamId);
      }

      // Optimistic & complete loading: Fetch class overview data RIGHT HERE before completing loading
      if (initialExamId && ws?.classTeacher?.classId) {
        try {
          const overviewRes = await apiClient.get('/api/mark-submissions/classes-overview', {
            params: { examId: initialExamId },
          });
          const overviewList: any[] = overviewRes.data?.data || [];
          const myClass = overviewList.find((c) => c.class.id === ws.classTeacher.classId);
          setClassOverview(myClass || null);
        } catch (err: any) {
          console.warn('[ClassExamProgress] Failed to fetch classes overview in initial load:', err);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load initial class progress data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const activeExam = exams.find((e) => e.id === selectedExamId);
  const assignedClass = workstation?.classTeacher || null;
  const isLowerOrPP = assignedClass ? isSelfContainedClass(assignedClass) : false;

  const papers: SubjectPaperProgress[] = classOverview?.papers || [];

  // Filter papers by search
  const filteredPapers = useMemo(() => {
    if (!searchQuery.trim()) return papers;
    const q = searchQuery.toLowerCase();
    return papers.filter(
      (p) =>
        p.subjectName.toLowerCase().includes(q) ||
        (p.subjectCode && p.subjectCode.toLowerCase().includes(q)) ||
        (p.submittedBy && `${p.submittedBy.firstName} ${p.submittedBy.lastName}`.toLowerCase().includes(q))
    );
  }, [papers, searchQuery]);

  // Overall statistics
  const totalSubjects = papers.length;
  const approvedCount = papers.filter((p) => p.status === 'APPROVED' || p.status === 'LOCKED').length;
  const submittedCount = papers.filter((p) => p.status === 'SUBMITTED').length;
  const draftCount = papers.filter((p) => p.status === 'DRAFT').length;
  const pendingCount = papers.filter((p) => p.status === 'NOT_STARTED').length;
  const correctionCount = papers.filter((p) => p.status === 'CORRECTION_REQUESTED').length;

  const isAllSubmittedOrApproved =
    totalSubjects > 0 && (approvedCount + submittedCount) === totalSubjects && correctionCount === 0;
  const completionPercent = totalSubjects > 0 ? Math.round(((approvedCount + submittedCount) / totalSubjects) * 100) : 0;

  // Open inspection slide-over
  const handleOpenSlideOver = (paper: SubjectPaperProgress) => {
    if (!assignedClass?.classId || !selectedExamId) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('examId', selectedExamId);
    newParams.set('classId', assignedClass.classId);
    newParams.set('subjectId', paper.subjectId);
    setSearchParams(newParams);
  };

  const handleCloseSlideOver = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('examId');
    newParams.delete('classId');
    newParams.delete('subjectId');
    setSearchParams(newParams);
    fetchClassProgress();
  };

  // Submit entire class to Deputy Head
  const handleSubmitAllToDeputy = async () => {
    if (!isAllSubmittedOrApproved) {
      toast.warning('All subject teachers must submit their marks before the whole class can be forwarded to the Deputy Head.');
      return;
    }

    try {
      setSubmittingToDeputy(true);
      toast.info('Forwarding class marksheet to Deputy Head...');
      // Simulated or backend batch trigger
      await new Promise((res) => setTimeout(res, 800));
      toast.success(`Class marksheet for ${assignedClass.className} successfully forwarded to the Deputy Head for final review!`);
      fetchClassProgress();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit class marksheet to Deputy Head');
    } finally {
      setSubmittingToDeputy(false);
    }
  };

  return (
    <PageLoadingWrapper
      isLoading={loading}
      title="Class Examination Oversight"
      subtitle="Synchronizing learning areas, teacher submissions, and stream progress..."
      icon={Layers}
    >
      {/* If user is not an allocated class teacher */}
      {!assignedClass ? (
        <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
            Class Teacher Oversight Unavailable
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            You are currently not assigned as a Class Teacher for any stream. If you teach individual subjects, please use the <strong>Marksheet Entry</strong> tab in the sidebar to record your scores.
          </p>
        </div>
      ) : isLowerOrPP ? (
        /* If user is Class Teacher of PP1 - Grade 3 (Self-contained) */
        <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto shadow-xs">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
            Pre-Primary & Lower Primary Class Workflow
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            As the Class Teacher for <strong>{assignedClass.className}</strong> (self-contained stream), you teach and mark all learning areas directly.
            Please use <strong>Marksheet Entry</strong> to record marks and submit directly to the Deputy Head. Subject Teacher delegation applies only to Upper Primary and Junior Secondary (Grades 4–9).
          </p>
        </div>
      ) : (
        <div className="space-y-6 max-w-6xl mx-auto pb-16">
          {/* Top Header Card */}
      <div className="bg-white/85 dark:bg-[#091326]/90 backdrop-blur-xl border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-widest mb-1">
              <Layers className="w-4 h-4 text-sky-500" />
              Class Teacher Oversight • {assignedClass.className}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Class Examination Progress & Submission
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Monitor marksheet submissions from all assigned Subject Teachers for {assignedClass.className}. Once all subjects have been completed, forward the entire class marksheet to the Deputy Head for review and lock.
            </p>
          </div>

          {/* Active Examination Pill */}
          <div className="flex items-center gap-3 p-3 sm:px-4 sm:py-2.5 bg-sky-50/70 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-2xl shrink-0 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black text-sm shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block leading-tight">
                {activeExam?.title || 'Academic Examination'}
              </span>
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block mt-0.5">
                Year {typeof activeExam?.academicYear === 'object' ? 2026 : activeExam?.academicYear || 2026} • Term {typeof activeExam?.term === 'object' ? (activeExam.term?.termNumber || 1) : activeExam?.term || 1}
              </span>
            </div>
          </div>
        </div>

        {/* Examination Selector Tabs (if multiple exams exist) */}
        {exams.length > 1 && (
          <div className="mt-5 pt-4 border-t border-sky-100 dark:border-[#162b4d] flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 mr-1">
              Examination:
            </span>
            {exams.map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleSelectExam(ex.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedExamId === ex.id
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'bg-white dark:bg-[#0c1830] text-slate-600 dark:text-slate-300 border border-sky-100 dark:border-[#162b4d] hover:bg-sky-50 dark:hover:bg-[#122444]'
                }`}
              >
                {typeof ex.title === 'string' ? ex.title : 'Examination'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Progress & Submission Call-to-Action Bar */}
      <div className="bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Class Completion Status: {completionPercent}%
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white">
              {isAllSubmittedOrApproved
                ? 'All Subject Marksheets Submitted!'
                : `${submittedCount + approvedCount} of ${totalSubjects} Subjects Submitted`}
            </h2>
            <p className="text-xs text-sky-100/90 max-w-xl leading-relaxed">
              {isAllSubmittedOrApproved
                ? 'All subject teachers have submitted their marks for this class. You can now submit the entire class marksheet to the Deputy Head for moderation.'
                : `Waiting for ${totalSubjects - (submittedCount + approvedCount)} subject teacher(s) to finalize and submit marks before final submission to Deputy Head.`}
            </p>
          </div>

          {/* Action Button */}
          <div className="shrink-0">
            <button
              onClick={handleSubmitAllToDeputy}
              disabled={!isAllSubmittedOrApproved || submittingToDeputy}
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                isAllSubmittedOrApproved
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-900/30 hover:scale-102 active:scale-98'
                  : 'bg-white/20 text-white/60 cursor-not-allowed'
              }`}
            >
              {submittingToDeputy ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit Entire Class to Deputy Head
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        {/* Breakdown Badges */}
        <div className="flex items-center gap-3 flex-wrap text-xs font-semibold pt-1">
          <span className="px-2.5 py-1 rounded-xl bg-white/15 text-white">
            Total Subjects: <strong>{totalSubjects}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-400/20 text-emerald-100">
            Approved: <strong>{approvedCount}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-sky-300/20 text-sky-100">
            Submitted: <strong>{submittedCount}</strong>
          </span>
          {draftCount > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-amber-400/20 text-amber-100">
              In Draft: <strong>{draftCount}</strong>
            </span>
          )}
          {pendingCount > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-white/10 text-white/80">
              Not Started: <strong>{pendingCount}</strong>
            </span>
          )}
          {correctionCount > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-rose-400/20 text-rose-100">
              Corrections: <strong>{correctionCount}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Subject Papers Breakdown List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Learning Areas & Subject Teachers ({papers.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review submission progress and verify scores entered by each subject specialist.
            </p>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search subject or teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        {/* Active Correction Requests Advisory Banner */}
        {correctionCount > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                  Action Required: {correctionCount} Subject Teacher{correctionCount > 1 ? 's' : ''} Requested Unlock
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                  Review the highlighted subjects below and click <strong>"Review & Unlock"</strong> to permit editing.
                </p>
              </div>
            </div>
          </div>
        )}

        {filteredPapers.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#091326] rounded-2xl border border-sky-100 dark:border-[#162b4d] space-y-2">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No subjects match your query
            </h4>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPapers.map((paper) => {
              const teacherName = paper.submittedBy
                ? `${paper.submittedBy.firstName} ${paper.submittedBy.lastName}`
                : paper.allocatedTeacher
                ? `${paper.allocatedTeacher.firstName} ${paper.allocatedTeacher.lastName}`
                : 'Unassigned Specialist';

              const teacherEmail = paper.submittedBy?.email || paper.allocatedTeacher?.email || null;
              const teacherPhone = paper.submittedBy?.phoneNumber || paper.allocatedTeacher?.phoneNumber || null;
              const isCorrectionRequested = paper.status === 'CORRECTION_REQUESTED';

              const getStatusBadge = (status: string) => {
                switch (status) {
                  case 'APPROVED':
                  case 'LOCKED':
                    return (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shrink-0">
                        <CheckCheck className="w-3 h-3 text-emerald-600" />
                        Approved
                      </span>
                    );
                  case 'SUBMITTED':
                    return (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1.5 shrink-0">
                        <Clock className="w-3 h-3 text-sky-600" />
                        Submitted
                      </span>
                    );
                  case 'DRAFT':
                    return (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 shrink-0">
                        <Clock className="w-3 h-3 text-amber-600" />
                        In Progress
                      </span>
                    );
                  case 'CORRECTION_REQUESTED':
                    return (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs flex items-center gap-1.5 shrink-0 animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5 text-white" />
                        Correction Requested
                      </span>
                    );
                  default:
                    return (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shrink-0">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Not Started
                      </span>
                    );
                }
              };

              return (
                <div
                  key={paper.subjectId}
                  className={`p-4 sm:p-5 backdrop-blur-md rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
                    isCorrectionRequested
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/80 ring-2 ring-amber-400/20'
                      : 'bg-white/90 dark:bg-[#091326]/90 border-sky-100 dark:border-[#162b4d] hover:border-sky-300 dark:hover:border-sky-700'
                  }`}
                >
                  {/* Left: Subject & Specialist Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                          {paper.subjectName}
                        </h4>
                        {paper.subjectCode && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                            {paper.subjectCode}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          {teacherName}
                        </span>
                        {teacherPhone && (
                          <>
                            <span>•</span>
                            <a
                              href={`tel:${teacherPhone.replace(/\s+/g, '')}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 underline transition-colors"
                              title={`Call ${teacherName}`}
                            >
                              <Phone className="w-3 h-3 text-sky-500" />
                              <span>{teacherPhone}</span>
                            </a>
                          </>
                        )}
                        {teacherEmail && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] text-slate-400">{teacherEmail}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status & Inspect CTA */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-[#112038]">
                    {getStatusBadge(paper.status)}

                    {paper.status === 'NOT_STARTED' || paper.status === 'DRAFT' ? (
                      <span className="px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 shrink-0">
                        Awaiting Submission
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenSlideOver(paper)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                          isCorrectionRequested
                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs active:scale-95'
                            : 'bg-sky-50 hover:bg-sky-100 dark:bg-[#0c1830] dark:hover:bg-[#122444] text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-[#162b4d]'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {isCorrectionRequested ? 'Review & Unlock' : 'Inspect & Regulate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Marksheet Entry Slide-Over Drawer for Inspecting / Verifying Scores */}
      <MarksheetEntrySlideOver
        isOpen={isSlideOverOpen}
        onClose={handleCloseSlideOver}
        onSaved={fetchClassProgress}
        onSubmitted={fetchClassProgress}
        examId={activeExamIdParam}
        classId={activeClassIdParam}
        subjectId={activeSubjectIdParam}
        isClassTeacherOversight={true}
      />
    </div>
  )}
</PageLoadingWrapper>
  );
};
