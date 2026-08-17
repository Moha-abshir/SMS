import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, Plus, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';

export const MarkingAllocationView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [markingList, setMarkingList] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    examId: '',
    subjectId: '',
    classId: '',
    teacherId: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mrkRes, exRes, sbRes, clsRes, stfRes] = await Promise.all([
        apiClient.get('/api/academic-allocations/marking'),
        apiClient.get('/api/exams'),
        apiClient.get('/api/subjects'),
        apiClient.get('/api/admissions/classes'),
        apiClient.get('/api/staff'),
      ]);

      setMarkingList(mrkRes.data.data || []);
      setExams(exRes.data.data || []);
      setSubjectsList(sbRes.data.data || []);
      setClassesList(clsRes.data.data || []);
      setTeachersList(stfRes.data.data?.staff || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load marking allocations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignMarking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.examId || !form.subjectId || !form.classId || !form.teacherId) {
      toast.error('Please complete all selection fields');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/api/academic-allocations/marking', form);
      toast.success('Paper examiner assigned to mark scripts');
      setShowModal(false);
      setForm({ examId: '', subjectId: '', classId: '', teacherId: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign examiner');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMarking = async (id: string) => {
    try {
      await apiClient.delete(`/api/academic-allocations/marking/${id}`);
      toast.success('Marking allocation removed');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove marking allocation');
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
      className="space-y-6 max-w-6xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 text-white rounded-3xl shadow-xl border border-blue-900/40">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
            <Award className="w-4 h-4" />
            DoS Examination Paper Marking Assignments
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">DoS Exam Marking Allocation Matrix</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium max-w-xl">
            Assign qualified teacher examiners to mark specific subject exam papers for each class stream.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Assign Examiner
        </button>
      </div>

      {/* Marking Roster Table */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Award className="w-4 h-4 text-blue-600" />
          Paper Marking Examiners Roster ({markingList.length} Allocations)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Examination</th>
                <th className="py-3.5 px-4">Subject Paper</th>
                <th className="py-3.5 px-4">Class Stream</th>
                <th className="py-3.5 px-4">Assigned Examiner</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {markingList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    No marking allocations recorded yet. Click "Assign Examiner" to allocate teachers to mark scripts.
                  </td>
                </tr>
              ) : (
                markingList.map((row) => (
                  <tr key={row.allocation.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {row.exam.title}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-indigo-600 dark:text-indigo-400">
                      {row.subject.name} ({row.subject.code})
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                      {row.class.name}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400">
                      {row.teacher.firstName} {row.teacher.lastName}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleRemoveMarking(row.allocation.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Marking Examiner Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Assign Paper Marking Examiner">
        <form onSubmit={handleAssignMarking} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Examination *
              </label>
              <select
                required
                value={form.examId}
                onChange={(e) => setForm({ ...form, examId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Subject Paper *
              </label>
              <select
                required
                value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Class Stream *
              </label>
              <select
                required
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Examiner Teacher *
              </label>
              <select
                required
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="">-- Select Teacher --</option>
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Assign Examiner
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
