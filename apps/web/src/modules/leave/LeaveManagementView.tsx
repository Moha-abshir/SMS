import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, CheckCircle, Printer, FileText, X, Eye, UserCheck, Calendar, FileCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { formatDate } from '../../lib/formatters';
import { Modal } from '../../components/Modal';
import { SearchableSelect } from '../../components/SearchableSelect';
import { printElement } from '../../lib/printElement';

export const LeaveManagementView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [markingReturnId, setMarkingReturnId] = useState<string | null>(null);
  const [printSlipData, setPrintSlipData] = useState<{
    request: any;
    teacher: any;
    standingInTeacher: any;
    settings: any;
  } | null>(null);

  const getCurrentTimeString = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const [form, setForm] = useState({
    teacherId: '',
    leaveType: 'PERSONAL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    departureTime: '',
    durationValue: 2,
    durationUnit: 'Hours' as 'Hours' | 'Days',
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
      const [reqRes, formDataRes, stfRes, allocRes] = await Promise.all([
        apiClient.get('/api/leave-requests').catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/leave-requests/form-data').catch(() => ({ data: { data: null } })),
        apiClient.get('/api/staff').catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/allocations').catch(() => ({ data: { data: { classes: [], teachers: [] } } })),
      ]);

      setRequests(reqRes.data?.data || []);

      // Build unified, deduplicated teacher list
      const teacherMap = new Map<string, any>();

      // 1. Direct from /api/leave-requests/form-data (custom tailor-made endpoint)
      if (formDataRes.data?.data?.teachers && Array.isArray(formDataRes.data.data.teachers)) {
        formDataRes.data.data.teachers.forEach((t: any) => {
          teacherMap.set(t.id, {
            id: t.id,
            firstName: t.firstName,
            lastName: t.lastName,
            email: t.email,
            phoneNumber: t.phoneNumber,
            roleName: t.roleName,
          });
        });
      }

      // 2. From /api/staff (handle both array and { staff: [] } structures)
      const rawStaff = Array.isArray(stfRes.data?.data)
        ? stfRes.data.data
        : (stfRes.data?.data?.staff || []);

      rawStaff.forEach((s: any) => {
        if (!s.isInvitation && s.isActive !== false) {
          if (!teacherMap.has(s.id)) {
            teacherMap.set(s.id, {
              id: s.id,
              firstName: s.firstName,
              lastName: s.lastName,
              email: s.email,
              phoneNumber: s.phoneNumber,
              roleName: s.roleName,
            });
          } else {
            const existing = teacherMap.get(s.id);
            teacherMap.set(s.id, {
              ...existing,
              phoneNumber: existing.phoneNumber || s.phoneNumber,
              roleName: existing.roleName || s.roleName,
            });
          }
        }
      });

      // 3. From /api/allocations
      const allocTeachers = allocRes.data?.data?.teachers || [];
      allocTeachers.forEach((t: any) => {
        if (!teacherMap.has(t.id)) {
          teacherMap.set(t.id, {
            id: t.id,
            firstName: t.firstName,
            lastName: t.lastName,
            email: t.email,
            phoneNumber: t.phoneNumber,
            roleName: 'TEACHER',
          });
        }
      });

      const resolvedTeachers = Array.from(teacherMap.values()).sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      );
      setTeachers(resolvedTeachers);

      // Classes: prioritize form-data classes, then allocations classes
      const rawClasses = (formDataRes.data?.data?.classes && formDataRes.data.data.classes.length > 0)
        ? formDataRes.data.data.classes
        : (allocRes.data?.data?.classes || []);
      setClasses(rawClasses);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!printSlipData) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        triggerPrint();
      }
      if (e.key === 'Escape') {
        setPrintSlipData(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [printSlipData]);

  // Map of teacherId -> class object for quick class teacher detection
  const classTeacherMap = new Map<string, any>();
  classes.forEach((cItem: any) => {
    const teacherId = cItem.classTeacherId || cItem.classTeacher?.id || cItem.class?.classTeacherId;
    const clsObj = cItem.class || cItem;
    if (teacherId && clsObj && clsObj.name) {
      classTeacherMap.set(teacherId, clsObj);
    }
  });

  const selectedTeacherClass = form.teacherId ? classTeacherMap.get(form.teacherId) : null;

  const handleOpenModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setForm({
      teacherId: '',
      leaveType: 'PERSONAL',
      startDate: todayStr,
      endDate: todayStr,
      departureTime: getCurrentTimeString(),
      durationValue: 2,
      durationUnit: 'Hours',
      standingInTeacherId: '',
      reason1: '',
      reason2: '',
      reason3: '',
      deputyReason: '',
    });
    setShowModal(true);
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teacherId) {
      toast.error('Please select a teacher');
      return;
    }
    if (selectedTeacherClass && !form.standingInTeacherId) {
      toast.error(`Please select a substitute class teacher to take over ${selectedTeacherClass.name}`);
      return;
    }
    if (!form.reason1.trim()) {
      toast.error('Please provide at least the primary reason for leave (Reason 1)');
      return;
    }

    const reasons = [form.reason1.trim()];
    if (form.reason2.trim()) reasons.push(form.reason2.trim());
    if (form.reason3.trim()) reasons.push(form.reason3.trim());

    const unitLabel = form.durationValue === 1
      ? (form.durationUnit === 'Hours' ? 'Hour' : 'Day')
      : form.durationUnit;
    const durationStr = `${form.durationValue} ${unitLabel}`;

    try {
      setSubmitting(true);
      await apiClient.post('/api/leave-requests', {
        teacherId: form.teacherId,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        departureTime: form.departureTime || getCurrentTimeString(),
        duration: durationStr,
        standingInTeacherId: selectedTeacherClass ? form.standingInTeacherId : undefined,
        reasons,
        reason: reasons.join('; '),
        deputyReason: form.deputyReason || 'Approved official leave request',
      });
      toast.success('Official Teacher Leave-Out Sheet logged & approved');
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to log leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReportedBack = async (leaveId: string) => {
    try {
      setMarkingReturnId(leaveId);
      await apiClient.put(`/api/leave-requests/${leaveId}/report-back`);
      toast.success('Teacher marked as reported back. Class teacher roles restored.');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to record return');
    } finally {
      setMarkingReturnId(null);
    }
  };

  const handleOpenPrintSlip = async (leaveId: string) => {
    try {
      const res = await apiClient.get(`/api/leave-requests/${leaveId}/print-slip`);
      const data = res.data?.data;
      if (!data) throw new Error('No data received');
      const reqObj = data.request || data.leave || {};
      setPrintSlipData({
        ...data,
        request: {
          ...reqObj,
          departureTime: data.departureTime || reqObj.departureTime || '08:30 AM',
          duration: data.duration || reqObj.duration || '2 Hours',
          reasons: data.reasons || reqObj.reasons || [],
          deputyReason: data.deputyReason || reqObj.deputyReason || 'Approved official leave permission.',
        },
      });
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
          #leave-slip-printable,
          #leave-slip-printable * {
            visibility: visible !important;
          }
          #leave-slip-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 20mm 15mm 20mm 15mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11.5pt !important;
            line-height: 1.6 !important;
            box-sizing: border-box !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white/85 dark:bg-[#0c1830] backdrop-blur-xl border border-sky-100 dark:border-[#1a335a] rounded-2xl sm:rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            Staff Absence & Permissions
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Teaching Staff Leave Out Sheets</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-xl">
            Log official duty and personal permission slips, assign standing-in teachers, and print standardized academy leave out sheets.
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="w-full sm:w-auto justify-center min-h-[40px] px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Log Leave Out Slip
        </button>
      </div>

      {/* Leave Requests Table */}
      <div className="p-5 sm:p-6 bg-white/85 dark:bg-[#0c1830] backdrop-blur-md border border-sky-100 dark:border-[#1a335a] rounded-2xl sm:rounded-3xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-sky-500" />
            Teacher Leave History ({requests.length} {requests.length === 1 ? 'Record' : 'Records'})
          </h3>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Standardized Academy Format</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50/70 dark:bg-[#081224] text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200/60 dark:border-[#1a335a]">
              <tr>
                <th className="py-3 px-4">Teacher</th>
                <th className="py-3 px-4">Schedule & Duration</th>
                <th className="py-3 px-4">Substitute Teacher</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#152a4a]">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 dark:text-slate-500 italic">
                    No teacher leave-outs recorded yet.
                  </td>
                </tr>
              ) : (
                requests.map((row) => (
                  <tr key={row.request.id} className="hover:bg-slate-50/50 dark:hover:bg-[#0f2042]/50 transition-colors">
                    {/* Teacher Column */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
                        {row.teacher.firstName} {row.teacher.lastName}
                      </div>
                      {row.classTeacherOf ? (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900/40">
                            Class Teacher · {row.classTeacherOf.name}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {row.teacher.email || 'Teaching Staff'}
                        </div>
                      )}
                    </td>

                    {/* Schedule & Duration Column */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="font-medium text-slate-700 dark:text-slate-200 text-xs">
                        {formatDate(row.request.startDate)} · {row.departureTime || 'Morning'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                        Duration: <span className="font-medium text-slate-600 dark:text-slate-300">{row.duration || 'Full Day'}</span>
                      </div>
                    </td>

                    {/* Substitute Teacher Column */}
                    <td className="py-3.5 px-4 align-middle">
                      {row.standingInTeacher ? (
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span>{row.standingInTeacher.firstName} {row.standingInTeacher.lastName}</span>
                          </div>
                          {row.classTeacherOf && !row.isReturned && (
                            <div className="text-[10px] text-amber-600/90 dark:text-amber-400/90 font-medium mt-0.5">
                              Acting Class Teacher for {row.classTeacherOf.name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">None required (Subject Specialist)</span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="py-3.5 px-4 align-middle text-center">
                      {row.isReturned ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Reported Back
                          </span>
                          {row.returnedAt && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                              {formatDate(row.returnedAt)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Away (Active)
                        </span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="py-3.5 px-4 align-middle text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        {!row.isReturned && (
                          <button
                            onClick={() => handleMarkReportedBack(row.request.id)}
                            disabled={markingReturnId === row.request.id}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-emerald-600/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                            title="Confirm teacher has reported back"
                          >
                            {markingReturnId === row.request.id ? (
                              <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            )}
                            <span>Mark Returned</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenPrintSlip(row.request.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700/80 bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          title="View & print official leave out sheet"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Leave Sheet</span>
                        </button>
                      </div>
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
          <div className={selectedTeacherClass ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4"}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Teacher Seeking Permission *
              </label>
              <SearchableSelect
                required
                value={form.teacherId}
                onChange={(val) => {
                  const isCt = classTeacherMap.has(val);
                  setForm({
                    ...form,
                    teacherId: val,
                    standingInTeacherId: isCt ? form.standingInTeacherId : '',
                  });
                }}
                placeholder="-- Select Teacher --"
                searchPlaceholder="Search teacher by name or phone..."
                options={teachers.map((t) => {
                  const ct = classTeacherMap.get(t.id);
                  return {
                    value: t.id,
                    label: `${t.firstName} ${t.lastName}`,
                    badge: ct
                      ? `Class Teacher (${ct.name})`
                      : (t.roleName ? t.roleName.replace(/_/g, ' ') : 'Teacher'),
                    sublabel: t.phoneNumber ? `Phone: ${t.phoneNumber}` : (t.email || undefined),
                  };
                })}
              />
              {selectedTeacherClass && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-[#1f1906] border border-amber-200 dark:border-[#63490b] text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <span className="font-bold">Assigned Class Teacher: </span>
                    <span>This teacher is the class teacher for <strong>{selectedTeacherClass.name}</strong>. A Substitute Class Teacher is required to temporarily hold all class teacher responsibilities until return.</span>
                  </div>
                </div>
              )}
            </div>

            {selectedTeacherClass && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Substitute / Standing-In Class Teacher *
                </label>
                <SearchableSelect
                  required
                  value={form.standingInTeacherId}
                  onChange={(val) => setForm({ ...form, standingInTeacherId: val })}
                  placeholder="-- Select Substitute Class Teacher --"
                  searchPlaceholder="Search substitute teacher by name or phone..."
                  options={teachers
                    .filter((t) => t.id !== form.teacherId)
                    .map((t) => {
                      const ct = classTeacherMap.get(t.id);
                      return {
                        value: t.id,
                        label: `${t.firstName} ${t.lastName}`,
                        badge: ct
                          ? `Class Teacher (${ct.name})`
                          : (t.roleName ? t.roleName.replace(/_/g, ' ') : 'Available'),
                        sublabel: t.phoneNumber ? `Phone: ${t.phoneNumber}` : (t.email || undefined),
                      };
                    })}
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  This teacher will temporarily assume all class teacher duties (marking daily attendance registers, learner rosters, and report card reviews) for <strong>{selectedTeacherClass.name}</strong> until the permanent class teacher reports back.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Departure Date *
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: e.target.value })}
                className="w-full bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Departure Time *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 08:30 AM"
                value={form.departureTime}
                onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                className="w-full bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  required
                  placeholder="Qty"
                  value={form.durationValue}
                  onChange={(e) => setForm({ ...form, durationValue: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-20 bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
                />
                <div className="flex-1">
                  <SearchableSelect
                    value={form.durationUnit}
                    onChange={(val) => setForm({ ...form, durationUnit: val as 'Hours' | 'Days' })}
                    placeholder="Unit"
                    searchPlaceholder="Search unit..."
                    options={[
                      { value: 'Hours', label: form.durationValue === 1 ? 'Hour' : 'Hours' },
                      { value: 'Days', label: form.durationValue === 1 ? 'Day' : 'Days' },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3 Numbered Reasons matching physical slip */}
          <div className="p-3.5 bg-sky-50/50 dark:bg-[#0c1830]/60 border border-sky-100 dark:border-[#162b4d] rounded-2xl space-y-2.5">
            <span className="text-xs font-bold text-sky-900 dark:text-sky-300 block">
              Reasons for Seeking Permission (Numbered lines on Leave Out Sheet):
            </span>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">1. Primary Reason *</label>
              <input
                type="text"
                required
                placeholder="e.g. Official Ministry of Education cluster briefing..."
                value={form.reason1}
                onChange={(e) => setForm({ ...form, reason1: e.target.value })}
                className="w-full bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#1a335a] rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">2. Second Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Follow up on student examination registration materials..."
                value={form.reason2}
                onChange={(e) => setForm({ ...form, reason2: e.target.value })}
                className="w-full bg-white dark:bg-[#091326] border border-sky-100 dark:border-[#1a335a] rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">3. Third Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Medical consultation..."
                value={form.reason3}
                onChange={(e) => setForm({ ...form, reason3: e.target.value })}
                className="w-full bg-white dark:bg-[#091326] border border-sky-100 dark:border-[#1a335a] rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deputy / Headteacher Approval Note
            </label>
            <input
              type="text"
              placeholder="e.g. Approved official duties out of school premises"
              value={form.deputyReason}
              onChange={(e) => setForm({ ...form, deputyReason: e.target.value })}
              className="w-full bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sky-100 dark:border-[#162b4d]">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-white dark:bg-[#0d1c38] border border-sky-200 dark:border-[#1d3863] hover:bg-sky-50 dark:hover:bg-[#13274c] text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Save & Generate Slip
            </button>
          </div>
        </form>
      </Modal>

      {/* Official Leave Slip Preview Modal (Employment Contract Style) */}
      {printSlipData && (
        <div
          id="leave-slip-modal-root"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex"
        >
          {/* Left Sidebar — Summary Details (hidden on print) */}
          <div className="no-print hidden lg:flex flex-col w-72 sm:w-80 bg-white dark:bg-[#0c1830] border-r border-slate-200 dark:border-[#1a335a] shrink-0">
            {/* Sidebar header */}
            <div className="p-5 border-b border-slate-100 dark:border-[#1a335a]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900/40 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">Leave Slip Preview</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{printSlipData.settings?.schoolName || 'Eldoret Muslim Academy'}</p>
                </div>
              </div>
            </div>

            {/* Metadata list */}
            <div className="p-5 space-y-4 flex-1 overflow-y-auto text-xs">
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Teacher Seeking Leave
                </span>
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {printSlipData.teacher.firstName} {printSlipData.teacher.lastName}
                </p>
                {printSlipData.classTeacherOf ? (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900/40">
                    Class Teacher · {printSlipData.classTeacherOf.name}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Subject Specialist Teacher
                  </span>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Schedule & Duration
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDate(printSlipData.request.startDate)}
                </p>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                  Departure Time: <span className="font-medium text-slate-800 dark:text-slate-200">{printSlipData.request.departureTime || '08:30 AM'}</span>
                </p>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                  Duration: <span className="font-medium text-slate-800 dark:text-slate-200">{printSlipData.request.duration || '2 Hours'}</span>
                </p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Substitute Coverage
                </span>
                {Boolean(printSlipData.classTeacherOf || printSlipData.standingInTeacher) ? (
                  printSlipData.standingInTeacher ? (
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        {printSlipData.standingInTeacher.firstName} {printSlipData.standingInTeacher.lastName}
                      </p>
                      {printSlipData.classTeacherOf && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                          Acting Class Teacher for {printSlipData.classTeacherOf.name}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 text-[11px]">Pending assignment</span>
                  )
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Not required (Subject teacher with distinct timetable).
                  </p>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Approval & Return Status
                </span>
                {printSlipData.isReturned ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Reported Back
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Away (Active Permission)
                  </span>
                )}
              </div>

              
            </div>
          </div>

          {/* Right Main Area — Document Canvas */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top action bar (hidden on print) */}
            <div className="no-print flex items-center justify-between px-4 sm:px-6 py-3 bg-white dark:bg-[#0c1830] border-b border-slate-200 dark:border-[#1a335a] shrink-0 gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                  {printSlipData.teacher.firstName} {printSlipData.teacher.lastName}
                </p>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {printSlipData.classTeacherOf ? `Class Teacher (${printSlipData.classTeacherOf.name})` : 'Teaching Staff'} • Official Leave Out Sheet
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={triggerPrint}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Leave Out Sheet</span>
                </button>
                <button
                  onClick={() => setPrintSlipData(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Document Area with Muted Backdrop */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 md:p-12 bg-slate-100 dark:bg-[#060c18]">
              {/* Pure White A4 Physical Document (Never dark/inverted) */}
              <div
                id="leave-slip-printable"
                className="mx-auto w-full max-w-[760px] shadow-2xl shadow-black/40 border border-slate-300 p-8 sm:p-14 select-text"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  fontFamily: "'Times New Roman', Times, serif",
                  boxSizing: 'border-box',
                }}
              >
                {/* 1. Official Centered Header */}
                <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '28px', color: '#000000' }}>
                  <div style={{ textDecoration: 'underline', fontSize: '15pt', letterSpacing: '0.5px' }}>
                    ELDORET MUSLIM ACADEMY
                  </div>
                  <div style={{ textDecoration: 'underline', fontSize: '12pt', marginTop: '4px' }}>
                    P.O BOX 5080-30100
                  </div>
                  <div style={{ fontSize: '12pt', marginTop: '2px' }}>
                    ELDORET.
                  </div>
                  <div style={{ textDecoration: 'underline', fontSize: '13pt', marginTop: '18px', letterSpacing: '0.5px' }}>
                    TEACHING STAFF LEAVE OUT SHEET
                  </div>
                </div>

                {/* 2. First sentence */}
                <div style={{ fontSize: '12pt', lineHeight: '2.2', marginTop: '14px', color: '#000000' }}>
                  <span>I &nbsp;MR/MRS/MISS</span>
                  <span
                    style={{
                      borderBottom: '1.5px dotted #000',
                      padding: '0 12px',
                      fontWeight: 600,
                      minWidth: '280px',
                      display: 'inline-block',
                      textAlign: 'center',
                    }}
                  >
                    {printSlipData.teacher.firstName} {printSlipData.teacher.lastName}
                  </span>
                  <span>Wish to apply for permission off my duties and responsibility.</span>
                </div>

                {/* 3. Second sentence (Date, Departure Time, Duration) */}
                <div style={{ fontSize: '12pt', lineHeight: '2.2', marginTop: '10px', color: '#000000' }}>
                  <span>Date</span>
                  <span
                    style={{
                      borderBottom: '1.5px dotted #000',
                      padding: '0 10px',
                      fontWeight: 600,
                      minWidth: '140px',
                      display: 'inline-block',
                      textAlign: 'center',
                    }}
                  >
                    {formatDate(printSlipData.request.startDate)}
                  </span>
                  <span>at</span>
                  <span
                    style={{
                      borderBottom: '1.5px dotted #000',
                      padding: '0 10px',
                      fontWeight: 600,
                      minWidth: '110px',
                      display: 'inline-block',
                      textAlign: 'center',
                    }}
                  >
                    {printSlipData.request.departureTime || '08:30 AM'}
                  </span>
                  <span>I shall be away for</span>
                  <span
                    style={{
                      borderBottom: '1.5px dotted #000',
                      padding: '0 10px',
                      fontWeight: 600,
                      minWidth: '110px',
                      display: 'inline-block',
                      textAlign: 'center',
                    }}
                  >
                    {printSlipData.request.duration || '2 Hours'}
                  </span>
                  <span>(hours/days).Reasons for seeking permission ;</span>
                </div>

                {/* 4. Three Numbered Reasons with Dotted Lines */}
                <div style={{ fontSize: '12pt', lineHeight: '2.4', marginTop: '12px', marginBottom: '16px', color: '#000000' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 'bold', width: '28px' }}>1.</span>
                    <span style={{ borderBottom: '1.5px dotted #000', flex: 1, padding: '0 8px', fontWeight: 500 }}>
                      {printSlipData.request.reasons?.[0] || ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '4px' }}>
                    <span style={{ fontWeight: 'bold', width: '28px' }}>2.</span>
                    <span style={{ borderBottom: '1.5px dotted #000', flex: 1, padding: '0 8px', fontWeight: 500 }}>
                      {printSlipData.request.reasons?.[1] || ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '4px' }}>
                    <span style={{ fontWeight: 'bold', width: '28px' }}>3.</span>
                    <span style={{ borderBottom: '1.5px dotted #000', flex: 1, padding: '0 8px', fontWeight: 500 }}>
                      {printSlipData.request.reasons?.[2] || ''}
                    </span>
                  </div>
                </div>

                {/* 5. Stand-in Teacher Section (ONLY for Class Teachers) */}
                {Boolean(printSlipData.classTeacherOf || printSlipData.standingInTeacher) && (
                  <div style={{ fontSize: '12pt', lineHeight: '2.2', marginTop: '14px', color: '#000000' }}>
                    <span>In my absence MR/MRS/MISS</span>
                    <span
                      style={{
                        borderBottom: '1.5px dotted #000',
                        padding: '0 12px',
                        fontWeight: 600,
                        minWidth: '260px',
                        display: 'inline-block',
                        textAlign: 'center',
                      }}
                    >
                      {printSlipData.standingInTeacher
                        ? `${printSlipData.standingInTeacher.firstName} ${printSlipData.standingInTeacher.lastName}`
                        : ''}
                    </span>
                    <span>will be standing in my position.</span>
                  </div>
                )}

                {/* 6. Signatures Section (Stand-in signature ONLY for Class Teachers) */}
                <div style={{ fontSize: '12pt', lineHeight: '2.4', marginTop: '20px', color: '#000000' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span style={{ minWidth: '280px' }}>Teacher seeking permission signature</span>
                    <span style={{ borderBottom: '1.5px dotted #000', flex: 1 }} />
                  </div>
                  {Boolean(printSlipData.classTeacherOf || printSlipData.standingInTeacher) && (
                    <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '8px' }}>
                      <span style={{ minWidth: '280px' }}>Teacher requested to stand in signature</span>
                      <span style={{ borderBottom: '1.5px dotted #000', flex: 1 }} />
                    </div>
                  )}
                </div>

                {/* 7. Deputy / Headteacher Approval Section */}
                <div style={{ borderTop: '1px solid #000', marginTop: '28px', paddingTop: '16px', fontSize: '11.5pt', lineHeight: '2.2', color: '#000000' }}>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                    DEPUTY/ HEADTEACHER'S ( <span style={{ textDecoration: 'underline' }}>Approved</span>/Not approved )
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '6px' }}>
                    <span style={{ minWidth: '80px' }}>Reason(s)</span>
                    <span style={{ borderBottom: '1.5px dotted #000', flex: 1, padding: '0 8px', fontWeight: 500 }}>
                      {printSlipData.request.deputyReason || 'Approved official leave request'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', flex: 1, marginRight: '24px' }}>
                      <span style={{ whiteSpace: 'nowrap' }}>HEAD TEACHER'S SIGNATURE</span>
                      <span style={{ borderBottom: '1.5px dotted #000', flex: 1, marginLeft: '6px' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', width: '220px' }}>
                      <span style={{ marginRight: '6px' }}>DATE</span>
                      <span style={{ borderBottom: '1.5px dotted #000', flex: 1, padding: '0 6px', fontWeight: 500, textAlign: 'center' }}>
                        {formatDate(printSlipData.request.createdAt || new Date())}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 8. Headteacher / Director Section & Circular Stamp */}
                <div style={{ borderTop: '1px solid #000', marginTop: '24px', paddingTop: '16px', fontSize: '11.5pt', color: '#000000' }}>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                    HEADTEACHER ( Approved/Not approved )
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '6px' }}>
                    <span style={{ minWidth: '80px' }}>Reason(s)</span>
                    <span style={{ borderBottom: '1.5px dotted #000', flex: 1, padding: '0 8px', fontWeight: 500 }}>
                      {printSlipData.request.headTeacherReason || 'Approved'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '12px' }}>
                    <div style={{ flex: 1, marginRight: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline' }}>
                        <span style={{ lineHeight: 1.2, whiteSpace: 'nowrap' }}>DIRECTOR'S<br />SIGNATURE</span>
                        <span style={{ borderBottom: '1.5px dotted #000', flex: 1, marginLeft: '8px', height: '18px' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '14px', width: '240px' }}>
                        <span style={{ marginRight: '6px' }}>DATE</span>
                        <span style={{ borderBottom: '1.5px dotted #000', flex: 1, padding: '0 6px', fontWeight: 500, textAlign: 'center' }}>
                          {formatDate(printSlipData.request.createdAt || new Date())}
                        </span>
                      </div>
                    </div>

                    {/* Authentic Blue Circular School Stamp matching physical sheet */}
                    <div
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        border: '2.5px solid #1e40af',
                        color: '#1e40af',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: '6px',
                        fontFamily: 'sans-serif',
                        fontSize: '7.5pt',
                        fontWeight: 'bold',
                        lineHeight: 1.15,
                        textTransform: 'uppercase',
                        transform: 'rotate(-5deg)',
                        userSelect: 'none',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: '7pt', letterSpacing: '0.4px' }}>ELDORET MUSLIM</span>
                      <span style={{ fontSize: '8pt' }}>ACADEMY</span>
                      <div
                        style={{
                          margin: '3px 0',
                          padding: '1px 6px',
                          borderTop: '1px dashed #2563eb',
                          borderBottom: '1px dashed #2563eb',
                          fontSize: '8pt',
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                        }}
                      >
                        {formatDate(printSlipData.request.startDate)}
                      </div>
                      <span style={{ fontSize: '6pt', letterSpacing: '-0.2px' }}>P.O BOX 5080-30100</span>
                      <span style={{ fontSize: '6pt' }}>ELDORET</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

