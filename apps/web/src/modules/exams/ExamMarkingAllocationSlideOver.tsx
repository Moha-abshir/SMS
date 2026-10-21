import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  Search,
  Sparkles,
  BookOpen,
  User,
  AlertCircle,
  GraduationCap,
  Star,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { SearchableSelect, SearchableSelectOption } from '../../components/SearchableSelect';

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  levelCategory: string;
}

interface TeacherMeta {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  priority: number;
  qualificationReason: string;
  isBestMatch: boolean;
  isQualified: boolean;
}

interface MarkingAllocationItem {
  allocation: {
    id: string;
    examId: string;
    subjectId: string;
    classId: string;
    teacherId: string;
  };
  exam: {
    id: string;
    name: string;
    academicYear: number;
  };
  subject: SubjectItem;
  class: {
    id: string;
    name: string;
    levelCategory: string;
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ExamMarkingAllocationSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string | null;
  classes: any[];
  subjects: SubjectItem[];
  markingAllocations: MarkingAllocationItem[];
  activeExam: any | null;
  onAssignExaminer: (classId: string, subjectId: string, teacherId: string) => Promise<void>;
  onRemoveExaminer: (allocationId: string) => Promise<void>;
}

export const ExamMarkingAllocationSlideOver: React.FC<ExamMarkingAllocationSlideOverProps> = ({
  isOpen,
  onClose,
  classId,
  classes,
  subjects,
  markingAllocations,
  activeExam,
  onAssignExaminer,
  onRemoveExaminer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ALLOCATED' | 'UNALLOCATED'>('ALL');
  const [savingSubjectIds, setSavingSubjectIds] = useState<Record<string, boolean>>({});
  const [removingAllocationIds, setRemovingAllocationIds] = useState<Record<string, boolean>>({});

  // Cache eligible teachers by subject ID
  const [eligibleTeachersCache, setEligibleTeachersCache] = useState<Record<string, TeacherMeta[]>>({});
  const [loadingSubjects, setLoadingSubjects] = useState<Record<string, boolean>>({});

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Target class metadata
  const targetClassRow = useMemo(() => {
    return classes.find((c) => (c.class?.id || c.id) === classId) || null;
  }, [classes, classId]);

  const targetClass = targetClassRow?.class || targetClassRow || null;

  // Subjects taught in this class's level tier
  const classSubjects = useMemo(() => {
    if (!targetClass) return [];
    return subjects.filter((s) => s.levelCategory === targetClass.levelCategory);
  }, [subjects, targetClass]);

  // Allocations for this class and active exam
  const classAllocations = useMemo(() => {
    if (!classId || !activeExam) return [];
    const targetExamId = activeExam.exam?.id || activeExam.id;
    return markingAllocations.filter(
      (m) =>
        (m.class?.id || (m as any).classId) === classId &&
        (m.exam?.id || (m as any).examId) === targetExamId
    );
  }, [markingAllocations, classId, activeExam]);

  // Map allocations by subject ID
  const allocationBySubjectId = useMemo(() => {
    const map = new Map<string, MarkingAllocationItem>();
    classAllocations.forEach((alloc) => {
      map.set(alloc.subject?.id || (alloc as any).subjectId, alloc);
    });
    return map;
  }, [classAllocations]);

  // Progress counts
  const totalCount = classSubjects.length;
  const allocatedCount = classAllocations.length;
  const progressPercent = totalCount > 0 ? Math.round((allocatedCount / totalCount) * 100) : 0;

  // Fetch eligible teachers for subjects when slide-over opens
  useEffect(() => {
    if (!isOpen || !classId || classSubjects.length === 0) return;

    classSubjects.forEach(async (subj) => {
      if (eligibleTeachersCache[subj.id]) return;

      try {
        setLoadingSubjects((prev) => ({ ...prev, [subj.id]: true }));
        const res = await apiClient.get(
          `/api/academic-allocations/marking/eligible-teachers?subjectId=${subj.id}&classId=${classId}`
        );
        const list: TeacherMeta[] = res.data.data || [];
        setEligibleTeachersCache((prev) => ({ ...prev, [subj.id]: list }));
      } catch (err) {
        console.error(`Failed to load eligible teachers for subject ${subj.name}`, err);
      } finally {
        setLoadingSubjects((prev) => ({ ...prev, [subj.id]: false }));
      }
    });
  }, [isOpen, classId, classSubjects]);

  // Filtered subjects list
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return classSubjects.filter((subj) => {
      const isAllocated = allocationBySubjectId.has(subj.id);

      if (filterMode === 'ALLOCATED' && !isAllocated) return false;
      if (filterMode === 'UNALLOCATED' && isAllocated) return false;

      if (!q) return true;
      return (
        subj.name.toLowerCase().includes(q) ||
        subj.code.toLowerCase().includes(q)
      );
    });
  }, [classSubjects, allocationBySubjectId, searchQuery, filterMode]);

  const handleSave = async (subjectId: string, teacherId: string) => {
    if (!classId || !teacherId) return;
    try {
      setSavingSubjectIds((prev) => ({ ...prev, [subjectId]: true }));
      await onAssignExaminer(classId, subjectId, teacherId);
    } finally {
      setSavingSubjectIds((prev) => ({ ...prev, [subjectId]: false }));
    }
  };

