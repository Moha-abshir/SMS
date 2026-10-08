import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, CheckCircle2, RotateCcw, Lock, AlertCircle, Eye, Search, Award, TrendingUp, BookOpen, User } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';
import { isJuniorSecondaryClass } from '@school/shared/types';

export const MarkReviewView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [rejectionModalSubmission, setRejectionModalSubmission] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionSubmissionId, setActionSubmissionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'LOCK' | null>(null);

  // Scores Inspection State
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectData, setInspectData] = useState<any | null>(null);
  const [scoreSearch, setScoreSearch] = useState('');
  const [filterRubric, setFilterRubric] = useState<'ALL' | 'EE' | 'ME' | 'AE' | 'BE'>('ALL');
  const [filterPoints, setFilterPoints] = useState<number | 'ALL'>('ALL');
  const [inlineCorrectionMode, setInlineCorrectionMode] = useState(false);
  const [inlineReason, setInlineReason] = useState('');

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/mark-submissions');
      setSubmissions(res.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load mark submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleOpenInspection = async (submissionId: string) => {
    setInspectModalOpen(true);
    setInspectLoading(true);
    setScoreSearch('');
    setFilterRubric('ALL');
    setFilterPoints('ALL');
    setInlineCorrectionMode(false);
    setInlineReason('');
    try {
      const res = await apiClient.get(`/api/mark-submissions/${submissionId}/scores`);
      setInspectData(res.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load marksheet scores');
      setInspectModalOpen(false);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (actionProcessing) return;
    try {
      setActionProcessing(true);
      setActionSubmissionId(id);
      setActionType('APPROVE');
      await apiClient.put(`/api/mark-submissions/${id}/approve`);
      toast.success('Marksheet approved successfully');
      if (inspectModalOpen && inspectData?.submission?.id === id) {
        setInspectData({
          ...inspectData,
          submission: { ...inspectData.submission, status: 'APPROVED' },
        });
      }
      await fetchSubmissions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve marksheet');
    } finally {
      setActionProcessing(false);
      setActionSubmissionId(null);
      setActionType(null);
    }
  };

  const handleConfirmCorrectionRequest = async (submissionId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error('Please specify a reason for requesting correction');
      return;
    }

    try {
      setActionProcessing(true);
      await apiClient.put(`/api/mark-submissions/${submissionId}/request-correction`, {
        reason,
      });
      toast.success('Correction request sent back to subject teacher');
      setRejectionModalSubmission(null);
      setRejectionReason('');
      if (inspectModalOpen && inspectData?.submission?.id === submissionId) {
        setInspectData({
          ...inspectData,
          submission: {
            ...inspectData.submission,
            status: 'CORRECTION_REQUESTED',
            rejectionReason: reason,
          },
        });
        setInlineCorrectionMode(false);
      }
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to request correction');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleLock = async (id: string) => {
    if (actionProcessing) return;
    if (!confirm('Are you sure you want to permanently lock this marksheet? No further edits will be permitted.')) return;
    try {
      setActionProcessing(true);
      setActionSubmissionId(id);
      setActionType('LOCK');
      await apiClient.put(`/api/mark-submissions/${id}/lock`);
      toast.success('Marksheet permanently locked');
      if (inspectModalOpen && inspectData?.submission?.id === id) {
        setInspectData({
          ...inspectData,
          submission: { ...inspectData.submission, status: 'LOCKED' },
        });
      }
      await fetchSubmissions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to lock marksheet');
    } finally {
      setActionProcessing(false);
      setActionSubmissionId(null);
      setActionType(null);
    }
  };

  const isJunior = inspectData?.isJunior ?? isJuniorSecondaryClass(inspectData?.class);

  const filteredScores = (inspectData?.scores || []).filter((s: any) => {
    const sName = s.studentName || s.fullName || '';
    const sAdm = s.admissionNumber || s.assessmentNumber || '';
    const matchesSearch =
      sName.toLowerCase().includes(scoreSearch.toLowerCase()) ||
      sAdm.toLowerCase().includes(scoreSearch.toLowerCase());
    if (isJunior) {
      const pts = s.juniorPoints ?? s.points;
      const matchesPoints = filterPoints === 'ALL' || pts === filterPoints;
      return matchesSearch && matchesPoints;
    } else {
      const rub = s.cbcRubricLevel || s.rubric;
      const matchesRubric = filterRubric === 'ALL' || rub === filterRubric;
      return matchesSearch && matchesRubric;
    }
  });

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
            <ClipboardCheck className="w-4 h-4 text-sky-500" />
            Marksheet Review & Approval Workflow
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Exam Mark Review & Approval State Machine</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Inspect learner scores, examine class performance metrics, approve submissions, or request corrections with teacher feedback.
          </p>
        </div>

        <div className="flex items-center justify-around sm:justify-start gap-4 px-4 sm:px-5 py-2.5 sm:py-3 bg-sky-50/60 border border-sky-100 rounded-xl sm:rounded-2xl backdrop-blur-md w-full sm:w-auto shrink-0">
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-black text-slate-800 leading-none">{submissions.length}</span>
            <span className="text-[10px] font-bold tracking-wider text-sky-700 uppercase mt-1 block">Submissions</span>
          </div>
          <div className="w-[1px] h-8 bg-sky-200" />
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-black text-sky-600 leading-none">
              {submissions.filter((s) => s.submission.status === 'SUBMITTED').length} Pending
            </span>
            <span className="text-[10px] font-bold tracking-wider text-sky-700 uppercase mt-1 block">Review Queue</span>
          </div>
        </div>
      </div>

      {/* Submissions Review Workspace */}
      <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-sky-600" />
          Marksheet Submissions Queue ({submissions.length} Marksheets)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
              <tr>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Submitted By</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Inspection & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/60">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    No submitted marksheets currently in review queue.
                  </td>
                </tr>
              ) : (
                submissions.map((row) => (
                  <tr key={row.submission.id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {row.class.name}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-sky-700">
                      {row.subject.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">
                      {row.submittedBy.firstName} {row.submittedBy.lastName}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${
                          row.submission.status === 'APPROVED'
                            ? 'bg-sky-100 text-sky-800 border-sky-200'
                            : row.submission.status === 'CORRECTION_REQUESTED'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : row.submission.status === 'LOCKED'
                            ? 'bg-slate-100 text-slate-700 border-slate-200 font-mono'
                            : 'bg-sky-500 text-white border-transparent'
                        }`}
                      >
                        {row.submission.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* Inspect Scores Button */}
                        <button
                          onClick={() => handleOpenInspection(row.submission.id)}
                          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                          title="Inspect student scores and averages"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Scores</span>
                        </button>

                        {row.submission.status !== 'LOCKED' && (
                          <>
                            {row.submission.status !== 'APPROVED' && (
                              <button
                                onClick={() => handleApprove(row.submission.id)}
                                disabled={actionProcessing}
                                className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {actionProcessing && actionSubmissionId === row.submission.id && actionType === 'APPROVE' ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>{actionProcessing && actionSubmissionId === row.submission.id && actionType === 'APPROVE' ? 'Approving...' : 'Approve'}</span>
                              </button>
                            )}

                            <button
                              onClick={() => setRejectionModalSubmission(row)}
                              disabled={actionProcessing}
                              className="px-3 py-1.5 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Correction
                            </button>

                            <button
                              onClick={() => handleLock(row.submission.id)}
                              disabled={actionProcessing}
                              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl flex items-center gap-1 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionProcessing && actionSubmissionId === row.submission.id && actionType === 'LOCK' ? (
                                <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin shrink-0" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-slate-500" />
                              )}
                              <span>{actionProcessing && actionSubmissionId === row.submission.id && actionType === 'LOCK' ? 'Locking...' : 'Lock'}</span>
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

      {/* Scores Inspection Modal */}
      {inspectModalOpen && (
        <Modal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          title={
            inspectData
              ? `Marksheet Scores: ${inspectData.class?.name} - ${inspectData.subject?.name}`
              : 'Marksheet Scores Inspection'
          }
          maxWidth="max-w-4xl"
        >
          {inspectLoading || !inspectData ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Details Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-sky-50/60 border border-sky-100 rounded-2xl">
                <div>
                  <div className="flex items-center gap-2 text-xs text-sky-700 font-bold uppercase tracking-wider mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                    {inspectData.examination?.name || 'Term Exam'} (Year {inspectData.examination?.academicYear || 2026})
                  </div>
                  <h4 className="text-base font-black text-slate-800">
                    {inspectData.class?.name} — {inspectData.subject?.name}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Submitted by <strong className="text-slate-900">{inspectData.submittedBy?.firstName} {inspectData.submittedBy?.lastName}</strong> ({inspectData.submittedBy?.email})
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span
                    className={`px-3 py-1 text-xs font-black rounded-full border ${
                      inspectData.submission?.status === 'APPROVED'
                        ? 'bg-sky-100 text-sky-800 border-sky-200'
                        : inspectData.submission?.status === 'CORRECTION_REQUESTED'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : inspectData.submission?.status === 'LOCKED'
                        ? 'bg-slate-100 text-slate-700 border-slate-200 font-mono'
                        : 'bg-sky-500 text-white border-transparent'
                    }`}
                  >
                    {inspectData.submission?.status}
                  </span>
                </div>
              </div>

              {/* Existing Correction Note Alert if any */}
              {inspectData.submission?.rejectionReason && (
                <div className="p-3 bg-sky-50/90 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-sky-950 font-bold">Correction Instructions Sent to Teacher:</strong>
                    <span>{inspectData.submission.rejectionReason}</span>
                  </div>
                </div>
              )}

              {/* Key Aggregate Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-white border border-sky-100 rounded-xl shadow-xs text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Class Average</span>
                  <span className="text-xl font-black text-sky-600 mt-0.5 block">{inspectData.summary?.classAverage}%</span>
                </div>

                <div className="p-3 bg-white border border-sky-100 rounded-xl shadow-xs text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Learners Scored</span>
                  <span className="text-xl font-black text-slate-900 mt-0.5 block">
                    {inspectData.summary?.scoredStudents} / {inspectData.summary?.totalStudents}
                  </span>
                </div>

                <div className="p-3 bg-white border border-sky-100 rounded-xl shadow-xs text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Highest Mark</span>
                  <span className="text-xl font-black text-sky-700 mt-0.5 block">{inspectData.summary?.highestScore}%</span>
                </div>

                <div className="p-3 bg-white border border-sky-100 rounded-xl shadow-xs text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Lowest Mark</span>
                  <span className="text-xl font-black text-slate-700 mt-0.5 block">{inspectData.summary?.lowestScore}%</span>
                </div>
              </div>

              {/* Assessment Performance Distribution: Points for Junior Secondary vs Rubrics for Primary */}
              {isJunior ? (
                <div className="p-3.5 bg-sky-50/40 border border-sky-100 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 block">
                      Junior Secondary Points Distribution (1–8 pts)
                    </span>
                    {filterPoints !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setFilterPoints('ALL')}
                        className="text-[11px] text-sky-600 font-bold hover:underline cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
                    {[
                      { pt: 8, label: '8 pts', range: '90-100%' },
                      { pt: 7, label: '7 pts', range: '75-89%' },
                      { pt: 6, label: '6 pts', range: '58-74%' },
                      { pt: 5, label: '5 pts', range: '41-57%' },
                      { pt: 4, label: '4 pts', range: '31-40%' },
                      { pt: 3, label: '3 pts', range: '21-30%' },
                      { pt: 2, label: '2 pts', range: '11-20%' },
                      { pt: 1, label: '1 pt', range: '0-10%' },
                    ].map((p) => {
                      const count =
                        inspectData.summary?.pointsBreakdown?.[p.pt] ??
                        inspectData.scores?.filter((sc: any) => (sc.juniorPoints ?? sc.points) === p.pt).length ??
                        0;
                      return (
                        <button
                          key={p.pt}
                          type="button"
                          onClick={() => setFilterPoints(filterPoints === p.pt ? 'ALL' : p.pt)}
                          className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                            filterPoints === p.pt
                              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                              : 'bg-white text-slate-700 border-sky-200 hover:border-sky-300'
                          }`}
                        >
                          <span className="font-black block text-xs">{p.label}</span>
                          <span className="text-[11px] block font-bold opacity-90">{count} learners</span>
                          <span className="text-[9px] block text-slate-400 mt-0.5">{p.range}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-sky-50/40 border border-sky-100 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 block">
                      CBC Rubric Level Distribution
                    </span>
                    {filterRubric !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setFilterRubric('ALL')}
                        className="text-[11px] text-sky-600 font-bold hover:underline cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterRubric(filterRubric === 'EE' ? 'ALL' : 'EE')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        filterRubric === 'EE'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-emerald-200 hover:border-emerald-300'
                      }`}
                    >
                      <span className="font-extrabold block">EE (Exceeding)</span>
                      <span className="text-[11px] opacity-80 block">
                        {inspectData.summary?.rubricBreakdown?.EE ?? inspectData.summary?.cbcPerformance?.EE ?? 0} learners (75-100%)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterRubric(filterRubric === 'ME' ? 'ALL' : 'ME')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        filterRubric === 'ME'
                          ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                          : 'bg-white text-slate-700 border-sky-200 hover:border-sky-300'
                      }`}
                    >
                      <span className="font-extrabold block">ME (Meeting)</span>
                      <span className="text-[11px] opacity-80 block">
                        {inspectData.summary?.rubricBreakdown?.ME ?? inspectData.summary?.cbcPerformance?.ME ?? 0} learners (50-74%)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterRubric(filterRubric === 'AE' ? 'ALL' : 'AE')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        filterRubric === 'AE'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-white text-slate-700 border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      <span className="font-extrabold block">AE (Approaching)</span>
                      <span className="text-[11px] opacity-80 block">
                        {inspectData.summary?.rubricBreakdown?.AE ?? inspectData.summary?.cbcPerformance?.AE ?? 0} learners (25-49%)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterRubric(filterRubric === 'BE' ? 'ALL' : 'BE')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        filterRubric === 'BE'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                          : 'bg-white text-slate-700 border-rose-200 hover:border-rose-300'
                      }`}
                    >
                      <span className="font-extrabold block">BE (Below)</span>
                      <span className="text-[11px] opacity-80 block">
                        {inspectData.summary?.rubricBreakdown?.BE ?? inspectData.summary?.cbcPerformance?.BE ?? 0} learners (0-24%)
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Search Learner Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search student name or admission number..."
                  value={scoreSearch}
                  onChange={(e) => setScoreSearch(e.target.value)}
                  className="w-full bg-white border border-sky-100 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Student Scores Roster Table */}
              <div className="max-h-80 overflow-y-auto border border-sky-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sky-50/90 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Adm #</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3 text-center">Percentage</th>
                      <th className="py-2.5 px-3 text-center">{isJunior ? 'Points (1–8)' : 'CBC Rubric'}</th>
                      <th className="py-2.5 px-3">Teacher Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-50">
                    {filteredScores.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                          No student scores match the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredScores.map((s: any) => {
                        const pts = s.juniorPoints ?? s.points;
                        const rub = s.cbcRubricLevel || s.rubric;
                        return (
                          <tr key={s.studentId} className="hover:bg-sky-50/40 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                              {s.admissionNumber || s.assessmentNumber || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {s.studentName || s.fullName}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800 font-mono">
                              {s.score ?? s.marksObtained ?? '—'} / {s.maxScore ?? s.maxMarks ?? 100}
                            </td>
                            <td className="py-2.5 px-3 text-center font-black text-sky-700">
                              {s.percentage}%
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isJunior ? (
                                pts !== null && pts !== undefined ? (
                                  <span
                                    className={`px-2.5 py-0.5 text-xs font-black rounded-full border ${
                                      pts === 8
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                        : pts === 7
                                        ? 'bg-sky-100 text-sky-800 border-sky-300'
                                        : pts === 6
                                        ? 'bg-teal-50 text-teal-800 border-teal-200'
                                        : pts === 5
                                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                                        : pts === 4
                                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                                        : pts === 3
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : pts === 2
                                        ? 'bg-orange-50 text-orange-800 border-orange-200'
                                        : 'bg-rose-100 text-rose-800 border-rose-200'
                                    }`}
                                  >
                                    {pts} pts
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )
                              ) : (
                                rub ? (
                                  <span
                                    className={`px-2.5 py-0.5 text-[10px] font-black rounded-md border ${
                                      rub === 'EE'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                        : rub === 'ME'
                                        ? 'bg-sky-100 text-sky-800 border-sky-200'
                                        : rub === 'AE'
                                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                                        : 'bg-rose-100 text-rose-800 border-rose-200'
                                    }`}
                                  >
                                    {rub}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 italic">
                              {s.teacherRemarks || s.remarks || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Inline Return for Correction Panel */}
              {inlineCorrectionMode && (
                <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
                      Specify Correction Instructions for Teacher
                    </span>
                    <button
                      type="button"
                      onClick={() => setInlineCorrectionMode(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="e.g. Please verify learner admission #ADM-102 score and recalculate question 4..."
                    value={inlineReason}
                    onChange={(e) => setInlineReason(e.target.value)}
                    className="w-full bg-white border border-sky-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmCorrectionRequest(inspectData.submission.id, inlineReason)}
                      disabled={actionProcessing || !inlineReason.trim()}
                      className="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {actionProcessing && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Send Correction Request
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Action Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-sky-100">
                <button
                  type="button"
                  onClick={() => setInspectModalOpen(false)}
                  className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Close Inspection
                </button>

                {inspectData.submission?.status !== 'LOCKED' && (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {!inlineCorrectionMode && (
                      <button
                        type="button"
                        onClick={() => setInlineCorrectionMode(true)}
                        className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-sky-700 font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Request Correction
                      </button>
                    )}

                    {inspectData.submission?.status !== 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(inspectData.submission.id)}
                        disabled={actionProcessing}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionProcessing && actionSubmissionId === inspectData.submission.id && actionType === 'APPROVE' ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{actionProcessing && actionSubmissionId === inspectData.submission.id && actionType === 'APPROVE' ? 'Approving...' : 'Approve Marksheet'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleLock(inspectData.submission.id)}
                      disabled={actionProcessing}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionProcessing && actionSubmissionId === inspectData.submission.id && actionType === 'LOCK' ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{actionProcessing && actionSubmissionId === inspectData.submission.id && actionType === 'LOCK' ? 'Locking...' : 'Lock Permanently'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Standalone Request Correction Modal */}
      {rejectionModalSubmission && (
        <Modal
          isOpen={!!rejectionModalSubmission}
          onClose={() => setRejectionModalSubmission(null)}
          title={`Request Mark Correction: ${rejectionModalSubmission.class.name} - ${rejectionModalSubmission.subject.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Specify the reason for returning the marksheet to <strong className="text-slate-900">{rejectionModalSubmission.submittedBy.firstName} {rejectionModalSubmission.submittedBy.lastName}</strong> for correction.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correction Instructions / Reason *
              </label>
              <textarea
                required
                rows={4}
                placeholder="e.g. Please re-check student assessment numbers and recalculate paper 2 marks..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-white border border-sky-200 rounded-xl p-3 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setRejectionModalSubmission(null)}
                className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmCorrectionRequest(rejectionModalSubmission.submission.id, rejectionReason)}
                disabled={actionProcessing}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {actionProcessing && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Return for Correction
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};

