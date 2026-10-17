import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, BookOpen, UserCheck, CheckCircle2, Plus, Trash2,
  ChevronRight, ChevronLeft, X, Sparkles, AlertTriangle, Search, ChevronDown, Check
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';

interface ExamTimetableWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (newExamId?: string) => void;
  existingExamId?: string;
}

// Reusable Custom Dropdown
const CustomDropdown: React.FC<{
  label?: string;
  options: Array<{ id: string; label: string; sublabel?: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
}> = ({ label, options, selectedId, onSelect, placeholder = 'Select...' }) => {
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
      {label && <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-xs ${
          isOpen
            ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/50 dark:bg-[#0c1830]'
            : 'border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#091326] hover:border-sky-300 dark:hover:border-sky-500/50'
        } text-slate-800 dark:text-slate-100`}
      >
        <span className="truncate">
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="font-bold">{selected.label}</span>
              {selected.sublabel && <span className="text-[11px] text-slate-400">({selected.sublabel})</span>}
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
            className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-[#162b4d] rounded-xl shadow-xl overflow-hidden backdrop-blur-xl max-h-56 overflow-y-auto"
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
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

export const ExamTimetableWizardModal: React.FC<ExamTimetableWizardModalProps> = ({
  isOpen,
  onClose,
  onGenerated,
  existingExamId,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);

  // Metadata
  const [activeTerm, setActiveTerm] = useState<any>(null);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);

  // Step 1: Series & Daily Timetable Window
  const [examTitle, setExamTitle] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dailyStartTime, setDailyStartTime] = useState<string>('08:00');
  const [dailyEndTime, setDailyEndTime] = useState<string>('15:30');
  const [breaks, setBreaks] = useState<Array<{ id: string; name: string; startTime: string; endTime: string }>>([
    { id: 'b1', name: 'Morning Tea Break', startTime: '10:00', endTime: '10:30' },
    { id: 'b2', name: 'Lunch & Dhuhr Break', startTime: '12:30', endTime: '13:30' },
  ]);

  // Step 2: Subject Durations per Grade: { [gradeName]: { [subjectId]: minutes } }
  const [subjectDurations, setSubjectDurations] = useState<Record<string, Record<string, number>>>({});
  const [selectedGradeTab, setSelectedGradeTab] = useState<string>('');

  // Step 3: Class Invigilators: { [classId]: teacherId }
  const [classInvigilators, setClassInvigilators] = useState<Record<string, string>>({});

  // Load initial data
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [termsRes, clsRes, subRes, stfRes] = await Promise.all([
          apiClient.get('/api/academic-terms'),
          apiClient.get('/api/admissions/classes'),
          apiClient.get('/api/admissions/subjects'),
          apiClient.get('/api/staff'),
        ]);

        const terms = termsRes.data.data || [];
        const currentTerm = terms.find((t: any) => t.isCurrent) || terms[0];
        setActiveTerm(currentTerm);

        const classes = clsRes.data.data || [];
        setClassesList(classes);

        const subjects = subRes.data.data || [];
        setSubjectsList(subjects);

        const staff = stfRes.data.data?.staff || [];
        setTeachersList(staff);

        // Pre-fill defaults
        if (currentTerm) {
          setExamTitle(`End of Term ${currentTerm.termNumber} Examination ${currentTerm.year}`);
          // Default exam dates: next Monday to Friday
          const today = new Date();
          const nextMon = new Date();
          nextMon.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
          const nextFri = new Date(nextMon);
          nextFri.setDate(nextMon.getDate() + 4);

          setStartDate(nextMon.toISOString().split('T')[0]);
          setEndDate(nextFri.toISOString().split('T')[0]);
        }

        // Initialize durations with standard CBC defaults
        const initialDurations: Record<string, Record<string, number>> = {};
        classes.forEach((c: any) => {
          if (!initialDurations[c.name]) {
            initialDurations[c.name] = {};
            const matchingSubs = subjects.filter((s: any) => s.levelCategory === c.levelCategory);
            matchingSubs.forEach((s: any) => {
              let def = 90;
              if (c.levelCategory === 'PPE') def = 45;
              else if (c.levelCategory === 'LOWER_PRIMARY') def = 60;
              else if (c.levelCategory === 'UPPER_PRIMARY') def = 80;
              initialDurations[c.name][s.id] = def;
            });
          }
        });
        setSubjectDurations(initialDurations);
        if (classes.length > 0) {
          setSelectedGradeTab(classes[0].name);
        }

        // Initialize invigilators with class teacher or empty
        const initialInvigs: Record<string, string> = {};
        classes.forEach((c: any) => {
          if (c.classTeacherId) {
            initialInvigs[c.id] = c.classTeacherId;
          }
        });
        setClassInvigilators(initialInvigs);
      } catch (err: any) {
        toast.error('Failed to load timetable metadata');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen]);

  // Weekdays calculation
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return 0;

    let count = 0;
    const curr = new Date(start);
    while (curr <= end) {
      const day = curr.getDay();
      if (day !== 0 && day !== 6) count++;
      curr.setDate(curr.getDate() + 1);
    }
    return count;
  }, [startDate, endDate]);

  const handleAddBreak = () => {
    const id = `b_${Date.now()}`;
    setBreaks([...breaks, { id, name: 'Short Break', startTime: '14:30', endTime: '14:45' }]);
  };

  const handleRemoveBreak = (id: string) => {
    setBreaks(breaks.filter((b) => b.id !== id));
  };

  const handleUpdateBreak = (id: string, field: string, val: string) => {
    setBreaks(breaks.map((b) => (b.id === id ? { ...b, [field]: val } : b)));
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      toast.error('Please specify start and end dates');
      return;
    }
    if (calculatedDays === 0) {
      toast.error('Exam period must have at least one weekday');
      return;
    }

    try {
      setGenerating(true);

      let examId = existingExamId;

      // If no existing exam, create exam series first
      if (!examId) {
        const createRes = await apiClient.post('/api/exams', {
          title: examTitle || `Examination ${activeTerm?.year || 2026}`,
          termId: activeTerm.id,
          startDate,
          endDate,
          status: 'DRAFT',
        });
        examId = createRes.data.data.id;
      }

      // Generate timetable
      const genRes = await apiClient.post('/api/exams/generate-timetable', {
        examId,
        startDate,
        endDate,
        dailyStartTime,
        dailyEndTime,
        breaks,
        gradeSubjectDurations: subjectDurations,
        classInvigilators,
      });

      toast.success(genRes.data.message || 'Exam timetable generated successfully!');
      onGenerated(examId);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate examination timetable');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-4xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#162b4d] flex items-center justify-between bg-slate-50/60 dark:bg-[#091326]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                Examination Timetable Generator
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Automated scheduling wizard for all grades (PP1 to Grade 9)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Steps */}
        <div className="grid grid-cols-4 border-b border-slate-200 dark:border-[#162b4d] text-center text-xs font-bold divide-x divide-slate-200 dark:divide-[#162b4d] bg-white dark:bg-[#0c1830]">
          <div className={`py-2.5 px-2 flex items-center justify-center gap-2 ${currentStep === 1 ? 'text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30 font-black' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">1</span>
            <span className="hidden sm:inline">Timing & Breaks</span>
          </div>
          <div className={`py-2.5 px-2 flex items-center justify-center gap-2 ${currentStep === 2 ? 'text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30 font-black' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">2</span>
            <span className="hidden sm:inline">Subject Durations</span>
          </div>
          <div className={`py-2.5 px-2 flex items-center justify-center gap-2 ${currentStep === 3 ? 'text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30 font-black' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">3</span>
            <span className="hidden sm:inline">Class Invigilators</span>
          </div>
          <div className={`py-2.5 px-2 flex items-center justify-center gap-2 ${currentStep === 4 ? 'text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30 font-black' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">4</span>
            <span className="hidden sm:inline">Review & Generate</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400 font-medium">Loading school metadata...</p>
            </div>
          ) : (
            <>
              {/* STEP 1: Exam Timing & Breaks */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="p-3 bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 rounded-xl text-xs text-sky-800 dark:text-sky-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold">Active Academic Term:</span> {activeTerm?.year} Term {activeTerm?.termNumber}
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Synchronized
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Examination Series Title
                    </label>
                    <input
                      type="text"
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      placeholder="e.g. End of Term 1 Examination 2026"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#091326] text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Exam Period Start Date *
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#091326] text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Exam Period End Date *
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#091326] text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    <span>Calculated Weekdays: <strong>{calculatedDays} days</strong> (weekends excluded automatically)</span>
                  </div>

                  {/* Daily Windows & Breaks */}
                  <div className="pt-3 border-t border-slate-200 dark:border-[#162b4d]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Common Daily Exam Window (All Grades)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Daily Papers Start Time
                        </label>
                        <input
                          type="time"
                          value={dailyStartTime}
                          onChange={(e) => setDailyStartTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#091326] text-xs font-mono text-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Daily Dismissal / End Time
                        </label>
                        <input
                          type="time"
                          value={dailyEndTime}
                          onChange={(e) => setDailyEndTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#091326] text-xs font-mono text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Breaks */}
                  <div className="pt-3 border-t border-slate-200 dark:border-[#162b4d] space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Daily Breaks & Recess
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddBreak}
                        className="px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Break
                      </button>
                    </div>

                    <div className="space-y-2">
                      {breaks.map((b) => (
                        <div key={b.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-slate-50/50 dark:bg-[#091326]/50">
                          <input
                            type="text"
                            value={b.name}
                            onChange={(e) => handleUpdateBreak(b.id, 'name', e.target.value)}
                            placeholder="Break Name"
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#0c1830] text-xs text-slate-800 dark:text-slate-200"
                          />
                          <input
                            type="time"
                            value={b.startTime}
                            onChange={(e) => handleUpdateBreak(b.id, 'startTime', e.target.value)}
                            className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#0c1830] text-xs font-mono text-slate-800 dark:text-slate-200"
                          />
                          <span className="text-xs text-slate-400">to</span>
                          <input
                            type="time"
                            value={b.endTime}
                            onChange={(e) => handleUpdateBreak(b.id, 'endTime', e.target.value)}
                            className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#0c1830] text-xs font-mono text-slate-800 dark:text-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveBreak(b.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Grade-Specific Subject Durations */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Paper Durations per Grade (Minutes)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select a grade to customize duration for each paper. Defaults comply with CBC requirements.
                    </p>
                  </div>

                  {/* Grade Selector Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                    {classesList.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedGradeTab(c.name)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                          selectedGradeTab === c.name
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#091326] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#142647]'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>

                  {/* Subjects for the selected grade */}
                  {selectedGradeTab && (
                    <div className="rounded-xl border border-slate-200 dark:border-[#162b4d] overflow-hidden">
                      <div className="p-3 bg-slate-50 dark:bg-[#091326] border-b border-slate-200 dark:border-[#162b4d] flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span>{selectedGradeTab} Examination Papers</span>
                        <span className="text-[11px] font-normal text-slate-400">
                          {classesList.find((c) => c.name === selectedGradeTab)?.levelCategory} Tier
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-72 overflow-y-auto">
                        {(() => {
                          const cls = classesList.find((c) => c.name === selectedGradeTab);
                          if (!cls) return null;
                          const subs = subjectsList.filter((s) => s.levelCategory === cls.levelCategory);

                          return subs.map((s) => {
                            const curDur = subjectDurations[cls.name]?.[s.id] || 60;
                            return (
                              <div key={s.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                                <div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200">{s.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{s.code}</div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* Quick presets */}
                                  <div className="hidden sm:flex items-center gap-1">
                                    {[45, 60, 80, 90, 120].map((preset) => (
                                      <button
                                        key={preset}
                                        type="button"
                                        onClick={() =>
                                          setSubjectDurations({
                                            ...subjectDurations,
                                            [cls.name]: {
                                              ...(subjectDurations[cls.name] || {}),
                                              [s.id]: preset,
                                            },
                                          })
                                        }
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                          curDur === preset
                                            ? 'border-sky-500 bg-sky-500 text-white'
                                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                      >
                                        {preset}m
                                      </button>
                                    ))}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min={15}
                                      max={240}
                                      step={5}
                                      value={curDur}
                                      onChange={(e) =>
                                        setSubjectDurations({
                                          ...subjectDurations,
                                          [cls.name]: {
                                            ...(subjectDurations[cls.name] || {}),
                                            [s.id]: Number(e.target.value) || 60,
                                          },
                                        })
                                      }
                                      className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#0c1830] text-center font-bold text-slate-800 dark:text-slate-100"
                                    />
                                    <span className="text-[11px] text-slate-400">mins</span>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Class Invigilators */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assign Room Invigilators per Class
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Before generating the timetable, assign a supervisor for each examination room. You can also reassign or adjust later.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-[#162b4d] overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                    {classesList.map((c) => {
                      const teacherOptions = teachersList.map((t) => ({
                        id: t.id,
                        label: `${t.firstName} ${t.lastName}`,
                        sublabel: t.email,
                      }));

                      return (
                        <div key={c.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div>
                            <div className="text-xs font-black text-slate-800 dark:text-slate-200">{c.name}</div>
                            <div className="text-[10px] text-slate-400">Room / Exam Center</div>
                          </div>

                          <div className="w-full sm:w-72">
                            <CustomDropdown
                              options={teacherOptions}
                              selectedId={classInvigilators[c.id] || ''}
                              onSelect={(tid) => setClassInvigilators({ ...classInvigilators, [c.id]: tid })}
                              placeholder="Select Class Invigilator..."
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 4: Review & Generate */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-3">
                    <h3 className="text-sm font-black text-sky-900 dark:text-sky-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-600" />
                      Ready to Generate Whole-School Examination Timetable
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 bg-white dark:bg-[#0c1830] rounded-xl border border-slate-200 dark:border-[#162b4d]">
                        <span className="text-slate-400 block text-[10px]">Academic Term</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {activeTerm?.year} Term {activeTerm?.termNumber}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-[#0c1830] rounded-xl border border-slate-200 dark:border-[#162b4d]">
                        <span className="text-slate-400 block text-[10px]">Exam Period</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {calculatedDays} Weekdays
                        </span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-[#0c1830] rounded-xl border border-slate-200 dark:border-[#162b4d]">
                        <span className="text-slate-400 block text-[10px]">Classes Covered</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {classesList.length} Classes (PP1–G9)
                        </span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-[#0c1830] rounded-xl border border-slate-200 dark:border-[#162b4d]">
                        <span className="text-slate-400 block text-[10px]">Daily Window</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {dailyStartTime} – {dailyEndTime}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      The timetable algorithm will fit all required CBC curriculum papers across the {calculatedDays} testing days for each class, taking into account breaks and individual subject paper durations. Each class timetable will be created independently so changes to one class will not affect any other.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-[#162b4d] flex items-center justify-between bg-slate-50/60 dark:bg-[#091326]/60">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] hover:bg-slate-50 dark:hover:bg-[#142647] text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (currentStep === 1 && (!startDate || !endDate || calculatedDays === 0)) {
                  toast.error('Please specify valid start and end dates with at least one weekday');
                  return;
                }
                setCurrentStep(currentStep + 1);
              }}
              className="px-4 py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              Next Step
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerate}
              className="px-5 py-2 rounded-xl border border-sky-600 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-glass disabled:opacity-60"
            >
              {generating && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {generating ? 'Generating Timetable...' : 'Generate Exam Timetable'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
