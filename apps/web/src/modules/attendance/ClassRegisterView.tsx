import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, CheckCircle2, Clock, Save,
  Users, CheckCheck, Search, Lock, ShieldCheck,
  MessageSquare, AlertTriangle, AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';

interface StudentRegisterRow {
  studentId: string;
  admissionNumber?: string;
  assessmentNumber?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: string;
  guardianName: string;
  guardianPhone: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
  remarks?: string;
}

interface HistoryLearner {
  studentId: string;
  admissionNumber?: string;
  assessmentNumber?: string;
  fullName: string;
  gender: string;
  guardianName: string;
  guardianPhone: string;
  stats: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    excusedDays: number;
    lateDays: number;
    attendanceRate: number;
    isChronicAbsent: boolean;
  };
}

export const ClassRegisterView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fixed today's date in Africa/Nairobi timezone (locked, cannot be edited)
  const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
  const todayDisplayStr = new Date().toLocaleDateString('en-KE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Nairobi',
  });
  const selectedDate = todayDateStr;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE'>('ALL');

  // Teacher & Class state
  const [assignedClass, setAssignedClass] = useState<any>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<StudentRegisterRow[]>([]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [expandedRemarkId, setExpandedRemarkId] = useState<string | null>(null);

  // History state
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<{
    totalRegisters: number;
    overallAttendanceRate: number;
    students: HistoryLearner[];
  } | null>(null);

  // 1. Initial Load: Fetch teacher workstation data to determine assigned class
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const workstationRes = await apiClient.get('/api/teacher/workstation');
        const workstation = workstationRes.data?.data;

        if (workstation?.classTeacher) {
          setAssignedClass(workstation.classTeacher);
          setSelectedClassId(workstation.classTeacher.classId);
        } else {
          setAssignedClass(null);
          setSelectedClassId('');
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load teacher class assignment');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // 2. Load register whenever selectedClassId or selectedDate changes
  useEffect(() => {
    if (!selectedClassId) return;

    const fetchRegister = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/api/attendance/classes/${selectedClassId}/register?date=${selectedDate}`);
        const regData = res.data?.data;
        if (regData) {
          setStudents(regData.students || []);
          setIsSubmitted(regData.isSubmitted);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load class register');
      } finally {
        setLoading(false);
      }
    };

    fetchRegister();
  }, [selectedClassId, selectedDate]);

  // 3. Load attendance history when history tab is active
  useEffect(() => {
    if (activeTab !== 'history' || !selectedClassId) return;

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await apiClient.get(`/api/attendance/classes/${selectedClassId}/history`);
        setHistoryData(res.data?.data || null);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load attendance history');
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [activeTab, selectedClassId]);

  // Quick action: Mark all present
  const handleMarkAllPresent = () => {
    if (isSubmitted) {
      toast.warning("Today's register has already been submitted and locked under zero-trust policy.");
      return;
    }
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'PRESENT',
      }))
    );
    toast.info('All learners marked Present. Remember to save changes.');
  };

  // Quick action: Set status for single student
  const handleStatusChange = (studentId: string, newStatus: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE') => {
    if (isSubmitted) {
      toast.warning('Register is locked. Roll-call cannot be modified once submitted.');
      return;
    }
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status: newStatus } : s))
    );
  };

  // Remark change
  const handleRemarksChange = (studentId: string, remarks: string) => {
    if (isSubmitted) return;
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, remarks } : s))
    );
  };

  // Save register
  const handleSaveRegister = async () => {
    if (!selectedClassId) return;
    if (isSubmitted) {
      toast.warning('This register has already been submitted and locked. Resubmission is blocked to preserve audit integrity.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: selectedDate,
        records: students.map((s) => ({
          studentId: s.studentId,
          status: s.status,
          remarks: s.remarks || '',
        })),
      };

      await apiClient.post(`/api/attendance/classes/${selectedClassId}/register`, payload);
      setIsSubmitted(true);
      toast.success(`Register for ${selectedDate} saved and locked successfully!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save attendance register');
    } finally {
      setSaving(false);
    }
  };

  // Real-time calculation of status counts
  const presentCount = students.filter((s) => s.status === 'PRESENT').length;
  const absentCount = students.filter((s) => s.status === 'ABSENT').length;
  const excusedCount = students.filter((s) => s.status === 'EXCUSED').length;
  const lateCount = students.filter((s) => s.status === 'LATE').length;
  const totalCount = students.length;

  // Filtered students for display
  const filteredStudents = students.filter((s) => {
    const fullName = `${s.firstName} ${s.middleName || ''} ${s.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      fullName.includes(query) ||
      (s.assessmentNumber && s.assessmentNumber.toLowerCase().includes(query)) ||
      (s.admissionNumber && s.admissionNumber.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered history students
  const filteredHistory = (historyData?.students || []).filter((h) => {
    const query = searchQuery.toLowerCase();
    return (
      h.fullName.toLowerCase().includes(query) ||
      (h.assessmentNumber && h.assessmentNumber.toLowerCase().includes(query))
    );
  });

  if (!loading && !assignedClass) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <div className="bg-white/90 dark:bg-[#091326]/90 backdrop-blur-md rounded-3xl p-8 sm:p-12 border border-sky-100 dark:border-[#162b4d] shadow-glass text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] flex items-center justify-center mx-auto text-sky-600 dark:text-sky-400 shadow-xs">
            <Users className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">No Class Assigned Yet</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              You are currently not assigned as a Class Teacher to any class. The Deputy Head Teacher assigns class teachers via Class & Teacher Allocations.
            </p>
          </div>
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 dark:bg-[#072648] text-sky-700 dark:text-sky-300 text-xs font-semibold border border-sky-100 dark:border-[#0c4a6e]">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Role: Subject Specialist / Unassigned Class Teacher
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 max-w-5xl mx-auto pb-10">
      {/* 1. Minimalist Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {assignedClass?.className || 'Class'} Register
            </h1>
            {assignedClass?.isStandingIn && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Standing In
              </span>
            )}
            {isSubmitted ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Submitted & Locked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Pending
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            <span>{todayDisplayStr}</span>
          </div>
        </div>

        {/* Tab Switcher & Desktop Fast Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-white dark:bg-[#0c1830] text-sky-700 dark:text-sky-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Roll Call
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-[#0c1830] text-sky-700 dark:text-sky-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              History
            </button>
          </div>

          {activeTab === 'today' && (
            <div className="hidden sm:flex items-center gap-2">
              {!isSubmitted ? (
                <>
                  <button
                    onClick={handleMarkAllPresent}
                    disabled={loading || students.length === 0}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>All Present</span>
                  </button>
                  <button
                    onClick={handleSaveRegister}
                    disabled={loading || saving || students.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Submit Register'}</span>
                  </button>
                </>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Locked</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'today' ? (
        <>
          {/* 2. Compact Minimalist Summary & Filter Bar (Sticky on scroll) */}
          <div className="sticky top-2 z-20 bg-white/95 dark:bg-[#0c1830]/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200/90 dark:border-[#1a335a] shadow-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Quick Metrics Strip */}
              <div className="flex items-center gap-2 sm:gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>
                  Total: <strong className="text-slate-900 dark:text-slate-100 font-bold">{totalCount}</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  Present: <strong>{presentCount}</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className={absentCount > 0 ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-500"}>
                  Absent: <strong>{absentCount}</strong>
                </span>
                {excusedCount > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-sky-600 dark:text-sky-400">
                      Excused: <strong>{excusedCount}</strong>
                    </span>
                  </>
                )}
                {lateCount > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-amber-600 dark:text-amber-400">
                      Late: <strong>{lateCount}</strong>
                    </span>
                  </>
                )}
              </div>

              {/* Quick Mobile Action Buttons */}
              {!isSubmitted && (
                <div className="flex sm:hidden items-center gap-1.5 ml-auto">
                  <button
                    onClick={handleMarkAllPresent}
                    disabled={loading || students.length === 0}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                  >
                    All Present
                  </button>
                  <button
                    onClick={handleSaveRegister}
                    disabled={loading || saving || students.length === 0}
                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-sky-500 hover:bg-sky-600 text-white shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Submit'}
                  </button>
                </div>
              )}
            </div>

            {/* Compact Search & Status Filter */}
            <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter student..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-1 text-[11px] shrink-0">
                {(['ALL', 'PRESENT', 'ABSENT'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                      statusFilter === filter
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {filter === 'ALL' ? `All (${totalCount})` : filter === 'PRESENT' ? `Present (${presentCount})` : `Absent (${absentCount})`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Zero-Trust Locked Audit Notice (Only When Submitted) */}
          {isSubmitted && (
            <div className="flex items-center justify-between gap-2 p-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong>Roll call submitted & locked.</strong> Records cannot be re-taken or edited.
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 shrink-0 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Read-Only
              </span>
            </div>
          )}

          {/* 3. High-Density Mobile-First Roll Call Roster */}
          <div className="bg-white/90 dark:bg-[#0c1830] backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-[#1a335a] shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading student register...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No students found matching current filters.
              </div>
            ) : (
              filteredStudents.map((student, idx) => {
                const isRemarkOpen = expandedRemarkId === student.studentId;
                return (
                  <div
                    key={student.studentId}
                    className={`p-2.5 sm:px-4 sm:py-2.5 transition-colors ${
                      student.status === 'ABSENT'
                        ? 'bg-rose-50/40 dark:bg-rose-950/25'
                        : student.status === 'EXCUSED'
                        ? 'bg-sky-50/30 dark:bg-sky-950/15'
                        : student.status === 'LATE'
                        ? 'bg-amber-50/30 dark:bg-amber-950/15'
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Left: Roll #, Name, Adm # */}
                      <div className="min-w-0 flex-1 flex items-center gap-2 sm:gap-3">
                        <span className="text-[11px] font-mono font-bold text-slate-400 w-5 text-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {student.firstName} {student.middleName || ''} {student.lastName}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono">Adm: {student.admissionNumber || student.assessmentNumber || '—'}</span>
                            {student.remarks && !isRemarkOpen && (
                              <>
                                <span>•</span>
                                <span className="italic text-slate-600 dark:text-slate-300 truncate">
                                  "{student.remarks}"
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Segmented Status Toggle & Remark Button */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="inline-flex rounded-xl p-0.5 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                          {/* PRESENT */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.studentId, 'PRESENT')}
                            disabled={isSubmitted}
                            className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                              student.status === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            } ${isSubmitted ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                            title="Present"
                          >
                            <span className="sm:hidden">P</span>
                            <span className="hidden sm:inline">Present</span>
                          </button>

                          {/* ABSENT */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.studentId, 'ABSENT')}
                            disabled={isSubmitted}
                            className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                              student.status === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                            } ${isSubmitted ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                            title="Absent"
                          >
                            <span className="sm:hidden">A</span>
                            <span className="hidden sm:inline">Absent</span>
                          </button>

                          {/* EXCUSED */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.studentId, 'EXCUSED')}
                            disabled={isSubmitted}
                            className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                              student.status === 'EXCUSED'
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400'
                            } ${isSubmitted ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                            title="Excused"
                          >
                            <span className="sm:hidden">E</span>
                            <span className="hidden sm:inline">Excused</span>
                          </button>

                          {/* LATE */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.studentId, 'LATE')}
                            disabled={isSubmitted}
                            className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                              student.status === 'LATE'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
                            } ${isSubmitted ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                            title="Late Arrival"
                          >
                            <span className="sm:hidden">L</span>
                            <span className="hidden sm:inline">Late</span>
                          </button>
                        </div>

                        {!isSubmitted && (
                          <button
                            type="button"
                            onClick={() => setExpandedRemarkId(isRemarkOpen ? null : student.studentId)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              student.remarks
                                ? 'text-sky-600 bg-sky-50 dark:bg-sky-950/50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={student.remarks ? `Remark: ${student.remarks}` : "Add remark"}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Inline Remark Input */}
                    {isRemarkOpen && !isSubmitted && (
                      <div className="mt-2 pl-7 flex items-center gap-2">
                        <input
                          type="text"
                          value={student.remarks || ''}
                          onChange={(e) => handleRemarksChange(student.studentId, e.target.value)}
                          placeholder="Add remark (e.g. sick, doctor visit, excused)..."
                          autoFocus
                          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-sky-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setExpandedRemarkId(null)}
                          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold px-2 py-1 cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* History Tab */
        <div className="space-y-4">
          {/* History KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/85 dark:bg-[#0c1830] backdrop-blur-md rounded-2xl p-4 border border-slate-200 dark:border-[#1a335a] shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Roll Calls</div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{historyData?.totalRegisters || 0}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Recorded daily registers</div>
            </div>

            <div className="bg-white/85 dark:bg-[#0c1830] backdrop-blur-md rounded-2xl p-4 border border-slate-200 dark:border-[#1a335a] shadow-xs">
              <div className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">Overall Attendance Rate</div>
              <div className="text-2xl font-black text-sky-700 dark:text-sky-400 mt-1">
                {historyData?.overallAttendanceRate || 100}%
              </div>
              <div className="text-[11px] text-sky-600/80 mt-0.5">Term attendance performance</div>
            </div>

            <div className="bg-white/85 dark:bg-[#0c1830] backdrop-blur-md rounded-2xl p-4 border border-slate-200 dark:border-[#1a335a] shadow-xs">
              <div className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> Chronic Absenteeism Flag
              </div>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                {historyData?.students.filter((s) => s.stats.isChronicAbsent).length || 0}
              </div>
              <div className="text-[11px] text-rose-600/80 mt-0.5">Learners with &lt; 85% attendance</div>
            </div>
          </div>

          {/* Chronic Absenteeism Notice Banner */}
          {historyData && historyData.students.some((s) => s.stats.isChronicAbsent) && (
            <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">Chronic Absenteeism Warning</h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  Learners below 85% attendance require follow-up with guardians to safeguard CBC competency progress.
                </p>
              </div>
            </div>
          )}

          {/* Search History */}
          <div className="bg-white/85 dark:bg-[#0c1830] backdrop-blur-md p-2.5 rounded-2xl border border-slate-200 dark:border-[#1a335a] shadow-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history by learner name..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white/85 dark:bg-[#0c1830] backdrop-blur-md rounded-2xl border border-slate-200 dark:border-[#1a335a] shadow-xs overflow-hidden">
            {historyLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading attendance history...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No attendance history records available for this class.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Learner</th>
                      <th className="py-2.5 px-3">Assess #</th>
                      <th className="py-2.5 px-3">Present</th>
                      <th className="py-2.5 px-3">Absent</th>
                      <th className="py-2.5 px-3">Excused</th>
                      <th className="py-2.5 px-3">Rate</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredHistory.map((h) => (
                      <tr
                        key={h.studentId}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                          h.stats.isChronicAbsent ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{h.fullName}</div>
                          <div className="text-[10px] text-slate-400">
                            Guardian: {h.guardianName} ({h.guardianPhone})
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{h.assessmentNumber || '—'}</td>
                        <td className="py-2.5 px-3 text-emerald-700 dark:text-emerald-400 font-bold">{h.stats.presentDays}</td>
                        <td className="py-2.5 px-3 text-rose-700 dark:text-rose-400 font-bold">{h.stats.absentDays}</td>
                        <td className="py-2.5 px-3 text-sky-700 dark:text-sky-400">{h.stats.excusedDays}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-bold ${
                                h.stats.attendanceRate < 85 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {h.stats.attendanceRate}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {h.stats.isChronicAbsent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                              Chronic
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Good
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default ClassRegisterView;
