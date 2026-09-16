import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Printer, Clock, BookOpen, Trash2, CheckCircle2, ShieldCheck, Lock, Unlock, AlertTriangle, Users } from 'lucide-react';
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
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  const [showExamModal, setShowExamModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

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
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [exRes, tmRes, sbRes, setRes] = await Promise.all([
        apiClient.get('/api/exams'),
        apiClient.get('/api/academic-terms'),
        apiClient.get('/api/subjects'),
        apiClient.get('/api/settings').catch(() => ({ data: { data: null } })),
      ]);

      const examData = exRes.data.data || [];
      setExams(examData);
      setTerms(tmRes.data.data || []);
      setSubjectsList(sbRes.data.data || []);
      setSchoolSettings(setRes.data?.data || null);

      if (examData.length > 0) {
        setSelectedExam((prev: any) => {
          if (!prev) return examData[0];
          const found = examData.find((e: any) => e.exam.id === prev.exam.id);
          return found || examData[0];
        });
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
      await fetchData();
      if (res.data?.data) {
        const found = exams.find((e) => e.exam.id === res.data.data.id);
        if (found) setSelectedExam(found);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedExam) return;
    try {
      setUpdatingStatus(true);
      await apiClient.put(`/api/exams/${selectedExam.exam.id}/status`, { status: newStatus });
      toast.success(`Exam timetable status updated to ${newStatus}`);
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update exam status');
    } finally {
      setUpdatingStatus(false);
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
      toast.success('Exam paper session scheduled');
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
    if (!confirm('Are you sure you want to remove this paper session?')) return;
    try {
      await apiClient.delete(`/api/exams/sessions/${sessionId}`);
      toast.success('Exam session removed');
      if (selectedExam) fetchSessions(selectedExam.exam.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete session');
    }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-sky-100 shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <Calendar className="w-4 h-4 text-sky-500" />
            Director of Studies · Examination Management
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Master Examination Timetable & Session Hub
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Schedule examination series, monitor room invigilator coverage, manage publication status, and print master timetables.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setShowExamModal(true)}
            className="flex-1 sm:flex-initial justify-center min-h-[42px] px-4 py-2.5 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-sky-600" />
            New Exam Series
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

      {/* Exam Selector Tabs & Status Indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {exams.map((ex) => {
          const isSelected = selectedExam?.exam.id === ex.exam.id;
          return (
            <button
              key={ex.exam.id}
              onClick={() => setSelectedExam(ex)}
              className={`px-4 py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                isSelected
                  ? 'bg-sky-500 text-white shadow-glass'
                  : 'bg-white/85 backdrop-blur-md border border-sky-100 hover:bg-sky-50 text-slate-700 shadow-xs'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{ex.exam.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                isSelected ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-700 border border-sky-200'
              }`}>
                {ex.exam.status}
              </span>
            </button>
          );
        })}
      </div>

      {selectedExam && (
        <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
          {/* Status Bar & Action Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-sky-50/60 border border-sky-100 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl border border-sky-200 text-sky-600 shadow-xs">
                {selectedExam.exam.status === 'LOCKED' ? (
                  <Lock className="w-5 h-5 text-slate-600" />
                ) : selectedExam.exam.status === 'APPROVED' ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-slate-800">{selectedExam.exam.title}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    selectedExam.exam.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : selectedExam.exam.status === 'LOCKED'
                      ? 'bg-slate-200 text-slate-800 border border-slate-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {selectedExam.exam.status === 'APPROVED' ? 'Published / Approved' : selectedExam.exam.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Term {selectedExam.term?.termNumber || 1} · Academic Year {selectedExam.term?.year || 2026} · {sessions.length} Scheduled Paper Sessions
                </p>
              </div>
            </div>

            {/* Status Transition Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedExam.exam.status === 'DRAFT' && (
                <button
                  disabled={updatingStatus}
                  onClick={() => handleUpdateStatus('APPROVED')}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Approve & Publish Timetable
                </button>
              )}

              {selectedExam.exam.status === 'APPROVED' && (
                <>
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus('DRAFT')}
                    className="px-3 py-1.5 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Unlock className="w-3.5 h-3.5 text-amber-600" />
                    Revert to Draft
                  </button>
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus('LOCKED')}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5 text-white" />
                    Lock Examination
                  </button>
                </>
              )}

              {selectedExam.exam.status === 'LOCKED' && (
                <button
                  disabled={updatingStatus}
                  onClick={() => handleUpdateStatus('APPROVED')}
                  className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Unlock Timetable
                </button>
              )}

              <button
                onClick={() => setShowPrintModal(true)}
                disabled={sessions.length === 0}
                className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5 text-sky-600" />
                Print Master Timetable
              </button>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
                <tr>
                  <th className="py-3.5 px-4">Session Date</th>
                  <th className="py-3.5 px-4">Session Time</th>
                  <th className="py-3.5 px-4">Subject Paper</th>
                  <th className="py-3.5 px-4">Tier Category</th>
                  <th className="py-3.5 px-4">Invigilator Coverage</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/60">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No paper sessions scheduled for this exam yet. Click "Add Paper Session" to add slots to the timetable.
                    </td>
                  </tr>
                ) : (
                  sessions.map((row) => {
                    const count = row.invigilatorsCount || 0;
                    return (
                      <tr key={row.session.id} className="hover:bg-sky-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                          {formatDate(row.session.sessionDate)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-sky-600">
                          {row.session.sessionTime}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {row.subject.name}
                          <span className="text-[10px] text-slate-400 font-mono block">Code: {row.subject.code}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-semibold">
                          <span className="bg-sky-50 text-sky-800 px-2 py-0.5 rounded border border-sky-100 text-[11px]">
                            {row.subject.levelCategory}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {count > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {count} Room Invigilator{count > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              0 Invigilators (Unassigned)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            title="Delete session"
                            onClick={() => handleDeleteSession(row.session.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Exam Modal */}
      <Modal isOpen={showExamModal} onClose={() => setShowExamModal(false)} title="Create New Examination Series">
        <form onSubmit={handleCreateExam} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Academic Term *
            </label>
            <select
              required
              value={examForm.termId}
              onChange={(e) => setExamForm({ ...examForm, termId: e.target.value })}
              className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors font-medium"
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
              className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors font-medium"
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
              className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors font-medium"
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
                className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors font-medium"
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
                className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors font-medium"
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

      {/* Printable Master Timetable Modal */}
      {showPrintModal && (
        <Modal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          title="Printable Master Examination Timetable"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-sky-100">
              <p className="text-xs text-slate-600">
                Official master timetable for notice boards, class circulation, and parent notices.
              </p>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-glass shrink-0 transition-all"
              >
                <Printer className="w-4 h-4" />
                Print Master Timetable
              </button>
            </div>

            {/* Paper Preview Sheet */}
            <div className="p-6 sm:p-8 bg-white border border-slate-300 rounded-xl text-slate-900 shadow-sm print:m-0 print:p-0 print:border-none print:shadow-none space-y-6">
              {/* Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-slate-900">
                  {schoolSettings?.schoolName || 'ELDORET MUSLIM ACADEMY'}
                </h1>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-0.5">
                  Office of the Director of Studies · Central Examination Board
                </p>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-bold uppercase tracking-wider text-slate-800">
                  Master Examination Timetable
                </div>
                <div className="mt-2 text-xs text-slate-600 flex justify-center items-center gap-6 font-medium">
                  <span><strong>Examination:</strong> {selectedExam?.exam.title}</span>
                  <span><strong>Academic Year:</strong> {schoolSettings?.currentAcademicYear || selectedExam?.term?.year || 2026}</span>
                  <span><strong>Term:</strong> Term {schoolSettings?.currentTermNumber || selectedExam?.term?.termNumber || 1}</span>
                </div>
              </div>

              {/* Timetable Table */}
              <div>
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase border-b border-slate-300 text-[11px]">
                      <th className="p-2.5 border border-slate-300">#</th>
                      <th className="p-2.5 border border-slate-300">Date</th>
                      <th className="p-2.5 border border-slate-300">Time Slot</th>
                      <th className="p-2.5 border border-slate-300">Subject Paper</th>
                      <th className="p-2.5 border border-slate-300">Code</th>
                      <th className="p-2.5 border border-slate-300">Target Category</th>
                      <th className="p-2.5 border border-slate-300 text-center">Invigilators</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((row, idx) => (
                      <tr key={row.session.id} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-300 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-2 border border-slate-300 font-mono font-bold">
                          {formatDate(row.session.sessionDate)}
                        </td>
                        <td className="p-2 border border-slate-300 font-mono text-slate-700">
                          {row.session.sessionTime}
                        </td>
                        <td className="p-2 border border-slate-300 font-bold">
                          {row.subject.name}
                        </td>
                        <td className="p-2 border border-slate-300 font-mono text-[11px]">
                          {row.subject.code}
                        </td>
                        <td className="p-2 border border-slate-300 font-medium">
                          {row.subject.levelCategory}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-semibold">
                          {row.invigilatorsCount || 0} Assigned
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Candidate Instructions */}
              <div className="border border-slate-200 bg-slate-50/50 p-3 rounded text-[11px] space-y-1 text-slate-700">
                <p className="font-bold uppercase tracking-wider text-slate-900">Instructions to Candidates:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  <li>Be seated in the examination hall at least <strong>10 minutes</strong> before paper start time.</li>
                  <li>Ensure your admission number and name are clearly legible on all answer sheets.</li>
                  <li>Possession of unapproved study materials, electronic devices, or communication during exams is strictly prohibited.</li>
                  <li>No candidate shall leave the room during the first or last 15 minutes of the session.</li>
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
                  <p className="font-bold text-slate-800">Headteacher / Principal</p>
                  <p className="text-[10px] text-slate-500">Signature & Date</p>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-sky-800 flex flex-col items-center justify-center text-center p-1 text-[7px] font-bold text-sky-900 tracking-tighter uppercase leading-tight select-none">
                    <span>ELDORET MUSLIM</span>
                    <span>ACADEMY</span>
                    <span className="my-0.5 text-[6px] text-sky-600">★ APPROVED TIMETABLE ★</span>
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

