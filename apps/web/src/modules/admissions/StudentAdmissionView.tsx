import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Search, UserCheck, ShieldCheck, Plus, CheckCircle, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';

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
  email?: string;
  address?: string;
}

export const StudentAdmissionView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);

  // Guardian Autocomplete state
  const [guardianQuery, setGuardianQuery] = useState('');
  const [guardianSearchResults, setGuardianSearchResults] = useState<GuardianItem[]>([]);
  const [searchingGuardian, setSearchingGuardian] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianItem | null>(null);

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
    email: '',
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
      toast.error(error.response?.data?.message || 'Failed to load admissions data');
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
      email: guardian.email || '',
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
      email: '',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl text-white shadow-xl shadow-blue-600/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Student Admissions & Registration</h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Admit new learners using KNEC Assessment Number with parent deduplication.
            </p>
          </div>
        </div>
      </div>

      {/* Unified Admission Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Profile Info */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            1. Student Academic Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        {/* Parent / Guardian Info with Keystroke Deduplication Autocomplete */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              2. Parent / Guardian Records (Keystroke Deduplication)
            </h3>

            {selectedGuardian && (
              <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold rounded-full flex items-center gap-1">
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
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300">
              <div>
                <p className="font-bold text-sm">{selectedGuardian.fullName}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  National ID: {selectedGuardian.idNumber} | Phone: {selectedGuardian.phoneNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearSelectedGuardian}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Unlink Parent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
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
                  Email Address
                </label>
                <input
                  type="email"
                  value={guardianForm.email}
                  onChange={(e) => setGuardianForm({ ...guardianForm, email: e.target.value })}
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

              <div>
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
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
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

      {/* Active Student Roster Directory Table */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          Active School Roster ({studentsList.length} Admitted Learners)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">KNEC Assessment No</th>
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Gender</th>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4">Primary Parent / Phone</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {studentsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No active students admitted yet. Fill out the form above to register students.
                  </td>
                </tr>
              ) : (
                studentsList.map((row) => (
                  <tr key={row.student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {row.student.assessmentNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {row.student.firstName} {row.student.middleName || ''} {row.student.lastName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{row.student.gender}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                      {row.class.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      <p className="font-semibold">{row.guardian.fullName}</p>
                      <p className="text-[10px] text-slate-400">{row.guardian.phoneNumber}</p>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold rounded-full">
                        {row.student.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
