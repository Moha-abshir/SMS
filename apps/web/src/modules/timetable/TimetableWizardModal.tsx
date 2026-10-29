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
  const [maxStepReached, setMaxStepReached] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
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

  // Under-allocated warning modal state (Pre-generation validation)
  const [underAllocatedModalData, setUnderAllocatedModalData] = useState<{
    isOpen: boolean;
    classes: { id: string; name: string; count: number; missing: number }[];
  }>({ isOpen: false, classes: [] });

  // Post-generation conflict report modal state
  const [generationReportData, setGenerationReportData] = useState<{
    isOpen: boolean;
    totalSlots: number;
    totalRequired: number;
    unplacedLessons: any[];
  }>({ isOpen: false, totalSlots: 0, totalRequired: 0, unplacedLessons: [] });

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

    setCurrentStep(1);
    setMaxStepReached(1);

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

  const validateSettings = (): boolean => {
    if (isOverCapacity) {
      toast.error(
        `${currentSelectedClass?.name} exceeds available weekly lessons (${totalClassLessons} > ${totalWeeklyAvailableSlots}).`
      );
      return false;
    }

    // Validate breaks time ranges
    for (const b of breaks) {
      if (b.startTime && b.endTime && timeToMinutes(b.endTime) <= timeToMinutes(b.startTime)) {
        toast.error(`Break "${b.name || 'Break'}" has invalid times: End time must be after start time.`);
        return false;
      }
    }

    // Validate Friday Jummah prayer routine if enabled
    if (fridaySpecial.isSpecial) {
      const jStart = timeToMinutes(fridaySpecial.jummahBreakStart);
      const jReturn = timeToMinutes(fridaySpecial.afternoonReturnTime);
      if (jReturn <= jStart) {
        toast.error('Friday afternoon return time must be after Jummah break start time.');
        return false;
      }
    }

    return true;
  };

  const getSettingsPayload = () => ({
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
      specialStaffLimits: {},
    },
  });

  // Action 1: Save settings only without generating (allows Deputy to return and resume anytime)
  const handleSaveSettingsOnly = async () => {
    if (!validateSettings()) return;

    try {
      setIsSavingSettings(true);
      await apiClient.post('/api/timetable/config', getSettingsPayload());
      toast.success('Settings saved successfully.');
      onClose();
    } catch (err: any) {
      console.error('Error saving timetable config:', err);
      toast.error(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Action 2: Actually initiate the timetable generation flow
  const handleGenerateTimetable = async () => {
    if (!validateSettings()) return;

    try {
      setIsGenerating(true);

      // Auto-save the latest settings before initiating generation
      await apiClient.post('/api/timetable/config', getSettingsPayload());

      // Pre-generation validation across ALL classes
      const underAllocated: { id: string; name: string; count: number; missing: number }[] = [];
      const overAllocated: { name: string; count: number; excess: number }[] = [];

      for (const cls of classesList) {
        const clsSubjects = subjectsList.filter((s: any) => s.levelCategory === cls.levelCategory);
        let clsLessons = 0;
        for (const sub of clsSubjects) {
          const req = getSubjectReq(cls.id, sub);
          clsLessons += req.lessons;
        }
        if (clsLessons > totalWeeklyAvailableSlots) {
          overAllocated.push({
            name: cls.name,
            count: clsLessons,
            excess: clsLessons - totalWeeklyAvailableSlots,
          });
        } else if (clsLessons < totalWeeklyAvailableSlots) {
          underAllocated.push({
            id: cls.id,
            name: cls.name,
            count: clsLessons,
            missing: totalWeeklyAvailableSlots - clsLessons,
          });
        }
      }

      if (overAllocated.length > 0) {
        toast.error(
          `Cannot generate: ${overAllocated.map((c) => `${c.name} (${c.count}/${totalWeeklyAvailableSlots})`).join(', ')} exceed weekly lesson capacity.`
        );
        return;
      }

      if (underAllocated.length > 0) {
        setUnderAllocatedModalData({
          isOpen: true,
          classes: underAllocated,
        });
        return;
      }

      setIsPasswordModalOpen(true);
    } catch (err: any) {
      console.error('Error preparing timetable generation:', err);
      toast.error(err.response?.data?.message || 'Failed to prepare generation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAuthorizeAndGenerate = async (password: string) => {
    setIsAuthorizing(true);
    try {
      const genRes = await apiClient.post(
        '/api/timetable/generate',
        {
          academicYear,
          term,
          password,
        },
        {
          headers: {
            'X-Skip-Auth-Redirect': 'true',
          },
        }
      );
      const data = genRes.data?.data;
      setIsPasswordModalOpen(false);

      if (data?.unplacedLessons && data.unplacedLessons.length > 0) {
        // Close the wizard setup dialog so user isn't trapped in the wizard
        onClose();
        // Immediately notify parent view to load the freshly generated timetable
        onGenerated();
        // Open the warnings report dialog cleanly at top level
        setGenerationReportData({
          isOpen: true,
          totalSlots: data.count || data.totalSlots || 0,
          totalRequired: data.totalRequiredLessons || 0,
          unplacedLessons: data.unplacedLessons,
        });
        toast.warn(
          `Timetable generated with ${data.count} lessons. ${data.unplacedLessons.length} lessons could not be scheduled due to constraints.`
        );
      } else {
        toast.success(genRes.data?.message || 'Timetable generated with 100% full coverage (0 free periods)!');
        onClose();
        onGenerated();
      }
    } catch (err: any) {
      console.error('Error generating timetable:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to generate timetable';
      toast.error(msg);
      throw new Error(msg);
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Helper for Break Operations
  const addBreak = () => {
    let defaultStart = '11:00';
    let defaultEnd = '11:30';

    if (breaks.length > 0) {
      const validExisting = breaks
        .filter((b) => b && b.endTime && timeToMinutes(b.endTime) > 0)
        .sort((a, b) => timeToMinutes(a.endTime) - timeToMinutes(b.endTime));

      if (validExisting.length > 0) {
        const lastBreak = validExisting[validExisting.length - 1];
        const lastEndMins = timeToMinutes(lastBreak.endTime);
        const nextStartMins = lastEndMins + 40;
        const nextEndMins = nextStartMins + 30;
        const endLimitMins = timeToMinutes(endTime) || 940;

        if (nextEndMins <= endLimitMins) {
          const pad = (n: number) => String(n).padStart(2, '0');
          defaultStart = `${pad(Math.floor(nextStartMins / 60))}:${pad(nextStartMins % 60)}`;
          defaultEnd = `${pad(Math.floor(nextEndMins / 60))}:${pad(nextEndMins % 60)}`;
        }
      }
    }

    const newBreak = {
      id: `break-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `Break ${breaks.length + 1}`,
      startTime: defaultStart,
      endTime: defaultEnd,
      days: ['ALL'],
    };
    setBreaks([...breaks, newBreak]);
  };

  const updateBreak = (index: number, field: string, value: any) => {
    setBreaks((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  const removeBreak = (index: number) => {
    setBreaks((prev) => prev.filter((_, i) => i !== index));
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
  // Completely freeze-proof and guarded against empty, zero, inverted, or equal times
  const totalWeeklyAvailableSlots = useMemo(() => {
    const lessonDuration = Math.max(15, Number(lessonDurationMinutes) || 40);
    const dayStartMins = timeToMinutes(startTime) || 480;
    const defaultEndMins = timeToMinutes(endTime) || 940;

    // Filter to strictly valid breaks (valid non-empty times where end > start)
    const validBreaks = (breaks || []).filter((b) => {
      if (!b || !b.startTime || !b.endTime) return false;
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);
      return bStart > 0 && bEnd > bStart;
    });

    // Sanitize Friday Jummah
    const isFridaySpecial = Boolean(fridaySpecial?.isSpecial);
    const jummahStartMins = timeToMinutes(fridaySpecial?.jummahBreakStart);
    const jummahReturnMins = timeToMinutes(fridaySpecial?.afternoonReturnTime);
    const validJummah =
      isFridaySpecial &&
      jummahStartMins > 0 &&
      jummahReturnMins > jummahStartMins;
    const fridayDismissalMins = timeToMinutes(fridaySpecial?.afternoonDismissalTime);

    let totalTeachingSlots = 0;

    for (const day of schoolDays) {
      const isFriday = day.toUpperCase() === 'FRIDAY';
      const dayEndMins =
        isFriday && validJummah && fridayDismissalMins > dayStartMins
          ? fridayDismissalMins
          : defaultEndMins;

      if (dayEndMins <= dayStartMins + lessonDuration) {
        continue;
      }

      // Applicable breaks for this day
      const dayBreaks = validBreaks.filter((b) => {
        if (!b.days || b.days.length === 0 || b.days.includes('ALL')) return true;
        return b.days.map((d) => d.toUpperCase()).includes(day.toUpperCase());
      });
      dayBreaks.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

      let currentTimeMins = dayStartMins;
      let watchdog = 0;

      while (currentTimeMins + lessonDuration <= dayEndMins) {
        if (++watchdog > 100) break; // Hard safety watchdog to guarantee zero browser freezes

        // Friday Jummah break handling
        if (isFriday && validJummah) {
          if (currentTimeMins < jummahReturnMins && currentTimeMins + lessonDuration > jummahStartMins) {
            currentTimeMins = Math.max(currentTimeMins + 1, jummahReturnMins);
            continue;
          }
        }

        // Check regular breaks
        const upcomingBreak = dayBreaks.find((b) => {
          const bStart = timeToMinutes(b.startTime);
          const bEnd = timeToMinutes(b.endTime);
          return currentTimeMins < bEnd && currentTimeMins + lessonDuration > bStart;
        });

        if (upcomingBreak) {
          const bEnd = timeToMinutes(upcomingBreak.endTime);
          currentTimeMins = Math.max(currentTimeMins + 1, bEnd);
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
        r.includes('PRINCIPAL') ||
        name.includes('MOHAMED ABSHIR') ||
        name.includes('ABDI MOHA')
      );
    });
  }, [teachersList]);

  // Navigate to next step with capacity validation
  const handleNextStep = () => {
    if (currentStep === 3 && isOverCapacity) {
      toast.warning(
        `${currentSelectedClass?.name} lessons (${totalClassLessons}) exceed available weekly slots (${totalWeeklyAvailableSlots}). Please reduce lessons before continuing.`
      );
      return;
    }
    const next = currentStep + 1;
    setCurrentStep(next);
    setMaxStepReached((prev) => Math.max(prev, next));
  };

  if (!isOpen && !underAllocatedModalData.isOpen && !generationReportData.isOpen && !isPasswordModalOpen) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && !isPasswordModalOpen && (
          <div key="timetable-wizard-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            {/* Backdrop overlay */}
            <motion.div
              key="timetable-wizard-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs"
            />

            {/* Modal Window Container */}
            <motion.div
              key="timetable-wizard-dialog"
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
                { num: 4, label: 'Staff Constraints', icon: UserCheck },
              ].map((step) => {
                const isActive = currentStep === step.num;
                const isPassed = currentStep > step.num;
                const isReached = step.num <= maxStepReached;

                return (
                  <button
                    key={step.num}
                    type="button"
                    disabled={!isReached}
                    onClick={() => {
                      if (isReached) {
                        setCurrentStep(step.num);
                      }
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 font-bold cursor-default'
                        : isPassed
                        ? 'text-emerald-700 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-[#0d1c38] cursor-pointer'
                        : isReached
                        ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0d1c38] cursor-pointer'
                        : 'text-slate-400/50 dark:text-slate-600 opacity-40 cursor-not-allowed select-none'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isActive
                          ? 'bg-sky-600 text-white'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : isReached
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600'
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
                        {breaks.length === 0 ? (
                          <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                            No break intervals added yet. Click &quot;Add Break&quot; above to schedule morning tea or lunch breaks.
                          </div>
                        ) : (
                          breaks.map((b, idx) => {
                            const isInvalidRange =
                              Boolean(b.startTime) &&
                              Boolean(b.endTime) &&
                              timeToMinutes(b.endTime) <= timeToMinutes(b.startTime);

                            return (
                              <div
                                key={b.id || `break-row-${idx}`}
                                className={`p-3.5 rounded-xl border ${
                                  isInvalidRange
                                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20'
                                    : 'border-slate-100 dark:border-[#162b4d] bg-slate-50/50 dark:bg-[#0b172e]'
                                } flex flex-col gap-2 text-xs`}
                              >
                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
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
                                    title="Delete Break"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                {isInvalidRange && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium pl-1">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    <span>End time should be after start time</span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
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
                          const clsSubjects = subjectsList.filter((s: any) => s.levelCategory === cls.levelCategory);
                          let clsLessons = 0;
                          for (const sub of clsSubjects) {
                            const req = getSubjectReq(cls.id, sub);
                            clsLessons += req.lessons;
                          }
                          const isClsBalanced = clsLessons === totalWeeklyAvailableSlots;
                          const isClsOver = clsLessons > totalWeeklyAvailableSlots;

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
                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                  isSelected
                                    ? isClsBalanced
                                      ? 'bg-emerald-500/80 text-white'
                                      : isClsOver
                                      ? 'bg-rose-500/80 text-white'
                                      : 'bg-amber-400 text-slate-900'
                                    : isClsBalanced
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                    : isClsOver
                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                {clsLessons}/{totalWeeklyAvailableSlots}
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
                          : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isOverCapacity ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : isBalanced ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
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
                              100% Balanced ({totalClassLessons} / {totalWeeklyAvailableSlots} slots scheduled — 0 free periods).
                            </span>
                          ) : (
                            <span className="text-amber-800 dark:text-amber-300 font-semibold">
                              Incomplete ({totalClassLessons} of {totalWeeklyAvailableSlots} lessons). Students cannot have free time — please allocate {remainingSlots} more lessons.
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

                {/* STEP 4: Administrative Routines & Teacher Workload */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    {/* Administrative Leaders Routines Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-4 h-4 text-sky-600" />
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Administrative Leaders Teaching Workload Overview
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        Review the teaching workloads assigned to the Headteacher, Deputy Head, and Director of Studies. To modify any leader's weekly periods, adjust the lessons in Step 3 or reassign subjects in Academic Allocations so students have 100% full lesson coverage with zero free periods.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {adminLeaders.map((leader) => {
                          const leaderAllocations = allocationsList.filter((a: any) => {
                            const teacherId = a.teacher?.id || a.allocation?.teacherId || a.teacherId;
                            return teacherId === leader.id;
                          });
                          const leaderTotalLessons = leaderAllocations.reduce((sum: number, a: any) => {
                            const cId = a.classId || a.class?.id;
                            const sId = a.subjectId || a.subject?.id;
                            const sub = subjectsList.find((s: any) => s.id === sId) || a.subject;
                            if (!cId || !sub) return sum;
                            const req = getSubjectReq(cId, sub);
                            return sum + (req?.lessons || 0);
                          }, 0);

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
                                  <span className="text-[10px] text-slate-400 block">Assigned Lessons</span>
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {leaderTotalLessons} periods ({leaderAllocations.length} subjects)
                                  </span>
                                </div>
                              </div>

                              {leaderAllocations.length > 0 ? (
                                <div className="text-[10px] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-black/30 p-2.5 rounded-xl flex flex-wrap gap-1.5 border border-slate-200/60 dark:border-slate-800/60">
                                  {leaderAllocations.map((a: any, idx: number) => {
                                    const className = a.class?.name || a.className || 'Class';
                                    const subjectName = a.subject?.name || a.subjectCode || a.subjectName || 'Subject';
                                    const subjectCode = a.subject?.code ? ` (${a.subject.code})` : '';
                                    return (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-100/70 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 font-medium"
                                      >
                                        {className}: {subjectName}{subjectCode}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic bg-white/40 dark:bg-black/10 p-2 rounded-xl">
                                  No subjects currently allocated in Class & Subject Allocation
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-2 border-t border-sky-100/80 dark:border-sky-900/40">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  Teaching Load: <strong className="text-slate-800 dark:text-slate-200">{leaderTotalLessons} lessons</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCurrentStep(3)}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
                                >
                                  Modify in Step 3
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
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
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-[#162b4d] bg-slate-50/70 dark:bg-[#0b172e] flex items-center justify-between gap-3 shrink-0">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-[#112038] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Next Step
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSaveSettingsOnly}
                    disabled={isSavingSettings || isGenerating || isAuthorizing}
                    className="px-4 py-2 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 text-xs font-bold flex items-center gap-2 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingSettings ? 'Saving Settings...' : 'Save Settings'}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateTimetable}
                    disabled={isSavingSettings || isGenerating || isAuthorizing}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap className="w-4 h-4" />
                    {isGenerating || isAuthorizing ? 'Generating...' : 'Generate Timetable'}
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
        )}
      </AnimatePresence>

      <PasswordConfirmModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onConfirm={handleAuthorizeAndGenerate}
        isSubmitting={isAuthorizing}
        title="Authorize School Timetable Generation"
        warningMessage="Authorization is required before generating the timetable."
      />

      {/* PRE-GENERATION FREE TIME WARNING MODAL */}
      <AnimatePresence>
        {underAllocatedModalData.isOpen && (
          <div key="under-allocated-modal-wrapper" className="fixed inset-0 z-70 flex items-center justify-center p-4">
            <motion.div
              key="under-allocated-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUnderAllocatedModalData({ isOpen: false, classes: [] })}
              className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs"
            />
            <motion.div
              key="under-allocated-dialog"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#0c182d] border border-amber-200 dark:border-amber-900/60 shadow-xl overflow-hidden p-5 space-y-4 z-10"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Free Time Warning: Incomplete Allocation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Students are not supposed to have free periods. The following classes currently have unallocated slots:
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-black/20 border border-amber-200/60 dark:border-amber-900/40 divide-y divide-amber-100 dark:divide-amber-950 text-xs">
                {underAllocatedModalData.classes.map((c) => (
                  <div key={c.id} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{c.name}</span>
                    <span className="text-amber-700 dark:text-amber-400 font-semibold">
                      {c.count} / {totalWeeklyAvailableSlots} lessons ({c.missing} free periods)
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Would you like to return to Step 3 to allocate the remaining lessons across subjects, or proceed to generate with free periods?
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const firstClassId = underAllocatedModalData.classes[0]?.id;
                    setUnderAllocatedModalData({ isOpen: false, classes: [] });
                    setCurrentStep(3);
                    if (firstClassId) setSelectedClassTab(firstClassId);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Allocate Missing Lessons
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUnderAllocatedModalData({ isOpen: false, classes: [] });
                    setIsPasswordModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Proceed Anyway
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POST-GENERATION REPORT MODAL (When unplaced lessons exist) */}
      <AnimatePresence>
        {generationReportData.isOpen && (
          <div key="generation-report-modal-wrapper" className="fixed inset-0 z-70 flex items-center justify-center p-4">
            <motion.div
              key="generation-report-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setGenerationReportData({ isOpen: false, totalSlots: 0, totalRequired: 0, unplacedLessons: [] });
              }}
              className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs"
            />
            <motion.div
              key="generation-report-dialog"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0c182d] border border-amber-200 dark:border-amber-900/60 shadow-xl overflow-hidden p-5 space-y-4 z-10"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Timetable Generated With Scheduling Warnings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Successfully placed <strong>{generationReportData.totalSlots}</strong> periods. However, {generationReportData.unplacedLessons.length} lessons could not be scheduled due to constraints:
                  </p>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {generationReportData.unplacedLessons.map((item, i) => (
                  <div key={i} className="p-2.5">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                      <span>{item.className} • {item.subjectName}</span>
                      <span className="text-[11px] font-medium text-slate-500">{item.teacherName}</span>
                    </div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setGenerationReportData({ isOpen: false, totalSlots: 0, totalRequired: 0, unplacedLessons: [] });
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Close & View Timetable
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
