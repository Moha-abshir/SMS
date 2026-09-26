import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, CheckCircle2, XCircle, AlertCircle, Clock, Save,
  Users, CheckCheck, RotateCcw, Search, ChevronRight, UserCheck,
  TrendingDown, Sparkles, Filter, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { SearchableSelect } from '../../components/SearchableSelect';

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
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE'>('ALL');

  // Teacher & Class state
  const [assignedClass, setAssignedClass] = useState<any>(null);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<StudentRegisterRow[]>([]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

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
        }

        // Also fetch all classes in case user is admin or deputy
        const classesRes = await apiClient.get('/api/admissions/classes');
        const allClasses = classesRes.data?.data || [];
        setAvailableClasses(allClasses);

        if (!workstation?.classTeacher && allClasses.length > 0) {
          setSelectedClassId(allClasses[0].id);
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
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status: newStatus } : s))
    );
  };

  // Remark change
  const handleRemarksChange = (studentId: string, remarks: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, remarks } : s))
    );
  };

  // Save register
  const handleSaveRegister = async () => {
    if (!selectedClassId) return;
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
      toast.success(`Register for ${selectedDate} saved and synced successfully!`);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-sky-100 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                Class Teacher Workstation
              </span>
              {isSubmitted ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Submitted
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Pending Submission
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Daily Class Register
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Rapid mobile-first roll call. Submitting immediately synchronizes with the Deputy Head's attendance oversight and absentee notifications.
            </p>
          </div>

          {/* Tab Navigation Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-sky-50/80 rounded-xl border border-sky-100 shrink-0">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-sky-700 hover:bg-white/60'
              }`}
            >
              Today's Register
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-sky-700 hover:bg-white/60'
              }`}
            >
              Attendance History & Risk
            </button>
          </div>
        </div>

        {/* Class and Date Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-5 pt-5 border-t border-sky-100">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Class Roster
            </label>
            <SearchableSelect
              value={selectedClassId}
              onChange={(val) => setSelectedClassId(val)}
              placeholder="-- Select Class --"
              searchPlaceholder="Search class..."
              options={availableClasses.map((c) => ({
                value: c.id,
                label: c.name,
                badge: assignedClass?.classId === c.id ? 'My Class' : undefined,
              }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Register Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all outline-hidden cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleMarkAllPresent}
              disabled={loading || students.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              Mark All Present
            </button>

            <button
              onClick={handleSaveRegister}
              disabled={loading || saving || students.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Register'}
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'today' ? (
        <>
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-3.5 border border-sky-100 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Enrolled</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{totalCount}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Learners on class roll</div>
            </div>

            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-100 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Present
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">{presentCount}</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">
                {totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0}% attendance
              </div>
            </div>

            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-3.5 border border-rose-100 shadow-xs">
              <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Absent
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5">{absentCount}</div>
              <div className="text-[10px] text-rose-600 mt-0.5">Parent to be notified</div>
            </div>

            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-3.5 border border-sky-100 shadow-xs">
              <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span> Excused
              </div>
              <div className="text-xl sm:text-2xl font-black text-sky-700 mt-0.5">{excusedCount}</div>
              <div className="text-[10px] text-sky-600 mt-0.5">With teacher authorization</div>
            </div>

            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-3.5 border border-amber-100 shadow-xs col-span-2 sm:col-span-1">
              <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Late Arrival
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5">{lateCount}</div>
              <div className="text-[10px] text-amber-600 mt-0.5">Arrived after roll call</div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/85 backdrop-blur-md p-3 rounded-2xl border border-sky-100 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student by name or assessment number..."
                className="w-full bg-slate-50/70 border border-sky-100 rounded-xl pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-400 outline-hidden transition-all"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'PRESENT', 'ABSENT', 'EXCUSED', 'LATE'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'bg-sky-50 text-slate-600 hover:bg-sky-100'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Roll Call Student Roster Table */}
          <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-sky-100 shadow-glass overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                Loading student register...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No students found matching current filters.
              </div>
            ) : (
              <div className="divide-y divide-sky-100/70">
                {filteredStudents.map((student, idx) => (
                  <div
                    key={student.studentId}
                    className={`p-3.5 sm:p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      student.status === 'ABSENT'
                        ? 'bg-rose-50/30'
                        : student.status === 'EXCUSED'
                        ? 'bg-sky-50/20'
                        : student.status === 'LATE'
                        ? 'bg-amber-50/20'
                        : 'hover:bg-sky-50/30'
                    }`}
                  >
                    {/* Learner Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-400 w-6 text-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-100 to-sky-50 border border-sky-200 flex items-center justify-center font-bold text-xs text-sky-700 shrink-0">
                        {student.firstName[0]}
                        {student.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {student.firstName} {student.middleName || ''} {student.lastName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Assess #: {student.assessmentNumber || 'N/A'}</span>
                          <span>•</span>
                          <span className="capitalize">{student.gender?.toLowerCase()}</span>
                          <span>•</span>
                          <span className="text-slate-400">Guardian: {student.guardianName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Toggles - Mobile-Friendly Tap Targets */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleStatusChange(student.studentId, 'PRESENT')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          student.status === 'PRESENT'
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Present
                      </button>

                      <button
                        onClick={() => handleStatusChange(student.studentId, 'ABSENT')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          student.status === 'ABSENT'
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Absent
                      </button>

                      <button
                        onClick={() => handleStatusChange(student.studentId, 'EXCUSED')}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          student.status === 'EXCUSED'
                            ? 'bg-sky-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                        }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        Excused
                      </button>

                      <button
                        onClick={() => handleStatusChange(student.studentId, 'LATE')}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          student.status === 'LATE'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Late
                      </button>
                    </div>

                    {/* Quick Remark Input */}
                    <div className="w-full md:w-48 shrink-0">
                      <input
                        type="text"
                        value={student.remarks || ''}
                        onChange={(e) => handleRemarksChange(student.studentId, e.target.value)}
                        placeholder="Optional remarks..."
                        className="w-full bg-slate-50 border border-sky-100 rounded-lg px-2.5 py-1 text-xs text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-sky-400 outline-hidden transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sticky Bottom Quick-Save Bar on Mobile */}
          <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 p-3.5 bg-white/95 backdrop-blur-xl border border-sky-200 rounded-2xl shadow-xl">
            <div className="text-xs text-slate-600 font-medium">
              <span className="font-bold text-slate-800">{presentCount}</span> present •{' '}
              <span className="font-bold text-rose-600">{absentCount}</span> absent of{' '}
              <span className="font-bold text-slate-800">{totalCount}</span> total
            </div>

            <button
              onClick={handleSaveRegister}
              disabled={loading || saving || students.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Register'}
            </button>
          </div>
        </>
      ) : (
        /* History & Chronic Absenteeism Tab */
        <div className="space-y-5">
          {/* History KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 border border-sky-100 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Roll Calls Taken</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{historyData?.totalRegisters || 0}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Recorded daily registers</div>
            </div>

            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 border border-sky-100 shadow-xs">
              <div className="text-xs font-bold text-sky-700 uppercase tracking-wider">Class Overall Attendance Rate</div>
              <div className="text-2xl font-black text-sky-700 mt-1">
                {historyData?.overallAttendanceRate || 100}%
              </div>
              <div className="text-[11px] text-sky-600 mt-0.5">Term attendance performance</div>
            </div>

            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 border border-rose-100 shadow-xs">
              <div className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> Chronic Absenteeism Flag
              </div>
              <div className="text-2xl font-black text-rose-700 mt-1">
                {historyData?.students.filter((s) => s.stats.isChronicAbsent).length || 0}
              </div>
              <div className="text-[11px] text-rose-600 mt-0.5">Learners with &lt; 85% attendance</div>
            </div>
          </div>

          {/* Chronic Absenteeism Notice Banner */}
          {historyData && historyData.students.some((s) => s.stats.isChronicAbsent) && (
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-900">Chronic Absenteeism Warning</h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  Learners below 85% attendance are at severe risk of falling behind in core CBC competencies. The Class Teacher should conduct an intervention conference or notify guardians using the controlled communication tool.
                </p>
              </div>
            </div>
          )}

          {/* Search History */}
          <div className="bg-white/85 backdrop-blur-md p-3 rounded-2xl border border-sky-100 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history by learner name..."
                className="w-full bg-slate-50/70 border border-sky-100 rounded-xl pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-400 outline-hidden transition-all"
              />
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-sky-100 shadow-glass overflow-hidden">
            {historyLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                Loading attendance history...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No attendance history records available for this class.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sky-50/60 text-slate-600 border-b border-sky-100 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Learner</th>
                      <th className="py-3 px-4">Assess #</th>
                      <th className="py-3 px-4">Days Present</th>
                      <th className="py-3 px-4">Days Absent</th>
                      <th className="py-3 px-4">Days Excused</th>
                      <th className="py-3 px-4">Attendance Rate</th>
                      <th className="py-3 px-4">Status Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100/60 font-medium">
                    {filteredHistory.map((h) => (
                      <tr
                        key={h.studentId}
                        className={`hover:bg-sky-50/40 transition-colors ${
                          h.stats.isChronicAbsent ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{h.fullName}</div>
                          <div className="text-[10px] text-slate-400">
                            Guardian: {h.guardianName} ({h.guardianPhone})
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{h.assessmentNumber || '—'}</td>
                        <td className="py-3 px-4 text-emerald-700 font-bold">{h.stats.presentDays}</td>
                        <td className="py-3 px-4 text-rose-700 font-bold">{h.stats.absentDays}</td>
                        <td className="py-3 px-4 text-sky-700">{h.stats.excusedDays}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  h.stats.attendanceRate >= 90
                                    ? 'bg-emerald-500'
                                    : h.stats.attendanceRate >= 80
                                    ? 'bg-sky-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, h.stats.attendanceRate)}%` }}
                              ></div>
                            </div>
                            <span
                              className={`font-bold ${
                                h.stats.attendanceRate < 85 ? 'text-rose-600' : 'text-slate-800'
                              }`}
                            >
                              {h.stats.attendanceRate}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {h.stats.isChronicAbsent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Chronic Absent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Good Standing
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
