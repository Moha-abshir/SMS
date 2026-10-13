import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowLeft, CheckCircle2,
  Sparkles, Trash2, Check, Search, Calendar
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
  const [savingSubjectIds, setSavingSubjectIds] = useState<Record<string, boolean>>({});
  const [removingAllocationIds, setRemovingAllocationIds] = useState<Record<string, boolean>>({});

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
      setSavingSubjectIds((prev) => ({ ...prev, [subjectId]: true }));
      await onAssignSubjectTeacher(classId, subjectId, teacherId);
      // Clear pending map selection for this subject
      setPendingTeacherMap((prev) => {
        const next = { ...prev };
        delete next[subjectId];
        return next;
      });
    } finally {
      setSavingSubjectIds((prev) => {
        const next = { ...prev };
        delete next[subjectId];
        return next;
      });
    }
  };

  const handleRemove = async (allocationId: string) => {
    if (removingAllocationIds[allocationId]) return;
    try {
      setRemovingAllocationIds((prev) => ({ ...prev, [allocationId]: true }));
      await onRemoveSubjectAllocation(allocationId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove allocation');
    } finally {
      setRemovingAllocationIds((prev) => {
        const next = { ...prev };
        delete next[allocationId];
        return next;
      });
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
            className="w-screen h-full sm:max-w-2xl lg:max-w-3xl bg-white dark:bg-[#091326] border-l border-slate-200 dark:border-[#162b4d] shadow-2xl flex flex-col z-50"
          >
            {/* Top Navigation & Compact Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-[#162b4d] bg-white/95 dark:bg-[#091326]/95 backdrop-blur-md shrink-0 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="sm:hidden p-1.5 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Back to Allocations"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    {targetClass.name[0] || 'G'}
                  </div>

                  <div className="truncate min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                        {targetClass.name} Subject Allocations
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0">
                        {targetClass.levelCategory.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      <span>Class Teacher:</span>
                      {classTeacher ? (
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {classTeacher.firstName} {classTeacher.lastName}
                        </span>
                      ) : (
                        <span className="italic text-amber-500 dark:text-amber-400 font-medium">
                          Unassigned
                        </span>
                      )}
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

              {/* Compact Progress Row */}
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-slate-500 dark:text-slate-400">
                    Subject Allocation Progress:
                  </span>
                  <span className={`text-[11px] font-bold ${
                    allocatedCount === totalCount
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-sky-600 dark:text-sky-400'
                  }`}>
                    {allocatedCount} of {totalCount} Subjects ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      allocatedCount === totalCount ? 'bg-emerald-500' : 'bg-sky-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Compact Search & Filter Row */}
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
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Pending ({totalCount - allocatedCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Slide-Over Body (Compact & High-Density) */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2">
              {filteredSubjects.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
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
                  const isSaving = Boolean(savingSubjectIds[subj.id]);
                  const isRemoving = Boolean(currentAlloc && removingAllocationIds[currentAlloc.allocation.id]);

                  return (
                    <div
                      key={subj.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isAllocated
                          ? 'bg-white dark:bg-[#0c1830] border-slate-200/80 dark:border-[#162b4d] shadow-2xs'
                          : 'bg-white dark:bg-[#0b162c] border-slate-200/70 dark:border-[#152744] hover:border-slate-300 dark:hover:border-[#1e3a63]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        {/* Left: Subject details & status */}
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
                                <span className="truncate max-w-[130px] sm:max-w-none">
                                  {currentAlloc.teacher.firstName} {currentAlloc.teacher.lastName}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/60 text-[10px] font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Pending
                              </span>
                            )}
                          </div>

                          {/* Specialist Recommendations (Only visible if specialists exist!) */}
                          {bestSuitedTeachers.length > 0 && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1 shrink-0">
                                <Sparkles className="w-3 h-3" />
                                Recommended:
                              </span>
                              {bestSuitedTeachers.map((t) => {
                                const isAssigned = currentAlloc?.teacher.id === t.id;
                                return (
                                  <div
                                    key={t.id}
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                      isAssigned
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                                        : 'bg-sky-500/5 dark:bg-sky-500/10 text-slate-700 dark:text-slate-300 border-sky-500/20 hover:border-sky-400'
                                    }`}
                                  >
                                    <span>{t.firstName} {t.lastName}</span>
                                    {isAssigned ? (
                                      <span className="text-[9px] text-emerald-500 font-extrabold">(Active)</span>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={isSaving}
                                        onClick={() => handleSaveAllocation(subj.id, t.id)}
                                        className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 underline font-extrabold cursor-pointer ml-0.5 inline-flex items-center gap-1 disabled:opacity-50"
                                      >
                                        {isSaving && (
                                          <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                                        )}
                                        <span>Quick Assign</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Right: Compact dropdown & action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 sm:w-64">
                          <select
                            value={selectedTeacherId}
                            onChange={(e) => {
                              const newTeacherId = e.target.value;
                              if (newTeacherId) {
                                if (newTeacherId !== currentAlloc?.teacher.id) {
                                  handleSaveAllocation(subj.id, newTeacherId);
                                }
                              } else if (currentAlloc) {
                                handleRemove(currentAlloc.allocation.id);
                              } else {
                                setPendingTeacherMap((prev) => {
                                  const next = { ...prev };
                                  delete next[subj.id];
                                  return next;
                                });
                              }
                            }}
                            disabled={isSaving || isRemoving}
                            className="flex-1 min-w-0 bg-slate-50 dark:bg-[#081224] border border-slate-200 dark:border-[#162b4d] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="">-- Choose Teacher --</option>
                            {bestSuitedTeachers.length > 0 && (
                              <optgroup label="★ Qualified Specialists">
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

                          {/* Save allocation button (fallback if pending differs) */}
                          {selectedTeacherId && selectedTeacherId !== currentAlloc?.teacher.id && (
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveAllocation(subj.id, selectedTeacherId)}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-2xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
                              title="Save allocation"
                            >
                              {isSaving ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Save</span>
                            </button>
                          )}

                          {/* Remove allocation button */}
                          {currentAlloc && (
                            <button
                              type="button"
                              disabled={isRemoving}
                              onClick={() => handleRemove(currentAlloc.allocation.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Remove teacher from subject"
                            >
                              {isRemoving ? (
                                <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin shrink-0" />
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

            {/* Compact Footer */}
            <div className="p-3 px-4 border-t border-slate-200/80 dark:border-[#162b4d] bg-slate-50/70 dark:bg-[#091326] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 text-[11px] font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Academic Year: <strong className="text-slate-700 dark:text-slate-300">2026</strong>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs"
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
