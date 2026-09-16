import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, CheckCircle, Printer, FileText, X, Eye, UserCheck, Calendar, FileCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { formatDate } from '../../lib/formatters';
import { Modal } from '../../components/Modal';
import { printElement } from '../../lib/printElement';

export const LeaveManagementView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [printSlipData, setPrintSlipData] = useState<{
    request: any;
    teacher: any;
    standingInTeacher: any;
    settings: any;
  } | null>(null);

  const [form, setForm] = useState({
    teacherId: '',
    leaveType: 'PERSONAL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    departureTime: '08:30 AM',
    duration: '2 Hours',
    standingInTeacherId: '',
    reason1: '',
    reason2: '',
    reason3: '',
    deputyReason: '',
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
    if (!form.reason1.trim()) {
      toast.error('Please provide at least the primary reason for leave (Reason 1)');
      return;
    }

    const reasons = [form.reason1.trim()];
    if (form.reason2.trim()) reasons.push(form.reason2.trim());
    if (form.reason3.trim()) reasons.push(form.reason3.trim());

    try {
      setSubmitting(true);
      await apiClient.post('/api/leave-requests', {
        teacherId: form.teacherId,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        departureTime: form.departureTime,
        duration: form.duration,
        standingInTeacherId: form.standingInTeacherId || undefined,
        reasons,
        reason: reasons.join('; '),
        deputyReason: form.deputyReason || 'Approved official leave request',
      });
      toast.success('Official Teacher Leave-Out Sheet logged & approved');
      setShowModal(false);
      setForm({
        teacherId: '',
        leaveType: 'PERSONAL',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        departureTime: '08:30 AM',
        duration: '2 Hours',
        standingInTeacherId: '',
        reason1: '',
        reason2: '',
        reason3: '',
        deputyReason: '',
      });
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
    printElement('leave-slip-printable', 'Leave Out Sheet');
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
      {/* Print Stylesheet injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .printable-sheet-container, .printable-sheet-container * {
            visibility: visible !important;
          }
          .printable-sheet-container {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            margin: 0 !important;
            padding: 24px !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            z-index: 99999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-xl border border-sky-100 rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <Clock className="w-4 h-4 text-sky-600" />
            Eldoret Muslim Academy Staff Absence & Permissions
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Teaching Staff Leave Out Sheets</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Log official duty and personal permission slips, assign standing-in teachers, and print standardized academy leave out sheets.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-glass transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Log Leave Out Slip
        </button>
      </div>

      {/* Leave Requests Table */}
      <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600" />
            Teacher Leave History ({requests.length} Records)
          </h3>
          <span className="text-xs text-slate-500 font-medium">Standardized Official Academy Format</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
              <tr>
                <th className="py-3.5 px-4">Teacher Name</th>
                <th className="py-3.5 px-4">Departure & Duration</th>
                <th className="py-3.5 px-4">Standing-In Teacher</th>
                <th className="py-3.5 px-4">Reasons</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Printable Slip</th>
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
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">
                        {formatDate(row.request.startDate)} at {row.request.departureTime || 'Morning'}
                      </div>
                      <span className="text-[11px] text-sky-700 font-mono">
                        {row.request.duration || 'Full Day'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {row.standingInTeacher ? (
                        <span className="inline-flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                          {row.standingInTeacher.firstName} {row.standingInTeacher.lastName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None assigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {row.request.reasons && row.request.reasons.length > 0
                        ? row.request.reasons.join('; ')
                        : row.request.reason || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                          row.request.status === 'APPROVED'
                            ? 'bg-sky-50 border border-sky-200 text-sky-700'
                            : row.request.status === 'REJECTED'
                            ? 'bg-slate-100 border border-slate-200 text-slate-600'
                            : 'bg-sky-100/70 border border-sky-200 text-sky-800'
                        }`}
                      >
                        {row.request.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenPrintSlip(row.request.id)}
                        className="px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 font-bold text-xs rounded-xl flex items-center gap-1 mx-auto transition-colors shadow-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-600" /> Leave Sheet
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
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Log Teaching Staff Leave Out Sheet"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateLeave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teacher Seeking Permission *
              </label>
              <select
                required
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              >
                <option value="">-- Select Teacher --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} ({t.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Standing-In Teacher in Absence
              </label>
              <select
                value={form.standingInTeacherId}
                onChange={(e) => setForm({ ...form, standingInTeacherId: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              >
                <option value="">-- Select Standing-In Teacher --</option>
                {teachers
                  .filter((t) => t.id !== form.teacherId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} ({t.email})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Departure Date *
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Departure Time *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 09:30 AM"
                value={form.departureTime}
                onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Duration (hours/days) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 2 hours, 1 day"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          {/* 3 Numbered Reasons matching physical slip */}
          <div className="p-3.5 bg-sky-50/50 border border-sky-100 rounded-2xl space-y-2.5">
            <span className="text-xs font-bold text-sky-900 block">
              Reasons for Seeking Permission (Numbered lines on Leave Out Sheet):
            </span>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">1. Primary Reason *</label>
              <input
                type="text"
                required
                placeholder="e.g. Official Ministry of Education cluster briefing..."
                value={form.reason1}
                onChange={(e) => setForm({ ...form, reason1: e.target.value })}
                className="w-full bg-white border border-sky-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">2. Second Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Follow up on student examination registration materials..."
                value={form.reason2}
                onChange={(e) => setForm({ ...form, reason2: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">3. Third Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Medical consultation..."
                value={form.reason3}
                onChange={(e) => setForm({ ...form, reason3: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deputy / Headteacher Approval Note
            </label>
            <input
              type="text"
              placeholder="e.g. Approved official duties out of school premises"
              value={form.deputyReason}
              onChange={(e) => setForm({ ...form, deputyReason: e.target.value })}
              className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Save & Generate Slip
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Official Leave Slip Modal */}
      {printSlipData && (
        <Modal
          isOpen={!!printSlipData}
          onClose={() => setPrintSlipData(null)}
          title="Official Teaching Staff Leave Out Sheet"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center no-print">
              <span className="text-xs text-slate-500">
                Official printed format matching Eldoret Muslim Academy official stationery.
              </span>
              <button
                onClick={triggerPrint}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Leave Out Sheet
              </button>
            </div>

            {/* Recreated Physical Leave Out Sheet */}
            <div id="leave-slip-printable" className="printable-sheet-container p-6 sm:p-8 bg-white text-slate-950 font-serif border border-slate-300 rounded-xl max-w-xl mx-auto space-y-4 shadow-sm select-text">
              {/* Header */}
              <div className="text-center font-bold pb-2 border-b border-slate-900">
                <h2 className="text-base sm:text-lg uppercase tracking-wide font-black">
                  {printSlipData.settings?.schoolName || 'ELDORET MUSLIM ACADEMY'}
                </h2>
                <p className="text-xs tracking-wider uppercase font-semibold">P.O BOX 5080-30100</p>
                <p className="text-xs tracking-wider uppercase font-semibold">ELDORET.</p>
                <h3 className="text-xs sm:text-sm underline font-bold mt-2 tracking-wide uppercase">
                  TEACHING STAFF LEAVE OUT SHEET
                </h3>
              </div>

              {/* Body Sentence 1 */}
              <div className="text-xs sm:text-sm leading-relaxed pt-1">
                <span>I MR/MRS/MISS </span>
                <span className="font-bold underline px-1">
                  {printSlipData.teacher.firstName} {printSlipData.teacher.lastName}
                </span>
                <span> Wish to apply for permission off my duties and responsibility.</span>
              </div>

              {/* Body Sentence 2 */}
              <div className="text-xs sm:text-sm leading-relaxed">
                <span>Date </span>
                <span className="font-bold underline px-1">
                  {formatDate(printSlipData.request.startDate)}
                </span>
                <span> at </span>
                <span className="font-bold underline px-1">
                  {printSlipData.request.departureTime || '08:30 AM'}
                </span>
                <span> I shall be away for </span>
                <span className="font-bold underline px-1">
                  {printSlipData.request.duration || '2 hours'}
                </span>
                <span> (hours/days). Reasons for seeking permission ;</span>
              </div>

              {/* 3 Numbered Reasons */}
              <div className="text-xs sm:text-sm space-y-1 pl-1">
                <div>
                  1.{' '}
                  <span className="font-medium underline pl-1">
                    {printSlipData.request.reasons?.[0] || '—'}
                  </span>
                </div>
                <div>
                  2.{' '}
                  <span className="font-medium underline pl-1">
                    {printSlipData.request.reasons?.[1] || '____________________________________________________________________'}
                  </span>
                </div>
                <div>
                  3.{' '}
                  <span className="font-medium underline pl-1">
                    {printSlipData.request.reasons?.[2] || '____________________________________________________________________'}
                  </span>
                </div>
              </div>

              {/* Body Sentence 3 */}
              <div className="text-xs sm:text-sm leading-relaxed pt-1">
                <span>In my absence MR/MRS/MISS </span>
                <span className="font-bold underline px-1">
                  {printSlipData.standingInTeacher
                    ? `${printSlipData.standingInTeacher.firstName} ${printSlipData.standingInTeacher.lastName}`
                    : '__________________________________'}
                </span>
                <span> will be standing in my position.</span>
              </div>

              {/* Two Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-4 text-xs">
                <div>
                  <div className="border-b border-black h-8 mb-1" />
                  <p className="font-medium text-[10px] sm:text-[11px]">Teacher seeking permission signature</p>
                </div>
                <div>
                  <div className="border-b border-black h-8 mb-1" />
                  <p className="font-medium text-[10px] sm:text-[11px]">Teacher requested to stand in signature</p>
                </div>
              </div>

              {/* Deputy / Head Teacher's Section */}
              <div className="border-t border-black pt-3 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="uppercase">DEPUTY/HEAD TEACHER'S</span>
                  <span>({printSlipData.request.status === 'APPROVED' ? 'Approved' : 'Not approved'})</span>
                </div>
                <div>
                  <span>Reason(s): </span>
                  <span className="underline">
                    {printSlipData.request.deputyReason || 'Approved official leave permission.'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 text-[11px]">
                  <div>
                    HEAD TEACHER'S SIGNATURE:{' '}
                    <span className="border-b border-black inline-block w-24 sm:w-28">&nbsp;</span>
                  </div>
                  <div>
                    DATE:{' '}
                    <span className="underline font-mono">
                      {formatDate(printSlipData.request.createdAt || new Date())}
                    </span>
                  </div>
                </div>
              </div>

              {/* Headteacher / Director Section & Official Stamp */}
              <div className="border-t border-black pt-3 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="uppercase">HEADTEACHER</span>
                  <span>(Approved/Not approved)</span>
                </div>
                <div>
                  <span>Reason(s): </span>
                  <span className="underline">
                    {printSlipData.request.headTeacherReason || '________________________________________________________'}
                  </span>
                </div>
                <div className="flex items-end justify-between pt-2">
                  <div className="space-y-2 text-[11px]">
                    <div>
                      DIRECTOR'S SIGNATURE:{' '}
                      <span className="border-b border-black inline-block w-24 sm:w-28">&nbsp;</span>
                    </div>
                    <div>
                      DATE:{' '}
                      <span className="border-b border-black inline-block w-24 sm:w-28">&nbsp;</span>
                    </div>
                  </div>

                  {/* Circular School Stamp */}
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-sky-800 flex flex-col items-center justify-center text-center p-1 text-[8px] font-bold text-sky-900 tracking-tighter uppercase leading-tight select-none shrink-0">
                    <span>ELDORET MUSLIM</span>
                    <span>ACADEMY</span>
                    <span className="my-0.5 text-[7px] text-sky-600">★ STAMP ★</span>
                    <span>P.O BOX 5080</span>
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

