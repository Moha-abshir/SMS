import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Search,
  UserCheck,
  ShieldCheck,
  Plus,
  CheckCircle,
  Users,
  ArrowRightLeft,
  Check,
  GraduationCap,
  ArrowLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';

interface ClassItem {
  id: string;
  name: string;
  levelCategory: string;
}

interface GuardianItem {
  id: string;
  fullName: string;
  phoneNumber: string;
  idNumber: string;
  address?: string;
}

export const StudentAdmissionView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);

  // Active Roster state: null = show all grade cards; string = specific class ID
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');

  // Guardian Autocomplete state
  const [guardianQuery, setGuardianQuery] = useState('');
  const [guardianSearchResults, setGuardianSearchResults] = useState<GuardianItem[]>([]);
  const [searchingGuardian, setSearchingGuardian] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianItem | null>(null);

  // Transfer Modal state
  const [transferModalStudent, setTransferModalStudent] = useState<any | null>(null);
  const [transferReason, setTransferReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const [studentForm, setStudentForm] = useState({
    assessmentNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'MALE' as 'MALE' | 'FEMALE',
    previousGrade: '',
    classId: '',
    admissionDate: new Date().toISOString().split('T')[0],
  });

  const [guardianForm, setGuardianForm] = useState({
    fullName: '',
    phoneNumber: '',
    idNumber: '',
    address: '',
    emergencyContact: '',
    relationship: 'Father',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clsRes, stdRes] = await Promise.all([
        apiClient.get('/api/admissions/classes'),
        apiClient.get('/api/admissions/students'),
      ]);

      if (clsRes.data.data) setClassesList(clsRes.data.data);
      if (stdRes.data.data) setStudentsList(stdRes.data.data);
    } catch (error: any) {
      toast.error('Failed to fetch admissions directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Guardian keystroke search
  useEffect(() => {
    if (!guardianQuery || guardianQuery.trim().length < 2) {
      setGuardianSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingGuardian(true);
        const res = await apiClient.get(`/api/admissions/guardians/search?q=${encodeURIComponent(guardianQuery)}`);
        setGuardianSearchResults(res.data.data || []);
      } catch (error) {
        console.error('Guardian search failed', error);
      } finally {
        setSearchingGuardian(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [guardianQuery]);

  const handleSelectExistingGuardian = (guardian: GuardianItem) => {
    setSelectedGuardian(guardian);
    setGuardianForm({
      fullName: guardian.fullName,
      phoneNumber: guardian.phoneNumber,
      idNumber: guardian.idNumber,
      address: guardian.address || '',
      emergencyContact: '',
      relationship: 'Parent',
    });
    setGuardianQuery('');
    setGuardianSearchResults([]);
  };

  const handleClearSelectedGuardian = () => {
    setSelectedGuardian(null);
    setGuardianForm({
      fullName: '',
      phoneNumber: '',
      idNumber: '',
      address: '',
      emergencyContact: '',
      relationship: 'Father',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.classId) {
      toast.error('Please select a class placement for the student');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        student: studentForm,
        guardian: selectedGuardian
          ? { existingGuardianId: selectedGuardian.id }
          : guardianForm,
      };

      const res = await apiClient.post('/api/admissions/students', payload);
      toast.success(res.data.message || 'Student admitted successfully');

      // Reset form
      setStudentForm({
        assessmentNumber: '',
        firstName: '',
        middleName: '',
        lastName: '',
        gender: 'MALE',
        previousGrade: '',
        classId: classesList[0]?.id || '',
        admissionDate: new Date().toISOString().split('T')[0],
      });
      handleClearSelectedGuardian();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Admission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePending = async (studentId: string) => {
    try {
      setProcessingAction(true);
      await apiClient.put(`/api/admissions/students/${studentId}/approve`);
      toast.success('Student admission approved successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve admission');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!transferModalStudent) return;
    try {
      setProcessingAction(true);
      await apiClient.put(`/api/admissions/students/${transferModalStudent.student.id}/transfer`, {
        reason: transferReason,
      });
      toast.success('Student transfer recorded successfully');
      setTransferModalStudent(null);
      setTransferReason('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process student transfer');
    } finally {
      setProcessingAction(false);
    }
  };

  // Helper: Format Level Category tag text
  const formatLevelTag = (cat: string) => {
    switch (cat) {
      case 'PPE':
        return 'ECDE / Pre-Primary';
      case 'LOWER_PRIMARY':
        return 'Lower Primary (1–3)';
      case 'UPPER_PRIMARY':
        return 'Upper Primary (4–6)';
      case 'JUNIOR':
        return 'Junior Sec (7–9)';
      default:
        return cat;
    }
  };

  // Get selected class details and students for drill-down
  const selectedClass = classesList.find((c) => c.id === selectedClassId);
  const classStudents = selectedClassId
    ? studentsList.filter((s) => s.class.id === selectedClassId)
    : [];

  const filteredClassStudents = classStudents.filter((row) => {
    if (!rosterSearchQuery.trim()) return true;
    const q = rosterSearchQuery.toLowerCase();
    const fullName = `${row.student.firstName} ${row.student.middleName || ''} ${row.student.lastName}`.toLowerCase();
    const knec = (row.student.assessmentNumber || '').toLowerCase();
    const parent = (row.guardian.fullName || '').toLowerCase();
    return fullName.includes(q) || knec.includes(q) || parent.includes(q);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-950 dark:via-slate-900 dark:to-slate-900 text-white rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-600/15 dark:shadow-none border border-blue-500/30 dark:border-blue-900/40">
        <div>
          <div className="flex items-center gap-2 text-blue-100 dark:text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
            <UserPlus className="w-4 h-4 text-blue-200 dark:text-blue-400" />
            Admissions & Student Information System
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Learner Enrolment & Class Directory</h2>
          <p className="text-xs text-blue-100 dark:text-slate-400 mt-1 font-medium max-w-xl">
            Register new learners with KNEC Assessment numbers, manage class placements, and audit class rosters.
          </p>
        </div>

        <div className="flex items-center justify-around sm:justify-start gap-4 px-4 sm:px-5 py-2.5 sm:py-3 bg-white/10 dark:bg-slate-900/80 border border-white/20 dark:border-slate-800 rounded-xl sm:rounded-2xl backdrop-blur-md w-full sm:w-auto shrink-0">
          <div className="text-center">
            <span className="block text-xl sm:text-2xl font-bold text-white dark:text-blue-400 leading-none">{studentsList.length}</span>
            <span className="text-[10px] font-bold tracking-wider text-blue-100 dark:text-slate-400 uppercase mt-1 block">Total Learners</span>
          </div>
          <div className="w-[1px] h-8 bg-white/20 dark:bg-slate-800" />
          <div className="text-center">
            <span className="block text-xl sm:text-2xl font-bold text-emerald-300 dark:text-emerald-400 leading-none">{classesList.length}</span>
            <span className="text-[10px] font-bold tracking-wider text-blue-100 dark:text-slate-400 uppercase mt-1 block">Active Classes</span>
          </div>
        </div>
      </div>

      {/* Student Admission Form */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Section 1: Learner Basic Details */}
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            1. Learner Profile & KNEC Assessment Record
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                KNEC Assessment Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 26701004012"
                value={studentForm.assessmentNumber}
                onChange={(e) => setStudentForm({ ...studentForm, assessmentNumber: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={studentForm.firstName}
                onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Middle Name
              </label>
              <input
                type="text"
                value={studentForm.middleName}
                onChange={(e) => setStudentForm({ ...studentForm, middleName: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Last Name / Surname *
              </label>
              <input
                type="text"
                required
                value={studentForm.lastName}
                onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Gender *
              </label>
              <select
                value={studentForm.gender}
                onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Class Placement *
              </label>
              <select
                required
                value={studentForm.classId}
                onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">-- Select Class --</option>
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.levelCategory})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Previous School Grade (If Transfer)
              </label>
              <input
                type="text"
                placeholder="e.g. Grade 5"
                value={studentForm.previousGrade}
                onChange={(e) => setStudentForm({ ...studentForm, previousGrade: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Admission Date
              </label>
              <input
                type="date"
                required
                value={studentForm.admissionDate}
                onChange={(e) => setStudentForm({ ...studentForm, admissionDate: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Parent / Guardian Info with Keystroke Deduplication */}
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              2. Parent / Guardian Records (Keystroke Deduplication)
            </h3>

            {selectedGuardian && (
              <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold rounded-full flex items-center gap-1 w-max">
                <CheckCircle className="w-3.5 h-3.5" /> Linked to Existing Parent
              </span>
            )}
          </div>

          {/* Autocomplete Search Bar */}
          {!selectedGuardian && (
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Search Existing Parent / Guardian (Keystroke Autocomplete)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Type parent phone number, ID number, or full name..."
                  value={guardianQuery}
                  onChange={(e) => setGuardianQuery(e.target.value)}
                  className="w-full pl-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                />
                {searchingGuardian && (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin absolute right-3.5 top-3" />
                )}
              </div>

              {/* Autocomplete Search Dropdown */}
              {guardianSearchResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {guardianSearchResults.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleSelectExistingGuardian(g)}
                      className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{g.fullName}</p>
                        <p className="text-[10px] text-slate-500">ID: {g.idNumber} | Phone: {g.phoneNumber}</p>
                      </div>
                      <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-lg">
                        Select Parent
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedGuardian ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-300">
              <div>
                <p className="font-bold text-sm">{selectedGuardian.fullName}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  National ID: {selectedGuardian.idNumber} | Phone: {selectedGuardian.phoneNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearSelectedGuardian}
                className="w-full sm:w-auto px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[36px]"
              >
                Unlink Parent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Parent Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={guardianForm.fullName}
                  onChange={(e) => setGuardianForm({ ...guardianForm, fullName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  National ID Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 29481920"
                  value={guardianForm.idNumber}
                  onChange={(e) => setGuardianForm({ ...guardianForm, idNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Phone Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +254 712 345678"
                  value={guardianForm.phoneNumber}
                  onChange={(e) => setGuardianForm({ ...guardianForm, phoneNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Relationship to Student
                </label>
                <input
                  type="text"
                  placeholder="e.g. Father, Mother, Guardian"
                  value={guardianForm.relationship}
                  onChange={(e) => setGuardianForm({ ...guardianForm, relationship: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Phone Contact
                </label>
                <input
                  type="text"
                  value={guardianForm.emergencyContact}
                  onChange={(e) => setGuardianForm({ ...guardianForm, emergencyContact: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 min-h-[44px] cursor-pointer"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Complete Student Admission
          </button>
        </div>
      </form>

      {/* ACTIVE SCHOOL ROSTER SECTION */}
      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 shadow-sm">
        {selectedClassId === null ? (
          /* LEVEL 1: GRADE CARDS DIRECTORY OVERVIEW */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4.5 h-4.5 text-blue-600" />
                  Active School Roster ({classesList.length} Classes — {studentsList.length} Learners Enrolled)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select a grade card below to view enrolled learners and process student transfers.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400">Loading school grade roster...</div>
            ) : classesList.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No active classes configured in system.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {classesList.map((c) => {
                  const enrolledCount = studentsList.filter((s) => s.class.id === c.id).length;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedClassId(c.id);
                        setRosterSearchQuery('');
                      }}
                      className="group p-4 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-blue-500/80 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {c.name}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-md">
                            {formatLevelTag(c.levelCategory)}
                          </span>
                        </div>

                        <div className="pt-2 flex items-baseline gap-1.5">
                          <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                            {enrolledCount}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {enrolledCount === 1 ? 'Learner' : 'Learners'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                        <span>View Class Roster</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* LEVEL 2: DRILL-DOWN ENROLLED LEARNERS TABLE FOR SELECTED GRADE */
          <div className="space-y-4">
            {/* Header & Back Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedClassId(null)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shrink-0 min-h-[36px]"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to All Grades
                </button>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                    {selectedClass?.name} Roster
                    <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-extrabold rounded-full">
                      {classStudents.length} {classStudents.length === 1 ? 'Learner' : 'Learners'}
                    </span>
                  </h3>
                </div>
              </div>

              {/* Class Filter / Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={`Search ${selectedClass?.name}...`}
                  value={rosterSearchQuery}
                  onChange={(e) => setRosterSearchQuery(e.target.value)}
                  className="w-full pl-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3 sm:px-4">KNEC Assessment No</th>
                    <th className="py-3 px-3 sm:px-4">Student Name</th>
                    <th className="py-3 px-3 sm:px-4">Gender</th>
                    <th className="py-3 px-3 sm:px-4">Primary Parent / Phone</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Status</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredClassStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        {rosterSearchQuery
                          ? `No learners found matching "${rosterSearchQuery}" in ${selectedClass?.name}.`
                          : `No active learners enrolled in ${selectedClass?.name} yet.`}
                      </td>
                    </tr>
                  ) : (
                    filteredClassStudents.map((row) => (
                      <tr key={row.student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {row.student.assessmentNumber}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {row.student.firstName} {row.student.middleName || ''} {row.student.lastName}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{row.student.gender}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          <p className="font-semibold">{row.guardian.fullName}</p>
                          <p className="text-[10px] text-slate-400">{row.guardian.phoneNumber}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                            row.student.status === 'ACTIVE'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                              : row.student.status === 'PENDING'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {row.student.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {row.student.status === 'PENDING' && (
                              <button
                                onClick={() => handleApprovePending(row.student.id)}
                                disabled={processingAction}
                                className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                            )}
                            {row.student.status === 'ACTIVE' && (
                              <button
                                onClick={() => setTransferModalStudent(row)}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-600 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <ArrowRightLeft className="w-3 h-3" /> Transfer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Transfer Student Modal */}
      {transferModalStudent && (
        <Modal
          isOpen={!!transferModalStudent}
          onClose={() => setTransferModalStudent(null)}
          title={`Transfer Student: ${transferModalStudent.student.firstName} ${transferModalStudent.student.lastName}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Confirm transfer of student <strong className="text-slate-900 dark:text-white">{transferModalStudent.student.firstName} {transferModalStudent.student.lastName}</strong> (Assessment No: <span className="font-mono font-bold text-blue-600">{transferModalStudent.student.assessmentNumber}</span>) to another institution.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason / Destination School details
              </label>
              <textarea
                rows={3}
                placeholder="Specify transfer reason or destination school..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTransferModalStudent(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={processingAction}
                className="px-4 py-2 bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                {processingAction && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Confirm Transfer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};
