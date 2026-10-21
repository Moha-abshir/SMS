import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Search,
  Users,
  Layers,
  ArrowRight,
  User,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { isSubjectTeacherClass } from '@school/shared/types';
import { ExamMarkingAllocationSlideOver } from './ExamMarkingAllocationSlideOver';

export const MarkingAllocationView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [markingList, setMarkingList] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);

  // Search filter for grade cards
  const [searchGrade, setSearchGrade] = useState('');

  // Deep-linkable Slide-Over URL search params
  const [searchParams, setSearchParams] = useSearchParams();
  const activeClassId = searchParams.get('classId');

  const fetchData = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const [mrkRes, exRes, sbRes, clsRes, stfRes] = await Promise.all([
        apiClient.get('/api/academic-allocations/marking'),
        apiClient.get('/api/exams'),
        apiClient.get('/api/subjects'),
        apiClient.get('/api/admissions/classes'),
        apiClient.get('/api/staff'),
      ]);

      setMarkingList(mrkRes.data.data || []);
      setExams(exRes.data.data || []);
      setSubjectsList(sbRes.data.data || []);
      setClassesList(clsRes.data.data || []);
      setTeachersList(stfRes.data.data?.staff || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load marking allocations');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  // Determine active exam (find APPROVED/Active exam, or fallback to first)
  const activeExam = useMemo(() => {
    if (exams.length === 0) return null;
    const approved = exams.find((e: any) => e.exam?.status === 'APPROVED' || e.status === 'APPROVED');
    return approved || exams[0];
  }, [exams]);

  const activeExamId = activeExam?.exam?.id || activeExam?.id || '';
  const activeExamName = activeExam?.exam?.name || activeExam?.name || 'Active Examination';
  const activeExamYear = activeExam?.exam?.academicYear || activeExam?.academicYear || 2026;

  // Open slide-over for a grade
  const handleOpenSlideOver = (classId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('classId', classId);
    setSearchParams(newParams);
  };

  // Close slide-over
  const handleCloseSlideOver = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('classId');
    setSearchParams(newParams);
  };

  // Assign examiner handler (with optimistic update)
  const handleAssignExaminer = async (classId: string, subjectId: string, teacherId: string) => {
    if (!activeExamId) {
      toast.error('No active examination found');
      return;
    }

    const prevMarkingList = markingList;
    const targetTeacher = teachersList.find((t) => t.id === teacherId);
    const targetSubject = subjectsList.find((s) => s.id === subjectId);
    const targetClassRow = classesList.find((c) => (c.class?.id || c.id) === classId);
    const targetClass = targetClassRow?.class || targetClassRow;

    if (!targetTeacher || !targetSubject || !targetClass) return;

    // Optimistic entry
    const existingIndex = prevMarkingList.findIndex(
      (m) =>
        (m.class?.id || m.classId) === classId &&
        (m.subject?.id || m.subjectId) === subjectId &&
        (m.exam?.id || m.examId) === activeExamId
    );

    const tempId = existingIndex >= 0 ? prevMarkingList[existingIndex].allocation?.id || prevMarkingList[existingIndex].id : `temp-${Date.now()}`;

    const optimisticRecord = {
      allocation: {
        id: tempId,
        examId: activeExamId,
        subjectId,
        classId,
        teacherId,
      },
      exam: activeExam?.exam || activeExam,
      subject: targetSubject,
      class: targetClass,
      teacher: {
        id: targetTeacher.id,
        firstName: targetTeacher.firstName,
        lastName: targetTeacher.lastName,
        email: targetTeacher.email,
      },
    };

    let nextMarking = [...prevMarkingList];
    if (existingIndex >= 0) {
      nextMarking[existingIndex] = optimisticRecord;
    } else {
      nextMarking.push(optimisticRecord);
    }

    setMarkingList(nextMarking);

    try {
      await apiClient.post('/api/academic-allocations/marking', {
        examId: activeExamId,
        subjectId,
        classId,
        teacherId,
      });

      toast.success(
        `${targetSubject.name}: Assigned to ${targetTeacher.firstName} ${targetTeacher.lastName}`,
        { autoClose: 1500 }
      );

      // Background refresh to sync DB ids
      await fetchData(false);
    } catch (err: any) {
      setMarkingList(prevMarkingList);
      toast.error(err.response?.data?.message || 'Failed to assign examiner');
      throw err;
    }
  };

  // Remove examiner handler (with optimistic update)
  const handleRemoveExaminer = async (allocationId: string) => {
    const prevMarkingList = markingList;
    const targetAlloc = prevMarkingList.find(
      (m) => (m.allocation?.id || m.id) === allocationId
    );

    setMarkingList((prev) =>
      prev.filter((m) => (m.allocation?.id || m.id) !== allocationId)
    );

    try {
      await apiClient.delete(`/api/academic-allocations/marking/${allocationId}`);
      toast.info(
        `${targetAlloc?.subject?.name || 'Subject'}: Examiner allocation removed`,
        { autoClose: 1500 }
      );
      await fetchData(false);
    } catch (err: any) {
      setMarkingList(prevMarkingList);
      toast.error(err.response?.data?.message || 'Failed to remove allocation');
      throw err;
    }
  };

  // Filter upper primary and junior secondary classes (Grades 4-9)
  const upperClasses = useMemo(() => {
    const list = classesList.filter((c) => isSubjectTeacherClass(c.class || c));
    if (!searchGrade.trim()) return list;
    const q = searchGrade.toLowerCase();
    return list.filter((c) => {
      const cls = c.class || c;
      const ct = c.classTeacher;
      return (
        cls.name.toLowerCase().includes(q) ||
        (ct && `${ct.firstName} ${ct.lastName}`.toLowerCase().includes(q))
      );
    });
  }, [classesList, searchGrade]);

  // Overall metrics for Upper Primary & Junior Secondary
  const totalUpperSubjects = useMemo(() => {
    let count = 0;
    classesList
      .filter((c) => isSubjectTeacherClass(c.class || c))
      .forEach((c) => {
        const cls = c.class || c;
        const subs = subjectsList.filter((s) => s.levelCategory === cls.levelCategory);
        count += subs.length;
      });
    return count;
  }, [classesList, subjectsList]);

  const allocatedUpperSubjects = useMemo(() => {
    if (!activeExamId) return 0;
    return markingList.filter((m) => {
      const cls = m.class;
      const exId = m.exam?.id || m.examId;
      return isSubjectTeacherClass(cls) && exId === activeExamId;
    }).length;
  }, [markingList, activeExamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 max-w-6xl mx-auto pb-12"
    >
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-xl border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-widest mb-1">
            <Award className="w-4 h-4 text-sky-500" />
            Director of Studies • Academic Examination Management
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Exam Paper Marking Allocation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-xl leading-relaxed">
            Assign and manage specialist subject examiners for Upper Primary & Junior Secondary grades (Grades 4–9) for the active examination period.
          </p>
        </div>

        {/* Minimalist Summary Status Pill */}
        <div className="flex items-center justify-around sm:justify-start gap-3 sm:gap-5 p-3 sm:px-5 sm:py-3 bg-sky-50/70 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-xl sm:rounded-2xl backdrop-blur-md w-full sm:w-auto shrink-0 shadow-xs">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 leading-none">
                {activeExamName}
              </span>
            </div>
            <span className="text-[10px] font-bold tracking-wider text-sky-700 dark:text-sky-400 uppercase mt-1 block">
              Active Exam ({activeExamYear})
            </span>
          </div>

          <div className="w-[1px] h-8 bg-sky-200 dark:bg-[#162b4d]" />

          <div className="text-center">
            <span className="block text-lg sm:text-xl font-black text-sky-600 dark:text-sky-400 leading-none">
              {allocatedUpperSubjects} / {totalUpperSubjects}
            </span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-1 block">
              Allocated
            </span>
          </div>
        </div>
      </div>

      {/* 2. Upper Primary & Junior Secondary Grade-by-Grade List (Grades 4 – 9) */}
      <div className="p-4 sm:p-6 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 dark:border-[#162b4d] pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Classes & Subject Examiner Allocations (Grades 4 – 9)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click on any grade to slide open examiner assignments and allocate qualified subject specialists.
            </p>
          </div>

          {/* Search grade input */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search grade or teacher..."
              value={searchGrade}
              onChange={(e) => setSearchGrade(e.target.value)}
              className="w-full bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        {/* Grade Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {upperClasses.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-slate-400 text-xs italic">
              No upper primary or junior secondary grades found.
            </div>
          ) : (
            upperClasses.map((cRow) => {
              const cls = cRow.class || cRow;
              const ct = cRow.classTeacher;

              // Subject count for this grade's levelCategory
              const classSubjects = subjectsList.filter((s) => s.levelCategory === cls.levelCategory);
              const totalCount = classSubjects.length;

              // Marking allocations for this class in the active exam
              const classAllocations = markingList.filter((m) => {
                const cId = m.class?.id || m.classId;
                const exId = m.exam?.id || m.examId;
                return cId === cls.id && exId === activeExamId;
              });
              const allocatedCount = classAllocations.length;
              const isComplete = totalCount > 0 && allocatedCount >= totalCount;
              const percent = totalCount > 0 ? Math.round((allocatedCount / totalCount) * 100) : 0;
              const isCurrentActive = activeClassId === cls.id;

              return (
                <div
                  key={cls.id}
                  onClick={() => handleOpenSlideOver(cls.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                    isCurrentActive
                      ? 'bg-sky-500/5 dark:bg-sky-500/10 border-sky-400 dark:border-sky-500 ring-2 ring-sky-400/30'
                      : 'bg-white dark:bg-[#091326] border-sky-100 dark:border-[#162b4d] hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md'
                  } shadow-xs space-y-3`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        {cls.name[0] || 'G'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            {cls.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
                            {cls.levelCategory.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Class Teacher:</span>
                          {ct ? (
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {ct.firstName} {ct.lastName}
                            </span>
                          ) : (
                            <span className="italic text-amber-600 dark:text-amber-400 font-medium">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                        isComplete
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                      }`}
                    >
                      {isComplete ? 'Fully Allocated' : `${allocatedCount}/${totalCount} Subjects`}
                    </span>
                  </div>

                  {/* Coverage Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span>Examiner Coverage</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {allocatedCount}/{totalCount} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isComplete ? 'bg-emerald-500' : 'bg-sky-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Link Footer */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-[#162b4d]">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      {totalCount} Examination Papers
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSlideOver(cls.id);
                      }}
                      className={`px-3 py-1 rounded-xl font-bold text-xs shadow-glass flex items-center gap-1.5 transition-all cursor-pointer group ${
                        isCurrentActive
                          ? 'bg-sky-600 text-white'
                          : 'bg-sky-500 hover:bg-sky-600 text-white'
                      }`}
                    >
                      <span>Allocate Examiners</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Slide-Over Panel for Selected Grade Marking Allocations */}
      <ExamMarkingAllocationSlideOver
        isOpen={Boolean(activeClassId)}
        onClose={handleCloseSlideOver}
        classId={activeClassId}
        classes={classesList}
        subjects={subjectsList}
        markingAllocations={markingList}
        activeExam={activeExam}
        onAssignExaminer={handleAssignExaminer}
        onRemoveExaminer={handleRemoveExaminer}
      />
    </motion.div>
  );
};
