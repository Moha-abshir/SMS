import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Plus, Trash2, Printer, AlertTriangle, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { formatDate } from '../../lib/formatters';
import { Modal } from '../../components/Modal';
import { printElement } from '../../lib/printElement';

export const InvigilatorAllocationView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [invigilators, setInvigilators] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  const [selectedExamId, setSelectedExamId] = useState('');
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Dynamic teacher availability for the selected session
  const [availableTeachers, setAvailableTeachers] = useState<Array<{
    teacherId: string;
    name: string;
    email: string;
    isAvailable: boolean;
    assignedRoom?: string;
    assignedSubject?: string;
  }>>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const [form, setForm] = useState({
    examSessionId: '',
    classId: '',
    teacherId: '',
  });

  const [searchFilter, setSearchFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [removingAllocationId, setRemovingAllocationId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, exRes, clsRes, stfRes, setRes] = await Promise.all([
        apiClient.get('/api/academic-allocations/invigilators'),
        apiClient.get('/api/exams'),
        apiClient.get('/api/admissions/classes'),
        apiClient.get('/api/staff'),
        apiClient.get('/api/settings').catch(() => ({ data: { data: null } })),
      ]);

      const exList = exRes.data.data || [];
      setInvigilators(invRes.data.data || []);
      setExams(exList);
      setClassesList(clsRes.data.data || []);
      setTeachersList(stfRes.data.data?.staff || []);
      setSchoolSettings(setRes.data?.data || null);

      if (exList.length > 0 && !selectedExamId) {
        setSelectedExamId(exList[0].exam.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load invigilator allocations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      apiClient.get(`/api/exams/${selectedExamId}/sessions`).then((res) => {
        setSessionsList(res.data.data || []);
      });
    }
  }, [selectedExamId]);

  // When session selection changes in allocation modal, fetch real-time availability
  const handleSessionChange = async (sessionId: string) => {
    setForm((prev) => ({ ...prev, examSessionId: sessionId, teacherId: '' }));
    if (!sessionId) {
      setAvailableTeachers([]);
      return;
    }

    try {
      setLoadingAvailability(true);
      const res = await apiClient.get(`/api/academic-allocations/invigilators/available?sessionId=${sessionId}`);
      setAvailableTeachers(res.data.data || []);
    } catch (error: any) {
      console.error('Failed to query available invigilators', error);
      toast.warning('Could not refresh live teacher availability');
    } finally {
      setLoadingAvailability(false);
    }
  };

  const selectedTeacherMeta = availableTeachers.find((t) => t.teacherId === form.teacherId);

  const handleAssignInvigilator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.examSessionId || !form.classId || !form.teacherId) {
      toast.error('Please complete all selection fields');
      return;
    }

    if (selectedTeacherMeta && !selectedTeacherMeta.isAvailable) {
      toast.error(`Teacher is already invigilating room ${selectedTeacherMeta.assignedRoom}. Cannot double-book.`);
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/api/academic-allocations/invigilators', form);
      toast.success('Invigilator successfully assigned to examination hall');
      setShowModal(false);
      setForm({ examSessionId: '', classId: '', teacherId: '' });
      setAvailableTeachers([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign invigilator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveInvigilator = async (id: string) => {
    if (removingAllocationId) return;
    if (!confirm('Are you sure you want to remove this invigilator allocation?')) return;
    try {
      setRemovingAllocationId(id);
      await apiClient.delete(`/api/academic-allocations/invigilators/${id}`);
      toast.success('Invigilator allocation removed');
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove invigilator');
    } finally {
      setRemovingAllocationId(null);
    }
  };

  // Filter invigilators by exam and search text
  const filteredInvigilators = invigilators.filter((row) => {
    const matchesExam = !selectedExamId || row.session?.examId === selectedExamId;
    const searchLower = searchFilter.toLowerCase();
    const matchesSearch =
      !searchFilter ||
      row.teacher?.firstName?.toLowerCase().includes(searchLower) ||
      row.teacher?.lastName?.toLowerCase().includes(searchLower) ||
      row.class?.name?.toLowerCase().includes(searchLower) ||
      row.session?.sessionDate?.toLowerCase().includes(searchLower);
    return matchesExam && matchesSearch;
  });

  const selectedExamObj = exams.find((e) => e.exam.id === selectedExamId);

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
            <UserCheck className="w-4 h-4 text-sky-500" />
            Director of Studies · Exam Operations
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Invigilator Allocation & Conflict Roster
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Assign qualified supervisors to exam sessions, prevent double-booking across rooms, and print official duty rosters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowPrintModal(true)}
            disabled={filteredInvigilators.length === 0}
            className="flex-1 sm:flex-none justify-center min-h-[42px] px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-sky-600" />
            Print Roster
          </button>

          <button
            onClick={() => {
              setForm({ examSessionId: '', classId: '', teacherId: '' });
              setAvailableTeachers([]);
              setShowModal(true);
            }}
            className="flex-1 sm:flex-none justify-center min-h-[42px] px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-glass transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Assign Invigilator
          </button>
        </div>
      </div>

      {/* Filter and Overview Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
        <div className="md:col-span-6 flex flex-col sm:flex-row items-center gap-2">
          <div className="w-full sm:w-auto flex items-center gap-2 text-xs font-bold text-slate-600 shrink-0">
            <Filter className="w-3.5 h-3.5 text-sky-600" />
            Filter Exam:
          </div>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:border-sky-500 outline-none transition-colors"
          >
            <option value="">-- All Examinations --</option>
            {exams.map((ex) => (
              <option key={ex.exam.id} value={ex.exam.id}>
                {ex.exam.title} ({ex.term?.year || 2026} Term {ex.term?.termNumber || 1})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invigilator name, class, or session date..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-white border border-sky-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Invigilations Table */}
      <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100/80 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-sky-600" />
            Active Invigilation Schedule ({filteredInvigilators.length} Duty Slots)
          </h3>
          <span className="text-xs text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg font-semibold border border-sky-200">
            {selectedExamObj ? selectedExamObj.exam.title : 'All Active Exams'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
              <tr>
                <th className="py-3.5 px-4">Date & Time Slot</th>
                <th className="py-3.5 px-4">Subject / Paper</th>
                <th className="py-3.5 px-4">Classroom / Hall</th>
                <th className="py-3.5 px-4">Assigned Invigilator</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/60">
              {filteredInvigilators.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    No invigilator allocations found matching the selected criteria. Click "Assign Invigilator" to allocate supervisors.
                  </td>
                </tr>
              ) : (
                filteredInvigilators.map((row) => (
                  <tr key={row.allocation.id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <span className="font-mono">{formatDate(row.session?.sessionDate)}</span>
                      <div className="text-[11px] font-mono text-sky-600">{row.session?.sessionTime}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">
                        {row.session?.subject?.name || 'Exam Paper'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      <span className="bg-sky-50 text-sky-800 px-2 py-0.5 rounded border border-sky-100">
                        {row.class?.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-sky-900">
                        {row.teacher?.firstName} {row.teacher?.lastName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {row.teacher?.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        title="Remove allocation"
                        disabled={removingAllocationId === row.allocation.id}
                        onClick={() => handleRemoveInvigilator(row.allocation.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {removingAllocationId === row.allocation.id ? (
                          <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Invigilator Modal with Conflict Prevention */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Assign Exam Room Invigilator">
        <form onSubmit={handleAssignInvigilator} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Examination *
            </label>
            <select
              required
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setForm({ examSessionId: '', classId: '', teacherId: '' });
                setAvailableTeachers([]);
              }}
              className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors font-medium"
            >
              <option value="">-- Select Exam --</option>
              {exams.map((ex) => (
                <option key={ex.exam.id} value={ex.exam.id}>
                  {ex.exam.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Exam Paper Session Slot *
            </label>
            <select
              required
              value={form.examSessionId}
              onChange={(e) => handleSessionChange(e.target.value)}
              className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors font-medium"
            >
              <option value="">-- Select Paper Session Slot --</option>
              {sessionsList.map((s) => (
                <option key={s.session.id} value={s.session.id}>
                  {s.subject?.name} — {formatDate(s.session.sessionDate)} ({s.session.sessionTime})
                </option>
              ))}
            </select>
            {sessionsList.length === 0 && selectedExamId && (
              <p className="text-[11px] text-amber-600 mt-1">
                No session slots created yet for this exam. Please configure the timetable first.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Classroom / Room *
              </label>
              <select
                required
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
                className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors font-medium"
              >
                <option value="">-- Select Class --</option>
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Select Invigilator *</span>
                {loadingAvailability && (
                  <span className="text-[10px] text-sky-600 animate-pulse font-normal">
                    Checking conflicts...
                  </span>
                )}
              </label>
              <select
                required
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                disabled={!form.examSessionId || loadingAvailability}
                className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors font-medium disabled:opacity-60"
              >
                <option value="">
                  {form.examSessionId ? '-- Select Teacher --' : '-- Select session slot first --'}
                </option>
                {availableTeachers.length > 0
                  ? availableTeachers.map((t) => (
                      <option
                        key={t.teacherId}
                        value={t.teacherId}
                        disabled={!t.isAvailable}
                        className={!t.isAvailable ? 'text-rose-500 font-normal' : 'text-slate-800 font-medium'}
                      >
                        {t.isAvailable ? `✓ ${t.name} (Available)` : `⛔ ${t.name} (BUSY: ${t.assignedRoom})`}
                      </option>
                    ))
                  : teachersList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          {/* Conflict Guard Callout */}
          {selectedTeacherMeta && !selectedTeacherMeta.isAvailable && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Schedule Conflict Detected</p>
                <p className="text-[11px] mt-0.5">
                  {selectedTeacherMeta.name} is already booked to invigilate room{' '}
                  <span className="font-bold underline">{selectedTeacherMeta.assignedRoom}</span> during this exact session slot. Please choose an available teacher.
                </p>
              </div>
            </div>
          )}

          {selectedTeacherMeta && selectedTeacherMeta.isAvailable && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center gap-2 text-sky-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                <strong>{selectedTeacherMeta.name}</strong> is available and has no conflicting supervision duties for this session.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (selectedTeacherMeta && !selectedTeacherMeta.isAvailable)}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Assign Invigilator
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Invigilation Duty Roster Modal */}
      {showPrintModal && (
        <Modal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          title="Printable Invigilation Duty Roster"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-sky-100">
              <p className="text-xs text-slate-600">
                Official examination supervision sheet ready for staff notice boards and invigilator briefing.
              </p>
              <button
                onClick={() => printElement('invigilator-roster-printable', `${schoolSettings?.schoolName || 'Eldoret Muslim Academy'} - Invigilation Duty Roster`)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-glass shrink-0 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Document
              </button>
            </div>

            {/* Printable Document Paper View */}
            <div id="invigilator-roster-printable" className="p-6 sm:p-8 bg-white border border-slate-300 rounded-xl text-slate-900 shadow-sm space-y-6">
              {/* Official School Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-slate-900">
                  {schoolSettings?.schoolName || 'ELDORET MUSLIM ACADEMY'}
                </h1>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-0.5">
                  Office of the Director of Studies · Academic & Examination Department
                </p>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-bold uppercase tracking-wider text-slate-800">
                  Examination Supervision & Invigilation Duty Roster
                </div>
                <div className="mt-2 text-xs text-slate-600 flex justify-center items-center gap-6 font-medium">
                  <span><strong>Examination:</strong> {selectedExamObj ? selectedExamObj.exam.title : 'All Active Exams'}</span>
                  <span><strong>Year:</strong> {schoolSettings?.currentAcademicYear || 2026}</span>
                  <span><strong>Term:</strong> Term {schoolSettings?.currentTermNumber || 1}</span>
                </div>
              </div>

              {/* Roster Table */}
              <div>
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase border-b border-slate-300 text-[11px]">
                      <th className="p-2.5 border border-slate-300">#</th>
                      <th className="p-2.5 border border-slate-300">Date & Session Time</th>
                      <th className="p-2.5 border border-slate-300">Paper / Subject</th>
                      <th className="p-2.5 border border-slate-300">Class / Hall</th>
                      <th className="p-2.5 border border-slate-300">Allocated Invigilator</th>
                      <th className="p-2.5 border border-slate-300 text-center">Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvigilators.map((row, idx) => (
                      <tr key={row.allocation.id} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-300 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-2 border border-slate-300 font-mono font-medium">
                          {formatDate(row.session?.sessionDate)}
                          <div className="text-[10px] text-slate-600">{row.session?.sessionTime}</div>
                        </td>
                        <td className="p-2 border border-slate-300 font-semibold">
                          {row.session?.subject?.name || 'General Examination'}
                        </td>
                        <td className="p-2 border border-slate-300 font-bold">
                          {row.class?.name}
                        </td>
                        <td className="p-2 border border-slate-300 font-medium">
                          {row.teacher?.firstName} {row.teacher?.lastName}
                        </td>
                        <td className="p-2 border border-slate-300 w-28">
                          <div className="border-b border-dotted border-slate-400 h-5" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mandatory Directives */}
              <div className="border border-slate-200 bg-slate-50/50 p-3 rounded text-[11px] space-y-1 text-slate-700">
                <p className="font-bold uppercase tracking-wider text-slate-900">Directives to Invigilators:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  <li>Invigilators must report to the exam control center <strong>15 minutes</strong> before paper commencement.</li>
                  <li>Verify learner identity and confirm all non-authorized materials (phones, notes) are stored outside the hall.</li>
                  <li>Collect and count all question and answer scripts before dismissing candidates from the examination room.</li>
                  <li>Immediately report any examination irregularities in writing to the Director of Studies.</li>
                </ul>
              </div>

              {/* Signatures & School Stamp */}
              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-300 text-xs">
                <div>
                  <div className="border-b border-slate-400 h-10 mb-1" />
                  <p className="font-bold text-slate-800">Director of Studies (DoS)</p>
                  <p className="text-[10px] text-slate-500">Signature & Date</p>
                </div>

                <div>
                  <div className="border-b border-slate-400 h-10 mb-1" />
                  <p className="font-bold text-slate-800">Deputy Headteacher</p>
                  <p className="text-[10px] text-slate-500">Signature & Date</p>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-sky-800 flex flex-col items-center justify-center text-center p-1 text-[7px] font-bold text-sky-900 tracking-tighter uppercase leading-tight select-none">
                    <span>ELDORET MUSLIM</span>
                    <span>ACADEMY</span>
                    <span className="my-0.5 text-[6px] text-sky-600">★ EXAM OFFICE ★</span>
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

