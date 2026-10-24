import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, CheckCircle2, AlertCircle, Save, Send, Printer,
  FileText, Sparkles, ChevronRight, Lock, RotateCcw,
  CheckCheck, ArrowRight, Calendar, Search, Award, Layers
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { MarksheetEntrySlideOver } from './MarksheetEntrySlideOver';
import { MarkSubmissionProgressTracker } from './MarkSubmissionProgressTracker';
import { isJuniorSecondaryClass } from '@school/shared/types';

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

  // Search and URL parameters for slide-over drawer
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  // Selected exam ID
  const [selectedExamId, setSelectedExamId] = useState<string>('');

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
        apiClient.get('/api/teacher/workstation'),
        apiClient.get('/api/exams'),
        apiClient.get('/api/settings/public').catch(() => ({ data: { data: null } })),
      ]);

      const ws = wsRes.data?.data;
      const rawExams = examsRes.data?.data || [];
      const normalizedExams = rawExams.map((e: any) => ({
        id: e.exam?.id || e.id,
        title: e.exam?.title || e.title || e.name || 'Examination',
        academicYear: e.exam?.academicYear || e.academicYear || 2026,
        term: e.exam?.term || e.term || 1,
        status: e.exam?.status || e.status || 'ACTIVE',
      }));

      setWorkstation(ws);
      setExams(normalizedExams);
      setSchoolSettings(settingsRes.data?.data || null);

      // Select default exam
      if (normalizedExams.length > 0 && !selectedExamId) {
        const approved = normalizedExams.find((ex: any) => ex.status === 'APPROVED' || ex.status === 'ACTIVE');
        setSelectedExamId(approved ? approved.id : normalizedExams[0].id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load marksheet data');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  // Filter subject papers for Grades 4 through 9 (Subject Specialists)
  const isSubjectTeacherPaper = (task: any) => {
    if (!task) return false;
    if (
      task.levelCategory === 'UPPER_PRIMARY' ||
      task.levelCategory === 'JUNIOR' ||
      task.levelCategory === 'JUNIOR_SECONDARY'
    ) {
      return true;
    }
    if (typeof task.numericOrder === 'number' && task.numericOrder >= 7) {
      return true;
    }
    if (typeof task.className === 'string') {
      const match = task.className.match(/Grade\s*([4-9])/i);
      if (match) return true;
    }
    return false;
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

    // Sort from Grade 4 to Grade 9, then alphabetically by subject
    return upperPapers.sort((a, b) => {
      const orderA = typeof a.numericOrder === 'number' ? a.numericOrder : 99;
      const orderB = typeof b.numericOrder === 'number' ? b.numericOrder : 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.subjectName.localeCompare(b.subjectName);
    });
  }, [workstation, selectedExamId]);

  // Search filtered tasks
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

  // Check if current user is an administrative supervisor
  const isPrivileged =
    workstation?.teacher?.role === 'HEAD_TEACHER' ||
    workstation?.teacher?.role === 'DEPUTY_HEAD' ||
    workstation?.teacher?.role === 'DOS';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-white/85 dark:bg-[#091326]/90 backdrop-blur-xl border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-widest mb-1">
              <Award className="w-4 h-4 text-sky-500" />
              Academic Marksheet Entry • Grades 4 – 9
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Subject Marksheet Entry
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
              Record CBC marks for your assigned learning areas. Click on any paper to enter scores, assign rubrics, and submit to the Class Teacher for verification.
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
                Year {activeExam?.academicYear || 2026} • Term {activeExam?.term || 1}
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

      {/* Main Content Area */}
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

        {/* Papers List (Ordered Top to Bottom from Grade 4 to Grade 9) */}
        {loading ? (
          <div className="py-20 text-center bg-white dark:bg-[#091326] rounded-2xl border border-sky-100 dark:border-[#162b4d]">
            <div className="w-9 h-9 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading assigned marksheet papers...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#091326] rounded-2xl border border-sky-100 dark:border-[#162b4d] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                No Examination Papers Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                You do not have any teaching allocations or paper marking assignments for Grades 4 through 9 in this examination. If you believe this is an error, please consult the Deputy Head or Director of Studies (DoS).
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const isJunior =
                task.levelCategory === 'JUNIOR' ||
                task.levelCategory === 'JUNIOR_SECONDARY' ||
                (task.numericOrder !== undefined && task.numericOrder >= 10) ||
                isJuniorSecondaryClass({ name: task.className });

              const percent =
                task.totalStudents > 0
                  ? Math.round((task.scoredStudents / task.totalStudents) * 100)
                  : 0;

              return (
                <div
                  key={`${task.examId}-${task.classId}-${task.subjectId}`}
                  onClick={() => handleOpenSlideOver(task)}
                  className="p-4 sm:p-5 bg-white/90 dark:bg-[#091326]/90 backdrop-blur-md rounded-2xl border border-sky-100 dark:border-[#162b4d] hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Class & Subject Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-white font-black text-sm sm:text-base flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      {task.className.replace(/^Grade\s*/i, 'G')}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                          {task.subjectName}
                        </h3>
                        {task.subjectCode && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                            {task.subjectCode}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        <span className="font-bold text-sky-700 dark:text-sky-300">
                          {task.className}
                        </span>
                        <span>•</span>
                        <span className="text-[11px]">
                          {isJunior
                            ? 'CBC 8-Point Scale (1–8 pts)'
                            : 'CBC 4-Level Rubrics (EE, ME, AE, BE)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle / Right: Progress, Status & CTA */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-[#112038]">
                    {/* Completion Progress Bar */}
                    <div className="min-w-[130px] sm:min-w-[160px] space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span>Scored</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {task.scoredStudents} / {task.totalStudents} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
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
                      {task.status === 'APPROVED' || task.status === 'LOCKED' ? (
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

                    {/* CTA Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSlideOver(task);
                      }}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 ${
                        task.status === 'CORRECTION_REQUESTED'
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : task.status === 'SUBMITTED' || task.status === 'APPROVED'
                          ? 'bg-white dark:bg-[#0c1830] border border-sky-200 dark:border-[#162b4d] text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-[#122444]'
                          : 'bg-sky-500 hover:bg-sky-600 text-white'
                      }`}
                    >
                      {task.status === 'CORRECTION_REQUESTED'
                        ? 'Fix Marks'
                        : task.status === 'SUBMITTED' || task.status === 'APPROVED'
                        ? 'View Marksheet'
                        : 'Enter Marks'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-over Sheet Drawer */}
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
    </div>
  );
};

export default MarksheetEntryView;
