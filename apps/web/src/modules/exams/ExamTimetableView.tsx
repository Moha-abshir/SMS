import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Sparkles, Printer, CheckCircle2, ChevronRight,
  Clock, UserCheck, ArrowLeftRight, Archive, AlertCircle,
  HelpCircle, Calendar, RefreshCw, ChevronDown, Check, Search, X
} from 'lucide-react';
import { toast } from 'react-toastify';
import { parseISO, format, isWeekend, eachDayOfInterval } from 'date-fns';
import { apiClient } from '../../lib/apiClient';
import { formatDate } from '../../lib/formatters';
import { ExamTimetableWizardModal } from './ExamTimetableWizardModal';
import { ExamTimetablePrintModal } from './ExamTimetablePrintModal';

// Reusable Custom Dropdown (No default select elements)
const CustomSelect: React.FC<{
  options: Array<{ id: string; label: string; sublabel?: string; badge?: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
}> = ({ options, selectedId, onSelect, placeholder = 'Select...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === selectedId);
  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sublabel && o.sublabel.toLowerCase().includes(q))
    );
  }, [options, search]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
          isOpen
            ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/50 dark:bg-[#0c1830]'
            : 'border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#091326] hover:border-sky-300 dark:hover:border-sky-500/50'
        } text-slate-800 dark:text-slate-100 min-w-[220px]`}
      >
        <span className="truncate">
          {selected ? (
            <span className="flex items-center gap-2">
              <span>{selected.label}</span>
              {selected.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {selected.badge}
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-[#162b4d] rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl max-h-56 overflow-y-auto"
          >
            {options.length > 5 && (
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#091326] border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            )}
            <div className="p-1 divide-y divide-slate-100 dark:divide-slate-800/40">
              {filtered.length === 0 ? (
                <div className="p-2.5 text-center text-xs text-slate-400 italic">No matches found</div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onSelect(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                      opt.id === selectedId
                        ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-[#142647] text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div>
                      <div>{opt.label}</div>
                      {opt.sublabel && <div className="text-[10px] text-slate-400">{opt.sublabel}</div>}
                    </div>
                    {opt.id === selectedId && <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ExamTimetableView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [showArchiveDrawer, setShowArchiveDrawer] = useState(false);
  const [pickerTargetDate, setPickerTargetDate] = useState<string | null>(null);
  const [reschedulingSession, setReschedulingSession] = useState<any | null>(null);

  // Swapping State (Click-to-Move / Swap)
  const [selectedSwapSlotA, setSelectedSwapSlotA] = useState<any | null>(null);
  const [swapping, setSwapping] = useState(false);

  // Fetch initial exam data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [examsRes, classesRes, settingsRes] = await Promise.all([
        apiClient.get('/api/exams'),
        apiClient.get('/api/admissions/classes'),
        apiClient.get('/api/settings').catch(() => ({ data: { data: null } })),
      ]);

      const exList = examsRes.data?.data || [];
      const rawClsList = classesRes.data?.data || [];
      const clsList = rawClsList.filter((c: any) => c.name.toLowerCase() !== 'playgroup');

      setExams(exList);
      setClassesList(clsList);
      setSchoolSettings(settingsRes.data?.data || null);

      if (exList.length > 0 && !selectedExamId) {
        setSelectedExamId(exList[0].exam.id);
      }
      if (clsList.length > 0 && (!selectedClassId || !clsList.some((c: any) => c.id === selectedClassId))) {
        setSelectedClassId(clsList[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load examination timetable data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch sessions for the selected exam and selected class
  const fetchSessions = async () => {
    if (!selectedExamId || !selectedClassId) {
      setSessions([]);
      return;
    }
    try {
      const res = await apiClient.get(`/api/exams/${selectedExamId}/sessions?classId=${selectedClassId}`);
      setSessions(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch class exam sessions', err);
    }
  };

  useEffect(() => {
    fetchSessions();
    setSelectedSwapSlotA(null);
  }, [selectedExamId, selectedClassId]);

  const selectedExamObj = useMemo(
    () => exams.find((e) => e.exam.id === selectedExamId),
    [exams, selectedExamId]
  );

  const selectedClassObj = useMemo(
    () => classesList.find((c) => c.id === selectedClassId),
    [classesList, selectedClassId]
  );

  // Group active vs previous exams in the academic year
  const activeExamOptions = useMemo(
    () =>
      exams.map((e) => ({
        id: e.exam.id,
        label: e.exam.title,
        sublabel: `${e.term?.year || 2026} Term ${e.term?.termNumber || 1}`,
        badge: e.exam.status,
      })),
    [exams]
  );

  // Group class sessions by exam date
  const sessionsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    sessions.forEach((s) => {
      const d = s.session.sessionDate;
      if (!map[d]) map[d] = [];
      map[d].push(s);
    });

    // Sort papers chronologically in each day
    Object.keys(map).forEach((d) => {
      map[d].sort((a, b) => a.session.sessionTime.localeCompare(b.session.sessionTime));
    });

    return map;
  }, [sessions]);

  // Generate all weekdays across the entire exam series span, ensuring extra days are visible
  const examDates = useMemo(() => {
    const datesSet = new Set<string>();

    if (selectedExamObj?.exam?.startDate && selectedExamObj?.exam?.endDate) {
      try {
        const start = parseISO(selectedExamObj.exam.startDate);
        const end = parseISO(selectedExamObj.exam.endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
          eachDayOfInterval({ start, end })
            .filter((d) => !isWeekend(d))
            .forEach((d) => datesSet.add(format(d, 'yyyy-MM-dd')));
        }
      } catch (e) {
        console.error('Error generating series date range', e);
      }
    }

    // Always include any dates that currently have sessions
    Object.keys(sessionsByDate).forEach((d) => datesSet.add(d));

    return Array.from(datesSet).sort();
  }, [selectedExamObj, sessionsByDate]);

  // Move an exam paper directly to a target day
  const handleMovePaperToDate = async (sessionItem: any, targetDate: string) => {
    if (!sessionItem || swapping) return;
    try {
      setSwapping(true);
      let sessionTime = sessionItem.session.sessionTime;

      // Check if target day already has a paper with the exact same sessionTime
      const existingOnDate = (sessionsByDate[targetDate] || []).filter(
        (s) => s.session.id !== sessionItem.session.id
      );

      const hasExactConflict = existingOnDate.some((s) => s.session.sessionTime === sessionTime);
      if (hasExactConflict) {
        const duration = sessionItem.session.durationMinutes || 60;
        let latestEndMin = 8 * 60; // 08:00 default
        existingOnDate.forEach((s) => {
          const parts = s.session.sessionTime.split('-');
          if (parts.length === 2) {
            const [endH, endM] = parts[1].trim().split(':').map(Number);
            const endMin = (endH || 0) * 60 + (endM || 0);
            if (endMin > latestEndMin) latestEndMin = endMin;
          }
        });
        const newStartMin = latestEndMin + 15;
        const newEndMin = newStartMin + duration;
        const formatMin = (m: number) => {
          const h = Math.floor(m / 60).toString().padStart(2, '0');
          const min = (m % 60).toString().padStart(2, '0');
          return `${h}:${min}`;
        };
        sessionTime = `${formatMin(newStartMin)} - ${formatMin(newEndMin)}`;
      }

      await apiClient.put(`/api/exams/sessions/${sessionItem.session.id}`, {
        sessionDate: targetDate,
        sessionTime,
      });

      const targetFormatted = format(parseISO(targetDate), 'EEEE, dd/MM/yyyy');
      toast.success(`Successfully moved ${sessionItem.subject?.name} to ${targetFormatted}!`);
      setSelectedSwapSlotA(null);
      setPickerTargetDate(null);
      setReschedulingSession(null);
      await fetchSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to move examination paper');
    } finally {
      setSwapping(false);
    }
  };

  // Handle slot click for Move / Swap
  const handleSlotClick = async (clickedSlot: any) => {
    if (swapping) return;

    // If none selected, select slot A
    if (!selectedSwapSlotA) {
      setSelectedSwapSlotA(clickedSlot);
      return;
    }

    // If clicking same slot, deselect
    if (selectedSwapSlotA.session.id === clickedSlot.session.id) {
      setSelectedSwapSlotA(null);
      return;
    }

    // Validate duration matching for swap
    const durA = selectedSwapSlotA.session.durationMinutes || 60;
    const durB = clickedSlot.session.durationMinutes || 60;

    if (durA !== durB) {
      toast.error(
        `Duration Mismatch: Cannot swap ${selectedSwapSlotA.subject?.name} (${durA}m) with ${clickedSlot.subject?.name} (${durB}m). Exam papers can only be swapped between slots of matching duration.`
      );
      return;
    }

    // Execute swap
    try {
      setSwapping(true);
      await apiClient.post('/api/exams/sessions/swap', {
        sessionAId: selectedSwapSlotA.session.id,
        sessionBId: clickedSlot.session.id,
      });

      toast.success(
        `Successfully swapped ${selectedSwapSlotA.subject?.name} and ${clickedSlot.subject?.name}!`
      );
      setSelectedSwapSlotA(null);
      await fetchSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to swap examination sessions');
    } finally {
      setSwapping(false);
    }
  };

  // Status toggle
  const handleTogglePublish = async () => {
    if (!selectedExamObj) return;
    const newStatus = selectedExamObj.exam.status === 'DRAFT' ? 'APPROVED' : 'DRAFT';
    try {
      await apiClient.put(`/api/exams/${selectedExamId}/status`, { status: newStatus });
      toast.success(
        newStatus === 'APPROVED'
          ? 'Examination timetable published and approved!'
          : 'Timetable reverted to Draft mode'
      );
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update timetable status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
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
                Examination Timetabling & Schedules
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate, inspect, and adjust independent class examination timetables • Eldoret Muslim Academy
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            Generate Exam Timetable
          </button>

          <button
            type="button"
            disabled={sessions.length === 0}
            onClick={() => setIsPrintOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b172e] hover:bg-slate-50 dark:hover:bg-[#112038] text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            A4 Print Timetable
          </button>

          {selectedExamObj && (
            <button
              type="button"
              onClick={handleTogglePublish}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                selectedExamObj.exam.status === 'APPROVED'
                  ? 'border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                  : 'border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {selectedExamObj.exam.status === 'APPROVED' ? 'Approved & Published' : 'Approve & Publish'}
            </button>
          )}
        </div>
      </div>

      {/* Series Switcher & History Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#091326] border border-slate-200 dark:border-[#162b4d] rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
            Selected Examination Series:
          </span>
          <CustomSelect
            options={activeExamOptions}
            selectedId={selectedExamId}
            onSelect={(id) => setSelectedExamId(id)}
            placeholder="Select Examination..."
          />
        </div>

        {/* Previous Timetables Archive Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowArchiveDrawer(!showArchiveDrawer)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c1830] hover:bg-slate-100 dark:hover:bg-[#142647] text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5 text-slate-400" />
            Previous Timetables Archive ({exams.length})
          </button>
        </div>
      </div>

      {/* Archive Dropdown list if opened */}
      <AnimatePresence>
        {showArchiveDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-slate-50 dark:bg-[#0c1830] border border-slate-200 dark:border-[#162b4d] rounded-2xl space-y-2 overflow-hidden text-xs"
          >
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Academic Year Examinations Archive</span>
              <span className="text-[11px] text-slate-400">Maintained until academic year ends</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {exams.map((ex) => (
                <button
                  key={ex.exam.id}
                  onClick={() => {
                    setSelectedExamId(ex.exam.id);
                    setShowArchiveDrawer(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    ex.exam.id === selectedExamId
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#091326] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="font-black text-xs">{ex.exam.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {ex.term?.year} Term {ex.term?.termNumber} • Status: {ex.exam.status}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grade Selector Bar (PP1 to Grade 9) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Select Class Timetable to View & Adjust
          </span>
          {selectedClassObj && (
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Grade Tier: <strong className="text-slate-800 dark:text-slate-200">{selectedClassObj.levelCategory}</strong>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {classesList.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedClassId(c.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer shadow-xs ${
                selectedClassId === c.id
                  ? 'bg-sky-600 text-white border border-sky-600'
                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#091326] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0e1a33]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Swapping Mode Helper Alert */}
      <AnimatePresence>
        {selectedSwapSlotA && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-between text-xs text-sky-900 dark:text-sky-200"
          >
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-sky-600 animate-pulse shrink-0" />
              <span>
                <strong>Swapping Mode Active:</strong> Selected{' '}
                <strong className="underline">{selectedSwapSlotA.subject?.name}</strong> (
                {selectedSwapSlotA.session.durationMinutes || 60} mins). Click another slot of matching duration to swap positions.
              </span>
            </div>
            <button
              onClick={() => setSelectedSwapSlotA(null)}
              className="px-2.5 py-1 rounded-lg border border-sky-300 dark:border-sky-700 bg-white dark:bg-[#091326] text-sky-800 dark:text-sky-300 font-bold hover:bg-sky-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Class Timetable Display Board */}
      <div className="p-5 sm:p-6 bg-white dark:bg-[#091326] border border-slate-200 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{selectedClassObj ? selectedClassObj.name : 'Class'} Examination Timetable</span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {sessions.length} Papers Scheduled
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Independent timetable • Altering papers here does not affect other classes
            </p>
          </div>

          {/* Supervisor Information */}
          {sessions.length > 0 && sessions[0].invigilator && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0c1830] border border-slate-200 dark:border-slate-800 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span className="text-slate-500">Class Invigilator:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {sessions[0].invigilator.firstName} {sessions[0].invigilator.lastName}
              </span>
            </div>
          )}
        </div>

        {/* Empty State when no exam dates exist */}
        {examDates.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No examination timetable generated yet for {selectedClassObj?.name || 'this class'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Click "Generate Exam Timetable" at the top right to run the automated timetable generator for all grades.
              </p>
            </div>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Open Generation Wizard
            </button>
          </div>
        ) : (
          /* Table Layout: Rows = Date & Day, Column = Exams */
          <div className="overflow-x-auto -mx-5 sm:-mx-6 -mb-5 sm:-mb-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-[#0c1830] border-y border-slate-200 dark:border-[#162b4d]">
                  <th
                    scope="col"
                    className="w-56 sm:w-64 px-5 sm:px-6 py-3.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 border-r border-slate-200/60 dark:border-[#162b4d]/60"
                  >
                    Date & Day
                  </th>
                  <th
                    scope="col"
                    className="px-5 sm:px-6 py-3.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400"
                  >
                    Exams
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d]/60">
                {examDates.map((dateStr, idx) => {
                  const daySessions = sessionsByDate[dateStr] || [];
                  let dateObj = parseISO(dateStr);
                  if (isNaN(dateObj.getTime())) {
                    dateObj = new Date(dateStr);
                  }
                  const dayOfWeek = !isNaN(dateObj.getTime()) ? format(dateObj, 'EEEE') : 'Exam Day';
                  const formattedDate = !isNaN(dateObj.getTime()) ? format(dateObj, 'dd/MM/yyyy') : dateStr;
                  const friendlyDate = !isNaN(dateObj.getTime()) ? format(dateObj, 'd MMMM yyyy') : dateStr;

                  return (
                    <tr
                      key={dateStr}
                      className="hover:bg-slate-50/40 dark:hover:bg-[#0c1830]/20 transition-colors"
                    >
                      {/* Row Title: Date plus the Day of the exam */}
                      <th
                        scope="row"
                        className="w-56 sm:w-64 px-5 sm:px-6 py-5 align-top border-r border-slate-200/60 dark:border-[#162b4d]/60 bg-slate-50/30 dark:bg-[#0c1830]/20"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                              Day {idx + 1}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                daySessions.length > 0
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                              }`}
                            >
                              {daySessions.length} {daySessions.length === 1 ? 'Paper' : 'Papers'}
                            </span>
                          </div>
                          <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                            {dayOfWeek}, {formattedDate}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {friendlyDate}
                          </div>
                        </div>
                      </th>

                      {/* Column: Exams */}
                      <td className="px-5 sm:px-6 py-5 align-top">
                        {daySessions.length > 0 ? (
                          <div className="flex flex-wrap items-stretch gap-3">
                            {daySessions.map((row) => {
                              const isSelected = selectedSwapSlotA?.session.id === row.session.id;
                              const duration = row.session.durationMinutes || 60;
                              const isCompatible =
                                selectedSwapSlotA &&
                                selectedSwapSlotA.session.id !== row.session.id &&
                                (selectedSwapSlotA.session.durationMinutes || 60) === duration;
                              const isMismatch =
                                selectedSwapSlotA &&
                                selectedSwapSlotA.session.id !== row.session.id &&
                                (selectedSwapSlotA.session.durationMinutes || 60) !== duration;

                              return (
                                <div
                                  key={row.session.id}
                                  onClick={() => handleSlotClick(row)}
                                  className={`min-w-[220px] max-w-[280px] flex-1 p-3.5 rounded-xl border transition-all cursor-pointer text-xs relative flex flex-col justify-between ${
                                    isSelected
                                      ? 'border-sky-500 ring-2 ring-sky-500 bg-sky-50 dark:bg-sky-950/60 shadow-md'
                                      : isCompatible
                                      ? 'border-dashed border-2 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 hover:scale-[1.01]'
                                      : isMismatch
                                      ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#091326] opacity-60'
                                      : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#091326] hover:border-sky-300 dark:hover:border-sky-600 shadow-xs'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <span className="font-mono text-[11px] font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-sky-500" />
                                        {row.session.sessionTime}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {duration}m
                                      </span>
                                    </div>

                                    <div className="font-black text-slate-900 dark:text-slate-100 text-xs sm:text-sm line-clamp-1">
                                      {row.subject?.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                      {row.subject?.code}
                                    </div>
                                  </div>

                                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 space-y-1.5">
                                    {row.invigilator && (
                                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1 truncate">
                                          <UserCheck className="w-3 h-3 text-sky-500 shrink-0" />
                                          <span className="truncate">{row.invigilator.firstName} {row.invigilator.lastName}</span>
                                        </span>
                                        <span className="text-[9px] text-slate-400 uppercase shrink-0">Invigilator</span>
                                      </div>
                                    )}

                                    {isCompatible && (
                                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                                        Click to swap ({duration}m match)
                                      </div>
                                    )}

                                    {isSelected && (
                                      <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                                        <ArrowLeftRight className="w-3 h-3 shrink-0 animate-pulse" />
                                        Selected • Click target slot or day
                                      </div>
                                    )}

                                    {!selectedSwapSlotA && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setReschedulingSession(row);
                                        }}
                                        className="w-full mt-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0c1830] hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 dark:hover:text-sky-300 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <ArrowLeftRight className="w-3 h-3" />
                                        Move to another day
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Quick Move drop target if a paper from another day is selected */}
                            {selectedSwapSlotA && selectedSwapSlotA.session.sessionDate !== dateStr && (
                              <button
                                type="button"
                                onClick={() => handleMovePaperToDate(selectedSwapSlotA, dateStr)}
                                className="min-w-[160px] p-3.5 rounded-xl border-2 border-dashed border-sky-300 dark:border-sky-700 bg-sky-50/50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-800 dark:text-sky-200 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center group shadow-xs"
                              >
                                <ArrowLeftRight className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">Move Exam Here</span>
                                <span className="text-[10px] text-sky-600 dark:text-sky-400">
                                  Add to {dayOfWeek}
                                </span>
                              </button>
                            )}
                          </div>
                        ) : (
                          /* Extra / Available Day (0 papers currently scheduled) */
                          <div className="w-full">
                            {selectedSwapSlotA ? (
                              <button
                                type="button"
                                onClick={() => handleMovePaperToDate(selectedSwapSlotA, dateStr)}
                                className="w-full p-4 rounded-xl border-2 border-dashed border-sky-400 dark:border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-200 transition-all cursor-pointer flex items-center justify-center gap-3 shadow-xs group"
                              >
                                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                                  <ArrowLeftRight className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                  <div className="text-xs font-black">
                                    Allocate / Move "{selectedSwapSlotA.subject?.name}" to {dayOfWeek}, {formattedDate}
                                  </div>
                                  <div className="text-[11px] text-sky-600 dark:text-sky-400">
                                    Click to confirm moving this paper to this open day ({selectedSwapSlotA.session.sessionTime})
                                  </div>
                                </div>
                              </button>
                            ) : (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-[#0c1830]/30 text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                    <Calendar className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      No examination papers scheduled for {dayOfWeek}
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                      This day is open within the exam series window. You can allocate or move exam papers here.
                                    </div>
                                  </div>
                                </div>
                                {sessions.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setPickerTargetDate(dateStr)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091326] hover:border-sky-400 dark:hover:border-sky-500 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                                  >
                                    <ArrowLeftRight className="w-3.5 h-3.5 text-sky-500" />
                                    Move Paper Here
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Picker Modal: When user clicks "Move Paper Here" on a specific day */}
      {pickerTargetDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#091326] border border-slate-200 dark:border-[#162b4d] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Move Exam to {format(parseISO(pickerTargetDate), 'EEEE, dd/MM/yyyy')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select which paper from {selectedClassObj?.name} to allocate to this day:
                </p>
              </div>
              <button
                onClick={() => setPickerTargetDate(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {sessions
                .filter((s) => s.session.sessionDate !== pickerTargetDate)
                .map((s) => (
                  <div
                    key={s.session.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0c1830]/50 hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {s.subject?.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Current: {format(parseISO(s.session.sessionDate), 'EEE, dd/MM')} • {s.session.sessionTime} ({s.session.durationMinutes}m)
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={swapping}
                      onClick={() => handleMovePaperToDate(s, pickerTargetDate)}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Move Here
                    </button>
                  </div>
                ))}
              {sessions.filter((s) => s.session.sessionDate !== pickerTargetDate).length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  All scheduled papers are already on this day.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal: When user clicks "Move to another day" on a specific paper card */}
      {reschedulingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#091326] border border-slate-200 dark:border-[#162b4d] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Move "{reschedulingSession.subject?.name}"
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Currently scheduled for {format(parseISO(reschedulingSession.session.sessionDate), 'EEEE, dd/MM/yyyy')}
                </p>
              </div>
              <button
                onClick={() => setReschedulingSession(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {examDates
                .filter((d) => d !== reschedulingSession.session.sessionDate)
                .map((d) => {
                  const dayPapers = sessionsByDate[d] || [];
                  const dObj = parseISO(d);
                  return (
                    <div
                      key={d}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0c1830]/50 hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                          Day {examDates.indexOf(d) + 1} • {format(dObj, 'EEEE, dd/MM/yyyy')}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {dayPapers.length} {dayPapers.length === 1 ? 'Paper' : 'Papers'} currently scheduled
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={swapping}
                        onClick={() => handleMovePaperToDate(reschedulingSession, d)}
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Move to Day {examDates.indexOf(d) + 1}
                      </button>
                    </div>
                  );
                })}
              {examDates.filter((d) => d !== reschedulingSession.session.sessionDate).length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No other series days available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generation Wizard Modal */}
      {isWizardOpen && (
        <ExamTimetableWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onGenerated={async (newExamId) => {
            if (newExamId) setSelectedExamId(newExamId);
            await fetchData();
            await fetchSessions();
          }}
          existingExamId={selectedExamId}
        />
      )}

      {/* A4 Print Modal */}
      {isPrintOpen && (
        <ExamTimetablePrintModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          exam={selectedExamObj?.exam}
          term={selectedExamObj?.term}
          className={selectedClassObj?.name || 'Class'}
          sessions={sessions}
          breaks={[]}
          schoolSettings={schoolSettings}
        />
      )}
    </div>
  );
};
