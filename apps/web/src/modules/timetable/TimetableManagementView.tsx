import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, BookOpen, Users, Printer, Settings, RefreshCw,
  Sparkles, AlertCircle, ArrowRightLeft, UserCheck, CheckCircle2,
  ChevronDown, X, Info, Download, ShieldCheck
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { TimetableWizardModal } from './TimetableWizardModal';
import { TimetablePrintModal } from './TimetablePrintModal';
import { ConflictModal } from './ConflictModal';

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

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

export const TimetableManagementView: React.FC<TimetableManagementViewProps> = ({ user }) => {
  const userRole = user?.roleName || user?.role || 'TEACHER';
  const isDeputy = userRole === 'DEPUTY_HEAD' || userRole === 'DEPUTY_HEAD_TEACHER';
  const isHeadTeacher = userRole === 'HEAD_TEACHER';

  // Navigation mode: 'master' | 'class' | 'teacher'
  // Head teacher is strictly restricted to viewing their personal timetable
  const [activeTab, setActiveTab] = useState<'master' | 'class' | 'teacher'>(
    isDeputy ? 'master' : 'teacher'
  );

  // Filters & State
  const [loading, setLoading] = useState<boolean>(true);
  const [academicYear, setAcademicYear] = useState<number>(2026);
  const [term, setTerm] = useState<number>(1);
  const [schoolName, setSchoolName] = useState<string>('Eldoret Muslim Academy');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        const [settingsRes, allocRes] = await Promise.all([
          apiClient.get('/api/settings/public'),
          apiClient.get('/api/allocations'),
        ]);

        if (settingsRes.data?.data) {
          if (settingsRes.data.data.schoolName) setSchoolName(settingsRes.data.data.schoolName);
          if (settingsRes.data.data.logoUrl) setLogoUrl(settingsRes.data.data.logoUrl);
        }

        if (allocRes.data?.data) {
          const { academicYear: yr, classes, teachers } = allocRes.data.data;
          if (yr) setAcademicYear(yr);
          const targetClasses = (classes || []).filter(
            (c: any) => c.levelCategory === 'UPPER_PRIMARY' || c.levelCategory === 'JUNIOR'
          );
          setClassesList(targetClasses);
          setTeachersList(teachers || []);

          if (targetClasses.length > 0 && !selectedClassId) {
            setSelectedClassId(targetClasses[0].id);
          }
          if (!selectedTeacherId && teachers?.length > 0) {
            // Find current user or first teacher
            const currentTeacher = teachers.find((t: any) => t.id === user?.id);
            setSelectedTeacherId(currentTeacher ? currentTeacher.id : teachers[0].id);
          }
        }
      } catch (err: any) {
        console.error('Error fetching initial allocations metadata', err);
      }
    };

    init();
  }, [user?.id]);

  // Load Timetable Data based on active tab
  const fetchTimetableData = async () => {
    try {
      setLoading(true);
      setSelectedSwapSlotA(null);

      if (activeTab === 'master') {
        const res = await apiClient.get(
          `/api/timetable/master?academicYear=${academicYear}&term=${term}`
        );
        if (res.data?.data) {
          const { periodsGrid, slots, config, academicYear: yr, term: t } = res.data.data;
          setPeriodsGrid(periodsGrid || {});
          setSlotsList(slots || []);
          setConfig(config);
          if (yr) setAcademicYear(yr);
          if (t) setTerm(t);
        }
      } else if (activeTab === 'class') {
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
      toast.error('Failed to load timetable view');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetableData();
  }, [activeTab, selectedClassId, selectedTeacherId, academicYear, term]);

  // Quick Generate Timetable Action
  const handleGenerate = async () => {
    if (!window.confirm('Regenerate timetable for Grades 4 to 9? This will refresh all teaching periods.')) {
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient.post('/api/timetable/generate', { academicYear, term });
      toast.success(res.data.message || 'Timetable generated successfully!');
      fetchTimetableData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate timetable');
      setLoading(false);
    }
  };

  // Slot click handler for swapping
  const handleSlotClick = async (slot: any) => {
    // Only Deputy Head Teacher can manually adjust slots
    if (!isDeputy) return;

    if (!selectedSwapSlotA) {
      // Step 1: Select slot A
      setSelectedSwapSlotA(slot);
      toast.info(`Selected ${slot.subjectName} (P${slot.periodIndex}, ${slot.dayOfWeek}). Click another slot to swap.`);
    } else {
      // Step 2: Selected slot B -> perform swap
      if (selectedSwapSlotA.id === slot.id) {
        // Deselect if clicked same slot
        setSelectedSwapSlotA(null);
        return;
      }

      // Check if both slots belong to the same class
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

      toast.success(res.data.message || 'Slots swapped successfully!');
      setSelectedSwapSlotA(null);
      setConflictModalData({ isOpen: false, message: '', slotA: null, slotB: null });
      fetchTimetableData();
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.hasConflict) {
        // Courteous conflict warning modal (not screaming!)
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

  // Quick lookup maps
  const singleViewSlotsMap = new Map<string, any>();
  const masterSlotsMap = new Map<string, any>();

  slotsList.forEach((s) => {
    singleViewSlotsMap.set(`${s.dayOfWeek}_${s.periodIndex}`, s);
    if (s.classId) {
      masterSlotsMap.set(`${s.classId}_${s.dayOfWeek}_${s.periodIndex}`, s);
    }
  });

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {isHeadTeacher ? 'My Teaching Timetable' : 'School Timetable (Grades 4–9)'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isHeadTeacher
                  ? `Personal Teaching Schedule • ${user?.firstName || 'Head Teacher'} ${user?.lastName || ''}`
                  : 'Dynamic & Conflict-Free Upper Primary and Junior Secondary Schedule • Eldoret Muslim Academy'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isDeputy && (
            <>
              <button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Settings className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Schedule Settings Wizard
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Regenerate Timetable
              </button>
            </>
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

      {/* Navigation Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        {isHeadTeacher ? (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 font-bold text-xs">
            <UserCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Personal Teaching Schedule</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#091326] rounded-2xl w-fit">
            {isDeputy && (
              <button
                type="button"
                onClick={() => setActiveTab('master')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'master'
                    ? 'bg-white dark:bg-sky-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Master Timetable
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('class')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'class'
                  ? 'bg-white dark:bg-sky-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Class Timetable
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('teacher')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'teacher'
                  ? 'bg-white dark:bg-sky-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Teacher Schedule
            </button>
          </div>
        )}

        {/* Dynamic Filters depending on active tab */}
        <div className="flex items-center gap-3">
          {activeTab === 'class' && !isHeadTeacher && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Select Grade:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-xs font-bold text-slate-800 dark:text-slate-100"
              >
                {classesList.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'teacher' && isDeputy && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Select Teacher:</span>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] text-xs font-bold text-slate-800 dark:text-slate-100"
              >
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
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
              {selectedSwapSlotA.periodIndex}, {selectedSwapSlotA.dayOfWeek}). Click any other slot in this class to swap positions.
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

      {/* MAIN TIMETABLE GRID SECTION */}
      {loading ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Loading timetable schedule...
          </p>
        </div>
      ) : slotsList.length === 0 ? (
        <div className="py-20 text-center p-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-[#091326]">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            No Timetable Slots Generated Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
            The timetable for Academic Year {academicYear}, Term {term} has not been created. Click below to launch the Deputy Setup Wizard.
          </p>
          {isDeputy && (
            <button
              type="button"
              onClick={() => setIsWizardOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Configure & Generate Timetable
            </button>
          )}
        </div>
      ) : activeTab === 'master' ? (
        /* MASTER TIMETABLE VIEW (Grade-by-Grade per Day) */
        <div className="space-y-6">
          {DAYS_OF_WEEK.map((day) => {
            const daySlots = periodsGrid[day] || [];
            if (daySlots.length === 0) return null;

            return (
              <div
                key={day}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#091326] shadow-xs overflow-hidden"
              >
                <div className="px-5 py-3 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-[#0b172e] dark:to-[#081020] text-white flex items-center justify-between">
                  <h3 className="font-bold text-sm tracking-wide uppercase flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    {day} Schedule
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {classesList.length} Classes • Upper Primary & Junior Secondary
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-[#0b172e] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        <th className="p-3 text-left font-bold w-28 shrink-0">Class</th>
                        {daySlots.map((p) => (
                          <th
                            key={p.index}
                            className={`p-2.5 text-center font-bold border-l border-slate-200 dark:border-slate-800 ${
                              p.isBreak
                                ? 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 min-w-[90px]'
                                : 'min-w-[120px]'
                            }`}
                          >
                            {p.isBreak ? (
                              <div>
                                <span className="block text-[11px] uppercase tracking-wider">{p.breakName}</span>
                                <span className="text-[10px] font-normal text-slate-400">
                                  {p.startTime} - {p.endTime}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span>Period {p.index}</span>
                                <span className="block text-[10px] font-normal text-slate-400">
                                  {p.startTime} - {p.endTime}
                                </span>
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {classesList.map((cls) => (
                        <tr key={cls.id} className="hover:bg-slate-50/50 dark:hover:bg-[#0b172e]/50">
                          <td className="p-3 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/30 dark:bg-[#091326]">
                            {cls.name}
                          </td>
                          {daySlots.map((p) => {
                            if (p.isBreak) {
                              return (
                                <td
                                  key={p.index}
                                  className="p-2 border-l border-slate-200 dark:border-slate-800 bg-amber-50/20 dark:bg-amber-950/10 text-center text-[10px] text-amber-700 dark:text-amber-400 italic"
                                >
                                  {p.breakName}
                                </td>
                              );
                            }

                            const slot = masterSlotsMap.get(`${cls.id}_${day}_${p.index}`);
                            const isSelected = selectedSwapSlotA?.id === slot?.id;

                            return (
                              <td
                                key={p.index}
                                className={`p-2 border-l border-slate-200 dark:border-slate-800 align-top transition-colors ${
                                  isSelected
                                    ? 'bg-sky-100/80 dark:bg-sky-950/80 ring-2 ring-sky-500'
                                    : ''
                                }`}
                              >
                                {slot ? (
                                  <div
                                    onClick={() => handleSlotClick(slot)}
                                    className={`p-2 rounded-xl border transition-all cursor-pointer select-none ${getSubjectBadgeColor(
                                      slot.subjectCode || slot.subjectName
                                    )} hover:shadow-xs hover:scale-[1.02]`}
                                    title={`Click to swap ${slot.subjectName}`}
                                  >
                                    <div className="font-bold text-[11px] leading-tight truncate">
                                      {slot.subjectCode || slot.subjectName}
                                    </div>
                                    <div className="text-[10px] opacity-80 truncate mt-0.5 font-medium">
                                      {slot.teacherLastName || slot.teacherFirstName}
                                    </div>
                                    {slot.isDoubleLesson && (
                                      <span className="mt-1 inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-white/70 dark:bg-black/40">
                                        Double {slot.doubleLessonPart ? `(${slot.doubleLessonPart}/2)` : ''}
                                      </span>
                                    )}
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CLASS VIEW OR TEACHER PERSONAL VIEW (Standard Day-by-Day Grid) */
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0b172e] border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {activeTab === 'class' ? `Weekly Schedule: ${activeClassName}` : `Personal Schedule: ${activeTeacherName}`}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {slotsList.length} total lessons assigned
            </span>
          </div>

          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day) => {
              const daySlots = periodsGrid[day] || [];
              if (daySlots.length === 0) return null;

              return (
                <div
                  key={day}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#091326] shadow-xs p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      {day}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {daySlots.filter((s) => !s.isBreak).length} Teaching Periods
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
                    {daySlots.map((p) => {
                      if (p.isBreak) {
                        return (
                          <div
                            key={`${day}-break-${p.index}`}
                            className="p-3 rounded-xl border border-dashed border-amber-300 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col justify-center text-center min-h-[90px]"
                          >
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                              {p.breakName}
                            </span>
                            <span className="text-[9px] text-slate-500 mt-0.5">
                              {p.startTime} - {p.endTime}
                            </span>
                          </div>
                        );
                      }

                      const slot = singleViewSlotsMap.get(`${day}_${p.index}`);
                      const isSelected = selectedSwapSlotA?.id === slot?.id;

                      return (
                        <div
                          key={`${day}-p-${p.index}`}
                          onClick={() => slot && handleSlotClick(slot)}
                          className={`p-3 rounded-xl border flex flex-col justify-between min-h-[90px] transition-all ${
                            isSelected
                              ? 'ring-2 ring-sky-500 bg-sky-50 dark:bg-sky-950/80 shadow-md'
                              : slot
                              ? `${getSubjectBadgeColor(
                                  slot.subjectCode || slot.subjectName
                                )} cursor-pointer hover:shadow-xs hover:scale-[1.02]`
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b172e]/40 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[9px] opacity-75 font-semibold">
                            <span>Period {p.index}</span>
                            <span>{p.startTime}</span>
                          </div>

                          {slot ? (
                            <div className="my-1">
                              <div className="font-bold text-xs leading-tight line-clamp-2">
                                {slot.subjectName}
                              </div>
                              <div className="text-[10px] opacity-80 mt-1 font-medium truncate">
                                {activeTab === 'teacher'
                                  ? slot.className
                                  : `${slot.teacherFirstName || ''} ${slot.teacherLastName || ''}`}
                              </div>
                              {slot.isDoubleLesson && (
                                <span className="mt-1 inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-white/70 dark:bg-black/40">
                                  Double {slot.doubleLessonPart ? `(${slot.doubleLessonPart}/2)` : ''}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-2 text-[10px] italic text-slate-400">
                              Free Period
                            </div>
                          )}

                          <div className="text-[9px] opacity-60 text-right">{p.endTime}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONFIGURATION WIZARD MODAL */}
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
          activeTab === 'master'
            ? 'Master School Timetable (Grades 4–9)'
            : activeTab === 'class'
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
  );
};
