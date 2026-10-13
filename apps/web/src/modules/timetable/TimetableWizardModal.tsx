import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, BookOpen, UserCheck, CheckCircle2, Plus, Trash2,
  HelpCircle, Save, Zap, ChevronRight, ChevronLeft,
  X, Layers, Info, User, ShieldCheck, Sparkles, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { PasswordConfirmModal } from './PasswordConfirmModal';

interface TimetableWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: () => void;
  academicYear: number;
  term: number;
}

const ALL_DAYS = [
  { id: 'MONDAY', label: 'Monday' },
  { id: 'TUESDAY', label: 'Tuesday' },
  { id: 'WEDNESDAY', label: 'Wednesday' },
  { id: 'THURSDAY', label: 'Thursday' },
  { id: 'FRIDAY', label: 'Friday' },
];

const DEFAULT_LESSONS_BY_CODE: Record<string, { lessons: number; doubleLessons: number }> = {
  // Upper Primary (10 subjects = 35 weekly lessons)
  'UP-ENG': { lessons: 5, doubleLessons: 0 },
  'UP-KISW': { lessons: 4, doubleLessons: 0 },
  'UP-MATH': { lessons: 5, doubleLessons: 0 },
  'UP-SCITECH': { lessons: 4, doubleLessons: 1 },
  'UP-AGRINUT': { lessons: 4, doubleLessons: 1 },
  'UP-SOC': { lessons: 3, doubleLessons: 0 },
  'UP-IRE': { lessons: 3, doubleLessons: 0 },
  'UP-ARTS': { lessons: 3, doubleLessons: 1 },
  'UP-PHE': { lessons: 2, doubleLessons: 0 },
  'UP-ARAB': { lessons: 2, doubleLessons: 0 },

  // Junior Secondary (12 subjects = 40 weekly lessons)
  'JSS-ENG': { lessons: 5, doubleLessons: 0 },
  'JSS-KISW': { lessons: 4, doubleLessons: 0 },
  'JSS-MATH': { lessons: 5, doubleLessons: 0 },
  'JSS-INTSCI': { lessons: 4, doubleLessons: 1 },
  'JSS-HLTH': { lessons: 2, doubleLessons: 0 },
  'JSS-SOC': { lessons: 3, doubleLessons: 0 },
  'JSS-IRE': { lessons: 3, doubleLessons: 0 },
  'JSS-AGRINUT': { lessons: 4, doubleLessons: 1 },
  'JSS-PRETECH': { lessons: 3, doubleLessons: 1 },
  'JSS-ARTSPORT': { lessons: 3, doubleLessons: 1 },
  'JSS-COMP': { lessons: 3, doubleLessons: 1 },
  'JSS-ARAB': { lessons: 2, doubleLessons: 0 },
};

