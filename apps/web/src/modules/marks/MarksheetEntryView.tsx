import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Printer,
  FileText,
  Sparkles,
  ChevronRight,
  Lock,
  RotateCcw,
  CheckCheck,
  ArrowRight,
  Calendar,
  Search,
  Award,
  Layers,
  Clock,
  Plus,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { MarksheetEntrySlideOver } from './MarksheetEntrySlideOver';
import { MarkSubmissionProgressTracker } from './MarkSubmissionProgressTracker';
import { CatMarksheetSlideOver } from './CatMarksheetSlideOver';
import { CreateCatModal } from './CreateCatModal';
import { isJuniorSecondaryClass, isSubjectTeacherClass } from '@school/shared/types';
import { PageLoadingWrapper, PageLoadingProgress } from '../../components/PageLoadingProgress';

interface SubjectMarkTask {
  examId: string;
  examTitle: string;
  classId: string;
  className: string;
  levelCategory?: string;
  numericOrder?: number;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  submissionId?: string | null;
  status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CORRECTION_REQUESTED' | 'APPROVED' | 'LOCKED';
  correctionReason?: string | null;
  isUnlockedForCorrection?: boolean;
  scoredStudents: number;
  totalStudents: number;
  isComplete: boolean;
}

export const MarksheetEntryView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [workstation, setWorkstation] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'subject_papers' | 'tracker'>('subject_papers');

  // Mode: Summative Examinations vs Continuous Assessment Tests (CATs)
  const [assessmentMode, setAssessmentMode] = useState<'summative' | 'cat'>('summative');

  // CATs state
  const [catData, setCatData] = useState<{ activeTerm: any; allocations: any[] } | null>(null);
  const [catLoading, setCatLoading] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [isCreateCatModalOpen, setIsCreateCatModalOpen] = useState(false);
  const [selectedAllocForCreate, setSelectedAllocForCreate] = useState<any | null>(null);

  // Search and URL parameters for slide-over drawer
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  // Selected exam ID
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  const hasActiveExams = useMemo(
    () => exams.some((e: any) => e.status === 'APPROVED' || e.exam?.status === 'APPROVED'),
    [exams]
  );

  // Active slide-over state
  const activeExamIdParam = searchParams.get('examId');
  const activeClassIdParam = searchParams.get('classId');
  const activeSubjectIdParam = searchParams.get('subjectId');

  const isSlideOverOpen = Boolean(activeExamIdParam && activeClassIdParam && activeSubjectIdParam);

  // Fetch workstation & exam data
  const fetchData = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const [wsRes, examsRes, settingsRes] = await Promise.all([
        apiClient.get('/api/teacher/workstation').catch((err) => {
          console.warn('[Marksheet] Failed to load workstation:', err);
          return { data: { data: null } };
        }),
        apiClient.get('/api/exams').catch((err) => {
          console.warn('[Marksheet] Failed to load exams:', err);
          return { data: { data: [] } };
        }),
        apiClient.get('/api/settings/public').catch(() => ({ data: { data: null } })),
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
      setSchoolSettings(settingsRes?.data?.data || settingsRes?.data || null);

      // Select default exam
      if (!selectedExamId) {
        if (normalizedExams.length > 0) {
          const approved = normalizedExams.find((ex: any) => ex.status === 'APPROVED' || ex.status === 'ACTIVE');
          setSelectedExamId(approved ? approved.id : normalizedExams[0].id);
        } else if (ws?.markEntryTasks?.length > 0 && ws.markEntryTasks[0].examId) {
          setSelectedExamId(ws.markEntryTasks[0].examId);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load marksheet data');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Fetch CAT allocations
  const fetchCatAllocations = async (showLoading = false) => {
    try {
      if (showLoading) setCatLoading(true);
      const res = await apiClient.get('/api/cats/teacher-allocations');
      setCatData(res.data?.data || res.data || null);
    } catch (err: any) {
      console.warn('[Marksheet] Failed to load CAT allocations:', err);
    } finally {
      if (showLoading) setCatLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  useEffect(() => {
    if (assessmentMode === 'cat' && !catData) {
      fetchCatAllocations(true);
    }
  }, [assessmentMode]);

  // Filter subject papers for Grades 4 through 9 (Subject Specialists)
  const isSubjectTeacherPaper = (task: any) => {
    if (!task) return false;
    return isSubjectTeacherClass({
      levelCategory: task.levelCategory,
      numericOrder: task.numericOrder,
      name: task.className,
    });
  };

  // Filter and sort tasks from Grade 4 to Grade 9
  const allocatedTasks: SubjectMarkTask[] = useMemo(() => {
    const rawTasks: SubjectMarkTask[] = workstation?.markEntryTasks || [];

    // Filter by selected examination
    const forExam = selectedExamId
      ? rawTasks.filter((t) => t.examId === selectedExamId)
      : rawTasks;

    // Filter for Subject Teacher papers (Grades 4 - 9)
    const upperPapers = forExam.filter(isSubjectTeacherPaper);

    // If forExam filtered everything out (e.g. slight mismatch between exam ids), fallback to all upperPapers
    const candidatePapers = upperPapers.length > 0 ? upperPapers : rawTasks.filter(isSubjectTeacherPaper);

    // Sort from Grade 4 to Grade 9, then alphabetically by subject
    return candidatePapers.sort((a, b) => {
      const orderA = typeof a.numericOrder === 'number' ? a.numericOrder : 99;
      const orderB = typeof b.numericOrder === 'number' ? b.numericOrder : 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.subjectName || '').localeCompare(b.subjectName || '');
    });
  }, [workstation, selectedExamId]);

  // Search filtered tasks (Summative)
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return allocatedTasks;
    const q = searchQuery.toLowerCase();
    return allocatedTasks.filter(
      (t) =>
        t.className.toLowerCase().includes(q) ||
        t.subjectName.toLowerCase().includes(q) ||
        (t.subjectCode && t.subjectCode.toLowerCase().includes(q))
    );
  }, [allocatedTasks, searchQuery]);

  // Search filtered allocations (CATs)
  const filteredCatAllocations = useMemo(() => {
    const allocs = catData?.allocations || [];
    if (!searchQuery.trim()) return allocs;
    const q = searchQuery.toLowerCase();
    return allocs.filter(
      (a) =>
        a.className.toLowerCase().includes(q) ||
        a.subjectName.toLowerCase().includes(q) ||
        (a.subjectCode && a.subjectCode.toLowerCase().includes(q))
    );
  }, [catData, searchQuery]);

  // Open slide-over for a specific subject allocation
  const handleOpenSlideOver = (task: SubjectMarkTask) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('examId', task.examId);
    newParams.set('classId', task.classId);
    newParams.set('subjectId', task.subjectId);
    setSearchParams(newParams);
  };

  // Close slide-over
  const handleCloseSlideOver = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('examId');
    newParams.delete('classId');
    newParams.delete('subjectId');
    setSearchParams(newParams);
  };

  const activeExam = exams.find((e) => e.id === selectedExamId);

  // Milestone text helper for transition grades
  const getMilestoneTag = (className: string) => {
    if (/Grade\s*3/i.test(className)) {
      return { label: 'Grade 3 • KEYA / MLP Milestone', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
    }
    if (/Grade\s*6/i.test(className)) {
      return { label: 'Grade 6 • KPSEA Candidate Class', color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800' };
    }
    if (/Grade\s*9/i.test(className)) {
      return { label: 'Grade 9 • KJSEA National Candidate', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
    }
    return { label: 'National Exam Cohort', color: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200' };
  };

  return (
    <PageLoadingWrapper
      isLoading={loading}
      title="Academic Marksheet Entry"
      subtitle="Loading assigned subject papers, CBC rubrics, and marking targets..."
      icon={Award}
    >
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Top Header Card */}
        <div className="bg-white/85 dark:bg-[#091326]/90 backdrop-blur-xl border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-glass">
          {/* Assessment Mode Segmented Control */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-[#0c1830] rounded-2xl border border-sky-100 dark:border-[#162b4d] w-fit mb-5">
            <button
              type="button"
              onClick={() => setAssessmentMode('summative')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                assessmentMode === 'summative'
                  ? 'bg-white dark:bg-[#162b4d] text-sky-600 dark:text-sky-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Award className="w-4 h-4 text-sky-500" />
              <span>Summative Examinations</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAssessmentMode('cat');
                if (!catData) fetchCatAllocations(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                assessmentMode === 'cat'
                  ? 'bg-white dark:bg-[#162b4d] text-sky-600 dark:text-sky-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Continuous Assessments (CAT)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-black">
                Grades 3, 6, 9
              </span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-widest mb-1">
                {assessmentMode === 'summative' ? (
                  <>
                    <Award className="w-4 h-4 text-sky-500" />
                    Academic Marksheet Entry • Grades 4 – 9
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Continuous Assessment Tests (CATs) • National Milestone Cohorts
                  </>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {assessmentMode === 'summative'
                  ? 'Subject Marksheet Entry'
                  : 'Continuous Assessment Tests (CATs)'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                {assessmentMode === 'summative'
                  ? 'Record CBC marks for your assigned learning areas. Click on any paper to enter scores, assign rubrics, and submit to the Class Teacher for verification.'
                  : 'Create, administer, and grade Continuous Assessment Tests (CATs) for Grades 3, 6, and 9. CATs are managed asynchronously by subject teachers to track national examination readiness.'}
              </p>
            </div>

            {/* Right Status Pill */}
            {assessmentMode === 'summative' ? (
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
            ) : (
              <div className="flex items-center gap-3 p-3 sm:px-4 sm:py-2.5 bg-indigo-50/70 dark:bg-[#0c1830] border border-indigo-100 dark:border-[#162b4d] rounded-2xl shrink-0 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-black text-sm shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block leading-tight">
                    Term {catData?.activeTerm?.termNumber || 1} Continuous Assessments
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mt-0.5">
                    Year {catData?.activeTerm?.year || 2026} • Formative Tracking
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Standby Banner when Examination Period is Inactive (Summative Mode Only) */}
          {assessmentMode === 'summative' && !hasActiveExams && (
            <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-amber-950 dark:text-amber-100">
                  Examination Score Entry Closed
                </h4>
                <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                  There is currently no active examination period in session. Continuous Assessment Tests (CATs) or classroom teaching is in progress.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAssessmentMode('cat');
                      if (!catData) fetchCatAllocations(true);
                    }}
                    className="underline font-bold text-amber-950 dark:text-amber-100 hover:text-sky-600 cursor-pointer"
                  >
                    Click here to enter Continuous Assessment Tests (CATs)
                  </button>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Examination Selector Tabs (Summative Mode Only) */}
          {assessmentMode === 'summative' && exams.length > 1 && (
            <div className="mt-5 pt-4 border-t border-sky-100 dark:border-[#162b4d] flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 mr-1">
                Examination:
              </span>
              {exams.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExamId(ex.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    selectedExamId === ex.id
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'bg-white dark:bg-[#0c1830] text-slate-600 dark:text-slate-300 border border-sky-100 dark:border-[#162b4d] hover:bg-sky-50 dark:hover:bg-[#122444]'
                  }`}
                >
                  {ex.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODE 1: SUMMATIVE EXAMINATIONS                                            */}
        {/* ========================================================================= */}
        {assessmentMode === 'summative' && (
          <div className="space-y-4">
            {/* Section Header with Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  My Assigned Examination Papers ({allocatedTasks.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Listed from Grade 4 to Grade 9. Click any paper to open the mark entry sheet.
                </p>
              </div>

              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search grade or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            {/* Papers List */}
            {filteredTasks.length === 0 ? (
              <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#091326] rounded-2xl border border-sky-100 dark:border-[#162b4d] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto shadow-xs">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    No Examination Papers Found
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    You do not have any teaching allocations or paper marking assignments for Grades 4 through 9 in this examination.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  const percent =
                    task.totalStudents > 0
                      ? Math.round((task.scoredStudents / task.totalStudents) * 100)
                      : 0;

                  return (
                    <div
                      key={`${task.examId}-${task.classId}-${task.subjectId}`}
                      onClick={() => handleOpenSlideOver(task)}
                      className="group p-4 sm:p-5 bg-white dark:bg-[#091326] rounded-2xl border border-sky-100 dark:border-[#162b4d] hover:border-sky-300 dark:hover:border-sky-600 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-sm shrink-0 border border-sky-100 dark:border-sky-900/40">
                            {task.subjectCode ? task.subjectCode.substring(0, 3) : 'SB'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {task.className}
                              </span>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                {task.subjectName}
                              </h3>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {task.scoredStudents} of {task.totalStudents} learners scored ({percent}%)
                            </p>
                          </div>
                        </div>

                        {/* Progress and Action */}
                        <div className="flex items-center gap-3">
                          <div className="w-28 hidden sm:block">
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  task.isComplete
                                    ? 'bg-emerald-500'
                                    : task.scoredStudents > 0
                                    ? 'bg-sky-500'
                                    : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>

                          {/* Status Pill */}
                          <div className="shrink-0">
                            {task.status === 'LOCKED' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                                Permanently Locked
                              </span>
                            ) : task.status === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Approved
                              </span>
                            ) : task.status === 'SUBMITTED' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                <Lock className="w-3.5 h-3.5 text-sky-600" />
                                Submitted
                              </span>
                            ) : task.status === 'CORRECTION_REQUESTED' ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Unlock Requested
                              </span>
                            ) : Boolean(task.isUnlockedForCorrection) || (task.status === 'DRAFT' && Boolean(task.correctionReason)) ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 animate-pulse">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                                Fix Required
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                {task.status === 'DRAFT' ? 'Draft' : 'Not Started'}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSlideOver(task);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white shadow-xs transition-colors cursor-pointer shrink-0"
                          >
                            <span>Enter Marks</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: CONTINUOUS ASSESSMENT TESTS (CATS) - GRADES 3, 6, 9              */}
        {/* ========================================================================= */}
        {assessmentMode === 'cat' && (
          <div className="space-y-4">
            {/* CAT Header with Add CAT Button and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  National Transition Cohorts (Grades 3, 6, 9)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Continuous Assessment Tests are managed by subject teachers to track national preparedness.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search grade or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                {catData && catData.allocations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAllocForCreate(null);
                      setIsCreateCatModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New CAT</span>
                  </button>
                )}
              </div>
            </div>

            {/* Content List */}
            {catLoading ? (
              <div className="p-12 text-center bg-white dark:bg-[#091326] rounded-2xl border border-sky-100 dark:border-[#162b4d]">
                <PageLoadingProgress isLoading={true} title="Loading CAT Allocations" subtitle="Fetching national milestone classes..." />
              </div>
            ) : filteredCatAllocations.length === 0 ? (
              <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#091326] rounded-2xl border border-sky-100 dark:border-[#162b4d] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    No National Examination Classes Assigned
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Under school guidelines, Continuous Assessment Tests (CATs) are specifically administered for national transition candidates: <strong>Grade 3</strong> (KEYA / MLP), <strong>Grade 6</strong> (KPSEA), and <strong>Grade 9</strong> (KJSEA). You do not currently teach these grades. Please use the <strong>Summative Examinations</strong> tab for your classes.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCatAllocations.map((alloc) => {
                  const milestone = getMilestoneTag(alloc.className);

                  return (
                    <div
                      key={`${alloc.classId}-${alloc.subjectId}`}
                      className="p-5 bg-white dark:bg-[#091326] rounded-2xl border border-sky-100 dark:border-[#162b4d] shadow-xs space-y-4"
                    >
                      {/* Allocation Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#162b4d]/60">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-100 dark:border-indigo-900/40">
                            {alloc.subjectCode ? alloc.subjectCode.substring(0, 3) : 'CAT'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                                {alloc.className}
                              </span>
                              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                                {alloc.subjectName}
                              </h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${milestone.color}`}>
                                {milestone.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {alloc.totalStudents} Active Learners • {alloc.cats.length} Continuous Assessments recorded
                            </p>
                          </div>
                        </div>

                        {/* Running CAT Mean & Action */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Running CAT Average
                            </span>
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                              {alloc.runningCatAverage !== null ? (
                                <>
                                  {alloc.runningCatAverage}%{' '}
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                    {alloc.runningCatRubric}
                                  </span>
                                </>
                              ) : (
                                'Pending Scores'
                              )}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAllocForCreate(alloc);
                              setIsCreateCatModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add CAT</span>
                          </button>
                        </div>
                      </div>

                      {/* CATs Grid */}
                      {alloc.cats.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0c1830] border border-dashed border-slate-200 dark:border-[#162b4d] text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            No assessments created yet for this term. Click{' '}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAllocForCreate(alloc);
                                setIsCreateCatModalOpen(true);
                              }}
                              className="font-bold text-indigo-600 dark:text-indigo-400 underline cursor-pointer"
                            >
                              Add CAT
                            </button>{' '}
                            to set up CAT 1.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {alloc.cats.map((cat: any) => {
                            const isMarked = cat.scoredStudents >= cat.totalStudents && cat.totalStudents > 0;

                            return (
                              <div
                                key={cat.id}
                                onClick={() => setSelectedCatId(cat.id)}
                                className="group/card p-3.5 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#0c1830] hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer space-y-2.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 rounded-md text-xs font-black bg-indigo-500 text-white shadow-2xs">
                                    CAT {cat.catNumber}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-400">
                                    /{cat.maxMarks} marks
                                  </span>
                                </div>

                                <div className="flex items-baseline justify-between">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Mean Score
                                    </span>
                                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                                      {cat.meanPct !== null ? `${cat.meanPct}%` : '—'}
                                    </span>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Scored
                                    </span>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      {cat.scoredStudents} / {cat.totalStudents}
                                    </span>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-[#162b4d] flex items-center justify-between text-[11px]">
                                  <span className={isMarked ? 'text-emerald-600 font-bold' : 'text-amber-600 font-medium'}>
                                    {isMarked ? '● Completed' : '● In Progress'}
                                  </span>
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400 group-hover/card:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                    Open Marksheet →
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Summative Slide-over Sheet Drawer */}
        <MarksheetEntrySlideOver
          isOpen={isSlideOverOpen}
          onClose={handleCloseSlideOver}
          examId={activeExamIdParam}
          classId={activeClassIdParam}
          subjectId={activeSubjectIdParam}
          schoolSettings={schoolSettings}
          onSaved={() => fetchData(false)}
          onSubmitted={() => fetchData(false)}
        />

        {/* CAT Marksheet Slide-over */}
        <CatMarksheetSlideOver
          isOpen={selectedCatId !== null}
          onClose={() => setSelectedCatId(null)}
          catId={selectedCatId}
          onSaved={() => fetchCatAllocations(false)}
          onDeleted={() => fetchCatAllocations(false)}
        />

        {/* Create CAT Modal */}
        <CreateCatModal
          isOpen={isCreateCatModalOpen}
          onClose={() => {
            setIsCreateCatModalOpen(false);
            setSelectedAllocForCreate(null);
          }}
          preselectedAllocation={selectedAllocForCreate}
          allocations={catData?.allocations || []}
          onCreated={(newCat) => {
            fetchCatAllocations(false);
            if (newCat && newCat.id) {
              setSelectedCatId(newCat.id);
            }
          }}
        />
      </div>
    </PageLoadingWrapper>
  );
};

export default MarksheetEntryView;
