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

