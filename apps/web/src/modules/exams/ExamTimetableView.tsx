import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Plus, Printer, Clock, BookOpen, Trash2, Edit3,
  CheckCircle2, ShieldCheck, Lock, Unlock, AlertTriangle, Users,
  Search, Filter, ChevronDown, Check, X, RefreshCw, BarChart2,
  FileText, ArrowRight, UserCheck, HelpCircle, Layers, ChevronRight
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { formatDate } from '../../lib/formatters';
import { Modal } from '../../components/Modal';
import { printElement } from '../../lib/printElement';

/* ==========================================================================
   Custom Accessible Searchable Dropdown Component
   ========================================================================== */
interface DropdownOption {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

const CustomDropdown: React.FC<{
  label?: string;
  options: DropdownOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
}> = ({
  label,
  options,
  selectedId,
  onSelect,
  placeholder = '-- Select an option --',
  searchPlaceholder = 'Search...',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.id === selectedId),
    [options, selectedId]
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full bg-white dark:bg-[#0c1932] border ${
            isOpen ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-sky-200 dark:border-[#162b4d]'
          } rounded-xl px-3.5 py-2.5 text-xs text-left text-slate-800 dark:text-slate-100 flex items-center justify-between transition-all cursor-pointer shadow-xs`}
        >
          <span className="truncate pr-2 font-medium">
            {selectedOption ? (
              <span className="flex items-center gap-2">
                <span>{selectedOption.label}</span>
                {selectedOption.sublabel && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    ({selectedOption.sublabel})
                  </span>
                )}
                {selectedOption.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    {selectedOption.badge}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
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
              className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl"
            >
              {options.length > 5 && (
                <div className="p-2 border-b border-sky-100 dark:border-[#162b4d]">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      placeholder={searchPlaceholder}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#091326] border border-sky-100 dark:border-[#162b4d] rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              )}
              <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-slate-800/40">
                {filteredOptions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 italic">No matches found</div>
                ) : (
                  filteredOptions.map((opt) => {
                    const isSelected = opt.id === selectedId;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onSelect(opt.id);
                          setIsOpen(false);
                          setSearch('');
                        }}
                        className={`w-full px-3 py-2 text-left text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500 text-white font-bold'
                            : 'hover:bg-sky-50 dark:hover:bg-[#142647] text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate">{opt.label}</div>
                          {opt.sublabel && (
                            <div
                              className={`text-[10px] truncate ${
                                isSelected ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {opt.sublabel}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {opt.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                              }`}
                            >
                              {opt.badge}
                            </span>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ==========================================================================
   Main Examination Management View Component
   ========================================================================== */
export const ExamTimetableView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'timetable' | 'progress'>('timetable');

  // Timetable View Mode (Daily Timeline vs Table)
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [tierFilter, setTierFilter] = useState<string>('ALL');

  // Modals state
  const [showExamModal, setShowExamModal] = useState(false);
  const [isEditingExam, setIsEditingExam] = useState(false);
  const [showDeleteExamModal, setShowDeleteExamModal] = useState(false);

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  const [showPrintModal, setShowPrintModal] = useState(false);

  // Forms
  const [examForm, setExamForm] = useState({
    termId: '',
    title: '',
  });

  const [sessionForm, setSessionForm] = useState({
    subjectId: '',
    sessionDate: new Date().toISOString().split('T')[0],
    sessionTime: '08:00 - 10:00 AM',
  });

  // Action states
  const [submitting, setSubmitting] = useState(false);
  const [deletingExam, setDeletingExam] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // Tab 2: Progress Monitoring State
  const [progressData, setProgressData] = useState<any | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});
  const [progressSearch, setProgressSearch] = useState('');
  const [progressStatusFilter, setProgressStatusFilter] = useState('ALL');
  const [progressTierFilter, setProgressTierFilter] = useState('ALL');

  // Fetch Core Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [exRes, tmRes, sbRes, setRes] = await Promise.all([
        apiClient.get('/api/exams'),
        apiClient.get('/api/academic-terms'),
        apiClient.get('/api/subjects'),
        apiClient.get('/api/settings').catch(() => ({ data: { data: null } })),
      ]);

      const examData = exRes.data.data || [];
      setExams(examData);
      setTerms(tmRes.data.data || []);
      setSubjectsList(sbRes.data.data || []);
      setSchoolSettings(setRes.data?.data || null);

