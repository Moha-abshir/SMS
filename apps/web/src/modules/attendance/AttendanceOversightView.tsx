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
            <UserX className="w-4 h-4" />
            Attendance Register & Parent Notification System
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">School-Wide Attendance Oversight</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium max-w-xl">
            Daily class register audit & automated Africa's Talking parent SMS notifications.
          </p>
        </div>

        {/* Date Selector Mini Container */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md shrink-0">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Target Date:</span>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded-lg border border-slate-700 outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Aggregate KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Registers Submitted</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {data.registersSubmittedCount} / {data.totalClassesCount}
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Class Registers Completed</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Present Learners</span>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {data.totalPresent}
          </div>
          <p className="text-xs text-slate-500 mt-1">In Attendance Today</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Absent Learners</span>
          <div className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-1">
            {data.totalAbsent}
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Absences Recorded</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Excused Absences</span>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {data.totalExcused}
          </div>
          <p className="text-xs text-slate-500 mt-1">Official Medical/Excused</p>
        </div>
      </div>

      {/* Absentee Roster & SMS Action Table */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Phone className="w-4 h-4 text-red-600" />
          Absentee Parent Notification Hub ({data.absentStudents.length} Absent Learners)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4">Parent / Guardian</th>
                <th className="py-3.5 px-4">Parent Phone Number</th>
                <th className="py-3.5 px-4 text-center">SMS Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.absentStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No absent learners recorded for this date. All registers complete.
                  </td>
                </tr>
              ) : (
                data.absentStudents.map((row) => (
                  <tr key={row.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {row.studentName}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                      {row.className}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-bold">
                      {row.guardianName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {row.guardianPhone}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.smsSentStatus === 'SENT' ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-extrabold rounded-full flex items-center justify-center gap-1">
                          <CheckCircle className="w-3 h-3" /> SMS Delivered
                        </span>
                      ) : row.smsSentStatus === 'FAILED' ? (
                        <span className="px-2.5 py-1 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-[10px] font-extrabold rounded-full flex items-center justify-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Failed
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold rounded-full">
                          Unnotified
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleSendSms(row)}
                        disabled={sendingSmsId === row.studentId}
                        className="px-3 py-1 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 flex items-center gap-1 mx-auto shadow-sm transition-all disabled:opacity-50"
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
