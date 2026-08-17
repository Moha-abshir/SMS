import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, CheckCircle2, RotateCcw, Lock, AlertCircle, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';

export const MarkReviewView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [rejectionModalSubmission, setRejectionModalSubmission] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);

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

  const handleApprove = async (id: string) => {
    try {
      setActionProcessing(true);
      await apiClient.put(`/api/mark-submissions/${id}/approve`);
      toast.success('Marksheet approved successfully');
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve marksheet');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleConfirmCorrectionRequest = async () => {
    if (!rejectionModalSubmission || !rejectionReason.trim()) {
      toast.error('Please specify a reason for requesting correction');
      return;
    }

    try {
      setActionProcessing(true);
      await apiClient.put(`/api/mark-submissions/${rejectionModalSubmission.submission.id}/request-correction`, {
        reason: rejectionReason,
      });
      toast.success('Correction request sent back to subject teacher');
      setRejectionModalSubmission(null);
      setRejectionReason('');
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to request correction');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleLock = async (id: string) => {
    if (!confirm('Are you sure you want to permanently lock this marksheet? No further edits will be permitted.')) return;
    try {
      setActionProcessing(true);
      await apiClient.put(`/api/mark-submissions/${id}/lock`);
      toast.success('Marksheet permanently locked');
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to lock marksheet');
    } finally {
      setActionProcessing(false);
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
            <ClipboardCheck className="w-4 h-4" />
            Marksheet Review & Approval Workflow
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Exam Mark Review & Approval State Machine</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium max-w-xl">
            Review submitted teacher marksheets, approve, request corrections, or lock final grades.
          </p>
        </div>

        <div className="flex items-center gap-4 px-5 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md shrink-0">
          <div className="text-center">
            <span className="block text-xl font-bold text-blue-400 leading-none">{submissions.length}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mt-1 block">Submissions</span>
          </div>
          <div className="w-[1px] h-8 bg-slate-800" />
          <div className="text-center">
            <span className="block text-xl font-bold text-amber-400 leading-none">{submissions.filter(s => s.status === 'SUBMITTED').length} Pending</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mt-1 block">Review Queue</span>
          </div>
        </div>
      </div>

      {/* Submissions Review Workspace */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-blue-600" />
          Marksheet Submissions Queue ({submissions.length} Marksheets)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Submitted By</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">State Machine Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    No submitted marksheets currently in review queue.
                  </td>
                </tr>
              ) : (
                submissions.map((row) => (
                  <tr key={row.submission.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {row.class.name}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-indigo-600 dark:text-indigo-400">
                      {row.subject.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                      {row.submittedBy.firstName} {row.submittedBy.lastName}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                        row.submission.status === 'APPROVED'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                          : row.submission.status === 'CORRECTION_REQUESTED'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                          : row.submission.status === 'LOCKED'
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                      }`}>
                        {row.submission.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {row.submission.status !== 'LOCKED' && (
                          <>
                            {row.submission.status !== 'APPROVED' && (
                              <button
                                onClick={() => handleApprove(row.submission.id)}
                                disabled={actionProcessing}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1 transition-all"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </button>
                            )}

                            <button
                              onClick={() => setRejectionModalSubmission(row)}
                              disabled={actionProcessing}
                              className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-400 font-bold text-xs rounded-lg flex items-center gap-1 transition-all"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Request Correction
                            </button>

                            <button
                              onClick={() => handleLock(row.submission.id)}
                              disabled={actionProcessing}
                              className="px-2.5 py-1 bg-slate-900 text-white dark:bg-slate-800 font-bold text-xs rounded-lg hover:bg-slate-800 flex items-center gap-1 transition-all"
                            >
                              <Lock className="w-3.5 h-3.5" /> Lock Marks
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

      {/* Request Correction Modal */}
      {rejectionModalSubmission && (
        <Modal
          isOpen={!!rejectionModalSubmission}
          onClose={() => setRejectionModalSubmission(null)}
          title={`Request Mark Correction: ${rejectionModalSubmission.class.name} - ${rejectionModalSubmission.subject.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Specify the reason for returning the marksheet to <strong className="text-slate-900 dark:text-white">{rejectionModalSubmission.submittedBy.firstName} {rejectionModalSubmission.submittedBy.lastName}</strong> for correction.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Correction Instructions / Reason *
              </label>
              <textarea
                required
                rows={4}
                placeholder="e.g. Please re-check student assessment numbers and recalculate paper 2 marks..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectionModalSubmission(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCorrectionRequest}
                disabled={actionProcessing}
                className="px-4 py-2 bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
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
