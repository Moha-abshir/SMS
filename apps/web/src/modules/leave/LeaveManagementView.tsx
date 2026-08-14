import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, Printer, Eye, CheckCircle, XCircle, School } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';

export const LeaveManagementView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [printModalData, setPrintModalData] = useState<any | null>(null);

  const [form, setForm] = useState({
    teacherId: '',
    leaveType: 'PERSONAL',
    startDate: '',
    endDate: '',
    reason: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, staffRes] = await Promise.all([
        apiClient.get('/api/leave-requests'),
        apiClient.get('/api/staff'),
      ]);

      setRequests(reqRes.data.data || []);
      setTeachers(staffRes.data.data?.staff || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teacherId) {
      toast.error('Please select a teacher');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/api/leave-requests', form);
      toast.success('Teacher leave-out recorded and approved');
      setShowCreateModal(false);
      setForm({ teacherId: '', leaveType: 'PERSONAL', startDate: '', endDate: '', reason: '', notes: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to record leave-out');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPrintSlip = async (id: string) => {
    try {
      const res = await apiClient.get(`/api/leave-requests/${id}/print`);
      setPrintModalData(res.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to prepare print slip');
    }
  };

  const triggerPrint = () => {
    window.print();
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
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Teacher Leave-Out Management</h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Record staff leave requests, approve leave-outs, and print official leave permission slips.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-white text-blue-600 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Record Teacher Leave-Out
        </button>
      </div>

      {/* Leave Requests Table */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          Teacher Leave History ({requests.length} Records)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Teacher Name</th>
                <th className="py-3.5 px-4">Leave Type</th>
                <th className="py-3.5 px-4">Duration Range</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No teacher leave-outs recorded yet.
                  </td>
                </tr>
              ) : (
                requests.map((row) => (
                  <tr key={row.request.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {row.teacher.firstName} {row.teacher.lastName}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">
                      {row.request.leaveType}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-semibold">
                      {new Date(row.request.startDate).toLocaleDateString()} — {new Date(row.request.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {row.request.reason}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                        row.request.status === 'APPROVED'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                          : row.request.status === 'REJECTED'
                          ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                      }`}>
                        {row.request.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenPrintSlip(row.request.id)}
                        className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-lg hover:bg-blue-100 flex items-center gap-1 mx-auto transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Leave Slip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Leave Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Record Teacher Leave-Out">
        <form onSubmit={handleCreateLeave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Staff / Teacher *
            </label>
            <select
              required
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="">-- Select Teacher --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Leave Category *
              </label>
              <select
                value={form.leaveType}
                onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="PERSONAL">Personal Leave</option>
                <option value="MEDICAL">Medical Sick Leave</option>
                <option value="OFFICIAL">Official Duty Outside</option>
                <option value="OTHER">Other Reason</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reason / Explanation *
            </label>
            <textarea
              required
              rows={3}
              placeholder="State the official reason for the leave-out..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
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
              Approve Leave-Out
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Leave Slip Modal */}
      {printModalData && (
        <Modal isOpen={!!printModalData} onClose={() => setPrintModalData(null)} title="Official Leave Slip Preview">
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={triggerPrint}
                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Leave Slip
              </button>
            </div>

            {/* Printable Leave Slip Canvas */}
            <div className="p-8 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-lg max-w-xl mx-auto space-y-6 print:shadow-none print:border-0 print:p-0">
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <School className="w-6 h-6 text-blue-700" />
                  <h1 className="text-lg font-extrabold uppercase text-slate-900">
                    {printModalData.settings.schoolName || 'ELDORET MUSLIM ACADEMY'}
                  </h1>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">OFFICIAL TEACHER LEAVE-OUT PERMISSION SLIP</p>
              </div>

              <div className="space-y-3 text-xs text-slate-800">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="font-bold text-slate-600">Staff Member:</span>
                  <span className="font-bold text-slate-900">{printModalData.teacher.firstName} {printModalData.teacher.lastName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="font-bold text-slate-600">Leave Category:</span>
                  <span className="font-bold text-blue-700">{printModalData.leave.leaveType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="font-bold text-slate-600">Start Date:</span>
                  <span className="font-bold">{new Date(printModalData.leave.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="font-bold text-slate-600">End Date:</span>
                  <span className="font-bold">{new Date(printModalData.leave.endDate).toLocaleDateString()}</span>
                </div>
                <div className="py-1">
                  <span className="font-bold text-slate-600 block mb-1">Stated Reason:</span>
                  <p className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed">
                    {printModalData.leave.reason}
                  </p>
                </div>
              </div>

              <div className="pt-8 text-xs text-slate-900 space-y-8">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-bold">Approved By:</p>
                    <div className="h-10 border-b border-dashed border-slate-400 w-40 mt-1" />
                    <p className="text-[11px] text-slate-600 mt-1">Deputy Headteacher Signature</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">Official Stamp / Date:</p>
                    <p className="text-[11px] text-slate-600 mt-6">{new Date().toLocaleDateString()}</p>
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
