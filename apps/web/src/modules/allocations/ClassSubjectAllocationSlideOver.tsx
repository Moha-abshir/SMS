import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowLeft, BookOpen, User, CheckCircle2, AlertCircle,
  Sparkles, Trash2, Check, Search, ShieldAlert, Award
} from 'lucide-react';
import { toast } from 'react-toastify';

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  levelCategory: string;
}

interface TeacherItem {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
}

interface QualificationItem {
  userId: string;
  subjectId: string;
}

interface AllocationRecord {
  allocation: {
    id: string;
    academicYear: number;
    classId: string;
    subjectId: string;
    teacherId: string;
  };
  teacher: TeacherItem;
  subject: SubjectItem;
  class: {
    id: string;
    name: string;
    levelCategory: string;
  };
}

interface ClassSubjectAllocationSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string | null;
  classes: any[];
  subjects: SubjectItem[];
  teachers: TeacherItem[];
  qualifications: QualificationItem[];
  subjectAllocations: AllocationRecord[];
  onAssignSubjectTeacher: (classId: string, subjectId: string, teacherId: string) => Promise<void>;
  onRemoveSubjectAllocation: (allocationId: string) => Promise<void>;
}

export const ClassSubjectAllocationSlideOver: React.FC<ClassSubjectAllocationSlideOverProps> = ({
  isOpen,
  onClose,
  classId,
  classes,
  subjects,
  teachers,
  qualifications,
  subjectAllocations,
  onAssignSubjectTeacher,
  onRemoveSubjectAllocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ALLOCATED' | 'UNALLOCATED'>('ALL');
  const [savingSubjectId, setSavingSubjectId] = useState<string | null>(null);

  // Selected teacher per subject dropdown
  const [pendingTeacherMap, setPendingTeacherMap] = useState<Record<string, string>>({});

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

  // Resolve current class details
  const targetClassRow = useMemo(() => {
    return classes.find((c) => c.class.id === classId) || null;
  }, [classes, classId]);

  const targetClass = targetClassRow?.class || null;
  const classTeacher = targetClassRow?.classTeacher || null;

  // Filter subjects taught in this class's level tier
  const classSubjects = useMemo(() => {
    if (!targetClass) return [];
    return subjects.filter((s) => s.levelCategory === targetClass.levelCategory);
  }, [subjects, targetClass]);

  // Allocations for this class
  const classAllocations = useMemo(() => {
    if (!classId) return [];
    return subjectAllocations.filter((sa) => sa.class.id === classId);
  }, [subjectAllocations, classId]);

  // Map allocations by subjectId
  const allocationBySubjectId = useMemo(() => {
    const map = new Map<string, AllocationRecord>();
    classAllocations.forEach((alloc) => {
      map.set(alloc.subject.id, alloc);
    });
    return map;
  }, [classAllocations]);

  // Progress metrics
  const totalCount = classSubjects.length;
  const allocatedCount = classAllocations.length;
  const progressPercent = totalCount > 0 ? Math.round((allocatedCount / totalCount) * 100) : 0;

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

  const handleSaveAllocation = async (subjectId: string, teacherId: string) => {
    if (!classId || !teacherId) return;
    try {
      setSavingSubjectId(subjectId);
      await onAssignSubjectTeacher(classId, subjectId, teacherId);
      // Clear pending map selection for this subject
      setPendingTeacherMap((prev) => {
        const next = { ...prev };
        delete next[subjectId];
        return next;
      });
    } finally {
      setSavingSubjectId(null);
    }
  };

  const handleRemove = async (allocationId: string) => {
    try {
      await onRemoveSubjectAllocation(allocationId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove allocation');
    }
  };

  if (!isOpen || !targetClass) return null;

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
          {/* Responsive Slide-Over Sheet (Full screen on mobile, wide panel on monitor) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="w-screen h-full sm:max-w-2xl lg:max-w-3xl bg-white dark:bg-[#0c1830] border-l border-sky-100 dark:border-[#1a335a] shadow-2xl flex flex-col z-50"
          >
            {/* Top Navigation & Sticky Header */}
            <div className="p-4 sm:p-5 border-b border-sky-100 dark:border-[#1a335a] bg-white/95 dark:bg-[#0c1830]/95 backdrop-blur-md shrink-0 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="sm:hidden p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Back to Allocations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                    {targetClass.name[0] || 'G'}
                  </div>

                  <div className="truncate min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                        {targetClass.name} Subject Allocations
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
                        {targetClass.levelCategory.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5 truncate">
                      <span>Class Teacher:</span>
                      {classTeacher ? (
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {classTeacher.firstName} {classTeacher.lastName}
                        </span>
                      ) : (
                        <span className="italic text-amber-600 dark:text-amber-400">
                          Unassigned (Set in Section 1)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Close Slide-Over (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Allocation Progress Bar */}
              <div className="p-3 bg-sky-50/60 dark:bg-[#091326] rounded-xl border border-sky-100 dark:border-[#162b4d] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">
                    Subject Allocation Completion:
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                    allocatedCount === totalCount
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                  }`}>
                    {allocatedCount} of {totalCount} Subjects ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      allocatedCount === totalCount ? 'bg-emerald-500' : 'bg-sky-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Search & Filter Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search subject name or code..."
                    className="w-full bg-slate-50 dark:bg-[#091326] border border-sky-100 dark:border-[#162b4d] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-[#0c1830] focus:ring-2 focus:ring-sky-400 outline-none transition-all"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFilterMode('ALL')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'ALL'
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('ALLOCATED')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'ALLOCATED'
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    Allocated ({allocatedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('UNALLOCATED')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'UNALLOCATED'
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    Unallocated ({totalCount - allocatedCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Slide-Over Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {filteredSubjects.length === 0 ? (
                <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
                  No subjects found matching your filter.
                </div>
              ) : (
                filteredSubjects.map((subj, idx) => {
                  const currentAlloc = allocationBySubjectId.get(subj.id);
                  const isAllocated = Boolean(currentAlloc);

                  // Teachers qualified for this subject
                  const qualifiedTeacherIds = qualifications
                    .filter((q) => q.subjectId === subj.id)
                    .map((q) => q.userId);
                  const bestSuitedTeachers = teachers.filter((t) =>
                    qualifiedTeacherIds.includes(t.id)
                  );

                  const selectedTeacherId =
                    pendingTeacherMap[subj.id] ?? (currentAlloc?.teacher.id || '');
                  const isSaving = savingSubjectId === subj.id;

                  return (
                    <div
                      key={subj.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isAllocated
                          ? 'bg-white dark:bg-[#091326] border-sky-100 dark:border-[#162b4d] shadow-xs'
                          : 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-[#162b4d]">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 flex items-center justify-center text-[10px] font-black">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              {subj.name}
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-[#162b4d]">
                                {subj.code}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {currentAlloc ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              Allocated to {currentAlloc.teacher.firstName} {currentAlloc.teacher.lastName}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              Not Yet Allocated
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Best Suited / Qualified Specialist Recommendation */}
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1830] border border-slate-200/70 dark:border-[#162b4d] space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          Best Suited Specialist Recommendations:
                        </div>

                        {bestSuitedTeachers.length === 0 ? (
                          <div className="text-xs text-slate-400 dark:text-slate-500 italic pl-1">
                            No teacher has registered this subject in staff qualifications yet. Any teacher may be allocated below.
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {bestSuitedTeachers.map((t) => {
                              const isCurrentlyAllocated = currentAlloc?.teacher.id === t.id;
                              return (
                                <div
                                  key={t.id}
                                  className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                    isCurrentlyAllocated
                                      ? 'bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                                      : 'bg-white dark:bg-[#091326] text-slate-800 dark:text-slate-200 border-sky-200 dark:border-[#162b4d]'
                                  }`}
                                >
                                  <span className="flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-sky-500" />
                                    {t.firstName} {t.lastName}
                                    {isCurrentlyAllocated && (
                                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold ml-1">
                                        (Active)
                                      </span>
                                    )}
                                  </span>

                                  {!isCurrentlyAllocated && (
                                    <button
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() => handleSaveAllocation(subj.id, t.id)}
                                      className="ml-1 px-2 py-0.5 rounded bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-bold shadow-xs cursor-pointer"
                                    >
                                      Quick Assign
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Dropdown Selector & Action Controls */}
                      <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                        <div className="flex-1 flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
                            Select Teacher:
                          </label>
                          <select
                            value={selectedTeacherId}
                            onChange={(e) =>
                              setPendingTeacherMap({
                                ...pendingTeacherMap,
                                [subj.id]: e.target.value,
                              })
                            }
                            className="flex-1 bg-white dark:bg-[#0c1830] border border-sky-200 dark:border-[#162b4d] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                          >
                            <option value="">-- Choose Teacher --</option>
                            {/* Best suited grouped at top */}
                            {bestSuitedTeachers.length > 0 && (
                              <optgroup label="★ Best Suited / Qualified Specialists">
                                {bestSuitedTeachers.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    ★ {t.firstName} {t.lastName} (Specialist)
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="All Staff Teachers">
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.firstName} {t.lastName}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          {selectedTeacherId && selectedTeacherId !== currentAlloc?.teacher.id && (
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveAllocation(subj.id, selectedTeacherId)}
                              className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-glass flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              {isSaving ? (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              Save Allocation
                            </button>
                          )}

                          {currentAlloc && (
                            <button
                              type="button"
                              onClick={() => handleRemove(currentAlloc.allocation.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                              title="Remove teacher from subject"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-4 border-t border-sky-100 dark:border-[#1a335a] bg-slate-50/80 dark:bg-[#0c1830] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">
                Allocating for academic year: <strong>2026</strong>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