  const handleRemove = async (allocationId: string) => {
    if (removingAllocationIds[allocationId]) return;
    try {
      setRemovingAllocationIds((prev) => ({ ...prev, [allocationId]: true }));
      await onRemoveExaminer(allocationId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove allocation');
    } finally {
      setRemovingAllocationIds((prev) => ({ ...prev, [allocationId]: false }));
    }
  };

  if (!isOpen || !targetClass) return null;

  const examName = activeExam?.exam?.name || activeExam?.name || 'Active Examination';
  const examYear = activeExam?.exam?.academicYear || activeExam?.academicYear || 2026;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="w-screen h-full sm:max-w-2xl lg:max-w-3xl bg-white dark:bg-[#091326] border-l border-slate-200 dark:border-[#162b4d] shadow-2xl flex flex-col z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200/80 dark:border-[#162b4d] bg-white/95 dark:bg-[#091326]/95 backdrop-blur-md shrink-0 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="sm:hidden p-1.5 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                    {targetClass.name[0] || 'G'}
                  </div>

                  <div className="truncate min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                        {targetClass.name} Marking Allocations
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0">
                        {targetClass.levelCategory.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 truncate mt-0.5">
                      <span className="font-semibold text-sky-700 dark:text-sky-300">
                        {examName} ({examYear})
                      </span>
                      <span>•</span>
                      <span>{classSubjects.length} Examination Papers</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Close Slide-Over (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-slate-500 dark:text-slate-400">
                    Subject Examiner Coverage:
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      allocatedCount === totalCount
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-sky-600 dark:text-sky-400'
                    }`}
                  >
                    {allocatedCount} of {totalCount} Subjects ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      allocatedCount === totalCount ? 'bg-emerald-500' : 'bg-sky-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Search & Filter Row */}
              <div className="flex items-center gap-2 pt-0.5">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search subject or code..."
                    className="w-full h-8 bg-slate-50 dark:bg-[#081224] border border-slate-200 dark:border-[#162b4d] rounded-lg pl-8 pr-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-[#0c1830] focus:ring-1 focus:ring-sky-400 outline-none transition-all"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFilterMode('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      filterMode === 'ALL'
                        ? 'bg-sky-500 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('ALLOCATED')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      filterMode === 'ALLOCATED'
                        ? 'bg-sky-500 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Allocated ({allocatedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('UNALLOCATED')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      filterMode === 'UNALLOCATED'
                        ? 'bg-sky-500 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Pending ({totalCount - allocatedCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Subjects Roster */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5">
              {filteredSubjects.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                  No subjects found matching your search.
                </div>
              ) : (
                filteredSubjects.map((subj, idx) => {
                  const currentAlloc = allocationBySubjectId.get(subj.id);
                  const isAllocated = Boolean(currentAlloc);
                  const eligibleList = eligibleTeachersCache[subj.id] || [];
                  const isLoadingTeachers = Boolean(loadingSubjects[subj.id]);
                  const isSaving = Boolean(savingSubjectIds[subj.id]);
                  const isRemoving = Boolean(
                    currentAlloc && removingAllocationIds[currentAlloc.allocation.id]
                  );

                  // Separate into Best Matches / Qualified vs General
                  const recommendedTeachers = eligibleList.filter((t) => t.isQualified);
                  const otherTeachers = eligibleList.filter((t) => !t.isQualified);

                  // Format options for SearchableSelect
                  const examinerOptions: SearchableSelectOption[] = [
                    ...(currentAlloc ? [{ value: '', label: '-- Unassign / Remove Examiner --' }] : []),
                    ...recommendedTeachers.map((t) => ({
                      value: t.id,
                      label: `${t.firstName} ${t.lastName}`,
                      sublabel: t.qualificationReason,
                      badge: t.isBestMatch ? '⭐ Best Match' : '⭐ Specialist',
                    })),
                    ...otherTeachers.map((t) => ({
                      value: t.id,
                      label: `${t.firstName} ${t.lastName}`,
                      sublabel: t.email || 'Faculty Teacher',
                    })),
                  ];

                  return (
                    <div
                      key={subj.id}
                      className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                        isAllocated
                          ? 'bg-white dark:bg-[#0c1830] border-slate-200/80 dark:border-[#162b4d] shadow-2xs'
                          : 'bg-white dark:bg-[#0b162c] border-slate-200/70 dark:border-[#152744] hover:border-slate-300 dark:hover:border-[#1e3a63]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Subject info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">
                              {subj.name}
                            </span>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0">
                              {subj.code}
                            </span>

                            {/* Status badge */}
                            {currentAlloc ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span className="truncate max-w-[140px] sm:max-w-none">
                                  Examiner: {currentAlloc.teacher.firstName} {currentAlloc.teacher.lastName}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Examiner Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dropdown & Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 sm:w-80">
                          <div className="relative flex-1 min-w-0">
                            <SearchableSelect
                              value={currentAlloc?.teacher.id || ''}
                              onChange={(newTeacherId) => {
                                if (newTeacherId) {
                                  if (newTeacherId !== currentAlloc?.teacher.id) {
                                    handleSave(subj.id, newTeacherId);
                                  }
                                } else if (currentAlloc) {
                                  handleRemove(currentAlloc.allocation.id);
                                }
                              }}
                              disabled={isSaving || isRemoving || isLoadingTeachers}
                              placeholder={isLoadingTeachers ? 'Loading teachers...' : '-- Assign Examiner --'}
                              searchPlaceholder="Search teacher..."
                              options={examinerOptions}
                            />
                          </div>

                          {/* Loading indicator */}
                          {isSaving && (
                            <div
                              className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0"
                              title="Saving allocation..."
                            />
                          )}

                          {/* Unassign button */}
                          {currentAlloc && !isSaving && (
                            <button
                              type="button"
                              onClick={() => handleRemove(currentAlloc.allocation.id)}
                              disabled={isRemoving}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Remove Examiner"
                            >
                              {isRemoving ? (
                                <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
