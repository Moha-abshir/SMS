import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Printer, Clock, BookOpen, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { formatDate } from '../../lib/formatters';
import { Modal } from '../../components/Modal';

export const ExamTimetableView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  const [showExamModal, setShowExamModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  const [examForm, setExamForm] = useState({
    termId: '',
    title: '',
  });

  const [sessionForm, setSessionForm] = useState({
    subjectId: '',
    sessionDate: new Date().toISOString().split('T')[0],
    sessionTime: '08:00 - 10:00 AM',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [exRes, tmRes, sbRes] = await Promise.all([
        apiClient.get('/api/exams'),
        apiClient.get('/api/academic-terms'),
        apiClient.get('/api/subjects'),
      ]);

      const examData = exRes.data.data || [];
      setExams(examData);
      setTerms(tmRes.data.data || []);
      setSubjectsList(sbRes.data.data || []);

      if (examData.length > 0 && !selectedExam) {
        setSelectedExam(examData[0]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load examination timetables');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async (examId: string) => {
    try {
      const res = await apiClient.get(`/api/exams/${examId}/sessions`);
      setSessions(res.data.data || []);
    } catch (error) {
      console.error('Failed to load sessions', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchSessions(selectedExam.exam.id);
    }
  }, [selectedExam]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.termId) {
      toast.error('Please select an academic term');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient.post('/api/exams', examForm);
      toast.success('Examination created');
      setShowExamModal(false);
      setExamForm({ termId: '', title: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam || !sessionForm.subjectId) {
      toast.error('Please select a subject');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/api/exams/sessions', {
        ...sessionForm,
        examId: selectedExam.exam.id,
      });
      toast.success('Exam session scheduled');
      setShowSessionModal(false);
      setSessionForm({
        subjectId: '',
        sessionDate: new Date().toISOString().split('T')[0],
        sessionTime: '08:00 - 10:00 AM',
      });
      fetchSessions(selectedExam.exam.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to schedule session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await apiClient.delete(`/api/exams/sessions/${sessionId}`);
      toast.success('Exam session removed');
      if (selectedExam) fetchSessions(selectedExam.exam.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete session');
    }
  };

  const triggerPrint = () => {
    window.print();
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-sky-100 shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <Calendar className="w-4 h-4 text-sky-500" />
            DoS Examination Scheduling & Timetables
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">DoS Examination Timetabling Hub</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Schedule term examinations, assign paper session dates/times, and publish printable timetables.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setShowExamModal(true)}
            className="flex-1 sm:flex-initial justify-center min-h-[42px] px-4 py-2.5 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-sky-600" />
            New Exam
          </button>
          {selectedExam && (
            <button
              onClick={() => setShowSessionModal(true)}
              className="flex-1 sm:flex-initial justify-center min-h-[42px] px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-glass transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Paper Session
            </button>
          )}
        </div>
      </div>

      {/* Exam Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {exams.map((ex) => (
          <button
            key={ex.exam.id}
            onClick={() => setSelectedExam(ex)}
            className={`px-4 py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              selectedExam?.exam.id === ex.exam.id
                ? 'bg-sky-500 text-white shadow-glass'
                : 'bg-white/85 backdrop-blur-md border border-sky-100 hover:bg-sky-50 text-slate-700 shadow-xs'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            {ex.exam.title} (Year {ex.term.year} Term {ex.term.termNumber})
          </button>
        ))}
      </div>

      {selectedExam && (
        <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass print:shadow-none print:border-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              {selectedExam.exam.title} Timetable Sessions ({sessions.length} Papers Scheduled)
            </h3>
            <button
              onClick={triggerPrint}
              className="w-full sm:w-auto justify-center min-h-[38px] px-3.5 py-1.5 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 hover:text-sky-600 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors print:hidden shadow-xs"
            >
              <Printer className="w-4 h-4" /> Print Noticeboard Timetable
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
                <tr>
                  <th className="py-3.5 px-4">Session Date</th>
                  <th className="py-3.5 px-4">Session Time</th>
                  <th className="py-3.5 px-4">Subject Paper</th>
                  <th className="py-3.5 px-4">Category Tier</th>
                  <th className="py-3.5 px-4 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/60">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No paper sessions scheduled for this exam yet. Click "Schedule Paper Session" to add exam slots.
                    </td>
                  </tr>
                ) : (
                  sessions.map((row) => (
                    <tr key={row.session.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        {formatDate(row.session.sessionDate)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-600">
                        {row.session.sessionTime}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {row.subject.name} ({row.subject.code})
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-semibold">
                        {row.subject.levelCategory}
                      </td>
                      <td className="py-3.5 px-4 text-center print:hidden">
                        <button
                          onClick={() => handleDeleteSession(row.session.id)}
                          className="p-1 text-slate-400 hover:text-sky-600 rounded-lg transition-colors"
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
      )}

      {/* New Exam Modal */}
      <Modal isOpen={showExamModal} onClose={() => setShowExamModal(false)} title="Create New Examination Term Series">
        <form onSubmit={handleCreateExam} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Academic Term *
            </label>
            <select
              required
              value={examForm.termId}
              onChange={(e) => setExamForm({ ...examForm, termId: e.target.value })}
              className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors"
            >
              <option value="">-- Select Term --</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  Year {t.year} — Term {t.termNumber} ({formatDate(t.startDate)} to {formatDate(t.endDate)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Exam Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. End of Term 1 National Standards Examination"
              value={examForm.title}
              onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
              className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
            <button
              type="button"
              onClick={() => setShowExamModal(false)}
              className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all"
            >
              {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Create Exam
            </button>
          </div>
        </form>
      </Modal>

      {/* New Session Modal */}
      <Modal isOpen={showSessionModal} onClose={() => setShowSessionModal(false)} title="Schedule Paper Exam Session">
        <form onSubmit={handleCreateSession} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Subject Paper *
            </label>
            <select
              required
              value={sessionForm.subjectId}
              onChange={(e) => setSessionForm({ ...sessionForm, subjectId: e.target.value })}
              className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors"
            >
              <option value="">-- Select Subject --</option>
              {subjectsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) — {s.levelCategory}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Session Date *
              </label>
              <input
                type="date"
                required
                value={sessionForm.sessionDate}
                onChange={(e) => setSessionForm({ ...sessionForm, sessionDate: e.target.value })}
                className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Session Time Range *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 08:00 - 10:00 AM"
                value={sessionForm.sessionTime}
                onChange={(e) => setSessionForm({ ...sessionForm, sessionTime: e.target.value })}
                className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
            <button
              type="button"
              onClick={() => setShowSessionModal(false)}
              className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all"
            >
              {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Schedule Session
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
