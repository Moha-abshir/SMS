import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Send, CheckCircle, AlertCircle, Phone, UserX, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';

export const AttendanceOversightView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<{
    date: string;
    totalClassesCount: number;
    registersSubmittedCount: number;
    totalPresent: number;
    totalAbsent: number;
    totalExcused: number;
    absentStudents: any[];
  }>({
    date: new Date().toISOString().split('T')[0],
    totalClassesCount: 0,
    registersSubmittedCount: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalExcused: 0,
    absentStudents: [],
  });

  const [sendingSmsId, setSendingSmsId] = useState<string | null>(null);

  const fetchAttendance = async (dateStr?: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/attendance/school-wide?date=${dateStr || targetDate}`);
      if (res.data.data) {
        setData(res.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load attendance oversight data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [targetDate]);

  const handleSendSms = async (student: any) => {
    try {
      setSendingSmsId(student.studentId);
      await apiClient.post('/api/attendance/notify-parent', {
        studentId: student.studentId,
        guardianId: student.guardianId,
        guardianPhone: student.guardianPhone,
        studentName: student.studentName,
      });
      toast.success(`Absentee SMS alert sent to ${student.guardianName} (${student.guardianPhone})`);
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send SMS');
    } finally {
      setSendingSmsId(null);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-sky-100 shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <UserX className="w-4 h-4 text-sky-500" />
            Attendance Register & Parent Notification System
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">School-Wide Attendance Oversight</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Daily class register audit & automated Africa's Talking parent SMS notifications.
          </p>
        </div>

        {/* Date Selector Mini Container */}
        <div className="flex items-center justify-between sm:justify-start gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-sky-50/60 border border-sky-100 rounded-xl sm:rounded-2xl backdrop-blur-md w-full sm:w-auto shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="text-[10px] font-bold tracking-wider text-sky-700 uppercase">Target Date:</span>
          </div>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="bg-white text-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-sky-200 outline-none cursor-pointer focus:border-sky-500 transition-colors"
          />
        </div>
      </div>

      {/* Aggregate KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Registers Submitted</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {data.registersSubmittedCount} / {data.totalClassesCount}
          </div>
          <p className="text-xs text-sky-600 font-medium mt-1">Class Registers Completed</p>
        </div>

        <div className="p-4 sm:p-5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Present Learners</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-600 mt-1">
            {data.totalPresent}
          </div>
          <p className="text-xs text-slate-500 mt-1">In Attendance Today</p>
        </div>

        <div className="p-4 sm:p-5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Absent Learners</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
            {data.totalAbsent}
          </div>
          <p className="text-xs text-slate-500 mt-1">Absences Recorded</p>
        </div>

        <div className="p-4 sm:p-5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Excused Absences</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
            {data.totalExcused}
          </div>
          <p className="text-xs text-slate-500 mt-1">Official Medical/Excused</p>
        </div>
      </div>

      {/* Absentee Roster & SMS Action Table */}
      <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
          <Phone className="w-4 h-4 text-sky-600" />
          Absentee Parent Notification Hub ({data.absentStudents.length} Absent Learners)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
              <tr>
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4">Parent / Guardian</th>
                <th className="py-3.5 px-4">Parent Phone Number</th>
                <th className="py-3.5 px-4 text-center">SMS Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/60">
              {data.absentStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No absent learners recorded for this date. All registers complete.
                  </td>
                </tr>
              ) : (
                data.absentStudents.map((row) => (
                  <tr key={row.studentId} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {row.studentName}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                      {row.className}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-bold">
                      {row.guardianName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {row.guardianPhone}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.smsSentStatus === 'SENT' ? (
                        <span className="px-2.5 py-1 bg-sky-100 text-sky-800 text-[10px] font-extrabold rounded-full inline-flex items-center justify-center gap-1 border border-sky-200">
                          <CheckCircle className="w-3 h-3 text-sky-600" /> SMS Delivered
                        </span>
                      ) : row.smsSentStatus === 'FAILED' ? (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-extrabold rounded-full inline-flex items-center justify-center gap-1 border border-slate-200">
                          <AlertCircle className="w-3 h-3 text-slate-500" /> Failed
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-sky-50 text-sky-600 border border-sky-100 text-[10px] font-bold rounded-full inline-block">
                          Unnotified
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleSendSms(row)}
                        disabled={sendingSmsId === row.studentId}
                        className="px-3.5 py-1.5 bg-sky-500 text-white font-bold text-xs rounded-xl hover:bg-sky-600 inline-flex items-center gap-1.5 mx-auto shadow-glass transition-all disabled:opacity-50"
                      >
                        {sendingSmsId === row.studentId ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Send SMS Alert
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
