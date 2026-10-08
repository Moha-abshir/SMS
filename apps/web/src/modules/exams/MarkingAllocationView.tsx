import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, Plus, Trash2, BookOpen, Printer, CheckCircle2, AlertCircle, Filter, Search, GraduationCap } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';
import { printElement } from '../../lib/printElement';

export const MarkingAllocationView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [markingList, setMarkingList] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Subject-qualified teachers state for the selected subject
  const [eligibleTeachers, setEligibleTeachers] = useState<Array<{
    teacherId: string;
    name: string;
    email: string;
    isQualified: boolean;
    qualificationReason: string;
  }>>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);

  const [form, setForm] = useState({
    examId: '',
    subjectId: '',
    classId: '',
    teacherId: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [removingAllocationId, setRemovingAllocationId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mrkRes, exRes, sbRes, clsRes, stfRes, setRes] = await Promise.all([
        apiClient.get('/api/academic-allocations/marking'),
        apiClient.get('/api/exams'),
        apiClient.get('/api/subjects'),
        apiClient.get('/api/admissions/classes'),
        apiClient.get('/api/staff'),
        apiClient.get('/api/settings').catch(() => ({ data: { data: null } })),
      ]);

      const exList = exRes.data.data || [];
      setMarkingList(mrkRes.data.data || []);
      setExams(exList);
      setSubjectsList(sbRes.data.data || []);
      setClassesList(clsRes.data.data || []);
      setTeachersList(stfRes.data.data?.staff || []);
      setSchoolSettings(setRes.data?.data || null);

      if (exList.length > 0 && !selectedExamId) {
        setSelectedExamId(exList[0].exam.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load marking allocations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When subject changes in modal, dynamically fetch teachers qualified in that subject
  const handleSubjectChange = async (subjectId: string) => {
    setForm((prev) => ({ ...prev, subjectId, teacherId: '' }));
    if (!subjectId) {
      setEligibleTeachers([]);
      return;
    }

    try {
      setLoadingEligible(true);
      const res = await apiClient.get(`/api/academic-allocations/marking/eligible-teachers?subjectId=${subjectId}`);
      setEligibleTeachers(res.data.data || []);
    } catch (error: any) {
      console.error('Failed to query eligible examiners', error);
      toast.warning('Could not load subject specialization info');
    } finally {
      setLoadingEligible(false);
    }
  };

  const selectedTeacherMeta = eligibleTeachers.find((t) => t.teacherId === form.teacherId);

  const handleAssignMarking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.examId || !form.subjectId || !form.classId || !form.teacherId) {
      toast.error('Please complete all selection fields');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/api/academic-allocations/marking', form);
      toast.success('Paper examiner successfully assigned to mark scripts');
      setShowModal(false);
      setForm({ examId: '', subjectId: '', classId: '', teacherId: '' });
      setEligibleTeachers([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign examiner');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMarking = async (id: string) => {
    if (removingAllocationId) return;
    if (!confirm('Are you sure you want to remove this marking allocation?')) return;
    try {
      setRemovingAllocationId(id);
      await apiClient.delete(`/api/academic-allocations/marking/${id}`);
      toast.success('Marking allocation removed');
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove marking allocation');
    } finally {
      setRemovingAllocationId(null);
    }
  };

  // Filter marking allocations
  const filteredMarkingList = markingList.filter((row) => {
    const matchesExam = !selectedExamId || row.exam?.id === selectedExamId;
    const matchesSubject = !selectedSubjectFilter || row.subject?.id === selectedSubjectFilter;
    const searchLower = searchFilter.toLowerCase();
    const matchesSearch =
      !searchFilter ||
      row.teacher?.firstName?.toLowerCase().includes(searchLower) ||
      row.teacher?.lastName?.toLowerCase().includes(searchLower) ||
      row.subject?.name?.toLowerCase().includes(searchLower) ||
      row.class?.name?.toLowerCase().includes(searchLower);
    return matchesExam && matchesSubject && matchesSearch;
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
            <Award className="w-4 h-4 text-sky-500" />
            Director of Studies · Examiner Allocations
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Subject Examiner & Marking Allocation Schedule
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Assign qualified subject specialist teachers to mark exam scripts, track evaluation duty, and generate printable departmental marking schedules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowPrintModal(true)}
            disabled={filteredMarkingList.length === 0}
            className="flex-1 sm:flex-none justify-center min-h-[42px] px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-sky-600" />
            Print Schedule
          </button>

          <button
            onClick={() => {
              setForm({ examId: selectedExamId || '', subjectId: '', classId: '', teacherId: '' });
              setEligibleTeachers([]);
              setShowModal(true);
            }}
            className="flex-1 sm:flex-none justify-center min-h-[42px] px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-glass transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Assign Examiner
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
        <div className="sm:col-span-1 md:col-span-4 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 shrink-0">Exam:</span>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:border-sky-500 outline-none transition-colors"
          >
            <option value="">-- All Examinations --</option>
            {exams.map((ex) => (
              <option key={ex.exam.id} value={ex.exam.id}>
                {ex.exam.title}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-1 md:col-span-4 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 shrink-0">Subject:</span>
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:border-sky-500 outline-none transition-colors"
          >
            <option value="">-- All Learning Areas --</option>
            {subjectsList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 md:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search examiner, subject, or class..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-white border border-sky-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Marking Roster Table */}
      <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100/80 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Award className="w-4 h-4 text-sky-600" />
            Paper Marking Examiners Roster ({filteredMarkingList.length} Allocations)
          </h3>
          <span className="text-xs text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg font-semibold border border-sky-200">
            {selectedExamObj ? selectedExamObj.exam.title : 'All Active Exams'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[660px]">
            <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
              <tr>
                <th className="py-3.5 px-4">Examination</th>
                <th className="py-3.5 px-4">Subject Paper</th>
                <th className="py-3.5 px-4">Class Stream</th>
                <th className="py-3.5 px-4">Designated Examiner</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/60">
              {filteredMarkingList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    No marking allocations found matching the selected criteria. Click "Assign Examiner" to allocate teachers to mark scripts.
                  </td>
                </tr>
              ) : (
                filteredMarkingList.map((row) => (
                  <tr key={row.allocation.id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {row.exam.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-sky-700 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-sky-500" />
                        {row.subject.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Code: {row.subject.code}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      <span className="bg-sky-50 text-sky-800 px-2 py-0.5 rounded border border-sky-100">
                        {row.class.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {row.teacher.firstName} {row.teacher.lastName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {row.teacher.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        title="Remove allocation"
                        disabled={removingAllocationId === row.allocation.id}
                        onClick={() => handleRemoveMarking(row.allocation.id)}
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

      {/* Assign Marking Examiner Modal with Subject Specialist Filter */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Assign Paper Marking Examiner">
        <form onSubmit={handleAssignMarking} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Examination *
              </label>
              <select
                required
                value={form.examId}
                onChange={(e) => setForm({ ...form, examId: e.target.value })}
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
                Select Subject Paper *
              </label>
              <select
                required
                value={form.subjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors font-medium"
              >
                <option value="">-- Select Subject --</option>
                {subjectsList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Class Stream *
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
                <span>Select Examiner Teacher *</span>
                {loadingEligible && (
                  <span className="text-[10px] text-sky-600 animate-pulse font-normal">
                    Filtering qualified staff...
                  </span>
                )}
              </label>
              <select
                required
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                disabled={!form.subjectId || loadingEligible}
                className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors font-medium disabled:opacity-60"
              >
                <option value="">
                  {form.subjectId ? '-- Select Teacher --' : '-- Select subject paper first --'}
                </option>
                {eligibleTeachers.length > 0
                  ? eligibleTeachers.map((t) => (
                      <option key={t.teacherId} value={t.teacherId}>
                        {t.isQualified ? `⭐ ${t.name} (Specialist: ${t.qualificationReason})` : `👤 ${t.name} (General Staff)`}
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

          {/* Qualification Indicator Banner */}
          {selectedTeacherMeta && selectedTeacherMeta.isQualified && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center gap-2 text-sky-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                <strong>{selectedTeacherMeta.name}</strong> is verified as qualified in this subject ({selectedTeacherMeta.qualificationReason}).
              </span>
            </div>
          )}

          {selectedTeacherMeta && !selectedTeacherMeta.isQualified && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">General Staff Allocation Notice: </span>
                <span className="text-[11px]">
                  {selectedTeacherMeta.name} does not have registered subject specialization for this paper. Allocation is allowed for cross-marking under DoS supervision.
                </span>
              </div>
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
              disabled={submitting}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
              {submitting ? 'Assigning...' : 'Assign Examiner'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Marking Schedule Modal */}
      {showPrintModal && (
        <Modal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          title="Printable Paper Marking Allocation Schedule"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-sky-100">
              <p className="text-xs text-slate-600">
                Official departmental script evaluation duty sheet for teacher examiners and academic record archives.
              </p>
              <button
                onClick={() => printElement('marking-schedule-printable', `${schoolSettings?.schoolName || 'Eldoret Muslim Academy'} - Marking Allocation Schedule`)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-glass shrink-0 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Schedule
              </button>
            </div>

            {/* Printable Paper View */}
            <div id="marking-schedule-printable" className="p-6 sm:p-8 bg-white border border-slate-300 rounded-xl text-slate-900 shadow-sm space-y-6">
              {/* Official School Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-slate-900">
                  {schoolSettings?.schoolName || 'ELDORET MUSLIM ACADEMY'}
                </h1>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-0.5">
                  Office of the Director of Studies · Academic Assessment Committee
                </p>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-bold uppercase tracking-wider text-slate-800">
                  Official Examination Script Marking & Evaluation Schedule
                </div>
                <div className="mt-2 text-xs text-slate-600 flex justify-center items-center gap-6 font-medium">
                  <span><strong>Exam:</strong> {selectedExamObj ? selectedExamObj.exam.title : 'All Current Examinations'}</span>
                  <span><strong>Academic Year:</strong> {schoolSettings?.currentAcademicYear || 2026}</span>
                  <span><strong>Term:</strong> Term {schoolSettings?.currentTermNumber || 1}</span>
                </div>
              </div>

              {/* Schedule Table */}
              <div>
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase border-b border-slate-300 text-[11px]">
                      <th className="p-2.5 border border-slate-300">#</th>
                      <th className="p-2.5 border border-slate-300">Subject / Learning Area</th>
                      <th className="p-2.5 border border-slate-300">Class Stream</th>
                      <th className="p-2.5 border border-slate-300">Allocated Examiner</th>
                      <th className="p-2.5 border border-slate-300 text-center">Examiner Signature</th>
                      <th className="p-2.5 border border-slate-300 text-center">DoS Moderation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMarkingList.map((row, idx) => (
                      <tr key={row.allocation.id} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-300 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-2 border border-slate-300 font-bold">
                          {row.subject.name}
                          <span className="text-[10px] text-slate-500 font-mono block">Code: {row.subject.code}</span>
                        </td>
                        <td className="p-2 border border-slate-300 font-semibold">
                          {row.class.name}
                        </td>
                        <td className="p-2 border border-slate-300 font-medium">
                          {row.teacher.firstName} {row.teacher.lastName}
                        </td>
                        <td className="p-2 border border-slate-300 w-28">
                          <div className="border-b border-dotted border-slate-400 h-5" />
                        </td>
                        <td className="p-2 border border-slate-300 text-center w-24">
                          <span className="border border-slate-400 px-2 py-0.5 text-[9px] uppercase font-bold text-slate-600 rounded">
                            Verified [ &nbsp; ]
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Directives to Examiners */}
              <div className="border border-slate-200 bg-slate-50/50 p-3 rounded text-[11px] space-y-1 text-slate-700">
                <p className="font-bold uppercase tracking-wider text-slate-900">Directives to Paper Examiners:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  <li>Mark strictly against the approved national curriculum marking scheme and standard rubrics (EE, ME, AE, BE).</li>
                  <li>Complete marking and electronic score entry within <strong>5 working days</strong> of paper administration.</li>
                  <li>Deliver marked physical scripts to the DoS office for cross-sample departmental moderation before mark locking.</li>
                  <li>Under no circumstances should unmarked scripts leave the institutional premises.</li>
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
                  <p className="font-bold text-slate-800">Head of Department (HoD)</p>
                  <p className="text-[10px] text-slate-500">Signature & Date</p>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-sky-800 flex flex-col items-center justify-center text-center p-1 text-[7px] font-bold text-sky-900 tracking-tighter uppercase leading-tight select-none">
                    <span>ELDORET MUSLIM</span>
                    <span>ACADEMY</span>
                    <span className="my-0.5 text-[6px] text-sky-600">★ ACADEMIC DEPT ★</span>
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

