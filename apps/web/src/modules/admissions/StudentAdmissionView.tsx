import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Download,
  Upload,
  FileSpreadsheet,
  XCircle,
  AlertTriangle,
  UserX,
  Clock,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';
import { SearchableSelect } from '../../components/SearchableSelect';

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
  const [pendingList, setPendingList] = useState<any[]>([]);

  // Tab State: 'roster' | 'register' | 'pending'
  const [activeTab, setActiveTab] = useState<'roster' | 'register' | 'pending'>('roster');

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

  // Expulsion Modal state
  const [expelModalStudent, setExpelModalStudent] = useState<any | null>(null);
  const [expelReason, setExpelReason] = useState('');

  // Rejection Modal state (for pending admissions)
  const [rejectModalStudent, setRejectModalStudent] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Bulk CSV Import Modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [importingCsv, setImportingCsv] = useState(false);

  const [processingAction, setProcessingAction] = useState(false);
  const [approvingStudentId, setApprovingStudentId] = useState<string | null>(null);

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
      const [clsRes, stdRes, pndRes] = await Promise.all([
        apiClient.get('/api/admissions/classes'),
        apiClient.get('/api/admissions/students'),
        apiClient.get('/api/admissions/pending').catch(() => ({ data: { data: [] } })),
      ]);

      if (clsRes.data.data) setClassesList(clsRes.data.data);
      if (stdRes.data.data) setStudentsList(stdRes.data.data);
      if (pndRes.data?.data) setPendingList(pndRes.data.data);
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
      setActiveTab('roster');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Admission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePending = async (studentId: string) => {
    if (processingAction) return;
    try {
      setProcessingAction(true);
      setApprovingStudentId(studentId);
      await apiClient.put(`/api/admissions/students/${studentId}/approve`);
      toast.success('Student admission approved successfully');
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve admission');
    } finally {
      setProcessingAction(false);
      setApprovingStudentId(null);
    }
  };

  const handleRejectPending = async () => {
    if (!rejectModalStudent) return;
    try {
      setProcessingAction(true);
      await apiClient.put(`/api/admissions/students/${rejectModalStudent.student.id}/reject`, {
        reason: rejectReason || 'Admission rejected by administrator',
      });
      toast.success('Student admission rejected');
      setRejectModalStudent(null);
      setRejectReason('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject admission');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!transferModalStudent) return;
    try {
      setProcessingAction(true);
      await apiClient.put(`/api/admissions/students/${transferModalStudent.student.id}/transfer`, {
        reason: transferReason || 'Transferred to another school',
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

  const handleConfirmExpulsion = async () => {
    if (!expelModalStudent) return;
    if (!expelReason.trim()) {
      toast.error('Expulsion reason is required');
      return;
    }
    try {
      setProcessingAction(true);
      await apiClient.put(`/api/admissions/students/${expelModalStudent.student.id}/expel`, {
        reason: expelReason,
      });
      toast.success('Student marked as expelled');
      setExpelModalStudent(null);
      setExpelReason('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to expel student');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await apiClient.get('/api/admissions/template.csv', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_admission_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV template downloaded successfully');
    } catch (error) {
      toast.error('Failed to download CSV template');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      // Parse quick preview
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
        const previewRows = lines.slice(1, 6).map((line) => {
          const vals = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
          const rowObj: any = {};
          headers.forEach((h, i) => {
            rowObj[h] = vals[i] || '';
          });
          return rowObj;
        });
        setCsvPreview(previewRows);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteBulkImport = async () => {
    if (!csvText.trim()) {
      toast.error('Please upload or provide a valid CSV file');
      return;
    }
    try {
      setImportingCsv(true);
      const res = await apiClient.post('/api/admissions/bulk-import', csvText, {
        headers: { 'Content-Type': 'text/plain' },
      });
      toast.success(res.data.message || 'Students imported successfully');
      setBulkModalOpen(false);
      setCsvText('');
      setCsvFileName('');
      setCsvPreview([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bulk import failed');
    } finally {
      setImportingCsv(false);
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

  // Active learners (exclude expelled/transferred)
  const activeStudents = studentsList.filter((s) => s.student.status === 'ACTIVE');

  // Selected class details and learners
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-xl border border-sky-100 rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <UserPlus className="w-4 h-4 text-sky-600" />
            Admissions & Student Information System
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">Learner Enrolment & Class Directory</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Register new learners with KNEC Assessment numbers, manage class placements, process secretary admissions, and audit class rosters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            title="Download CSV Template"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            CSV Template
          </button>
          <button
            type="button"
            onClick={() => setBulkModalOpen(true)}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-glass"
          >
            <Upload className="w-3.5 h-3.5" />
            Bulk CSV Import
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl shadow-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab('roster');
            setSelectedClassId(null);
          }}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'roster'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/70'
          }`}
        >
          <Users className="w-4 h-4" />
          Active Roster ({activeStudents.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('register')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'register'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/70'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          New Learner Admission
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'pending'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/70'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending Approvals
          {pendingList.length > 0 && (
            <span
              className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                activeTab === 'pending'
                  ? 'bg-white text-sky-600'
                  : 'bg-sky-100 text-sky-700'
              }`}
            >
              {pendingList.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ACTIVE ROSTER */}
      {activeTab === 'roster' && (
        <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 shadow-glass">
          {selectedClassId === null ? (
            /* LEVEL 1: GRADE CARDS DIRECTORY OVERVIEW */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-sky-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Users className="w-4.5 h-4.5 text-sky-600" />
                    Active School Roster ({classesList.length} Classes — {activeStudents.length} Active Learners)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a grade card below to view enrolled learners, process transfers, or record disciplinary actions.
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
                    const enrolledCount = studentsList.filter(
                      (s) => s.class.id === c.id && s.student.status === 'ACTIVE'
                    ).length;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedClassId(c.id);
                          setRosterSearchQuery('');
                        }}
                        className="group p-4 bg-white/80 backdrop-blur-xs border border-sky-100 rounded-2xl cursor-pointer hover:border-sky-400 hover:bg-sky-50/40 hover:shadow-glass transition-all flex flex-col justify-between shadow-xs"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-slate-800 group-hover:text-sky-600 transition-colors">
                              {c.name}
                            </span>
                            <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-md border border-sky-100">
                              {formatLevelTag(c.levelCategory)}
                            </span>
                          </div>

                          <div className="pt-2 flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-sky-600">
                              {enrolledCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              {enrolledCount === 1 ? 'Learner' : 'Learners'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-sky-100 flex items-center justify-between text-xs font-bold text-sky-600">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 pb-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedClassId(null)}
                    className="px-3 py-1.5 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shrink-0 min-h-[36px]"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to All Grades
                  </button>

                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-sky-600" />
                      {selectedClass?.name} Roster
                      <span className="px-2.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-100 text-xs font-extrabold rounded-full">
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
                    className="w-full pl-8 bg-white border border-sky-100 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              {/* Students Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[760px]">
                  <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
                    <tr>
                      <th className="py-3 px-3 sm:px-4">KNEC Assessment No</th>
                      <th className="py-3 px-3 sm:px-4">Student Name</th>
                      <th className="py-3 px-3 sm:px-4">Gender</th>
                      <th className="py-3 px-3 sm:px-4">Primary Parent / Phone</th>
                      <th className="py-3 px-3 sm:px-4 text-center">Status</th>
                      <th className="py-3 px-3 sm:px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100/60">
                    {filteredClassStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                          {rosterSearchQuery
                            ? `No learners found matching "${rosterSearchQuery}" in ${selectedClass?.name}.`
                            : `No learners enrolled in ${selectedClass?.name} yet.`}
                        </td>
                      </tr>
                    ) : (
                      filteredClassStudents.map((row) => (
                        <tr key={row.student.id} className="hover:bg-sky-50/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-sky-600">
                            {row.student.assessmentNumber}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {row.student.firstName} {row.student.middleName || ''} {row.student.lastName}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{row.student.gender}</td>
                          <td className="py-3 px-4 text-slate-600">
                            <p className="font-semibold">{row.guardian.fullName}</p>
                            <p className="text-[10px] text-slate-400">{row.guardian.phoneNumber}</p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                                row.student.status === 'ACTIVE'
                                  ? 'bg-sky-50 border border-sky-200 text-sky-700'
                                  : row.student.status === 'PENDING'
                                  ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                  : row.student.status === 'EXPELLED'
                                  ? 'bg-rose-50 border border-rose-200 text-rose-700'
                                  : 'bg-slate-100 border border-slate-200 text-slate-600'
                              }`}
                            >
                              {row.student.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {row.student.status === 'ACTIVE' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setTransferModalStudent(row)}
                                    className="px-2.5 py-1 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors shadow-xs"
                                    title="Transfer student"
                                  >
                                    <ArrowRightLeft className="w-3 h-3 text-sky-600" /> Transfer
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setExpelModalStudent(row)}
                                    className="px-2.5 py-1 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors shadow-xs"
                                    title="Expel student"
                                  >
                                    <UserX className="w-3 h-3" /> Expel
                                  </button>
                                </>
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
      )}

      {/* TAB 2: REGISTER NEW LEARNER */}
      {activeTab === 'register' && (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Section 1: Learner Basic Details */}
          <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-sky-600" />
              1. Learner Profile & KNEC Assessment Record
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  KNEC Assessment Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 26701004012"
                  value={studentForm.assessmentNumber}
                  onChange={(e) => setStudentForm({ ...studentForm, assessmentNumber: e.target.value })}
                  className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brian"
                  value={studentForm.firstName}
                  onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                  className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kiprono"
                  value={studentForm.middleName}
                  onChange={(e) => setStudentForm({ ...studentForm, middleName: e.target.value })}
                  className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kemboi"
                  value={studentForm.lastName}
                  onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                  className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender *
                </label>
                <select
                  value={studentForm.gender}
                  onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                  className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class Placement *
                </label>
                <SearchableSelect
                  required
                  value={studentForm.classId}
                  onChange={(val) => setStudentForm({ ...studentForm, classId: val })}
                  placeholder="-- Select Placement --"
                  searchPlaceholder="Search class placement..."
                  options={classesList.map((c) => ({
                    value: c.id,
                    label: c.name,
                    badge: formatLevelTag(c.levelCategory),
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Previous Grade / Level
                </label>
                <input
                  type="text"
                  placeholder="e.g. PP2 or Grade 3"
                  value={studentForm.previousGrade}
                  onChange={(e) => setStudentForm({ ...studentForm, previousGrade: e.target.value })}
                  className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admission Date *
                </label>
                <input
                  type="date"
                  required
                  value={studentForm.admissionDate}
                  onChange={(e) => setStudentForm({ ...studentForm, admissionDate: e.target.value })}
                  className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Guardian Information */}
          <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  2. Primary Parent or Guardian Information
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Link an existing registered guardian or capture a new guardian profile.
                </p>
              </div>

              {selectedGuardian ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-xl">
                  <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                  <span className="text-xs font-bold text-sky-800">{selectedGuardian.fullName} linked</span>
                  <button
                    type="button"
                    onClick={handleClearSelectedGuardian}
                    className="text-[10px] text-rose-500 hover:text-rose-700 underline font-semibold ml-2 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search existing guardian by ID/Phone..."
                    value={guardianQuery}
                    onChange={(e) => setGuardianQuery(e.target.value)}
                    className="w-full pl-8 bg-white border border-sky-100 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                  />
                  {searchingGuardian && (
                    <div className="absolute right-3 top-2.5 text-[10px] text-slate-400">Searching...</div>
                  )}

                  {guardianSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-sky-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                      {guardianSearchResults.map((g) => (
                        <div
                          key={g.id}
                          onClick={() => handleSelectExistingGuardian(g)}
                          className="p-2.5 hover:bg-sky-50 cursor-pointer border-b border-sky-50 last:border-0"
                        >
                          <p className="text-xs font-bold text-slate-800">{g.fullName}</p>
                          <p className="text-[10px] text-slate-500">ID: {g.idNumber} | Tel: {g.phoneNumber}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!selectedGuardian && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Guardian Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mary Kemboi"
                    value={guardianForm.fullName}
                    onChange={(e) => setGuardianForm({ ...guardianForm, fullName: e.target.value })}
                    className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    National ID / Passport Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 29481920"
                    value={guardianForm.idNumber}
                    onChange={(e) => setGuardianForm({ ...guardianForm, idNumber: e.target.value })}
                    className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0712345678"
                    value={guardianForm.phoneNumber}
                    onChange={(e) => setGuardianForm({ ...guardianForm, phoneNumber: e.target.value })}
                    className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Relationship to Learner
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Father, Mother, Guardian"
                    value={guardianForm.relationship}
                    onChange={(e) => setGuardianForm({ ...guardianForm, relationship: e.target.value })}
                    className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Home Address / Residence
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Eldoret West"
                    value={guardianForm.address}
                    onChange={(e) => setGuardianForm({ ...guardianForm, address: e.target.value })}
                    className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Emergency Contact Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0723456789"
                    value={guardianForm.emergencyContact}
                    onChange={(e) => setGuardianForm({ ...guardianForm, emergencyContact: e.target.value })}
                    className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center justify-center gap-2 transition-all disabled:opacity-50 min-h-[44px] cursor-pointer"
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
      )}

      {/* TAB 3: PENDING SECRETARY ADMISSIONS QUEUE */}
      {activeTab === 'pending' && (
        <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
          <div className="border-b border-sky-100 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-sky-600" />
              Pending Secretary Admissions Queue ({pendingList.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and approve draft student enrolments submitted by the Front Office Secretary before they are activated.
            </p>
          </div>

          {pendingList.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle className="w-8 h-8 text-sky-500 mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-xs text-slate-600">No pending admissions awaiting review.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">All student admissions are up-to-date and active.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
                  <tr>
                    <th className="py-3 px-3 sm:px-4">KNEC Assessment No</th>
                    <th className="py-3 px-3 sm:px-4">Learner Name</th>
                    <th className="py-3 px-3 sm:px-4">Placement Class</th>
                    <th className="py-3 px-3 sm:px-4">Guardian / Phone</th>
                    <th className="py-3 px-3 sm:px-4">Admission Date</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100/60">
                  {pendingList.map((row) => (
                    <tr key={row.student.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-600">
                        {row.student.assessmentNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {row.student.firstName} {row.student.middleName || ''} {row.student.lastName}
                        <span className="text-[10px] text-slate-400 block font-normal">{row.student.gender}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {row.class.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <p className="font-semibold">{row.guardian.fullName}</p>
                        <p className="text-[10px] text-slate-400">{row.guardian.phoneNumber}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {row.student.admissionDate}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprovePending(row.student.id)}
                            disabled={processingAction}
                            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {approvingStudentId === row.student.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>{approvingStudentId === row.student.id ? 'Approving...' : 'Approve'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectModalStudent(row)}
                            disabled={processingAction}
                            className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {bulkModalOpen && (
        <Modal
          isOpen={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          title="Bulk CSV Learner & Guardian Import"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Upload a comma-separated CSV file containing learner records and guardian details. The system will automatically validate assessment numbers and resolve classes atomically.
            </p>

            <div className="flex items-center justify-between p-3 bg-sky-50/70 border border-sky-100 rounded-xl">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-semibold text-slate-700">Need the standardized template?</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1 bg-white border border-sky-200 hover:bg-sky-50 text-sky-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Download Template
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Choose CSV File
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-500 file:text-white hover:file:bg-sky-600 file:cursor-pointer cursor-pointer border border-sky-100 rounded-xl p-2 bg-white"
              />
              {csvFileName && (
                <p className="text-[11px] text-sky-700 font-semibold mt-1">Loaded: {csvFileName}</p>
              )}
            </div>

            {csvPreview.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Data Preview (First {csvPreview.length} Rows)
                </h4>
                <div className="overflow-x-auto max-h-44 border border-sky-100 rounded-xl bg-white">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-sky-50 text-sky-900 font-bold">
                      <tr>
                        <th className="p-2">Assessment No</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Class</th>
                        <th className="p-2">Guardian</th>
                        <th className="p-2">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100/60">
                      {csvPreview.map((r, i) => (
                        <tr key={i}>
                          <td className="p-2 font-mono text-sky-600">{r.assessmentNumber || r.assessment_number}</td>
                          <td className="p-2">{r.firstName || r.first_name} {r.lastName || r.last_name}</td>
                          <td className="p-2">{r.className || r.class_name}</td>
                          <td className="p-2">{r.guardianFullName || r.guardian_full_name}</td>
                          <td className="p-2">{r.guardianPhoneNumber || r.guardian_phone_number}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkImport}
                disabled={importingCsv || !csvText}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {importingCsv ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Import Students
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Pending Admission Modal */}
      {rejectModalStudent && (
        <Modal
          isOpen={!!rejectModalStudent}
          onClose={() => setRejectModalStudent(null)}
          title={`Reject Admission: ${rejectModalStudent.student.firstName} ${rejectModalStudent.student.lastName}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Are you sure you want to reject this pending admission for{' '}
              <strong className="text-slate-800">
                {rejectModalStudent.student.firstName} {rejectModalStudent.student.lastName}
              </strong>{' '}
              (Assessment No: {rejectModalStudent.student.assessmentNumber})?
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Rejection
              </label>
              <textarea
                rows={3}
                placeholder="Specify reason for rejecting admission..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-white border border-sky-100 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setRejectModalStudent(null)}
                className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectPending}
                disabled={processingAction}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors"
              >
                {processingAction && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Expel Student Modal */}
      {expelModalStudent && (
        <Modal
          isOpen={!!expelModalStudent}
          onClose={() => setExpelModalStudent(null)}
          title={`Expel Student: ${expelModalStudent.student.firstName} ${expelModalStudent.student.lastName}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800">
                <p className="font-bold">Permanent Disciplinary Action</p>
                <p className="mt-0.5">
                  Expelling a learner sets their status to EXPELLED, terminates active billing allocations, and requires administrative re-admission.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expulsion Reason / Board Resolution *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Specify the reason for student expulsion (disciplinary grounds, board decision, etc.)..."
                value={expelReason}
                onChange={(e) => setExpelReason(e.target.value)}
                className="w-full bg-white border border-sky-100 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setExpelModalStudent(null)}
                className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExpulsion}
                disabled={processingAction || !expelReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {processingAction && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Confirm Expulsion
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Transfer Student Modal */}
      {transferModalStudent && (
        <Modal
          isOpen={!!transferModalStudent}
          onClose={() => setTransferModalStudent(null)}
          title={`Transfer Student: ${transferModalStudent.student.firstName} ${transferModalStudent.student.lastName}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Confirm transfer of student <strong className="text-slate-800">{transferModalStudent.student.firstName} {transferModalStudent.student.lastName}</strong> (Assessment No: <span className="font-mono font-bold text-sky-600">{transferModalStudent.student.assessmentNumber}</span>) to another institution.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Destination School details
              </label>
              <textarea
                rows={3}
                placeholder="Specify transfer reason or destination school..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full bg-white border border-sky-100 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setTransferModalStudent(null)}
                className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={processingAction}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors"
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