      if (examData.length > 0) {
        setSelectedExam((prev: any) => {
          if (!prev) return examData[0];
          const found = examData.find((e: any) => e.exam.id === prev.exam.id);
          return found || examData[0];
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load examination timetable data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async (examId: string) => {
    try {
      const res = await apiClient.get(`/api/exams/${examId}/sessions`);
      setSessions(res.data.data || []);
    } catch (error) {
      console.error('Failed to load sessions', error);
    }
  };

  const fetchProgress = async (examId: string) => {
    try {
      setLoadingProgress(true);
      const res = await apiClient.get(`/api/exams/${examId}/progress`);
      setProgressData(res.data.data || null);
    } catch (error: any) {
      console.error('Failed to load exam progress', error);
      toast.error(error.response?.data?.message || 'Failed to load examination progress tracker');
    } finally {
      setLoadingProgress(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchSessions(selectedExam.exam.id);
      if (activeTab === 'progress') {
        fetchProgress(selectedExam.exam.id);
      }
    }
  }, [selectedExam, activeTab]);

  // Exam Series Form Handlers
  const openCreateExamModal = () => {
    setIsEditingExam(false);
    setExamForm({
      termId: terms[0]?.id || '',
      title: '',
    });
    setShowExamModal(true);
  };

  const openEditExamModal = () => {
    if (!selectedExam) return;
    setIsEditingExam(true);
    setExamForm({
      termId: selectedExam.exam.termId,
      title: selectedExam.exam.title,
    });
    setShowExamModal(true);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!examForm.termId) {
      toast.error('Please select an academic term');
      return;
    }
    if (!examForm.title.trim()) {
      toast.error('Please provide an exam title');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditingExam && selectedExam) {
        await apiClient.put(`/api/exams/${selectedExam.exam.id}`, examForm);
        toast.success('Examination series updated');
      } else {
        const res = await apiClient.post('/api/exams', examForm);
        toast.success('Examination series created');
        if (res.data?.data) {
          await fetchData();
          const found = exams.find((e) => e.exam.id === res.data.data.id);
          if (found) setSelectedExam(found);
        }
      }
      setShowExamModal(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save examination series');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!selectedExam || deletingExam) return;
    try {
      setDeletingExam(true);
      await apiClient.delete(`/api/exams/${selectedExam.exam.id}`);
      toast.success('Examination series removed');
      setShowDeleteExamModal(false);
      setSelectedExam(null);
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete examination series');
    } finally {
      setDeletingExam(false);
    }
  };

  // Exam Status Transition
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedExam || updatingStatus) return;
    try {
      setUpdatingStatus(true);
      setTargetStatus(newStatus);
      await apiClient.put(`/api/exams/${selectedExam.exam.id}/status`, { status: newStatus });
      toast.success(`Exam status updated to ${newStatus}`);
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update exam status');
    } finally {
      setUpdatingStatus(false);
      setTargetStatus(null);
    }
  };

  // Session Handlers
  const openCreateSessionModal = () => {
    setEditingSessionId(null);
    setSessionForm({
      subjectId: subjectsList[0]?.id || '',
      sessionDate: new Date().toISOString().split('T')[0],
      sessionTime: '08:00 - 10:00 AM',
    });
    setShowSessionModal(true);
  };

  const openEditSessionModal = (sessionRow: any) => {
    setEditingSessionId(sessionRow.session.id);
    setSessionForm({
      subjectId: sessionRow.session.subjectId,
      sessionDate: sessionRow.session.sessionDate,
      sessionTime: sessionRow.session.sessionTime,
    });
    setShowSessionModal(true);
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!selectedExam || !sessionForm.subjectId) {
      toast.error('Please select a subject paper');
      return;
    }

    try {
      setSubmitting(true);
      if (editingSessionId) {
        await apiClient.put(`/api/exams/sessions/${editingSessionId}`, sessionForm);
        toast.success('Exam session updated');
      } else {
        await apiClient.post('/api/exams/sessions', {
          ...sessionForm,
          examId: selectedExam.exam.id,
        });
        toast.success('Exam session scheduled');
      }
      setShowSessionModal(false);
      fetchSessions(selectedExam.exam.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save paper session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (deletingSessionId) return;
    if (!confirm('Are you sure you want to remove this paper session?')) return;
    try {
      setDeletingSessionId(sessionId);
      await apiClient.delete(`/api/exams/sessions/${sessionId}`);
      toast.success('Exam session removed');
      if (selectedExam) await fetchSessions(selectedExam.exam.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete session');
    } finally {
      setDeletingSessionId(null);
    }
  };

  // Filtered Sessions for Tab 1
  const filteredSessions = useMemo(() => {
    if (tierFilter === 'ALL') return sessions;
    return sessions.filter(
      (s) => s.subject.levelCategory === tierFilter || s.subject.levelCategory === 'ALL'
    );
  }, [sessions, tierFilter]);

  // Chronologically Group Sessions by Date for Daily Timeline View
  const groupedSessions = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const sorted = [...filteredSessions].sort((a, b) => {
      const cmp = a.session.sessionDate.localeCompare(b.session.sessionDate);
      if (cmp !== 0) return cmp;
      return a.session.sessionTime.localeCompare(b.session.sessionTime);
    });

    sorted.forEach((item) => {
      const d = item.session.sessionDate;
      if (!groups[d]) groups[d] = [];
      groups[d].push(item);
    });

    return Object.entries(groups).map(([dateStr, sessionItems], idx) => ({
      dayNumber: idx + 1,
      dateStr,
      sessions: sessionItems,
    }));
  }, [filteredSessions]);

  // Tab 2 Class Expansion Toggle
  const toggleClassExpand = (classId: string) => {
    setExpandedClasses((prev) => ({
      ...prev,
      [classId]: !prev[classId],
    }));
  };

  // Tab 2 Filtered Classes
  const filteredClassesProgress = useMemo(() => {
    if (!progressData?.classes) return [];
    let list = progressData.classes;

    if (progressTierFilter !== 'ALL') {
      list = list.filter((c: any) => c.levelCategory === progressTierFilter);
    }

    if (progressStatusFilter !== 'ALL') {
      list = list.filter((c: any) => {
        if (progressStatusFilter === 'PENDING') {
          return c.classCompletionPercentage < 100;
        }
        if (progressStatusFilter === 'COMPLETED') {
          return c.classCompletionPercentage === 100;
        }
        if (progressStatusFilter === 'CORRECTION') {
          return c.subjects.some((s: any) => s.status === 'CORRECTION_REQUESTED');
        }
        return true;
      });
    }

    if (progressSearch.trim()) {
      const q = progressSearch.toLowerCase();
      list = list.filter(
        (c: any) =>
          c.className.toLowerCase().includes(q) ||
          c.subjects.some(
            (s: any) =>
              s.subjectName.toLowerCase().includes(q) ||
              s.subjectCode.toLowerCase().includes(q) ||
              (s.teacherName && s.teacherName.toLowerCase().includes(q))
          )
      );
    }

    return list;
  }, [progressData, progressTierFilter, progressStatusFilter, progressSearch]);

  // Dropdown options
  const examDropdownOptions = useMemo(
    () =>
      exams.map((ex) => ({
        id: ex.exam.id,
        label: ex.exam.title,
        sublabel: `Term ${ex.term?.termNumber || 1} · ${ex.term?.year || 2026}`,
        badge: ex.exam.status,
      })),
    [exams]
  );

  const termDropdownOptions = useMemo(
    () =>
      terms.map((t) => ({
        id: t.id,
        label: `Year ${t.year} — Term ${t.termNumber}`,
        sublabel: `${formatDate(t.startDate)} to ${formatDate(t.endDate)}`,
      })),
    [terms]
  );

  const subjectDropdownOptions = useMemo(
    () =>
      subjectsList.map((s) => ({
        id: s.id,
        label: s.name,
        sublabel: `Code: ${s.code}`,
        badge: s.levelCategory,
      })),
    [subjectsList]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading Examination Center...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12"
    >
      {/* ====================================================================
          1. Header Banner & Global Actions
          ==================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-sky-100 dark:border-[#162b4d] shadow-glass dark:shadow-none">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-widest mb-1.5">
            <Calendar className="w-4 h-4 text-sky-500" />
            Director of Studies · Examination Management
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Master Examination Timetable & Session Hub
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-2xl">
            Schedule examination series, monitor room invigilator coverage, track live mark submission progress across classes, and print master timetables.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0">
          <button
            onClick={openCreateExamModal}
            className="flex-1 sm:flex-initial justify-center min-h-[42px] px-4 py-2.5 bg-white dark:bg-[#0c1932] border border-sky-200 dark:border-[#162b4d] hover:bg-sky-50 dark:hover:bg-[#142647] text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            New Exam Series
          </button>

          {selectedExam && (
            <>
              <button
                onClick={openEditExamModal}
                className="min-h-[42px] px-3.5 py-2.5 bg-white dark:bg-[#0c1932] border border-sky-200 dark:border-[#162b4d] hover:bg-sky-50 dark:hover:bg-[#142647] text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Edit Exam Series Details"
              >
                <Edit3 className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Edit Series</span>
              </button>

              <button
                onClick={() => setShowDeleteExamModal(true)}
                className="min-h-[42px] px-3.5 py-2.5 bg-white dark:bg-[#0c1932] border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Delete Exam Series"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>

              <button
                onClick={openCreateSessionModal}
                className="flex-1 sm:flex-initial justify-center min-h-[42px] px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-glass transition-all whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Paper Session
              </button>
            </>
          )}
        </div>
      </div>

      {/* ====================================================================
          2. Exam Series Selector & Status Workflow Controller
          ==================================================================== */}
      {selectedExam && (
        <div className="p-4 sm:p-6 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl shadow-glass dark:shadow-none space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Custom Series Selector Dropdown */}
            <div className="w-full md:w-80">
              <CustomDropdown
                label="Selected Examination Series"
                options={examDropdownOptions}
                selectedId={selectedExam.exam.id}
                onSelect={(id) => {
                  const found = exams.find((e) => e.exam.id === id);
                  if (found) setSelectedExam(found);
                }}
              />
            </div>

            {/* Workflow Status Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 ${
                  selectedExam.exam.status === 'APPROVED'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : selectedExam.exam.status === 'LOCKED'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                {selectedExam.exam.status === 'APPROVED' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : selectedExam.exam.status === 'LOCKED' ? (
                  <Lock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                )}
                {selectedExam.exam.status === 'APPROVED' ? 'Published / Approved' : selectedExam.exam.status}
              </span>

              {selectedExam.exam.status === 'DRAFT' && (
                <button
                  disabled={updatingStatus}
                  onClick={() => handleUpdateStatus('APPROVED')}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {updatingStatus && targetStatus === 'APPROVED' ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Approve & Publish Timetable</span>
                </button>
              )}

              {selectedExam.exam.status === 'APPROVED' && (
                <>
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus('DRAFT')}
                    className="px-3 py-1.5 bg-white dark:bg-[#0c1932] border border-sky-200 dark:border-[#162b4d] hover:bg-sky-50 dark:hover:bg-[#142647] text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Revert to Draft</span>
                  </button>
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus('LOCKED')}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-white" />
                    <span>Lock Series</span>
                  </button>
                </>
              )}

              {selectedExam.exam.status === 'LOCKED' && (
                <button
                  disabled={updatingStatus}
                  onClick={() => handleUpdateStatus('APPROVED')}
                  className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock Series</span>
                </button>
              )}

              <button
                onClick={() => setShowPrintModal(true)}
                disabled={sessions.length === 0}
                className="px-3.5 py-1.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Print Timetable</span>
              </button>
            </div>
          </div>

          {/* ====================================================================
              3. Main Workstation Tabs
              ==================================================================== */}
          <div className="flex border-b border-sky-100 dark:border-[#162b4d] pt-2">
            <button
              onClick={() => setActiveTab('timetable')}
              className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                activeTab === 'timetable'
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Master Timetable & Schedule ({sessions.length})</span>
              {activeTab === 'timetable' && (
                <motion.div
                  layoutId="activeExamTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500"
                />
              )}
            </button>

            <button
              onClick={() => setActiveTab('progress')}
              className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                activeTab === 'progress'
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Mark Submission Progress</span>
              {progressData && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono">
                  {progressData.summary?.completionPercentage}%
                </span>
              )}
              {activeTab === 'progress' && (
                <motion.div
                  layoutId="activeExamTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500"
                />
              )}
            </button>
          </div>

          {/* ====================================================================
              TAB 1: Master Timetable & Daily Schedule
              ==================================================================== */}
          {activeTab === 'timetable' && (
            <div className="space-y-4 pt-2">
              {/* Controls bar: Mode switch & Tier Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50/50 dark:bg-[#0c1932]/50 p-3 rounded-2xl border border-sky-100/60 dark:border-[#162b4d]/60">
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#091326] p-1 rounded-xl border border-sky-100 dark:border-[#162b4d] shrink-0">
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      viewMode === 'timeline'
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    Daily Timeline View
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    Master Table View
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" />
                    Tier:
                  </span>
                  {['ALL', 'LOWER_PRIMARY', 'UPPER_PRIMARY', 'JUNIOR'].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setTierFilter(tier)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                        tierFilter === tier
                          ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                          : 'bg-white dark:bg-[#0c1932] text-slate-600 dark:text-slate-400 border border-sky-100 dark:border-[#162b4d] hover:bg-sky-50'
                      }`}
                    >
                      {tier === 'ALL'
                        ? 'All Tiers'
                        : tier === 'LOWER_PRIMARY'
                        ? 'Lower Primary'
                        : tier === 'UPPER_PRIMARY'
                        ? 'Upper Primary'
                        : 'Junior Secondary'}
                    </button>
                  ))}
                </div>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-sky-200 dark:border-[#162b4d] rounded-2xl bg-sky-50/20 dark:bg-[#0c1932]/20">
                  <Calendar className="w-10 h-10 text-sky-400 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No examination paper sessions scheduled
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Click "Add Paper Session" above to assign subject papers, exam dates, and time slots to the master timetable.
                  </p>
                </div>
              ) : viewMode === 'timeline' ? (
                /* Daily Grouped Timeline View */
                <div className="space-y-4">
                  {groupedSessions.map((group) => (
                    <div
                      key={group.dateStr}
                      className="bg-white dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] rounded-2xl overflow-hidden shadow-xs"
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-sky-50/70 dark:bg-[#091326] border-b border-sky-100 dark:border-[#162b4d]">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-xl bg-sky-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                            {group.dayNumber}
                          </span>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                              {formatDate(group.dateStr)}
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                              {group.sessions.length} Subject Paper Session{group.sessions.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Sessions within the Day */}
                      <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.sessions.map((row) => {
                          const count = row.invigilatorsCount || 0;
                          return (
                            <div
                              key={row.session.id}
                              className="p-3.5 bg-slate-50/70 dark:bg-[#091326]/60 border border-sky-100/80 dark:border-[#162b4d] rounded-xl flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      {row.session.sessionTime}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-medium">
                                      {row.subject.levelCategory}
                                    </span>
                                  </div>
                                  <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
                                    {row.subject.name}
                                  </h5>
                                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                                    Code: {row.subject.code}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => openEditSessionModal(row)}
                                    className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-[#142647] rounded-lg transition-colors cursor-pointer"
                                    title="Edit session slot"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    disabled={deletingSessionId === row.session.id}
                                    onClick={() => handleDeleteSession(row.session.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                    title="Remove session"
                                  >
                                    {deletingSessionId === row.session.id ? (
                                      <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                  Invigilator Coverage:
                                </span>
                                {count > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-semibold">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    {count} Invigilator{count > 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] font-semibold">
                                    <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                    0 Invigilators
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Flat Table View */
                <div className="overflow-x-auto rounded-xl border border-sky-100 dark:border-[#162b4d]">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-sky-50/80 dark:bg-[#0d1d3a] text-sky-900 dark:text-sky-300 font-bold uppercase tracking-wider border-b border-sky-100 dark:border-[#162b4d]">
                      <tr>
                        <th className="py-3.5 px-4">Session Date</th>
                        <th className="py-3.5 px-4">Session Time</th>
                        <th className="py-3.5 px-4">Subject Paper</th>
                        <th className="py-3.5 px-4">Tier Category</th>
                        <th className="py-3.5 px-4">Invigilator Coverage</th>
                        <th className="py-3.5 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100/60 dark:divide-[#162b4d]/60 bg-white dark:bg-[#0c1932]">
                      {filteredSessions.map((row) => {
                        const count = row.invigilatorsCount || 0;
                        return (
                          <tr key={row.session.id} className="hover:bg-sky-50/40 dark:hover:bg-[#142647]/50 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {formatDate(row.session.sessionDate)}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                              {row.session.sessionTime}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                              {row.subject.name}
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">
                                Code: {row.subject.code}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-semibold">
                              <span className="bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800 text-[11px]">
                                {row.subject.levelCategory}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {count > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  {count} Room Invigilator{count > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-semibold">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                  0 Invigilators (Unassigned)
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openEditSessionModal(row)}
                                  className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-[#142647] rounded-lg transition-colors cursor-pointer"
                                  title="Edit session"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  disabled={deletingSessionId === row.session.id}
                                  onClick={() => handleDeleteSession(row.session.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                  title="Delete session"
                                >
                                  {deletingSessionId === row.session.id ? (
                                    <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ====================================================================
              TAB 2: Mark Submission Progress Tracker
              ==================================================================== */}
          {activeTab === 'progress' && (
            <div className="space-y-5 pt-2">
              {loadingProgress ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Aggregating school-wide mark entry data...
                  </p>
                </div>
              ) : !progressData ? (
                <div className="text-center py-12 px-4 border border-dashed border-sky-200 dark:border-[#162b4d] rounded-2xl">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Unable to load progress metrics
                  </p>
                  <button
                    onClick={() => fetchProgress(selectedExam.exam.id)}
                    className="mt-3 px-4 py-2 bg-sky-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-glass"
                  >
                    Retry Loading
                  </button>
                </div>
              ) : (
                <>
                  {/* Overview KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                    {/* Completion Rate Card */}
                    <div className="col-span-2 lg:col-span-1 p-4 bg-sky-500 text-white rounded-2xl shadow-glass flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">
                          Completion Rate
                        </span>
                        <BarChart2 className="w-4 h-4" />
                      </div>
                      <div className="my-2">
                        <div className="text-3xl font-black">{progressData.summary?.completionPercentage}%</div>
                        <div className="w-full bg-white/30 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="bg-white h-full rounded-full transition-all duration-500"
                            style={{ width: `${progressData.summary?.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] opacity-80 font-medium">Whole school marks status</span>
                    </div>

                    {/* Total Expected Card */}
                    <div className="p-4 bg-white dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-xs">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Expected Papers
                      </div>
                      <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                        {progressData.summary?.totalExpected || 0}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                        Classes × Subjects
                      </span>
                    </div>

                    {/* Submitted Card */}
                    <div className="p-4 bg-white dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-xs">
                      <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        Submitted
                      </div>
                      <div className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">
                        {progressData.summary?.submittedCount || 0}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                        Ready for review
                      </span>
                    </div>

                    {/* Approved Card */}
                    <div className="p-4 bg-white dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-xs">
                      <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Approved / Locked
                      </div>
                      <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                        {progressData.summary?.approvedCount || 0}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                        Fully finalized
                      </span>
                    </div>

                    {/* Pending Card */}
                    <div className="p-4 bg-white dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-xs">
                      <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        Pending Marks
                      </div>
                      <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
                        {progressData.summary?.pendingCount || 0}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                        Draft or not started
                      </span>
                    </div>
                  </div>

                  {/* Filter and Search Bar for Tab 2 */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-sky-50/50 dark:bg-[#0c1932]/50 p-3 rounded-2xl border border-sky-100/60 dark:border-[#162b4d]/60">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search class, subject paper, or teacher name..."
                        value={progressSearch}
                        onChange={(e) => setProgressSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={progressTierFilter}
                        onChange={(e) => setProgressTierFilter(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] rounded-xl text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">All Tiers</option>
                        <option value="LOWER_PRIMARY">Lower Primary</option>
                        <option value="UPPER_PRIMARY">Upper Primary</option>
                        <option value="JUNIOR">Junior Secondary</option>
                      </select>

                      <select
                        value={progressStatusFilter}
                        onChange={(e) => setProgressStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] rounded-xl text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING">Classes with Pending Marks</option>
                        <option value="COMPLETED">100% Submitted Classes</option>
                        <option value="CORRECTION">Corrections Requested</option>
                      </select>

                      <button
                        onClick={() => fetchProgress(selectedExam.exam.id)}
                        className="p-2 bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] hover:bg-sky-50 dark:hover:bg-[#142647] rounded-xl text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Refresh progress data"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Class-by-Class Submission Matrix */}
                  <div className="space-y-3">
                    {filteredClassesProgress.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 italic bg-white dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] rounded-2xl">
                        No classes match your search or filter criteria.
                      </div>
                    ) : (
                      filteredClassesProgress.map((cls: any) => {
                        const isExpanded = expandedClasses[cls.classId] ?? false;
                        const isComplete = cls.classCompletionPercentage === 100;

                        return (
                          <div
                            key={cls.classId}
                            className="bg-white dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] rounded-2xl overflow-hidden shadow-xs transition-all"
                          >
                            {/* Class Summary Bar */}
                            <button
                              type="button"
                              onClick={() => toggleClassExpand(cls.classId)}
                              className="w-full px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-sky-50/40 dark:hover:bg-[#142647]/40 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isComplete
                                      ? 'bg-emerald-500 text-white shadow-xs'
                                      : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                  }`}
                                >
                                  {cls.numericOrder}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                      {cls.className}
                                    </h4>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-medium">
                                      {cls.levelCategory}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                    {cls.totalStudents} Active Students · {cls.submittedSubjects}/{cls.totalSubjects} Papers Submitted
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                                <div className="text-right">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                      {cls.classCompletionPercentage}%
                                    </span>
                                    <div className="w-20 bg-slate-100 dark:bg-[#091326] h-2 rounded-full overflow-hidden border border-sky-100 dark:border-[#162b4d]">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          isComplete ? 'bg-emerald-500' : 'bg-sky-500'
                                        }`}
                                        style={{ width: `${cls.classCompletionPercentage}%` }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    {isComplete ? '✓ All Papers Submitted' : 'Pending submissions'}
                                  </span>
                                </div>

                                <ChevronDown
                                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180 text-sky-500' : ''
                                  }`}
                                />
                              </div>
                            </button>

                            {/* Detailed Subjects Matrix */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="border-t border-sky-100 dark:border-[#162b4d] bg-slate-50/50 dark:bg-[#091326]/60 p-3 sm:p-4 overflow-x-auto"
                                >
                                  <table className="w-full text-left text-xs min-w-[650px]">
                                    <thead>
                                      <tr className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-sky-100 dark:border-[#162b4d] pb-2">
                                        <th className="py-2 px-3">Subject Paper</th>
                                        <th className="py-2 px-3">Assigned Teacher</th>
                                        <th className="py-2 px-3">Scores Recorded</th>
                                        <th className="py-2 px-3">Status</th>
                                        <th className="py-2 px-3">Last Activity</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-sky-100/60 dark:divide-[#162b4d]/60">
                                      {cls.subjects.map((sub: any) => {
                                        return (
                                          <tr
                                            key={sub.subjectId}
                                            className="hover:bg-white dark:hover:bg-[#0c1932] transition-colors"
                                          >
                                            <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                                              {sub.subjectName}
                                              <span className="text-[10px] text-slate-400 block font-mono">
                                                Code: {sub.subjectCode}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200">
                                              {sub.teacherName === 'Unassigned' ? (
                                                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                                  <AlertTriangle className="w-3 h-3" />
                                                  Unassigned Teacher
                                                </span>
                                              ) : (
                                                <span className="font-medium flex items-center gap-1.5">
                                                  <UserCheck className="w-3.5 h-3.5 text-sky-500" />
                                                  {sub.teacherName}
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-2.5 px-3 font-mono font-bold">
                                              <span
                                                className={
                                                  sub.scoresCount >= sub.totalStudents && sub.totalStudents > 0
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : sub.scoresCount > 0
                                                    ? 'text-amber-600 dark:text-amber-400'
                                                    : 'text-slate-400'
                                                }
                                              >
                                                {sub.scoresCount} / {sub.totalStudents} Scores
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3">
                                              <span
                                                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                  sub.status === 'APPROVED' || sub.status === 'LOCKED'
                                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                    : sub.status === 'SUBMITTED' || sub.status === 'RESUBMITTED'
                                                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                                    : sub.status === 'UNDER_REVIEW'
                                                    ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                                    : sub.status === 'CORRECTION_REQUESTED'
                                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                                    : sub.status === 'DRAFT'
                                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                }`}
                                              >
                                                {sub.status.replace('_', ' ')}
                                              </span>
                                              {sub.correctionReason && (
                                                <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 italic">
                                                  Note: {sub.correctionReason}
                                                </div>
                                              )}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                              {sub.submittedAt ? formatDate(sub.submittedAt) : '—'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          MODAL 1: Create / Edit Examination Series
          ==================================================================== */}
      <Modal
        isOpen={showExamModal}
        onClose={() => setShowExamModal(false)}
        title={isEditingExam ? 'Edit Examination Series Details' : 'Create New Examination Series'}
      >
        <form onSubmit={handleSaveExam} className="space-y-4">
          <CustomDropdown
            label="Select Academic Term"
            required
            options={termDropdownOptions}
            selectedId={examForm.termId}
            onSelect={(id) => setExamForm({ ...examForm, termId: id })}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Examination Series Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. End of Term 1 National Standards Examination"
              value={examForm.title}
              onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
              className="w-full bg-white dark:bg-[#0c1932] border border-sky-200 dark:border-[#162b4d] rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:border-sky-500 outline-none transition-colors font-medium shadow-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sky-100 dark:border-[#162b4d]">
            <button
              type="button"
              onClick={() => setShowExamModal(false)}
              className="px-4 py-2 bg-white dark:bg-[#0c1932] border border-sky-200 dark:border-[#162b4d] hover:bg-sky-50 dark:hover:bg-[#142647] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <span>{submitting ? 'Saving...' : isEditingExam ? 'Update Series' : 'Create Series'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ====================================================================
          MODAL 2: Delete Examination Series Confirmation
          ==================================================================== */}
      <Modal
        isOpen={showDeleteExamModal}
        onClose={() => setShowDeleteExamModal(false)}
        title="Delete Examination Series"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 dark:text-rose-300 space-y-1">
              <p className="font-bold">Are you sure you want to delete this examination series?</p>
              <p>
                Series: <strong>{selectedExam?.exam.title}</strong>
              </p>
              <p className="text-[11px] opacity-90">
                This will remove the exam and its scheduled sessions. This action cannot be performed if student marks or scores have already been recorded.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-sky-100 dark:border-[#162b4d]">
            <button
              type="button"
              onClick={() => setShowDeleteExamModal(false)}
              className="px-4 py-2 bg-white dark:bg-[#0c1932] border border-sky-200 dark:border-[#162b4d] hover:bg-sky-50 dark:hover:bg-[#142647] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deletingExam}
              onClick={handleDeleteExam}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {deletingExam && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <span>{deletingExam ? 'Deleting...' : 'Confirm Delete'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ====================================================================
          MODAL 3: Schedule / Edit Paper Session
          ==================================================================== */}
      <Modal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        title={editingSessionId ? 'Edit Exam Paper Session' : 'Schedule Exam Paper Session'}
      >
        <form onSubmit={handleSaveSession} className="space-y-4">
          <CustomDropdown
            label="Select Subject Paper"
            required
            options={subjectDropdownOptions}
            selectedId={sessionForm.subjectId}
            onSelect={(id) => setSessionForm({ ...sessionForm, subjectId: id })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Session Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={sessionForm.sessionDate}
                onChange={(e) => setSessionForm({ ...sessionForm, sessionDate: e.target.value })}
                className="w-full bg-white dark:bg-[#0c1932] border border-sky-200 dark:border-[#162b4d] rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:border-sky-500 outline-none transition-colors font-medium shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Session Time Slot <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 08:00 - 10:00 AM"
                value={sessionForm.sessionTime}
                onChange={(e) => setSessionForm({ ...sessionForm, sessionTime: e.target.value })}
                className="w-full bg-white dark:bg-[#0c1932] border border-sky-200 dark:border-[#162b4d] rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:border-sky-500 outline-none transition-colors font-medium shadow-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sky-100 dark:border-[#162b4d]">
            <button
              type="button"
              onClick={() => setShowSessionModal(false)}
              className="px-4 py-2 bg-white dark:bg-[#0c1932] border border-sky-200 dark:border-[#162b4d] hover:bg-sky-50 dark:hover:bg-[#142647] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <span>{submitting ? 'Saving Session...' : editingSessionId ? 'Update Session' : 'Schedule Session'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ====================================================================
          MODAL 4: Printable Master Timetable
          ==================================================================== */}
      {showPrintModal && (
        <Modal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          title="Printable Master Examination Timetable"
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-sky-100 dark:border-[#162b4d]">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Official master timetable for notice boards, classroom circulation, and staff records.
              </p>
              <button
                onClick={() =>
                  printElement(
                    'master-timetable-printable',
                    `${schoolSettings?.schoolName || 'Eldoret Muslim Academy'} - Master Examination Timetable`
                  )
                }
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-glass shrink-0 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Master Timetable
              </button>
            </div>

            {/* Paper Preview Sheet (Standard Clean White for Print) */}
            <div
              id="master-timetable-printable"
              className="p-6 sm:p-8 bg-white border border-slate-300 rounded-xl text-slate-900 shadow-sm space-y-6"
            >
              {/* Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-slate-900">
                  {schoolSettings?.schoolName || 'ELDORET MUSLIM ACADEMY'}
                </h1>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-0.5">
                  Office of the Director of Studies · Central Examination Board
                </p>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-bold uppercase tracking-wider text-slate-800">
                  Master Examination Timetable
                </div>
                <div className="mt-2 text-xs text-slate-600 flex justify-center items-center gap-6 font-medium">
                  <span>
                    <strong>Examination:</strong> {selectedExam?.exam.title}
                  </span>
                  <span>
                    <strong>Academic Year:</strong>{' '}
                    {schoolSettings?.currentAcademicYear || selectedExam?.term?.year || 2026}
                  </span>
                  <span>
                    <strong>Term:</strong> Term{' '}
                    {schoolSettings?.currentTermNumber || selectedExam?.term?.termNumber || 1}
                  </span>
                </div>
              </div>

              {/* Timetable Table */}
              <div>
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase border-b border-slate-300 text-[11px]">
                      <th className="p-2.5 border border-slate-300">#</th>
                      <th className="p-2.5 border border-slate-300">Date</th>
                      <th className="p-2.5 border border-slate-300">Time Slot</th>
                      <th className="p-2.5 border border-slate-300">Subject Paper</th>
                      <th className="p-2.5 border border-slate-300">Code</th>
                      <th className="p-2.5 border border-slate-300">Target Category</th>
                      <th className="p-2.5 border border-slate-300 text-center">Invigilators</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((row, idx) => (
                      <tr key={row.session.id} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-300 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-2 border border-slate-300 font-mono font-bold">
                          {formatDate(row.session.sessionDate)}
                        </td>
                        <td className="p-2 border border-slate-300 font-mono text-slate-700">
                          {row.session.sessionTime}
                        </td>
                        <td className="p-2 border border-slate-300 font-bold">{row.subject.name}</td>
                        <td className="p-2 border border-slate-300 font-mono text-[11px]">
                          {row.subject.code}
                        </td>
                        <td className="p-2 border border-slate-300 font-medium">
                          {row.subject.levelCategory}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-semibold">
                          {row.invigilatorsCount || 0} Assigned
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Instructions to Candidates */}
              <div className="border border-slate-200 bg-slate-50/50 p-3 rounded text-[11px] space-y-1 text-slate-700">
                <p className="font-bold uppercase tracking-wider text-slate-900">
                  Instructions to Candidates & Invigilators:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  <li>
                    Learners must be seated in the examination room at least <strong>10 minutes</strong> before paper start time.
                  </li>
                  <li>Ensure your admission number and name are clearly legible on all answer scripts.</li>
                  <li>
                    Possession of unauthorized study materials or communication devices during exams is strictly prohibited.
                  </li>
                  <li>Invigilators must verify candidate attendance and submit scripts immediately following session completion.</li>
                </ul>
              </div>

              {/* Signatures & Stamp */}
              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-300 text-xs">
                <div>
                  <div className="border-b border-slate-400 h-10 mb-1" />
                  <p className="font-bold text-slate-800">Director of Studies (DoS)</p>
                  <p className="text-[10px] text-slate-500">Signature & Date</p>
                </div>

                <div>
                  <div className="border-b border-slate-400 h-10 mb-1" />
                  <p className="font-bold text-slate-800">Headteacher / Principal</p>
                  <p className="text-[10px] text-slate-500">Signature & Date</p>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-sky-800 flex flex-col items-center justify-center text-center p-1 text-[7px] font-bold text-sky-900 tracking-tighter uppercase leading-tight select-none">
                    <span>ELDORET MUSLIM</span>
                    <span>ACADEMY</span>
                    <span className="my-0.5 text-[6px] text-sky-600">★ APPROVED TIMETABLE ★</span>
                    <span>OFFICIAL STAMP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};
