import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, BookOpen, Users, Printer, Settings,
  Sparkles, AlertCircle, ArrowRightLeft, UserCheck, CheckCircle2,
  ChevronDown, X, Info, Download, ShieldCheck, AlertTriangle, ArrowRight,
  Search, Check, GraduationCap, User
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { TimetableWizardModal } from './TimetableWizardModal';
import { TimetablePrintModal } from './TimetablePrintModal';
import { ConflictModal } from './ConflictModal';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';

interface TimetableManagementViewProps {
  user: any;
}

const SUBJECT_COLORS: Record<string, string> = {
  MATH: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  ENG: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
  KISW: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  SCI: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  SS: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
  IRE: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
  CRE: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
  AGR: 'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-950/60 dark:text-lime-300 dark:border-lime-800',
  ART: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800',
  PRE: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
};

const getSubjectBadgeColor = (codeOrName: string) => {
  const upper = (codeOrName || '').toUpperCase();
  for (const [key, val] of Object.entries(SUBJECT_COLORS)) {
    if (upper.includes(key)) return val;
  }
  return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
};

const DAYS_OF_WEEK = [
  { id: 'MONDAY', label: 'Monday', short: 'Mon' },
  { id: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { id: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { id: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { id: 'FRIDAY', label: 'Friday', short: 'Fri' },
];

/* Custom Designed Dropdown for Selecting Teachers */
const TeacherSelectDropdown: React.FC<{
  teachers: any[];
  selectedId: string;
  onSelect: (id: string) => void;
}> = ({ teachers, selectedId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedId) || teachers[0],
    [teachers, selectedId]
  );

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter(
      (t) =>
        `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
        (t.roleName && t.roleName.toLowerCase().includes(q))
    );
  }, [teachers, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const formatRole = (role?: string) => {
    if (!role) return 'Teacher';
    if (role === 'HEAD_TEACHER') return 'Head Teacher';
    if (role === 'DEPUTY_HEAD' || role === 'DEPUTY_HEAD_TEACHER') return 'Deputy Head';
    if (role === 'DOS') return 'DOS';
    return role.replace(/_/g, ' ');
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'T';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className={`flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
          isOpen
            ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/60 dark:bg-[#0c1830]'
            : 'border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#091326] hover:border-sky-300 dark:hover:border-sky-500/50'
        } text-slate-800 dark:text-slate-100 min-w-[210px] max-w-[280px]`}
      >
        <div className="flex items-center gap-2 truncate">
          <div className="w-5 h-5 rounded-md bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 flex items-center justify-center text-[10px] font-black shrink-0 border border-sky-200/60 dark:border-sky-800/60">
            {getInitials(selectedTeacher?.firstName, selectedTeacher?.lastName)}
          </div>
          <span className="truncate">
            {selectedTeacher ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}` : 'Select Teacher'}
          </span>
          {selectedTeacher?.roleName && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#0c1830] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#162b4d] shrink-0">
              {formatRole(selectedTeacher.roleName)}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sky-500' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 w-72 bg-white/95 dark:bg-[#091326]/95 backdrop-blur-xl border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            {teachers.length > 5 && (
              <div className="p-2 border-b border-slate-100 dark:border-[#162b4d]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search teacher..."
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0c1830] border border-slate-200 dark:border-[#162b4d] rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
              {filteredTeachers.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400">
                  No matching teachers found
                </div>
              ) : (
                filteredTeachers.map((t) => {
                  const isSelected = t.id === selectedId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onSelect(t.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-[#0c1830] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                            isSelected
                              ? 'bg-sky-500 text-white border-sky-600'
                              : 'bg-slate-100 dark:bg-[#0c1830] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#162b4d]'
                          }`}
                        >
                          {getInitials(t.firstName, t.lastName)}
                        </div>
                        <div className="truncate">
                          <span className="block truncate">
                            {t.firstName} {t.lastName}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 block truncate">
                            {formatRole(t.roleName)}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-sky-500 shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* Custom Designed Dropdown for Selecting Grades */
const GradeSelectDropdown: React.FC<{
  classes: any[];
  selectedId: string;
  onSelect: (id: string) => void;
}> = ({ classes, selectedId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedId) || classes[0],
    [classes, selectedId]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const formatCategory = (cat?: string) => {
    if (cat === 'JUNIOR') return 'Junior Secondary';
    return 'Upper Primary';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
          isOpen
            ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/60 dark:bg-[#0c1830]'
            : 'border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#091326] hover:border-sky-300 dark:hover:border-sky-500/50'
        } text-slate-800 dark:text-slate-100 min-w-[190px] max-w-[260px]`}
      >
        <div className="flex items-center gap-2 truncate">
          <GraduationCap className="w-4 h-4 text-sky-500 shrink-0" />
          <span className="truncate">{selectedClass ? selectedClass.name : 'Select Grade'}</span>
          {selectedClass && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#0c1830] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#162b4d] shrink-0">
              {formatCategory(selectedClass.levelCategory)}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sky-500' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 w-64 bg-white/95 dark:bg-[#091326]/95 backdrop-blur-xl border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-xl z-50 overflow-hidden p-1.5 space-y-0.5"
          >
            {classes.map((cls) => {
              const isSelected = cls.id === selectedId;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => {
                    onSelect(cls.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-[#0c1830] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <GraduationCap
                      className={`w-4 h-4 shrink-0 ${isSelected ? 'text-sky-500' : 'text-slate-400'}`}
                    />
                    <div className="truncate">
                      <span className="block truncate font-bold">{cls.name}</span>
                      <span className="text-[10px] font-medium text-slate-400 block truncate">
                        {formatCategory(cls.levelCategory)}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-sky-500 shrink-0 ml-1" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const TimetableManagementView: React.FC<TimetableManagementViewProps> = ({ user }) => {
  const navigate = useNavigate();
  const userRole = user?.roleName || user?.role || 'TEACHER';
  const isDeputy = userRole === 'DEPUTY_HEAD' || userRole === 'DEPUTY_HEAD_TEACHER';
  const isHeadTeacher = userRole === 'HEAD_TEACHER';

  // Navigation mode: 'class' | 'teacher' (Master Timetable removed as requested)
  const [activeTab, setActiveTab] = useState<'class' | 'teacher'>(
    isDeputy ? 'class' : 'teacher'
  );

  // Filters & State
  const [loading, setLoading] = useState<boolean>(true);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [academicYear, setAcademicYear] = useState<number>(2026);
  const [term, setTerm] = useState<number>(1);
  const [schoolName, setSchoolName] = useState<string>('Eldoret Muslim Academy');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Allocations Prerequisite Status
  const [allocationsStatus, setAllocationsStatus] = useState<{
    isReady: boolean;
    totalRequired: number;
    totalAllocated: number;
    missing: Array<{ className: string; subjectName: string; subjectCode: string }>;
  } | null>(null);

  // Metadata
  const [classesList, setClassesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(user?.id || '');

  // Timetable Data
  const [periodsGrid, setPeriodsGrid] = useState<Record<string, any[]>>({});
  const [slotsList, setSlotsList] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);

  // Swapping State
  const [selectedSwapSlotA, setSelectedSwapSlotA] = useState<any | null>(null);
  const [swapping, setSwapping] = useState<boolean>(false);

  // Modals State
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [conflictModalData, setConflictModalData] = useState<{
    isOpen: boolean;
    message: string;
    slotA: any | null;
    slotB: any | null;
  }>({
    isOpen: false,
    message: '',
    slotA: null,
    slotB: null,
  });

  // Initial load: Metadata & Allocation Readiness
  useEffect(() => {
    const init = async () => {
      try {
        setInitialLoading(true);
        const [settingsRes, classesRes, teachersRes, allocRes, statusRes] = await Promise.all([
          apiClient.get('/api/settings/public'),
          apiClient.get('/api/timetable/classes'),
          apiClient.get('/api/timetable/teachers'),
          apiClient.get('/api/allocations'),
          apiClient.get('/api/timetable/status'),
        ]);

        if (settingsRes.data?.data) {
          if (settingsRes.data.data.schoolName) setSchoolName(settingsRes.data.data.schoolName);
          if (settingsRes.data.data.logoUrl) setLogoUrl(settingsRes.data.data.logoUrl);
        }

        if (statusRes.data?.data) {
          setAllocationsStatus(statusRes.data.data);
        }

        const cleanClasses = classesRes.data?.data || [];
        setClassesList(cleanClasses);
        let initialClassId = '';
        if (cleanClasses.length > 0) {
          initialClassId = cleanClasses[0].id;
          setSelectedClassId(initialClassId);
        }

        const yr = allocRes.data?.data?.academicYear || 2026;
        if (allocRes.data?.data?.academicYear) {
          setAcademicYear(yr);
        }

        const cleanTeachers = teachersRes.data?.data || [];
        setTeachersList(cleanTeachers);

        let initialTeacherId = '';
        if (cleanTeachers.length > 0) {
          const currentTeacher = cleanTeachers.find((t: any) => t.id === user?.id);
          initialTeacherId = currentTeacher ? currentTeacher.id : cleanTeachers[0].id;
          setSelectedTeacherId(initialTeacherId);
        }

        // Optimistically pre-fetch timetable schedule before completing initial load
        const targetTab = isDeputy ? 'class' : 'teacher';
        if (targetTab === 'class' && initialClassId) {
          try {
            const ttRes = await apiClient.get(
              `/api/timetable/classes/${initialClassId}?academicYear=${yr}&term=${term}`
            );
            if (ttRes.data?.data) {
              setPeriodsGrid(ttRes.data.data.periodsGrid || {});
              setSlotsList(ttRes.data.data.slots || []);
              setConfig(ttRes.data.data.config);
            }
          } catch (_) {}
        } else if (targetTab === 'teacher') {
          const tId = isDeputy ? initialTeacherId : user?.id;
          if (tId) {
            try {
              const ttRes = await apiClient.get(
                `/api/timetable/teachers/${tId}?academicYear=${yr}&term=${term}`
              );
              if (ttRes.data?.data) {
                setPeriodsGrid(ttRes.data.data.periodsGrid || {});
                setSlotsList(ttRes.data.data.slots || []);
                setConfig(ttRes.data.data.config);
              }
            } catch (_) {}
          }
        }
      } catch (err: any) {
        console.error('Error fetching initial timetable metadata', err);
        toast.error('Failed to initialize timetable view.');
      } finally {
        setInitialLoading(false);
      }
    };

    init();
  }, [user?.id]);

  // Load Timetable Data based on active tab and selected filter
  const fetchTimetableData = async () => {
    try {
      setLoading(true);
      setSelectedSwapSlotA(null);

      if (activeTab === 'class') {
        if (!selectedClassId) {
          setLoading(false);
          return;
        }
        const res = await apiClient.get(
          `/api/timetable/classes/${selectedClassId}?academicYear=${academicYear}&term=${term}`
        );
        if (res.data?.data) {
          const { periodsGrid, slots, config, academicYear: yr, term: t } = res.data.data;
          setPeriodsGrid(periodsGrid || {});
          setSlotsList(slots || []);
          setConfig(config);
          if (yr) setAcademicYear(yr);
          if (t) setTerm(t);
        }
      } else if (activeTab === 'teacher') {
        const teacherIdToUse = isDeputy ? selectedTeacherId : user?.id;
        if (!teacherIdToUse) {
          setLoading(false);
          return;
        }
        const res = await apiClient.get(
          `/api/timetable/teachers/${teacherIdToUse}?academicYear=${academicYear}&term=${term}`
        );
        if (res.data?.data) {
          const { periodsGrid, slots, config, academicYear: yr, term: t } = res.data.data;
          setPeriodsGrid(periodsGrid || {});
          setSlotsList(slots || []);
          setConfig(config);
          if (yr) setAcademicYear(yr);
          if (t) setTerm(t);
        }
      }
    } catch (err: any) {
      console.error('Error fetching timetable data:', err);
      toast.error('Failed to load timetable schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialLoading) {
      fetchTimetableData();
    }
  }, [activeTab, selectedClassId, selectedTeacherId, academicYear, term, initialLoading]);

  // Slot click handler for manual swapping by Deputy
  const handleSlotClick = async (slot: any) => {
    if (!isDeputy) return;

    if (!selectedSwapSlotA) {
      setSelectedSwapSlotA(slot);
      toast.info(`Selected ${slot.subjectName} (P${slot.periodIndex}, ${slot.dayOfWeek}). Click another slot to swap positions.`);
    } else {
      if (selectedSwapSlotA.id === slot.id) {
        setSelectedSwapSlotA(null);
        return;
      }

      if (selectedSwapSlotA.classId !== slot.classId) {
        toast.warning('Slots must belong to the same class to swap teaching periods.');
        return;
      }

      executeSwap(selectedSwapSlotA, slot, false);
    }
  };

  // Execute Swap API call
  const executeSwap = async (slotA: any, slotB: any, force: boolean = false) => {
    try {
      setSwapping(true);
      const res = await apiClient.patch('/api/timetable/swap', {
        slotAId: slotA.id,
        slotBId: slotB.id,
        force,
      });

      toast.success(res.data?.message || 'Slots swapped successfully!');
      setSelectedSwapSlotA(null);
      setConflictModalData({ isOpen: false, message: '', slotA: null, slotB: null });
      fetchTimetableData();
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.hasConflict) {
        setConflictModalData({
          isOpen: true,
          message: err.response.data.message,
          slotA,
          slotB,
        });
      } else {
        toast.error(err.response?.data?.message || 'Failed to swap slots');
      }
    } finally {
      setSwapping(false);
    }
  };

  // Quick lookup map: "DAY_PERIODINDEX" -> Slot
  const singleViewSlotsMap = useMemo(() => {
    const map = new Map<string, any>();
    slotsList.forEach((s) => {
      map.set(`${s.dayOfWeek}_${s.periodIndex}`, s);
    });
    return map;
  }, [slotsList]);

  // Timeline Column Headers (calculated from Monday or day with most periods)
  const timelineColumns = useMemo(() => {
    const mondaySlots = periodsGrid['MONDAY'] || [];
    if (mondaySlots.length > 0) return mondaySlots;

    const allDays = Object.values(periodsGrid);
    if (allDays.length === 0) return [];
    return allDays.reduce((max, cur) => (cur.length > max.length ? cur : max), []);
  }, [periodsGrid]);

  const activeClassName =
    classesList.find((c) => c.id === selectedClassId)?.name || 'Class Timetable';

  const activeTeacherName = isHeadTeacher
    ? `${user?.firstName || 'Head Teacher'} ${user?.lastName || ''}`
    : teachersList.find((t) => t.id === (isDeputy ? selectedTeacherId : user?.id))
    ? `${teachersList.find((t) => t.id === (isDeputy ? selectedTeacherId : user?.id))?.firstName} ${
        teachersList.find((t) => t.id === (isDeputy ? selectedTeacherId : user?.id))?.lastName
      }`
    : 'Teacher Schedule';

  return (
    <PageLoadingWrapper
      isLoading={initialLoading}
      title="School Timetable Management"
      subtitle="Compiling teaching periods, room allocations, and weekly schedules..."
      icon={Calendar}
    >
      {isDeputy && allocationsStatus && !allocationsStatus.isReady ? (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="rounded-3xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-[#0c182d] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-amber-200/80 dark:border-amber-900/40">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                Class & Subject Allocations Required
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Before generating the school timetable, every subject in Grades 4 through 9 must have an assigned teacher.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#091326] border border-amber-100 dark:border-amber-900/30">
              <span className="text-xs font-semibold text-slate-500">Allocation Progress:</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
                  {allocationsStatus.totalAllocated}
                </span>
                <span className="text-xs text-slate-400">/ {allocationsStatus.totalRequired} subjects assigned</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((allocationsStatus.totalAllocated / (allocationsStatus.totalRequired || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#091326] border border-amber-100 dark:border-amber-900/30 flex flex-col justify-center">
              <span className="text-xs font-semibold text-slate-500">Next Step:</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                Complete teacher assignments in the Teacher Allocations module to enable automatic schedule generation.
              </p>
              <button
                type="button"
                onClick={() => navigate('/allocations')}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer w-fit"
              >
                Go to Teacher Allocations
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {allocationsStatus.missing?.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
                Subjects Awaiting Teacher Allocation ({allocationsStatus.missing.length})
              </h4>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#091326] divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {allocationsStatus.missing.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.className}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {item.subjectName} ({item.subjectCode})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    ) : (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {isDeputy ? 'School Timetable (Grades 4–9)' : 'My Timetable'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isDeputy
                  ? `Academic Year ${academicYear} • Term ${term} • Eldoret Muslim Academy`
                  : `Personal Teaching Schedule • ${user?.firstName || 'Teacher'} ${user?.lastName || ''}`}
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isDeputy && (
            <button
              type="button"
              onClick={() => setIsWizardOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Settings className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Edit Schedule Settings
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPrintOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b172e] hover:bg-slate-50 dark:hover:bg-[#112038] text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            A4 Print Preview
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar: Only Class Timetables & Teachers Timetables (Master removed) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        {!isDeputy ? (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 font-bold text-xs">
            <UserCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Personal Teaching Schedule</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#091326] rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('class')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'class'
                  ? 'bg-white dark:bg-sky-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Class Timetables
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('teacher')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'teacher'
                  ? 'bg-white dark:bg-sky-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Teachers Timetables
            </button>
          </div>
        )}

        {/* Dynamic Filters depending on active tab */}
        <div className="flex items-center gap-3">
          {activeTab === 'class' && isDeputy && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Select Grade:</span>
              <GradeSelectDropdown
                classes={classesList}
                selectedId={selectedClassId}
                onSelect={(id) => setSelectedClassId(id)}
              />
            </div>
          )}

          {activeTab === 'teacher' && isDeputy && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Select Teacher:</span>
              <TeacherSelectDropdown
                teachers={teachersList}
                selectedId={selectedTeacherId}
                onSelect={(id) => setSelectedTeacherId(id)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Swapping Active Instruction Banner */}
      {selectedSwapSlotA && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-between text-xs text-sky-900 dark:text-sky-200 shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <ArrowRightLeft className="w-4 h-4 text-sky-600 animate-pulse" />
            <span>
              <strong>Swap Mode Active:</strong> Selected{' '}
              <span className="font-bold underline">{selectedSwapSlotA.subjectName}</span> (Period{' '}
              {selectedSwapSlotA.periodIndex}, {selectedSwapSlotA.dayOfWeek}). Click another slot in this class to swap positions.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedSwapSlotA(null)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0b172e] border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 font-semibold hover:bg-sky-100 transition-colors cursor-pointer"
          >
            Cancel Selection
          </button>
        </motion.div>
      )}

      {/* MAIN TIMETABLE VIEW */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Loading timetable schedule...
          </p>
        </div>
      ) : slotsList.length === 0 ? (
        /* Empty State / First-Time Deputy Onboarding */
        <div className="py-16 text-center p-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-[#091326] max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 mx-auto mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
            Configure School Timetable Schedule
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
            The timetable for Academic Year {academicYear}, Term {term} is ready to be configured. The Setup Wizard will guide you through daily school hours, break times, Friday Jummah return schedule, and subject allocations.
          </p>
          {isDeputy && (
            <button
              type="button"
              onClick={() => setIsWizardOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Launch Setup Wizard
            </button>
          )}
        </div>
      ) : (
        /* CLASSIC TIMETABLE GRID: Columns = Periods/Time, Rows = Days of the Week */
        <div className="space-y-4">
          {/* Subheader info badge */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0b172e] border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {activeTab === 'class' ? `Class Schedule: ${activeClassName}` : `Teacher Schedule: ${activeTeacherName}`}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {slotsList.length} teaching lessons assigned
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#091326] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs min-w-[900px]">
                {/* TABLE HEADER: Periods & Times as Columns */}
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-[#0b172e] border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <th className="p-3 text-left font-black w-24 shrink-0 border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-slate-100 dark:bg-[#0b172e] z-10 shadow-xs">
                      Day
                    </th>
                    {timelineColumns.map((col, idx) => (
                      <th
                        key={idx}
                        className={`p-2.5 text-center font-bold border-r border-slate-200 dark:border-slate-800 last:border-r-0 ${
                          col.isBreak
                            ? 'bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 min-w-[100px]'
                            : 'min-w-[130px]'
                        }`}
                      >
                        {col.isBreak ? (
                          <div>
                            <span className="block text-[11px] font-bold uppercase tracking-wider">{col.breakName}</span>
                            <span className="text-[10px] font-normal text-amber-700/80 dark:text-amber-400/80 font-mono mt-0.5 block">
                              {col.startTime} – {col.endTime}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-black text-slate-900 dark:text-slate-100">Period {col.periodIndex}</span>
                            <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              {col.startTime} – {col.endTime}
                            </span>
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* TABLE BODY: Days of the Week as Rows */}
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {DAYS_OF_WEEK.map((dayObj) => {
                    const daySlots = periodsGrid[dayObj.id] || [];
                    if (daySlots.length === 0) return null;

                    return (
                      <tr key={dayObj.id} className="hover:bg-slate-50/40 dark:hover:bg-[#0b172e]/40 transition-colors">
                        {/* Day Title (Sticky column) */}
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-[#091326] border-r border-slate-200 dark:border-slate-800 sticky left-0 z-10 shadow-xs align-middle">
                          <div className="flex flex-col">
                            <span className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                              {dayObj.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                              {slotsList.filter((s) => s.dayOfWeek === dayObj.id).length} lessons
                            </span>
                          </div>
                        </td>

                        {/* Period & Break Cells for this day */}
                        {timelineColumns.map((colDef, colIdx) => {
                          const slotDef = colDef.isBreak
                            ? daySlots.find(
                                (s) =>
                                  s.isBreak &&
                                  (s.startTime === colDef.startTime ||
                                    s.breakName === colDef.breakName)
                              )
                            : daySlots.find(
                                (s) => !s.isBreak && s.periodIndex === colDef.periodIndex
                              );

                          // Case 1: Slot does not exist on this day (e.g. Friday early dismissal or break not on this day)
                          if (!slotDef) {
                            if (colDef.isBreak) {
                              return (
                                <td
                                  key={colIdx}
                                  className="p-2 border-r border-slate-200 dark:border-slate-800 last:border-r-0 bg-slate-50/30 dark:bg-[#070e1c] text-center text-slate-300 dark:text-slate-700 text-xs align-middle"
                                >
                                  —
                                </td>
                              );
                            }
                            return (
                              <td
                                key={colIdx}
                                className="p-2 border-r border-slate-200 dark:border-slate-800 last:border-r-0 bg-slate-50/50 dark:bg-[#070e1c] text-center text-slate-400 dark:text-slate-600 text-[10px] italic align-middle"
                              >
                                Weekend Dismissal
                              </td>
                            );
                          }

                          // Case 2: Break interval (Tea break, Lunch, Friday Jumuaa)
                          if (slotDef.isBreak) {
                            return (
                              <td
                                key={colIdx}
                                className="p-2 border-r border-slate-200 dark:border-slate-800 last:border-r-0 bg-amber-50/40 dark:bg-amber-950/20 text-center align-middle"
                              >
                                <div className="flex flex-col items-center justify-center py-1.5 px-1 text-amber-800 dark:text-amber-300">
                                  <span className="text-[10px] font-bold uppercase tracking-wider line-clamp-1">
                                    {slotDef.breakName}
                                  </span>
                                  <span className="text-[9px] text-amber-600/80 dark:text-amber-400/80 font-mono mt-0.5">
                                    {slotDef.startTime} – {slotDef.endTime}
                                  </span>
                                </div>
                              </td>
                            );
                          }

                          // Case 3: Teaching period
                          const lesson = singleViewSlotsMap.get(`${dayObj.id}_${slotDef.periodIndex}`);
                          const isSelected = selectedSwapSlotA?.id === lesson?.id;

                          return (
                            <td
                              key={colIdx}
                              className={`p-1.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0 align-middle transition-colors ${
                                isSelected ? 'bg-sky-100/80 dark:bg-sky-950/80 ring-2 ring-sky-500' : ''
                              }`}
                            >
                              {lesson ? (
                                <div
                                  onClick={() => handleSlotClick(lesson)}
                                  className={`p-2.5 rounded-xl border flex flex-col justify-between min-h-[72px] transition-all ${
                                    isDeputy ? 'cursor-pointer hover:shadow-xs hover:scale-[1.01]' : ''
                                  } ${getSubjectBadgeColor(
                                    lesson.subjectCode || lesson.subjectName
                                  )}`}
                                  title={
                                    isDeputy
                                      ? `Click to swap ${lesson.subjectName} (P${lesson.periodIndex}, ${dayObj.label})`
                                      : `${lesson.subjectName}`
                                  }
                                >
                                  <div>
                                    <div className="font-black text-xs leading-tight truncate">
                                      {lesson.subjectName}
                                    </div>
                                    <div className="text-[10px] opacity-80 truncate mt-0.5 font-semibold">
                                      {activeTab === 'teacher'
                                        ? lesson.className
                                        : `${lesson.teacherFirstName || ''} ${lesson.teacherLastName || ''}`}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between mt-1 text-[9px]">
                                    {lesson.isDoubleLesson ? (
                                      <span className="px-1.5 py-0.2 rounded font-bold bg-white/70 dark:bg-black/40 text-[9px]">
                                        Double {lesson.doubleLessonPart ? `(${lesson.doubleLessonPart}/2)` : ''}
                                      </span>
                                    ) : (
                                      <span />
                                    )}
                                    <span className="font-mono opacity-70">
                                      {slotDef.startTime}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-2 text-center text-slate-300 dark:text-slate-700 text-[10px] italic">
                                  Free
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURATION WIZARD MODAL (Deputy Only) */}
      <TimetableWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onGenerated={fetchTimetableData}
        academicYear={academicYear}
        term={term}
      />

      {/* OFFICIAL PRINT MODAL */}
      <TimetablePrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={
          activeTab === 'class'
            ? `Class Timetable: ${activeClassName}`
            : `Teacher Schedule: ${activeTeacherName}`
        }
        schoolName={schoolName}
        logoUrl={logoUrl}
        academicYear={academicYear}
        term={term}
        periodsGrid={periodsGrid}
        slots={slotsList}
        viewType={activeTab}
        classes={classesList}
      />

      {/* POLITE COLLISION WARNING MODAL */}
      <ConflictModal
        isOpen={conflictModalData.isOpen}
        onClose={() => setConflictModalData({ ...conflictModalData, isOpen: false })}
        conflictMessage={conflictModalData.message}
        onRevert={() => {
          setSelectedSwapSlotA(null);
          setConflictModalData({ isOpen: false, message: '', slotA: null, slotB: null });
          toast.info('Reverted to previous schedule.');
        }}
        onForceSwap={() => {
          if (conflictModalData.slotA && conflictModalData.slotB) {
            executeSwap(conflictModalData.slotA, conflictModalData.slotB, true);
          }
        }}
        isSwapping={swapping}
      />
      </div>
    )}
  </PageLoadingWrapper>
  );
};