export const TimetableWizardModal: React.FC<TimetableWizardModalProps> = ({
  isOpen,
  onClose,
  onGenerated,
  academicYear,
  term,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);

  // Available metadata
  const [classesList, setClassesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [allocationsList, setAllocationsList] = useState<any[]>([]);

  // Config State
  const [schoolDays, setSchoolDays] = useState<string[]>([
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
  ]);
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('15:40');
  const [lessonDurationMinutes, setLessonDurationMinutes] = useState<number>(40);

  // Breaks
  const [breaks, setBreaks] = useState<
    Array<{ id: string; name: string; startTime: string; endTime: string; days: string[] }>
  >([
    {
      id: 'break-1',
      name: 'Morning Tea Break',
      startTime: '10:00',
      endTime: '10:30',
      days: ['ALL'],
    },
    {
      id: 'break-2',
      name: 'Lunch & Dhuhr Break',
      startTime: '12:30',
      endTime: '13:30',
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'],
    },
  ]);

  // Friday Jumuaa Schedule
  const [fridaySpecial, setFridaySpecial] = useState<{
    isSpecial: boolean;
    jummahBreakStart: string;
    afternoonReturnTime: string;
    afternoonDismissalTime: string;
  }>({
    isSpecial: true,
    jummahBreakStart: '12:30',
    afternoonReturnTime: '14:00',
    afternoonDismissalTime: '15:30',
  });

  // Co-curriculars
  const [coCurriculars, setCoCurriculars] = useState<any[]>([
    {
      id: 'cocurr-1',
      name: 'Games & P.E. / Clubs',
      day: 'THURSDAY',
      periodIndex: 8,
      classIds: [],
    },
  ]);

  // Subject Requirements: { [classId]: { [subjectId]: { weeklyLessons, doubleLessonsAllowed, doubleLessonCount } } }
  const [subjectRequirements, setSubjectRequirements] = useState<Record<string, Record<string, any>>>({});
  const [selectedClassTab, setSelectedClassTab] = useState<string>('');

  // Teacher Constraints
  const [maxConsecutiveLessons, setMaxConsecutiveLessons] = useState<number>(3);
  const [minFreePeriodsPerWeek, setMinFreePeriodsPerWeek] = useState<number>(5);
  const [specialStaffLimits, setSpecialStaffLimits] = useState<Record<string, number>>({});

  // Helper to calculate total minutes from HH:mm
  const timeToMinutes = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map((v) => parseInt(v, 10) || 0);
    return h * 60 + m;
  };

  // Estimated periods calculation based on user's custom times
  const estimatedPeriods = useMemo(() => {
    const totalDayMins = Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime));
    const totalBreakMins = breaks.reduce((acc, b) => {
      const bMins = Math.max(0, timeToMinutes(b.endTime) - timeToMinutes(b.startTime));
      return acc + bMins;
    }, 0);
    const teachingMins = Math.max(0, totalDayMins - totalBreakMins);
    const duration = lessonDurationMinutes > 0 ? lessonDurationMinutes : 40;
    return Math.max(1, Math.floor(teachingMins / duration));
  }, [startTime, endTime, breaks, lessonDurationMinutes]);

  // Fetch initial config & metadata
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [configRes, allocRes, classesRes] = await Promise.all([
          apiClient.get(`/api/timetable/config?academicYear=${academicYear}&term=${term}`),
          apiClient.get('/api/allocations'),
          apiClient.get('/api/timetable/classes'),
        ]);

        let targetClasses: any[] = [];
        if (classesRes.data?.data && Array.isArray(classesRes.data.data) && classesRes.data.data.length > 0) {
          targetClasses = classesRes.data.data;
        } else if (allocRes.data?.data?.classes) {
          targetClasses = allocRes.data.data.classes
            .map((c: any) => c.class || c)
            .filter(
              (c: any) => c.levelCategory === 'UPPER_PRIMARY' || c.levelCategory === 'JUNIOR'
            );
        }
        setClassesList(targetClasses);

        if (allocRes.data?.data) {
          const { teachers, subjects, subjectAllocations } = allocRes.data.data;
          setTeachersList(teachers || []);
          setSubjectsList(subjects || []);
          setAllocationsList(subjectAllocations || []);
        }

        if (targetClasses.length > 0 && !selectedClassTab) {
          setSelectedClassTab(targetClasses[0].id);
        }

        if (configRes.data?.data) {
          const conf = configRes.data.data;
          if (conf.schoolDays) setSchoolDays(conf.schoolDays);
          if (conf.startTime) setStartTime(conf.startTime);
          if (conf.endTime) setEndTime(conf.endTime);
          if (conf.lessonDurationMinutes) setLessonDurationMinutes(conf.lessonDurationMinutes);
          if (conf.breaks) setBreaks(conf.breaks);
          if (conf.fridaySchedule) {
            setFridaySpecial({
              isSpecial: conf.fridaySchedule.isSpecial ?? true,
              jummahBreakStart: conf.fridaySchedule.jummahBreakStart || '12:30',
              afternoonReturnTime: conf.fridaySchedule.afternoonReturnTime || '14:00',
              afternoonDismissalTime: conf.fridaySchedule.afternoonDismissalTime || '15:30',
            });
          }
          if (conf.coCurriculars) setCoCurriculars(conf.coCurriculars);
          if (conf.subjectRequirements) setSubjectRequirements(conf.subjectRequirements);
          if (conf.teacherConstraints) {
            setMaxConsecutiveLessons(conf.teacherConstraints.maxConsecutiveLessons ?? 3);
            setMinFreePeriodsPerWeek(conf.teacherConstraints.minFreePeriodsPerWeek ?? 5);
            setSpecialStaffLimits(conf.teacherConstraints.specialStaffLimits || {});
          }
        }
      } catch (err: any) {
        console.error('Failed to load timetable config', err);
        toast.error('Could not load timetable configuration.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, academicYear, term]);

  const handleSaveConfig = async (triggerGenerate = false) => {
    try {
      setSaving(true);

      if (isOverCapacity) {
        toast.error(
          `${currentSelectedClass?.name} exceeds available weekly lessons (${totalClassLessons} > ${totalWeeklyAvailableSlots}).`
        );
        setSaving(false);
        return;
      }

      const payload = {
        academicYear,
        term,
        schoolDays,
        startTime,
        endTime,
        lessonDurationMinutes,
        breaks,
        fridaySchedule: fridaySpecial,
        coCurriculars,
        subjectRequirements,
        teacherConstraints: {
          maxConsecutiveLessons,
          minFreePeriodsPerWeek,
          specialStaffLimits,
        },
      };

      await apiClient.post('/api/timetable/config', payload);

      if (triggerGenerate) {
        setIsPasswordModalOpen(true);
      } else {
        // Short notification at most 6 words as requested by user
        toast.success('Settings saved successfully.');
        onClose();
      }
    } catch (err: any) {
      console.error('Error saving timetable config:', err);
      toast.error(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleAuthorizeAndGenerate = async (password: string) => {
    setIsAuthorizing(true);
    try {
      const genRes = await apiClient.post('/api/timetable/generate', {
        academicYear,
        term,
        password,
      });
      toast.success(genRes.data?.message || 'Timetable generated successfully!');
      setIsPasswordModalOpen(false);
      onClose();
      onGenerated();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to generate timetable';
      throw new Error(msg);
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Helper for Break Operations
  const addBreak = () => {
    const newBreak = {
      id: `break-${Date.now()}`,
      name: 'New Break',
      startTime: '11:00',
      endTime: '11:30',
      days: ['ALL'],
    };
    setBreaks([...breaks, newBreak]);
  };

  const updateBreak = (index: number, field: string, value: any) => {
    const copy = [...breaks];
    copy[index] = { ...copy[index], [field]: value };
    setBreaks(copy);
  };

  const removeBreak = (index: number) => {
    setBreaks(breaks.filter((_, i) => i !== index));
  };

  // Ensure selectedClassTab is always valid and defaults to first class
  useEffect(() => {
    if (classesList.length > 0) {
      if (!selectedClassTab || !classesList.some((c) => c.id === selectedClassTab)) {
        setSelectedClassTab(classesList[0].id);
      }
    }
  }, [classesList, selectedClassTab]);

  // Filter subjects for the selected class: ONLY Upper Primary or Junior Secondary!
  // Exclude PPE and Lower Primary completely!
  const currentSelectedClass = useMemo(() => {
    return classesList.find((c) => c.id === selectedClassTab) || classesList[0];
  }, [classesList, selectedClassTab]);

  const classLevelCategory = currentSelectedClass?.levelCategory; // 'UPPER_PRIMARY' or 'JUNIOR'

  const filteredClassSubjects = useMemo(() => {
    return subjectsList.filter(
      (s) =>
        (s.levelCategory === 'UPPER_PRIMARY' || s.levelCategory === 'JUNIOR') &&
        s.levelCategory === classLevelCategory
    );
  }, [subjectsList, classLevelCategory]);

  // Accurate weekly teaching slots calculation matching TimetableEngine.computePeriodsGrid
  const totalWeeklyAvailableSlots = useMemo(() => {
    const lessonDuration = lessonDurationMinutes > 0 ? lessonDurationMinutes : 40;
    let totalTeachingSlots = 0;

    for (const day of schoolDays) {
      const isFriday = day.toUpperCase() === 'FRIDAY';
      const useSpecialFriday = isFriday && fridaySpecial.isSpecial;

      let currentTimeMins = timeToMinutes(startTime);
      const dayEndMins = useSpecialFriday && fridaySpecial.afternoonDismissalTime
        ? timeToMinutes(fridaySpecial.afternoonDismissalTime)
        : timeToMinutes(endTime);

      // Applicable breaks for this day
      const dayBreaks = breaks.filter((b) => {
        if (!b.days || b.days.length === 0 || b.days.includes('ALL')) return true;
        return b.days.map((d) => d.toUpperCase()).includes(day.toUpperCase());
      });
      dayBreaks.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

      while (currentTimeMins + lessonDuration <= dayEndMins) {
        // Special Friday Jummah break handling
        if (useSpecialFriday) {
          const jummahStartMins = timeToMinutes(fridaySpecial.jummahBreakStart);
          const jummahReturnMins = timeToMinutes(fridaySpecial.afternoonReturnTime);

          if (currentTimeMins >= jummahStartMins && currentTimeMins < jummahReturnMins) {
            currentTimeMins = jummahReturnMins;
            continue;
          }
        }

        // Check regular breaks
        const upcomingBreak = dayBreaks.find((b) => {
          const bStart = timeToMinutes(b.startTime);
          return currentTimeMins <= bStart && currentTimeMins + lessonDuration > bStart;
        });

        if (upcomingBreak) {
          const bStart = timeToMinutes(upcomingBreak.startTime);
          const bEnd = timeToMinutes(upcomingBreak.endTime);
          if (currentTimeMins < bStart) currentTimeMins = bStart;
          currentTimeMins = bEnd;
          continue;
        }

        // Standard teaching lesson slot found
        totalTeachingSlots++;
        currentTimeMins += lessonDuration;
      }
    }

    return Math.max(1, totalTeachingSlots);
  }, [schoolDays, startTime, endTime, lessonDurationMinutes, breaks, fridaySpecial]);

  // Helper to retrieve requirements for a specific subject in a specific class with CBC defaults
  const getSubjectReq = (classId: string, sub: any) => {
    const req = subjectRequirements[classId]?.[sub.id];
    const defaults = DEFAULT_LESSONS_BY_CODE[sub.code] || { lessons: 4, doubleLessons: 0 };
    const doubleCount = req?.doubleLessonsCount ?? req?.doubleLessonCount ?? defaults.doubleLessons;
    const lessons = req?.lessonsPerWeek ?? req?.weeklyLessons ?? defaults.lessons;
    // Derive single lessons: singles = lessons - (doubles * 2)
    const singleCount = Math.max(0, lessons - doubleCount * 2);

    return {
      singleCount,
      doubleCount,
      lessons,
      doubleAllowed: doubleCount > 0,
    };
  };

  // Helper to update requirement: double lesson is counted as 2 and lessons per week updates appropriately
  const updateSubjectLessons = (
    classId: string,
    subjectId: string,
    subCode: string,
    newSingle: number,
    newDouble: number
  ) => {
    const validSingle = Math.max(0, newSingle);
    const validDouble = Math.max(0, newDouble);
    const calculatedTotal = validSingle + validDouble * 2;

    const updated = {
      lessonsPerWeek: calculatedTotal,
      weeklyLessons: calculatedTotal,
      doubleLessonsAllowed: validDouble > 0,
      doubleLessonsCount: validDouble,
      doubleLessonCount: validDouble,
    };

    setSubjectRequirements((prev) => ({
      ...prev,
      [classId]: {
        ...(prev[classId] || {}),
        [subjectId]: updated,
      },
    }));
  };

  // Live totals for currently selected class
  const { totalClassLessons, totalClassDoubles } = useMemo(() => {
    if (!currentSelectedClass) return { totalClassLessons: 0, totalClassDoubles: 0 };
    let lessons = 0;
    let doubles = 0;
    for (const sub of filteredClassSubjects) {
      const req = getSubjectReq(currentSelectedClass.id, sub);
      lessons += req.lessons;
      doubles += req.doubleCount;
    }
    return { totalClassLessons: lessons, totalClassDoubles: doubles };
  }, [currentSelectedClass, filteredClassSubjects, subjectRequirements]);

  const isOverCapacity = totalClassLessons > totalWeeklyAvailableSlots;
  const isBalanced = totalClassLessons === totalWeeklyAvailableSlots;
  const remainingSlots = Math.max(0, totalWeeklyAvailableSlots - totalClassLessons);
  const excessSlots = Math.max(0, totalClassLessons - totalWeeklyAvailableSlots);

  // Administrative leaders from teachersList (Head Teacher, Deputy Head Teacher, DOS)
  const adminLeaders = useMemo(() => {
    return teachersList.filter((t: any) => {
      const r = (t.roleName || t.role || '').toUpperCase();
      const name = `${t.firstName} ${t.lastName}`.toUpperCase();
      return (
        r.includes('HEAD') ||
        r.includes('DEPUTY') ||
        r.includes('DOS') ||
        name.includes('MOHAMED') ||
        name.includes('ABDI')
      );
    });
  }, [teachersList]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#091326] rounded-2xl sm:rounded-3xl shadow-2xl border border-sky-100 dark:border-[#162b4d] overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-[#162b4d] flex items-center justify-between bg-sky-50/50 dark:bg-[#0b172e] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Timetable Setup & Configuration Wizard
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Deputy Headteacher Control Panel • Academic Year {academicYear}, Term {term}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-white dark:hover:bg-[#112038] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Wizard Step Progress Bar */}
          <div className="px-6 py-3 border-b border-slate-100 dark:border-[#162b4d] bg-white dark:bg-[#091326] shrink-0">
            <div className="grid grid-cols-4 gap-2">
              {[
                { num: 1, label: 'Hours & Days', icon: Clock },
                { num: 2, label: 'Breaks & Jumuaa', icon: Calendar },
                { num: 3, label: 'Subject Lessons', icon: BookOpen },
                { num: 4, label: 'Teacher Caps', icon: UserCheck },
              ].map((step) => {
                const isActive = currentStep === step.num;
                const isPassed = currentStep > step.num;

                return (
                  <button
                    key={step.num}
                    onClick={() => setCurrentStep(step.num)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 font-bold'
                        : isPassed
                        ? 'text-emerald-700 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-[#0d1c38]'
                        : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-[#0d1c38]'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isActive
                          ? 'bg-sky-600 text-white'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isPassed ? '✓' : step.num}
                    </div>
                    <span className="text-xs truncate hidden sm:inline">{step.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {loading ? (
              <div className="py-16 text-center text-slate-400">Loading timetable configuration...</div>
            ) : (
              <>
                {/* STEP 1: School Hours & Days */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    <div className="p-4 rounded-xl bg-sky-50/60 dark:bg-[#0b1b36] border border-sky-100 dark:border-sky-900/40 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2.5">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Flexible Schedule Setup:</strong> Input your preferred start time, finish time, and custom lesson duration. The timetable engine automatically adapts the period slots across the week.
                      </div>
                    </div>

                    {/* School Days */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Active School Days
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {ALL_DAYS.map((day) => {
                          const isSelected = schoolDays.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  if (schoolDays.length > 1) {
                                    setSchoolDays(schoolDays.filter((d) => d !== day.id));
                                  }
                                } else {
                                  setSchoolDays([...schoolDays, day.id]);
                                }
                              }}
                              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                  : 'bg-slate-50 dark:bg-[#0d1c38] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Direct Inputs for Start Time, End Time & Custom Lesson Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          First Lesson Start Time
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b172e] text-slate-900 dark:text-slate-100 text-sm font-semibold focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Regular End Time
                        </label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b172e] text-slate-900 dark:text-slate-100 text-sm font-semibold focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Lesson Duration (Minutes)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={15}
                            max={120}
                            step={5}
                            value={lessonDurationMinutes}
                            onChange={(e) =>
                              setLessonDurationMinutes(parseInt(e.target.value, 10) || 40)
                            }
                            className="w-full px-3 py-2 pr-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b172e] text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-sky-500"
                            placeholder="e.g. 40"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                            Mins
                          </span>
                        </div>
                        {/* Quick preset suggestions */}
                        <div className="flex items-center gap-1.5 mt-2">
                          {[35, 40, 45, 50].map((dur) => (
                            <button
                              key={dur}
                              type="button"
                              onClick={() => setLessonDurationMinutes(dur)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                                lessonDurationMinutes === dur
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              {dur}m{dur === 40 ? ' (CBC)' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Live Adaptive Periods Counter */}
                    <div className="p-3.5 rounded-xl border border-sky-200/80 dark:border-sky-900/40 bg-sky-50/40 dark:bg-[#0a162b] flex items-center justify-between text-xs text-sky-900 dark:text-sky-200">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                        <span>
                          <strong>Calculated Daily Schedule:</strong> Based on {startTime} to {endTime} ({lessonDurationMinutes} mins/lesson):
                        </span>
                      </div>
                      <span className="font-bold px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300">
                        ~{estimatedPeriods} Teaching Periods / Day
                      </span>
                    </div>
                  </div>
                )}

                {/* STEP 2: Breaks, Friday Jumuaa & Co-Curriculars */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    {/* Breaks Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            Daily Break Intervals
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Configure Morning Tea Breaks, Lunch & Dhuhr prayer breaks.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addBreak}
                          className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-sky-100 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Break
                        </button>
                      </div>

                      <div className="space-y-3">
                        {breaks.map((b, idx) => (
                          <div
                            key={b.id || idx}
                            className="p-3.5 rounded-xl border border-slate-100 dark:border-[#162b4d] bg-slate-50/50 dark:bg-[#0b172e] flex flex-col sm:flex-row items-center gap-3 text-xs"
                          >
                            <input
                              type="text"
                              value={b.name}
                              onChange={(e) => updateBreak(idx, 'name', e.target.value)}
                              placeholder="Break Name (e.g. Morning Tea Break)"
                              className="w-full sm:w-1/3 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-slate-800 dark:text-slate-200 font-semibold"
                            />

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <span className="text-[11px] text-slate-400">From</span>
                              <input
                                type="time"
                                value={b.startTime}
                                onChange={(e) => updateBreak(idx, 'startTime', e.target.value)}
                                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-slate-800 dark:text-slate-200 font-mono text-xs"
                              />
                              <span className="text-[11px] text-slate-400">To</span>
                              <input
                                type="time"
                                value={b.endTime}
                                onChange={(e) => updateBreak(idx, 'endTime', e.target.value)}
                                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-slate-800 dark:text-slate-200 font-mono text-xs"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => removeBreak(idx)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-auto cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Friday Jumuaa Routine */}
                    <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-[#081826]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Friday Jummah Prayer Routine
                          </h4>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fridaySpecial.isSpecial}
                            onChange={(e) =>
                              setFridaySpecial({ ...fridaySpecial, isSpecial: e.target.checked })
                            }
                            className="rounded text-sky-600 cursor-pointer"
                          />
                          <span>Enable Extended Jummah Break</span>
                        </label>
                      </div>

                      {fridaySpecial.isSpecial && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-900/30">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                              Jummah Break Starts
                            </label>
                            <input
                              type="time"
                              value={fridaySpecial.jummahBreakStart}
                              onChange={(e) =>
                                setFridaySpecial({
                                  ...fridaySpecial,
                                  jummahBreakStart: e.target.value,
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                              Students Return Time (e.g. 2:00 PM)
                            </label>
                            <input
                              type="time"
                              value={fridaySpecial.afternoonReturnTime}
                              onChange={(e) =>
                                setFridaySpecial({
                                  ...fridaySpecial,
                                  afternoonReturnTime: e.target.value,
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-xs font-mono font-bold text-sky-700 dark:text-sky-300"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                              Friday Dismissal Time
                            </label>
                            <input
                              type="time"
                              value={fridaySpecial.afternoonDismissalTime}
                              onChange={(e) =>
                                setFridaySpecial({
                                  ...fridaySpecial,
                                  afternoonDismissalTime: e.target.value,
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-xs font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 3: Subject Lessons & Double Periods (Minimalistic 2-Column Grid) */}
                {currentStep === 3 && (
                  <div className="space-y-3.5">
                    {/* Header Strip: Grade Selector Pills + Level Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-[#162b4d]">
                      {/* Grade Selector Tabs */}
                      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                        {classesList.map((cls) => {
                          const isSelected = currentSelectedClass?.id === cls.id;
                          return (
                            <button
                              key={cls.id}
                              type="button"
                              onClick={() => setSelectedClassTab(cls.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                                isSelected
                                  ? 'bg-sky-600 text-white shadow-xs ring-1 ring-sky-400'
                                  : 'bg-slate-100 dark:bg-[#0d1c38] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span>{cls.name}</span>
                              <span
                                className={`text-[10px] px-1 py-0.2 rounded font-normal ${
                                  isSelected
                                    ? 'bg-sky-700/60 text-sky-100'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                }`}
                              >
                                {cls.levelCategory === 'JUNIOR' ? 'JSS' : 'Upper'}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Grade Info Label */}
                      <div className="text-right shrink-0 hidden sm:block">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {currentSelectedClass?.name}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1.5">
                          ({filteredClassSubjects.length} curriculum subjects)
                        </span>
                      </div>
                    </div>

                    {/* Compact Real-Time Capacity Alert Banner */}
                    <div
                      className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all text-xs ${
                        isOverCapacity
                          ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/60'
                          : isBalanced
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900/60'
                          : 'bg-sky-50/70 dark:bg-[#0b1c38] border-sky-200 dark:border-sky-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isOverCapacity ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : isBalanced ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Info className="w-4 h-4 text-sky-600 shrink-0" />
                        )}
                        <div>
                          <strong className="text-slate-900 dark:text-slate-100">
                            {currentSelectedClass?.name} Weekly Capacity:{' '}
                          </strong>
                          {isOverCapacity ? (
                            <span className="text-rose-700 dark:text-rose-300 font-semibold">
                              Exceeds schedule! {totalClassLessons} allocated / {totalWeeklyAvailableSlots} available ({excessSlots} over limit). Please reduce lessons.
                            </span>
                          ) : isBalanced ? (
                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                              100% Balanced ({totalClassLessons} / {totalWeeklyAvailableSlots} slots scheduled).
                            </span>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-300">
                              {totalClassLessons} of {totalWeeklyAvailableSlots} slots allocated ({remainingSlots} free / study slots remaining).
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <div className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#091326] border border-slate-200 dark:border-slate-800 text-right">
                          <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                            Total Lessons
                          </span>
                          <span
                            className={`text-xs font-extrabold ${
                              isOverCapacity
                                ? 'text-rose-600 dark:text-rose-400'
                                : isBalanced
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-sky-600 dark:text-sky-400'
                            }`}
                          >
                            {totalClassLessons} / {totalWeeklyAvailableSlots}
                          </span>
                        </div>

                        <div className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#091326] border border-slate-200 dark:border-slate-800 text-right">
                          <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                            Double Lessons
                          </span>
                          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                            {totalClassDoubles} ({totalClassDoubles * 2} les)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Minimalistic 2-Column Grid (Zero to minimal scrolling) */}
                    {currentSelectedClass && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
                        {filteredClassSubjects.length === 0 ? (
                          <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
                            No subjects allocated for {currentSelectedClass.name}.
                          </div>
                        ) : (
                          filteredClassSubjects.map((sub) => {
                            const req = getSubjectReq(currentSelectedClass.id, sub);

                            // Find allocated teacher for this subject in this specific class
                            const allocation = allocationsList.find(
                              (a: any) =>
                                (a.classId === currentSelectedClass.id || a.class?.id === currentSelectedClass.id) &&
                                (a.subjectId === sub.id || a.subject?.id === sub.id)
                            );
                            const teacherName = allocation?.teacher
                              ? `${allocation.teacher.firstName} ${allocation.teacher.lastName}`
                              : allocation?.teacherFirstName
                              ? `${allocation.teacherFirstName} ${allocation.teacherLastName}`
                              : null;

                            return (
                              <div
                                key={sub.id}
                                className="px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c182d] flex items-center justify-between gap-2 shadow-xs hover:border-sky-300 dark:hover:border-sky-800 transition-colors"
                              >
                                {/* Left: Subject info */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                                      {sub.name}
                                    </span>
                                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold shrink-0">
                                      {sub.code}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">
                                      {teacherName ? (
                                        <strong className="text-slate-700 dark:text-slate-300 font-medium">
                                          {teacherName}
                                        </strong>
                                      ) : (
                                        <span className="text-amber-500 italic">Unassigned</span>
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {/* Right: Controls */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {/* Single Stepper */}
                                  <div className="text-center">
                                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                                      Single (1x)
                                    </span>
                                    <div className="flex items-center mt-0.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateSubjectLessons(
                                            currentSelectedClass.id,
                                            sub.id,
                                            sub.code,
                                            Math.max(0, req.singleCount - 1),
                                            req.doubleCount
                                          )
                                        }
                                        className="w-5 h-5 flex items-center justify-center rounded-l border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-bold cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <span className="w-5 text-center font-bold text-xs text-slate-800 dark:text-slate-200">
                                        {req.singleCount}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateSubjectLessons(
                                            currentSelectedClass.id,
                                            sub.id,
                                            sub.code,
                                            req.singleCount + 1,
                                            req.doubleCount
                                          )
                                        }
                                        className="w-5 h-5 flex items-center justify-center rounded-r border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-bold cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  {/* Double Stepper (2x) */}
                                  <div className="text-center">
                                    <span
                                      className="block text-[9px] uppercase tracking-wider text-indigo-500 font-semibold"
                                      title="Double lesson counts as 2 periods"
                                    >
                                      Double (2x)
                                    </span>
                                    <div className="flex items-center mt-0.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateSubjectLessons(
                                            currentSelectedClass.id,
                                            sub.id,
                                            sub.code,
                                            req.singleCount,
                                            Math.max(0, req.doubleCount - 1)
                                          )
                                        }
                                        className="w-5 h-5 flex items-center justify-center rounded-l border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-bold cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <span className="w-5 text-center font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                        {req.doubleCount}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateSubjectLessons(
                                            currentSelectedClass.id,
                                            sub.id,
                                            sub.code,
                                            req.singleCount,
                                            Math.min(3, req.doubleCount + 1)
                                          )
                                        }
                                        className="w-5 h-5 flex items-center justify-center rounded-r border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-bold cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  {/* Total Badge */}
                                  <div className="text-right pl-1 min-w-[42px]">
                                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                                      Total
                                    </span>
                                    <span className="text-xs font-extrabold text-sky-600 dark:text-sky-400">
                                      {req.lessons}{' '}
                                      <span className="text-[10px] font-normal text-slate-400">/wk</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: Administrative Routines & Teacher Workload Caps */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    {/* Administrative Leaders Routines Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-4 h-4 text-sky-600" />
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Administrative Leaders Routines & Workload Caps
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        Configure routine workload limits for the Headteacher and Deputy Head Teacher to reserve their administrative hours.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {adminLeaders.map((leader) => {
                          const currentLimit = specialStaffLimits[leader.id] ?? '';
                          const leaderAllocations = allocationsList.filter(
                            (a) => a.teacherId === leader.id
                          );

                          return (
                            <div
                              key={leader.id}
                              className="p-4 rounded-2xl border border-sky-100 dark:border-sky-900/50 bg-sky-50/30 dark:bg-[#0c182d] space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">
                                    {leader.firstName} {leader.lastName}
                                  </span>
                                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 dark:bg-sky-900/70 text-sky-800 dark:text-sky-300">
                                    {leader.roleName?.replace('_', ' ') || 'School Leader'}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">Allocated Subjects</span>
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {leaderAllocations.length} class subjects
                                  </span>
                                </div>
                              </div>

                              {leaderAllocations.length > 0 && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-black/20 p-2 rounded-xl">
                                  {leaderAllocations.map((a: any) => `${a.className}: ${a.subjectCode || a.subjectName}`).join(' • ')}
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-2 border-t border-sky-100/80 dark:border-sky-900/40">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  Weekly Lesson Limit:
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    max={30}
                                    placeholder="No cap"
                                    value={currentLimit}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '') {
                                        const copy = { ...specialStaffLimits };
                                        delete copy[leader.id];
                                        setSpecialStaffLimits(copy);
                                      } else {
                                        setSpecialStaffLimits({
                                          ...specialStaffLimits,
                                          [leader.id]: parseInt(val, 10),
                                        });
                                      }
                                    }}
                                    className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-center font-bold text-xs"
                                  />
                                  <span className="text-[10px] text-slate-400 font-medium">lessons</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* General Teaching Staff Constraints */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Teaching Staff Workload & Rest Constraints
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        Set fatigue-prevention limits on consecutive teaching hours and guaranteed preparation time.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-[#162b4d] bg-slate-50/50 dark:bg-[#0b172e]">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Max Consecutive Lessons
                          </label>
                          <p className="text-[11px] text-slate-500 mb-2">
                            Maximum lessons a teacher can teach without a break or free period.
                          </p>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            value={maxConsecutiveLessons}
                            onChange={(e) =>
                              setMaxConsecutiveLessons(parseInt(e.target.value, 10) || 1)
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-sm font-bold"
                          />
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 dark:border-[#162b4d] bg-slate-50/50 dark:bg-[#0b172e]">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Min Free Periods per Week
                          </label>
                          <p className="text-[11px] text-slate-500 mb-2">
                            Guaranteed preparation / free periods for each regular teacher.
                          </p>
                          <input
                            type="number"
                            min={1}
                            max={15}
                            value={minFreePeriodsPerWeek}
                            onChange={(e) =>
                              setMinFreePeriodsPerWeek(parseInt(e.target.value, 10) || 0)
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-sm font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-[#162b4d] bg-slate-50/70 dark:bg-[#0b172e] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-[#112038] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              {currentStep < 4 && (
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 3 && isOverCapacity) {
                      toast.warning(
                        `${currentSelectedClass?.name} lessons (${totalClassLessons}) exceed available weekly slots (${totalWeeklyAvailableSlots}). Please reduce lessons before continuing.`
                      );
                      return;
                    }
                    setCurrentStep(currentStep + 1);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Next Step
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Save Settings and Save & Generate buttons appear ONLY on the last step (Step 4) */}
            {currentStep === 4 && (
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveConfig(false)}
                  disabled={saving || isAuthorizing}
                  className="px-4 py-2 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 text-xs font-bold flex items-center gap-2 hover:bg-sky-100 transition-colors cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveConfig(true)}
                  disabled={saving || isAuthorizing}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save & Generate Live Timetable'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <PasswordConfirmModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onConfirm={handleAuthorizeAndGenerate}
        isSubmitting={isAuthorizing}
        title="Authorize School Timetable Generation"
        warningMessage="Generating or updating the live timetable will refresh scheduled periods across all Grades 4–9 and staff schedules. This action requires your Deputy Head Teacher password."
      />
    </AnimatePresence>
  );
};
