import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Send,
  CheckCircle,
  AlertCircle,
  Phone,
  CheckCheck,
  Users,
  Search,
  Edit3,
  Clock,
  Sparkles,
  Eye,
  ShieldCheck,
  Lock,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';

interface ClassSummary {
  classId: string;
  className: string;
  gradeLevel?: string;
  stream?: string;
  totalStudents?: number;
  totalEnrolled?: number;
  submitted?: boolean;
  isSubmitted?: boolean;
  submittedAt?: string;
  submittedByTeacher?: string;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
}

interface AbsentStudent {
  recordId: string;
  studentId: string;
  studentName: string;
  assessmentNumber?: string;
  className: string;
  guardianName: string;
  guardianPhone: string;
  guardianId: string | null;
  smsSentStatus: 'SENT' | 'FAILED' | 'PENDING' | string | null;
  remarks: string | null;
}

interface AttendanceRecord {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
  remarks: string;
}

// Kenya school date helper: dd/mm/yy (e.g. 06/10/26) or dd/mm/yyyy
const formatToDdMmYy = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y.slice(2)}`;
};

const parseDdMmYyToIso = (val: string): string | null => {
  const cleaned = val.trim();
  const match = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2}|\d{4})$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);
  if (match[3].length === 2) {
    year = 2000 + year;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return iso;
};

export const AttendanceOversightView: React.FC = () => {
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [targetDate, setTargetDate] = useState(todayIso);
  const [dateInputValue, setDateInputValue] = useState(formatToDdMmYy(todayIso));
  const datePickerRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'registers' | 'absentees'>('registers');
  const [absentFilter, setAbsentFilter] = useState<'ALL' | 'UNNOTIFIED' | 'SENT'>('ALL');

  const [data, setData] = useState<{
    date: string;
    totalClassesCount: number;
    registersSubmittedCount: number;
    totalPresent: number;
    totalAbsent: number;
    totalExcused: number;
    absentStudents: AbsentStudent[];
    classSummaries: ClassSummary[];
  }>({
    date: todayIso,
    totalClassesCount: 0,
    registersSubmittedCount: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalExcused: 0,
    absentStudents: [],
    classSummaries: [],
  });

  const [sendingSmsId, setSendingSmsId] = useState<string | null>(null);
  const [bulkSendingSms, setBulkSendingSms] = useState(false);

  // Register inspection / edit modal state
  const [selectedClass, setSelectedClass] = useState<ClassSummary | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSaving, setRegisterSaving] = useState(false);
  const [registerRecords, setRegisterRecords] = useState<AttendanceRecord[]>([]);
  const [registerSearch, setRegisterSearch] = useState('');

  // Keep input in sync with targetDate
  useEffect(() => {
    setDateInputValue(formatToDdMmYy(targetDate));
  }, [targetDate]);

  const fetchAttendance = async (dateStr?: string) => {
    const fetchDate = dateStr || targetDate;
    try {
      setIsFetching(true);
      const res = await apiClient.get(`/api/attendance/school-wide?date=${fetchDate}`);
      if (res.data.data) {
        setData(res.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load attendance oversight data');
    } finally {
      setIsFetching(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [targetDate]);

  const handleCommitDateInput = () => {
    const parsedIso = parseDdMmYyToIso(dateInputValue);
    if (parsedIso) {
      if (parsedIso !== targetDate) {
        setTargetDate(parsedIso);
      }
    } else {
      toast.warning('Please enter date as DD/MM/YY (e.g. 06/10/26)');
      setDateInputValue(formatToDdMmYy(targetDate));
    }
  };

  const handleStepDate = (days: number) => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() + days);
    const nextIso = d.toISOString().split('T')[0];
    setTargetDate(nextIso);
  };

  const isToday = targetDate === todayIso;

  const handleSendSms = async (student: any) => {
    if (sendingSmsId) return;
    try {
      setSendingSmsId(student.studentId);
      await apiClient.post('/api/attendance/notify-parent', {
        studentId: student.studentId,
        guardianId: student.guardianId,
        guardianPhone: student.guardianPhone,
        studentName: student.studentName,
      });
      toast.success(`Absentee SMS alert sent to ${student.guardianName} (${student.guardianPhone})`);
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send SMS');
    } finally {
      setSendingSmsId(null);
    }
  };

  const handleNotifyAllAbsent = async () => {
    if (bulkSendingSms) return;
    const unnotified = data.absentStudents.filter(
      (s) => !s.smsSentStatus || s.smsSentStatus === 'PENDING' || s.smsSentStatus === 'FAILED'
    );
    if (unnotified.length === 0) {
      toast.info('No unnotified absent learners remaining for this date.');
      return;
    }

    const notedCount = unnotified.filter((s) => Boolean(s.remarks)).length;
    const confirmMessage =
      notedCount > 0
        ? `Send automated SMS notifications to all ${unnotified.length} parents of absent learners for ${targetDate}?\n\nNote: ${notedCount} learner(s) have teacher remarks recorded (e.g. sick, doctor visit). Please review their notes in the hub if you wish to exclude them.`
        : `Are you sure you want to send automated SMS notifications to all ${unnotified.length} parents of absent learners for ${targetDate}?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setBulkSendingSms(true);
      const res = await apiClient.post('/api/attendance/notify-all-absent', { date: targetDate });
      toast.success(res.data?.data?.message || `Dispatched absentee SMS to ${res.data?.data?.count || 0} parent(s)`);
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to dispatch bulk SMS');
    } finally {
      setBulkSendingSms(false);
    }
  };

  const handleOpenRegisterModal = async (cls: ClassSummary) => {
    setSelectedClass(cls);
    setRegisterSearch('');
    try {
      setRegisterLoading(true);
      const res = await apiClient.get(`/api/attendance/classes/${cls.classId}/register?date=${targetDate}`);
      const rawRecords = res.data.data?.records || res.data.data?.students || [];
      const normalized: AttendanceRecord[] = rawRecords.map((r: any) => ({
        studentId: r.studentId,
        admissionNumber: r.admissionNumber || r.assessmentNumber || r.studentId?.slice(0, 8) || 'N/A',
        studentName: r.studentName || `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Unknown Learner',
        status: r.status || 'PRESENT',
        remarks: r.remarks || '',
      }));
      setRegisterRecords(normalized);

      // Hydrate audit metadata from backend response if available
      if (res.data.data) {
        setSelectedClass((prev) =>
          prev
            ? {
                ...prev,
                isSubmitted: Boolean(res.data.data.isSubmitted ?? prev.isSubmitted),
                submittedAt: res.data.data.submittedAt || prev.submittedAt,
                submittedByTeacher: res.data.data.submittedBy || prev.submittedByTeacher,
              }
            : null
        );
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load class register');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleRecordStatusChange = (studentId: string, newStatus: 'PRESENT' | 'ABSENT' | 'EXCUSED') => {
    if (selectedClass?.isSubmitted) {
      toast.warning('Submitted registers cannot be modified under zero-trust policy.');
      return;
    }
    setRegisterRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status: newStatus } : r))
    );
  };

  const handleRecordRemarkChange = (studentId: string, remark: string) => {
    if (selectedClass?.isSubmitted) return;
    setRegisterRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, remarks: remark } : r))
    );
  };

  const handleMarkAllPresent = () => {
    if (selectedClass?.isSubmitted) {
      toast.warning('Submitted registers cannot be modified.');
      return;
    }
    setRegisterRecords((prev) => prev.map((r) => ({ ...r, status: 'PRESENT' })));
    toast.info('Marked all learners as PRESENT');
  };

  const handleSaveRegister = async () => {
    if (!selectedClass || registerSaving) return;
    if (selectedClass.isSubmitted) {
      toast.warning('This register has already been submitted and locked. Modifications are blocked to preserve audit integrity.');
      return;
    }
    try {
      setRegisterSaving(true);
      await apiClient.post(`/api/attendance/classes/${selectedClass.classId}/register`, {
        date: targetDate,
        records: registerRecords.map((r) => ({
          studentId: r.studentId,
          status: r.status,
          remarks: r.remarks,
        })),
      });
      toast.success(`Register for ${selectedClass.className} saved successfully`);
      setSelectedClass(null);
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save register');
    } finally {
      setRegisterSaving(false);
    }
  };

  const unnotifiedCount = data.absentStudents.filter(
    (s) => !s.smsSentStatus || s.smsSentStatus === 'PENDING' || s.smsSentStatus === 'FAILED'
  ).length;

  const filteredAbsentStudents = data.absentStudents.filter((s) => {
    if (absentFilter === 'UNNOTIFIED') {
      return !s.smsSentStatus || s.smsSentStatus === 'PENDING' || s.smsSentStatus === 'FAILED';
    }
    if (absentFilter === 'SENT') {
      return s.smsSentStatus === 'SENT';
    }
    return true;
  });

  const filteredRegisterRecords = registerRecords.filter(
    (r) =>
      r.studentName.toLowerCase().includes(registerSearch.toLowerCase()) ||
      r.admissionNumber.toLowerCase().includes(registerSearch.toLowerCase())
  );

  const modalPresentCount = registerRecords.filter((r) => r.status === 'PRESENT').length;
  const modalAbsentCount = registerRecords.filter((r) => r.status === 'ABSENT').length;
  const modalExcusedCount = registerRecords.filter((r) => r.status === 'EXCUSED').length;

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 sm:space-y-6 max-w-6xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 bg-white/90 dark:bg-[#0c1830] backdrop-blur-md rounded-2xl sm:rounded-3xl border border-sky-100 dark:border-[#1a335a] shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Users className="w-4 h-4 text-sky-500" />
            Attendance Oversight
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Daily Attendance Oversight
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-xl">
            School-wide daily register completion status and absentee notifications for parents.
          </p>
        </div>

        {/* Controls Bar: DD/MM/YY Date Navigator & Bulk SMS Action */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
          {/* Enhanced Date Navigator in DD/MM/YY format */}
          <div className="flex items-center gap-1.5 p-1 bg-sky-50/70 dark:bg-slate-900/80 border border-sky-100 dark:border-slate-800 rounded-xl sm:rounded-2xl">
            {/* Prev Day button */}
            <button
              type="button"
              onClick={() => handleStepDate(-1)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Date Input in dd/mm/yy format */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[#0c1830] border border-sky-200 dark:border-slate-700 rounded-lg shadow-xs">
              <button
                type="button"
                onClick={() => {
                  if (datePickerRef.current) {
                    if (datePickerRef.current.showPicker) {
                      datePickerRef.current.showPicker();
                    } else {
                      datePickerRef.current.focus();
                    }
                  }
                }}
                className="text-sky-600 dark:text-sky-400 hover:text-sky-700 cursor-pointer p-0.5"
                title="Click to pick date from calendar"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
              <input
                type="text"
                value={dateInputValue}
                onChange={(e) => setDateInputValue(e.target.value)}
                onBlur={handleCommitDateInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCommitDateInput();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="dd/mm/yy"
                className="w-18 bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none text-center"
                title="Date in dd/mm/yy format (Press Enter to apply)"
              />
              {/* Hidden native date input for the calendar popup */}
              <input
                type="date"
                ref={datePickerRef}
                value={targetDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setTargetDate(e.target.value);
                  }
                }}
                className="sr-only"
                tabIndex={-1}
              />
            </div>

            {/* Next Day button */}
            <button
              type="button"
              onClick={() => handleStepDate(1)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Jump to Today button */}
            {!isToday && (
              <button
                type="button"
                onClick={() => setTargetDate(todayIso)}
                className="px-2 py-1 text-[11px] font-bold rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-200 transition-colors cursor-pointer"
                title="Jump to Today"
              >
                Today
              </button>
            )}

            {isFetching && (
              <div className="w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0 mx-1" />
            )}
          </div>

          {/* Bulk SMS Action Button */}
          <button
            onClick={handleNotifyAllAbsent}
            disabled={bulkSendingSms || unnotifiedCount === 0}
            className={`px-4 py-2 font-bold text-xs rounded-xl sm:rounded-2xl shadow-glass flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              unnotifiedCount === 0 && data.absentStudents.length > 0
                ? 'bg-emerald-600 text-white'
                : 'bg-sky-500 hover:bg-sky-600 text-white'
            }`}
            title="Dispatch SMS notifications to all unnotified parents of absent learners"
          >
            {bulkSendingSms ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : unnotifiedCount === 0 && data.absentStudents.length > 0 ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {unnotifiedCount === 0 && data.absentStudents.length > 0
                ? 'All SMS Sent'
                : `Notify All Absent (${unnotifiedCount})`}
            </span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Registers Submitted */}
        <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#0c1830] backdrop-blur-md border border-sky-100 dark:border-[#1a335a] rounded-2xl shadow-glass">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Registers Submitted
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {data.registersSubmittedCount} / {data.totalClassesCount}
          </div>
          <div className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-1">
            {data.totalClassesCount > 0 ? Math.round((data.registersSubmittedCount / data.totalClassesCount) * 100) : 0}% completed
          </div>
        </div>

        {/* Card 2: Present Learners */}
        <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#0c1830] backdrop-blur-md border border-sky-100 dark:border-[#1a335a] rounded-2xl shadow-glass">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Present Learners
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {data.totalPresent}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Learners in school</p>
        </div>

        {/* Card 3: Absent Learners */}
        <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#0c1830] backdrop-blur-md border border-sky-100 dark:border-[#1a335a] rounded-2xl shadow-glass">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Absent Learners
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
            {data.totalAbsent}
          </div>
          {data.totalAbsent === 0 ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">Full attendance</p>
          ) : unnotifiedCount > 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {unnotifiedCount} Pending SMS
            </p>
          ) : (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              All SMS Dispatched
            </p>
          )}
        </div>

        {/* Card 4: Excused */}
        <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#0c1830] backdrop-blur-md border border-sky-100 dark:border-[#1a335a] rounded-2xl shadow-glass">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Excused Absences
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-400 mt-1">
            {data.totalExcused}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Authorized absences</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-sky-100 dark:border-[#1a335a] pb-2">
        <button
          onClick={() => setActiveTab('registers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'registers'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'bg-white/80 dark:bg-[#0c1830] text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-700 dark:hover:text-sky-300 border border-sky-100 dark:border-[#1a335a]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Class Registers ({data.classSummaries?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('absentees')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'absentees'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'bg-white/80 dark:bg-[#0c1830] text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-700 dark:hover:text-sky-300 border border-sky-100 dark:border-[#1a335a]'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Absentee Parents Hub ({data.absentStudents.length})</span>
          {unnotifiedCount > 0 ? (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-500 text-white font-extrabold rounded-full">
              {unnotifiedCount}
            </span>
          ) : data.absentStudents.length > 0 ? (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-500 text-white font-extrabold rounded-full flex items-center gap-0.5">
              <CheckCircle className="w-2.5 h-2.5" /> All Sent
            </span>
          ) : null}
        </button>
      </div>

      {/* TAB 1: Class Registers Oversight Grid */}
      {activeTab === 'registers' && (
        <div className="p-4 sm:p-6 bg-white/85 dark:bg-[#0c1830] backdrop-blur-md border border-sky-100 dark:border-[#1a335a] rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Class Registers ({formatToDdMmYy(targetDate)})
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {data.classSummaries?.length || 0} Classes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {data.classSummaries?.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 italic">
                No active classes found.
              </div>
            ) : (
              data.classSummaries?.map((cls) => {
                const isSubmitted = Boolean(cls.submitted ?? cls.isSubmitted);
                const totalLearners = cls.totalStudents ?? cls.totalEnrolled ?? (cls.presentCount + cls.absentCount + cls.excusedCount);

                return (
                  <div
                    key={cls.classId}
                    className="p-4 rounded-2xl bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] hover:border-sky-300 dark:hover:border-sky-500/50 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">{cls.className}</h4>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {totalLearners} enrolled learners
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${
                            isSubmitted
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {isSubmitted ? 'SUBMITTED' : 'PENDING'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-sky-50 dark:border-slate-800 text-center">
                        <div className="bg-sky-50/60 dark:bg-sky-950/30 rounded-xl p-1.5 border border-sky-100/50 dark:border-sky-900/30">
                          <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-300 block">Present</span>
                          <span className="text-sm font-black text-sky-700 dark:text-sky-300">{cls.presentCount}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-1.5 border border-slate-100 dark:border-slate-700/40">
                          <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Absent</span>
                          <span className="text-sm font-black text-slate-800 dark:text-slate-200">{cls.absentCount}</span>
                        </div>
                        <div className="bg-sky-50/40 dark:bg-sky-950/20 rounded-xl p-1.5 border border-sky-100/30 dark:border-sky-900/20">
                          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Excused</span>
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">{cls.excusedCount}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sky-500 shrink-0" />
                        {isSubmitted ? (
                          <span>
                            By <strong className="text-slate-700 dark:text-slate-200">{cls.submittedByTeacher || 'Class Teacher'}</strong> at{' '}
                            {cls.submittedAt ? new Date(cls.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recorded'}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">Not yet submitted today</span>
                        )}
                      </div>
                    </div>

                    {isSubmitted ? (
                      <button
                        onClick={() => handleOpenRegisterModal(cls)}
                        className="mt-3 w-full py-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Audit and inspect submitted register records"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>Inspect Register</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenRegisterModal(cls)}
                        className="mt-3 w-full py-2 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Complete roll-call for this unsubmitted class register"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Complete Register</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Absentee Roster & Parent SMS Action Table */}
      {activeTab === 'absentees' && (
        <div className="p-4 sm:p-6 bg-white/85 dark:bg-[#0c1830] backdrop-blur-md border border-sky-100 dark:border-[#1a335a] rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Phone className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Absentee Learners & Parent Alerts ({filteredAbsentStudents.length})
            </h3>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 bg-sky-50/80 dark:bg-slate-900 p-1 rounded-xl border border-sky-100 dark:border-slate-800 text-xs">
              <button
                onClick={() => setAbsentFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  absentFilter === 'ALL'
                    ? 'bg-white dark:bg-[#0c1830] text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                All ({data.absentStudents.length})
              </button>
              <button
                onClick={() => setAbsentFilter('UNNOTIFIED')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  absentFilter === 'UNNOTIFIED'
                    ? 'bg-white dark:bg-[#0c1830] text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Unnotified ({unnotifiedCount})
              </button>
              <button
                onClick={() => setAbsentFilter('SENT')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  absentFilter === 'SENT'
                    ? 'bg-white dark:bg-[#0c1830] text-sky-700 dark:text-sky-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                SMS Sent ({data.absentStudents.filter((s) => s.smsSentStatus === 'SENT').length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[680px]">
              <thead className="bg-sky-50/80 dark:bg-slate-900 text-sky-900 dark:text-sky-300 font-bold uppercase tracking-wider border-b border-sky-100 dark:border-[#1a335a]">
                <tr>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Class</th>
                  <th className="py-3.5 px-4">Teacher Note / Reason</th>
                  <th className="py-3.5 px-4">Parent / Guardian</th>
                  <th className="py-3.5 px-4">Parent Phone Number</th>
                  <th className="py-3.5 px-4 text-center">SMS Status</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/60 dark:divide-slate-800/60">
                {filteredAbsentStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500 italic">
                      No absent learners match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredAbsentStudents.map((row) => (
                    <tr key={row.studentId} className="hover:bg-sky-50/40 dark:hover:bg-sky-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {row.studentName}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {row.className}
                      </td>
                      <td className="py-3.5 px-4">
                        {row.remarks ? (
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 font-medium text-[11px] max-w-xs"
                            title={row.remarks}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="truncate">{row.remarks}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">No note recorded</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-bold">
                        {row.guardianName || 'Parent / Guardian'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {row.guardianPhone || 'No phone registered'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {row.smsSentStatus === 'SENT' ? (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold rounded-full inline-flex items-center justify-center gap-1 border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> SMS Delivered
                          </span>
                        ) : row.smsSentStatus === 'FAILED' ? (
                          <span className="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold rounded-full inline-flex items-center justify-center gap-1 border border-rose-500/20">
                            <AlertCircle className="w-3 h-3 text-rose-500" /> Delivery Failed
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-full inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Awaiting Dispatch
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleSendSms(row)}
                          disabled={sendingSmsId === row.studentId || !row.guardianPhone}
                          className={`px-3.5 py-1.5 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 mx-auto transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs ${
                            row.smsSentStatus === 'SENT'
                              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              : 'bg-sky-500 hover:bg-sky-600 text-white shadow-glass'
                          }`}
                          title={row.smsSentStatus === 'SENT' ? 'Resend absentee SMS' : 'Send absentee SMS'}
                        >
                          {sendingSmsId === row.studentId ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          {sendingSmsId === row.studentId ? 'Sending...' : (row.smsSentStatus === 'SENT' ? 'Resend SMS' : 'Send SMS')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Class Register Modal */}
      {selectedClass && (
        <Modal
          isOpen={!!selectedClass}
          onClose={() => setSelectedClass(null)}
          title={
            selectedClass.isSubmitted
              ? `Register: ${selectedClass.className} (${formatToDdMmYy(targetDate)})`
              : `Complete Register: ${selectedClass.className} (${formatToDdMmYy(targetDate)})`
          }
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Submitted Notice Banner */}
            {selectedClass.isSubmitted && (
              <div className="flex items-center justify-between gap-3 p-3 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-extrabold flex items-center gap-1.5">
                      <span>Submitted Register</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Submitted by <strong className="text-emerald-950 dark:text-white">{selectedClass.submittedByTeacher || 'Class Teacher'}</strong>
                      {selectedClass.submittedAt && (
                        <span> at {new Date(selectedClass.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                      . Read-only inspection mode is active.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold text-[10px] uppercase tracking-wider">
                  <Lock className="w-3 h-3" /> Read-Only
                </div>
              </div>
            )}

            {/* Modal Subheader with Stats & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Total: <strong className="text-slate-900 dark:text-slate-100">{registerRecords.length}</strong>
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Present: <strong>{modalPresentCount}</strong>
                </span>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  Absent: <strong>{modalAbsentCount}</strong>
                </span>
                <span className="text-xs font-bold text-sky-700 dark:text-sky-300">
                  Excused: <strong>{modalExcusedCount}</strong>
                </span>
              </div>

              {!selectedClass.isSubmitted ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="px-3 py-1.5 bg-white dark:bg-[#0c1830] border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark All Present</span>
                  </button>
                </div>
              ) : (
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 italic">
                  Immutable roll-call record
                </span>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search learner by name or admission number..."
                value={registerSearch}
                onChange={(e) => setRegisterSearch(e.target.value)}
                className="w-full bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            {/* Roster Table */}
            {registerLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-sky-100 dark:border-[#1a335a] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sky-50/90 dark:bg-[#0c1830] text-sky-900 dark:text-sky-300 font-bold uppercase tracking-wider border-b border-sky-100 dark:border-[#1a335a] sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Adm #</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-50 dark:divide-slate-800/60">
                    {filteredRegisterRecords.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                          No students found in this class.
                        </td>
                      </tr>
                    ) : (
                      filteredRegisterRecords.map((r) => (
                        <tr key={r.studentId} className="hover:bg-sky-50/40 dark:hover:bg-sky-950/20 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                            {r.admissionNumber}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                            {r.studentName}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {selectedClass.isSubmitted ? (
                              <span
                                className={`inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-lg ${
                                  r.status === 'PRESENT'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : r.status === 'ABSENT'
                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                    : 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                }`}
                              >
                                {r.status}
                              </span>
                            ) : (
                              <div className="inline-flex rounded-lg p-0.5 bg-sky-50/80 dark:bg-slate-900/80 border border-sky-100 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => handleRecordStatusChange(r.studentId, 'PRESENT')}
                                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                    r.status === 'PRESENT'
                                      ? 'bg-sky-500 text-white shadow-xs'
                                      : 'text-slate-600 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-300'
                                  }`}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRecordStatusChange(r.studentId, 'ABSENT')}
                                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                    r.status === 'ABSENT'
                                      ? 'bg-slate-800 text-white shadow-xs'
                                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                  }`}
                                >
                                  Absent
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRecordStatusChange(r.studentId, 'EXCUSED')}
                                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                    r.status === 'EXCUSED'
                                      ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-extrabold border border-sky-200 dark:border-sky-800'
                                      : 'text-slate-600 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-300'
                                  }`}
                                >
                                  Excused
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {selectedClass.isSubmitted ? (
                              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                                {r.remarks || <span className="text-slate-300 dark:text-slate-600 italic">None</span>}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Reason / Notes..."
                                value={r.remarks || ''}
                                onChange={(e) => handleRecordRemarkChange(r.studentId, e.target.value)}
                                className="w-full bg-white dark:bg-slate-900/80 border border-sky-100 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-700 dark:text-slate-200 outline-none focus:border-sky-400 transition-colors"
                              />
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-sky-100 dark:border-slate-800">
              {selectedClass.isSubmitted ? (
                <button
                  type="button"
                  onClick={() => setSelectedClass(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Close Inspection
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedClass(null)}
                    className="px-4 py-2 bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRegister}
                    disabled={registerSaving}
                    className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registerSaving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                    {registerSaving ? 'Saving...' : 'Save Daily Register'}
                  </button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};
