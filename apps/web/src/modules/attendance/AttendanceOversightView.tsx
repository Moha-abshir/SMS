import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Send, CheckCircle, AlertCircle, Phone, UserX, CheckCheck, Users, Search, Edit3, Clock, Sparkles } from 'lucide-react';
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

interface AttendanceRecord {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
  remarks: string;
}

export const AttendanceOversightView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'registers' | 'absentees'>('registers');
  const [absentFilter, setAbsentFilter] = useState<'ALL' | 'UNNOTIFIED' | 'SENT'>('ALL');

  const [data, setData] = useState<{
    date: string;
    totalClassesCount: number;
    registersSubmittedCount: number;
    totalPresent: number;
    totalAbsent: number;
    totalExcused: number;
    absentStudents: any[];
    classSummaries: ClassSummary[];
  }>({
    date: new Date().toISOString().split('T')[0],
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

  const fetchAttendance = async (dateStr?: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/attendance/school-wide?date=${dateStr || targetDate}`);
      if (res.data.data) {
        setData(res.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load attendance oversight data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [targetDate]);

  const handleSendSms = async (student: any) => {
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
    const unnotified = data.absentStudents.filter(
      (s) => !s.smsSentStatus || s.smsSentStatus === 'PENDING' || s.smsSentStatus === 'FAILED'
    );
    if (unnotified.length === 0) {
      toast.info('No unnotified absent learners remaining for this date.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to send automated SMS notifications to all ${unnotified.length} parents of absent learners for ${targetDate}?`
      )
    ) {
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load class register');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleRecordStatusChange = (studentId: string, newStatus: 'PRESENT' | 'ABSENT' | 'EXCUSED') => {
    setRegisterRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status: newStatus } : r))
    );
  };

  const handleRecordRemarkChange = (studentId: string, remark: string) => {
    setRegisterRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, remarks: remark } : r))
    );
  };

  const handleMarkAllPresent = () => {
    setRegisterRecords((prev) => prev.map((r) => ({ ...r, status: 'PRESENT' })));
    toast.info('Marked all learners as PRESENT');
  };

  const handleSaveRegister = async () => {
    if (!selectedClass) return;
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

  if (loading) {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-sky-100 shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <UserX className="w-4 h-4 text-sky-500" />
            Attendance Register & Parent Notification System
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">School-Wide Attendance Oversight</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Audit daily classroom registers, inspect or override entries, and dispatch automated Africa's Talking parent SMS notifications.
          </p>
        </div>

        {/* Controls Bar: Date Selector & Bulk SMS Action */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 rounded-xl sm:rounded-2xl backdrop-blur-md">
            <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="text-[10px] font-bold tracking-wider text-sky-700 dark:text-sky-300 uppercase">Target Date:</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold px-2 py-1 rounded-lg border border-sky-200 dark:border-slate-700 outline-none cursor-pointer focus:border-sky-500 transition-colors"
            />
          </div>

          <button
            onClick={handleNotifyAllAbsent}
            disabled={bulkSendingSms || unnotifiedCount === 0}
            className={`px-4 py-2.5 font-bold text-xs rounded-xl sm:rounded-2xl shadow-glass flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              unnotifiedCount === 0 && data.absentStudents.length > 0
                ? 'bg-emerald-600 text-white'
                : 'bg-sky-500 hover:bg-sky-600 text-white'
            }`}
            title="Dispatch bulk SMS notifications to all unnotified parents of absent learners"
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
                ? 'All SMS Dispatched'
                : `Notify All Absent (${unnotifiedCount})`}
            </span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#0c1830] backdrop-blur-md border border-sky-100 dark:border-[#1a335a] rounded-2xl shadow-glass">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Registers Submitted</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {data.registersSubmittedCount} / {data.totalClassesCount}
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-sky-600 dark:text-sky-400 font-medium">Class Registers Completed</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {data.totalClassesCount > 0 ? Math.round((data.registersSubmittedCount / data.totalClassesCount) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#0c1830] backdrop-blur-md border border-sky-100 dark:border-[#1a335a] rounded-2xl shadow-glass">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Present Learners</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-400 mt-1">
            {data.totalPresent}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">In School Today</p>
        </div>

        <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#0c1830] backdrop-blur-md border border-sky-100 dark:border-[#1a335a] rounded-2xl shadow-glass">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Absent Learners</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
            {data.totalAbsent}
          </div>
          {data.totalAbsent === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Full Attendance Today</p>
          ) : unnotifiedCount > 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {unnotifiedCount} Awaiting SMS Dispatch
            </p>
          ) : (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              All {data.totalAbsent} SMS Dispatched
            </p>
          )}
        </div>

        <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#0c1830] backdrop-blur-md border border-sky-100 dark:border-[#1a335a] rounded-2xl shadow-glass">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Excused Absences</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
            {data.totalExcused}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Medical or Official Reason</p>
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
          <span>Daily Class Registers ({data.classSummaries?.length || 0})</span>
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
        <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600" />
                Class-by-Class Attendance Registers ({targetDate})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Click "Inspect / Edit Register" on any class to view roster, change attendance, or complete pending registers.
              </p>
            </div>
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

                    <button
                      onClick={() => handleOpenRegisterModal(cls)}
                      className="mt-3 w-full py-2 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Inspect / Edit Register</span>
                    </button>
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
              Absentee Parent Notification Hub ({filteredAbsentStudents.length} Learners)
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
                  <th className="py-3.5 px-4">Parent / Guardian</th>
                  <th className="py-3.5 px-4">Parent Phone Number</th>
                  <th className="py-3.5 px-4 text-center">SMS Status</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/60 dark:divide-slate-800/60">
                {filteredAbsentStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500 italic">
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
                          className={`px-3.5 py-1.5 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 mx-auto transition-all disabled:opacity-50 cursor-pointer shadow-xs ${
                            row.smsSentStatus === 'SENT'
                              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              : 'bg-sky-500 hover:bg-sky-600 text-white shadow-glass'
                          }`}
                          title={row.smsSentStatus === 'SENT' ? 'Resend absentee SMS' : 'Send absentee SMS'}
                        >
                          {sendingSmsId === row.studentId ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          {row.smsSentStatus === 'SENT' ? 'Resend SMS' : 'Send SMS'}
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
          title={`Daily Attendance: ${selectedClass.className} (${targetDate})`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Modal Subheader with Stats & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Total: <strong className="text-slate-900 dark:text-slate-100">{registerRecords.length}</strong>
                </span>
                <span className="text-xs font-bold text-sky-700 dark:text-sky-300">
                  Present: <strong>{modalPresentCount}</strong>
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Absent: <strong>{modalAbsentCount}</strong>
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Excused: <strong>{modalExcusedCount}</strong>
                </span>
              </div>

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
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              placeholder="Reason / Notes..."
                              value={r.remarks || ''}
                              onChange={(e) => handleRecordRemarkChange(r.studentId, e.target.value)}
                              className="w-full bg-white dark:bg-slate-900/80 border border-sky-100 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-700 dark:text-slate-200 outline-none focus:border-sky-400 transition-colors"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRegister}
                disabled={registerSaving}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {registerSaving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Save Daily Register
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};
