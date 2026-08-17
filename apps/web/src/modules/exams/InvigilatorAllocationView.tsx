import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Plus, Trash2, ShieldCheck, Clock, BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { formatDate } from '../../lib/formatters';
import { Modal } from '../../components/Modal';

export const InvigilatorAllocationView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [invigilators, setInvigilators] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);

  const [selectedExamId, setSelectedExamId] = useState('');
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    examSessionId: '',
    classId: '',
    teacherId: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, exRes, clsRes, stfRes] = await Promise.all([
        apiClient.get('/api/academic-allocations/invigilators'),
        apiClient.get('/api/exams'),
        apiClient.get('/api/admissions/classes'),
        apiClient.get('/api/staff'),
      ]);

      const exList = exRes.data.data || [];
      setInvigilators(invRes.data.data || []);
      setExams(exList);
      setClassesList(clsRes.data.data || []);
      setTeachersList(stfRes.data.data?.staff || []);

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

  const handleAssignInvigilator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.examSessionId || !form.classId || !form.teacherId) {
      toast.error('Please complete all selection fields');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/api/academic-allocations/invigilators', form);
      toast.success('Invigilator allocated to exam room');
      setShowModal(false);
      setForm({ examSessionId: '', classId: '', teacherId: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign invigilator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveInvigilator = async (id: string) => {
    try {
      await apiClient.delete(`/api/academic-allocations/invigilators/${id}`);
      toast.success('Invigilator allocation removed');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove invigilator');
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
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 text-white rounded-3xl shadow-xl border border-blue-900/40">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Exam Invigilator Allocation Matrix</h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Assign invigilating teachers to exam paper sessions and classrooms to ensure strict examination integrity.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-white text-blue-600 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Assign Invigilator
        </button>
      </div>

      {/* Invigilations Table */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-blue-600" />
          Active Invigilation Roster ({invigilators.length} Allocations)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Session Date & Time</th>
                <th className="py-3.5 px-4">Classroom</th>
                <th className="py-3.5 px-4">Invigilating Teacher</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invigilators.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                    No invigilator allocations recorded yet. Click "Assign Invigilator" to assign supervisors to exam rooms.
                  </td>
                </tr>
              ) : (
                invigilators.map((row) => (
                  <tr key={row.allocation.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <span className="font-mono">{formatDate(row.session.sessionDate)}</span> — <span className="font-mono text-blue-600">{row.session.sessionTime}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                      {row.class.name}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400">
                      {row.teacher.firstName} {row.teacher.lastName} ({row.teacher.email})
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleRemoveInvigilator(row.allocation.id)}
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

      {/* Assign Invigilator Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Assign Exam Room Invigilator">
        <form onSubmit={handleAssignInvigilator} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Examination *
            </label>
            <select
              required
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
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
              Select Exam Paper Session *
            </label>
            <select
              required
              value={form.examSessionId}
              onChange={(e) => setForm({ ...form, examSessionId: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="">-- Select Paper Session Slot --</option>
              {sessionsList.map((s) => (
                <option key={s.session.id} value={s.session.id}>
                  {s.subject.name} — {formatDate(s.session.sessionDate)} ({s.session.sessionTime})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Classroom *
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
                Select Invigilating Teacher *
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
              Assign Invigilator
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
