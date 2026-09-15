import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, CheckCircle, Printer, FileText, X, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { formatDate } from '../../lib/formatters';
import { Modal } from '../../components/Modal';

export const LeaveManagementView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [printSlipData, setPrintSlipData] = useState<{ request: any; teacher: any; settings: any } | null>(null);

  const [form, setForm] = useState({
    teacherId: '',
    leaveType: 'PERSONAL',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, stfRes] = await Promise.all([
        apiClient.get('/api/leave-requests'),
        apiClient.get('/api/staff'),
      ]);

      setRequests(reqRes.data.data || []);
      setTeachers(stfRes.data.data?.staff || []);
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
      toast.success('Teacher leave request logged & slip generated');
      setShowModal(false);
      setForm({ teacherId: '', leaveType: 'PERSONAL', startDate: '', endDate: '', reason: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to log leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPrintSlip = async (leaveId: string) => {
    try {
      const res = await apiClient.get(`/api/leave-requests/${leaveId}/print-slip`);
      setPrintSlipData(res.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load leave slip');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-xl border border-sky-100 rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <Clock className="w-4 h-4 text-sky-600" />
            Staff Absence & Leave Permissions
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Teacher Leave-Out Management</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Record staff permission requests, monitor leave statuses, and print official permission slips.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-glass transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Log Leave Request
        </button>
      </div>

      {/* Leave Requests Table */}
      <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-600" />
          Teacher Leave History ({requests.length} Records)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
              <tr>
                <th className="py-3.5 px-4">Teacher Name</th>
                <th className="py-3.5 px-4">Leave Type</th>
                <th className="py-3.5 px-4">Duration Range</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/60">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No teacher leave-outs recorded yet.
                  </td>
                </tr>
              ) : (
                requests.map((row) => (
                  <tr key={row.request.id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {row.teacher.firstName} {row.teacher.lastName}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-sky-700">
                      {row.request.leaveType}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-semibold font-mono">
                      {formatDate(row.request.startDate)} — {formatDate(row.request.endDate)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {row.request.reason}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                        row.request.status === 'APPROVED'
                          ? 'bg-sky-50 border border-sky-200 text-sky-700'
                          : row.request.status === 'REJECTED'
                          ? 'bg-slate-100 border border-slate-200 text-slate-600'
                          : 'bg-sky-100/70 border border-sky-200 text-sky-800'
                      }`}>
                        {row.request.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenPrintSlip(row.request.id)}
                        className="px-3 py-1 bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 font-bold text-xs rounded-xl flex items-center gap-1 mx-auto transition-colors shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-600" /> Leave Slip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Leave Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Log Teacher Leave-Out Permission">
        <form onSubmit={handleCreateLeave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Teacher *
            </label>
            <select
              required
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
            >
              <option value="">-- Select Staff Member --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Leave Category / Type *
            </label>
            <select
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
              className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
            >
              <option value="PERSONAL">Personal Leave</option>
              <option value="MEDICAL">Medical / Sick Leave</option>
              <option value="OFFICIAL">Official Duty Leave</option>
              <option value="OTHER">Other Absence</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Permission Notes *
            </label>
            <textarea
              required
              rows={3}
              placeholder="State reason for absence..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full bg-white border border-sky-100 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors"
            >
              {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Save & Generate Slip
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Leave Slip Modal */}
      {printSlipData && (
        <Modal isOpen={!!printSlipData} onClose={() => setPrintSlipData(null)} title="Official Teacher Leave Slip">
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={triggerPrint}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Leave Slip
              </button>
            </div>

            <div className="p-6 bg-white text-slate-900 rounded-2xl border border-sky-200 max-w-md mx-auto space-y-4 font-mono text-xs shadow-sm">
              <div className="text-center border-b border-slate-300 pb-3">
                <h2 className="font-extrabold text-sm uppercase">{printSlipData.settings.schoolName}</h2>
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mt-0.5">OFFICIAL STAFF PERMISSION SLIP</p>
              </div>

              <div className="space-y-1.5">
                <p><span className="font-bold">Staff Name:</span> {printSlipData.teacher.firstName} {printSlipData.teacher.lastName}</p>
                <p><span className="font-bold">Leave Type:</span> {printSlipData.request.leaveType}</p>
                <p><span className="font-bold">Start Date:</span> {formatDate(printSlipData.request.startDate)}</p>
                <p><span className="font-bold">End Date:</span> {formatDate(printSlipData.request.endDate)}</p>
                <p><span className="font-bold">Reason:</span> {printSlipData.request.reason}</p>
                <p><span className="font-bold">Status:</span> APPROVED</p>
              </div>

              <div className="pt-6 border-t border-slate-300 flex justify-between items-end text-[10px]">
                <div>
                  <div className="h-8 border-b border-slate-400 w-28" />
                  <p className="mt-1 font-bold">Deputy / Headteacher</p>
                </div>
                <div>
                  <p className="text-slate-500 font-sans">Issued: {formatDate(new Date())}</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};
