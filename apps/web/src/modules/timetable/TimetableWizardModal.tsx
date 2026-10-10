import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, BookOpen, UserCheck, CheckCircle2, Plus, Trash2,
  Sparkles, AlertCircle, HelpCircle, Save, Zap, ChevronRight, ChevronLeft,
  X, Layers, Info
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

  // CBC Standard Presets
  const applyCbcPresets = () => {
    const updated: Record<string, Record<string, any>> = {};

    classesList.forEach((cls) => {
      updated[cls.id] = {};
      const isJunior = cls.levelCategory === 'JUNIOR';

      subjectsList.forEach((sub) => {
        const nameUpper = sub.name.toUpperCase();
        let weekly = 3;
        let allowsDouble = false;
        let doubleCount = 0;

        if (nameUpper.includes('MATHEMATICS') || nameUpper.includes('MATH')) {
          weekly = 5;
        } else if (nameUpper.includes('ENGLISH')) {
          weekly = 5;
        } else if (nameUpper.includes('KISWAHILI')) {
          weekly = 4;
        } else if (nameUpper.includes('SCIENCE') || nameUpper.includes('INTEGRATED SCIENCE')) {
          weekly = isJunior ? 5 : 4;
          allowsDouble = true;
          doubleCount = 1;
        } else if (nameUpper.includes('SOCIAL STUDIES')) {
          weekly = 3;
        } else if (nameUpper.includes('RELIGIOUS') || nameUpper.includes('CRE') || nameUpper.includes('IRE')) {
          weekly = 3;
        } else if (nameUpper.includes('CREATIVE ARTS') || nameUpper.includes('MUSIC') || nameUpper.includes('ART')) {
          weekly = 3;
          allowsDouble = true;
          doubleCount = 1;
        } else if (nameUpper.includes('AGRICULTURE') || nameUpper.includes('NUTRITION')) {
          weekly = 3;
          allowsDouble = true;
          doubleCount = 1;
        } else if (nameUpper.includes('PRE-TECHNICAL')) {
          weekly = 4;
          allowsDouble = true;
          doubleCount = 1;
        } else {
          weekly = 3;
        }

        updated[cls.id][sub.id] = {
          weeklyLessons: weekly,
          doubleLessonsAllowed: allowsDouble,
          doubleLessonCount: doubleCount,
        };
      });
    });

    setSubjectRequirements(updated);
    toast.success('Recommended Kenya CBC lesson distribution applied across all grades!');
  };

  const handleSaveConfig = async (triggerGenerate = false) => {
    try {
      setSaving(true);

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
        toast.success('Timetable settings saved successfully.');
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

  const removeBreak = (id: string) => {
    setBreaks(breaks.filter((b) => b.id !== id));
  };

  const updateBreak = (id: string, field: string, value: any) => {
    setBreaks(
      breaks.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs"
        />

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
                const Icon = step.icon;
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
                        <strong>Foundation Setup:</strong> Assemblies and morning devotions occur before school start time. The timetable schedules lessons between your declared start and finish times.
                      </div>
                    </div>

                    {/* School Days */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        School Days
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

                    {/* Start Time, End Time & Period Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          First Lesson Start Time
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b172e] text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Regular End Time (Mon-Thu)
                        </label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b172e] text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Lesson Duration (Minutes)
                        </label>
                        <select
                          value={lessonDurationMinutes}
                          onChange={(e) => setLessonDurationMinutes(parseInt(e.target.value, 10))}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b172e] text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-sky-500"
                        >
                          <option value={35}>35 Minutes</option>
                          <option value={40}>40 Minutes (Standard CBC)</option>
                          <option value={45}>45 Minutes</option>
                          <option value={50}>50 Minutes</option>
                        </select>
                      </div>
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
                            Configure Tea Breaks, Lunch, and prayer intervals.
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
                        {breaks.map((b) => (
                          <div
                            key={b.id}
                            className="p-3.5 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-slate-50/50 dark:bg-[#0b172e] flex flex-col sm:flex-row items-center gap-3"
                          >
                            <input
                              type="text"
                              value={b.name}
                              onChange={(e) => updateBreak(b.id, 'name', e.target.value)}
                              placeholder="Break Name"
                              className="w-full sm:flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-xs"
                            />
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <span className="text-[11px] text-slate-400">From</span>
                              <input
                                type="time"
                                value={b.startTime}
                                onChange={(e) => updateBreak(b.id, 'startTime', e.target.value)}
                                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-xs"
                              />
                              <span className="text-[11px] text-slate-400">To</span>
                              <input
                                type="time"
                                value={b.endTime}
                                onChange={(e) => updateBreak(b.id, 'endTime', e.target.value)}
                                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-xs"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeBreak(b.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Friday Special Jumuaa Schedule */}
                    <div className="p-4 rounded-2xl border border-sky-100 dark:border-[#162b4d] bg-sky-50/40 dark:bg-[#0b172e]/60 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                              FRIDAY SPECIAL
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              Friday Jumuaa Prayer & Afternoon Schedule
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Accounting for Jumuaa prayers in the nearby mosque with prompt afternoon resumption at 2:00 PM.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={fridaySpecial.isSpecial}
                          onChange={(e) =>
                            setFridaySpecial({ ...fridaySpecial, isSpecial: e.target.checked })
                          }
                          className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                      </div>

                      {fridaySpecial.isSpecial && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                              Jumuaa Break Starts
                            </label>
                            <input
                              type="time"
                              value={fridaySpecial.jummahBreakStart}
                              onChange={(e) =>
                                setFridaySpecial({ ...fridaySpecial, jummahBreakStart: e.target.value })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-xs"
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
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-xs font-bold text-sky-700 dark:text-sky-300"
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
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 3: Subject Lessons & Double Periods */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Subject Allocation & Double Periods
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Customize weekly lessons and double-period frequency for Grades 4 to 9.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={applyCbcPresets}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-bold flex items-center gap-2 hover:opacity-90 shadow-xs transition-opacity cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Apply Recommended CBC Presets
                      </button>
                    </div>

                    {/* Class Selector Tabs */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 dark:border-[#162b4d]">
                      {classesList.map((cls) => (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => setSelectedClassTab(cls.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                            selectedClassTab === cls.id
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-[#0d1c38] text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {cls.name}
                        </button>
                      ))}
                    </div>

                    {/* Subject Rows for Selected Class */}
                    {selectedClassTab && (
                      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                        {subjectsList.map((sub) => {
                          const req =
                            subjectRequirements[selectedClassTab]?.[sub.id] || {
                              weeklyLessons: 3,
                              doubleLessonsAllowed: false,
                              doubleLessonCount: 0,
                            };

                          const updateReq = (field: string, value: any) => {
                            setSubjectRequirements({
                              ...subjectRequirements,
                              [selectedClassTab]: {
                                ...(subjectRequirements[selectedClassTab] || {}),
                                [sub.id]: {
                                  ...req,
                                  [field]: value,
                                },
                              },
                            });
                          };

                          return (
                            <div
                              key={sub.id}
                              className="p-3 rounded-xl border border-slate-100 dark:border-[#162b4d] bg-slate-50/50 dark:bg-[#0b172e] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
                            >
                              <div className="w-full sm:w-1/3">
                                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                  {sub.name}
                                </span>
                                <span className="text-[10px] text-slate-400">{sub.code}</span>
                              </div>

                              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-slate-500">Weekly Lessons:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={req.weeklyLessons ?? 3}
                                    onChange={(e) =>
                                      updateReq('weeklyLessons', parseInt(e.target.value, 10) || 1)
                                    }
                                    className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-center font-bold"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={req.doubleLessonsAllowed ?? false}
                                      onChange={(e) =>
                                        updateReq('doubleLessonsAllowed', e.target.checked)
                                      }
                                      className="rounded text-sky-600 cursor-pointer"
                                    />
                                    <span>Double Lesson</span>
                                  </label>

                                  {req.doubleLessonsAllowed && (
                                    <select
                                      value={req.doubleLessonCount ?? 1}
                                      onChange={(e) =>
                                        updateReq('doubleLessonCount', parseInt(e.target.value, 10))
                                      }
                                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-[11px]"
                                    >
                                      <option value={1}>1 double / wk</option>
                                      <option value={2}>2 doubles / wk</option>
                                    </select>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: Teacher Workload Limits & Administration Caps */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="p-4 rounded-xl bg-sky-50/60 dark:bg-[#0b1b36] border border-sky-100 dark:border-sky-900/40 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2.5">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Fair Workload & Rest Hours:</strong> To ensure teaching quality and prevent fatigue, set the limits on consecutive lessons and specify weekly limits for administrative leaders (Deputy Head & Headteacher).
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-slate-50/50 dark:bg-[#0b172e]">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Max Consecutive Lessons
                        </label>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Maximum lessons a teacher can teach without a break or free period.
                        </p>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={maxConsecutiveLessons}
                          onChange={(e) => setMaxConsecutiveLessons(parseInt(e.target.value, 10) || 1)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-sm font-bold"
                        />
                      </div>

                      <div className="p-4 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-slate-50/50 dark:bg-[#0b172e]">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
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
                          onChange={(e) => setMinFreePeriodsPerWeek(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-sm font-bold"
                        />
                      </div>
                    </div>

                    {/* Administrative Caps Section */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Administrative Staff Workload Caps (Optional)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        Deputy Head Teacher and Headteacher lesson caps. Leave blank if standard load applies.
                      </p>

                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                        {teachersList
                          .filter(
                            (t: any) =>
                              t.roleName === 'DEPUTY_HEAD' ||
                              t.roleName === 'HEAD_TEACHER' ||
                              t.roleName === 'DOS'
                          )
                          .map((teacher) => {
                            const currentLimit = specialStaffLimits[teacher.id] ?? '';

                            return (
                              <div
                                key={teacher.id}
                                className="p-3 rounded-xl border border-slate-100 dark:border-[#162b4d] bg-white dark:bg-[#0b172e] flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                    {teacher.firstName} {teacher.lastName}
                                  </span>
                                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                                    {teacher.roleName?.replace('_', ' ')}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-slate-500">Max Lessons / Week:</span>
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
                                        delete copy[teacher.id];
                                        setSpecialStaffLimits(copy);
                                      } else {
                                        setSpecialStaffLimits({
                                          ...specialStaffLimits,
                                          [teacher.id]: parseInt(val, 10),
                                        });
                                      }
                                    }}
                                    className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-center font-bold"
                                  />
                                </div>
                              </div>
                            );
                          })}
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
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Next Step
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

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
