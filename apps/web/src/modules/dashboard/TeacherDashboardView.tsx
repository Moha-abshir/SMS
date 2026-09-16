import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarCheck, BookOpen, Users, Award, AlertCircle, CheckCircle2,
  Clock, ArrowRight, ChevronRight, TrendingUp, Sparkles, UserCheck,
  AlertTriangle, ShieldCheck, FileText, CheckCheck
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';

export const TeacherDashboardView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/api/teacher/workstation');
        setData(res.data?.data);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load teacher workstation');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Loading teacher workstation...</p>
        </div>
      </div>
    );
  }

  const teacher = data?.teacher;
  const classTeacher = data?.classTeacher;
  const allocations = data?.subjectAllocations || [];
  const markTasks = data?.markEntryTasks || [];
  const alerts = data?.alerts || { pendingCorrections: 0, hasUnmarkedAttendanceToday: false };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Teacher Welcome Banner */}
      <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-sky-100 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-md shrink-0">
              {teacher?.firstName?.[0]}
              {teacher?.lastName?.[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Welcome, Teacher {teacher?.firstName} {teacher?.lastName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  {classTeacher ? 'Class & Subject Teacher' : 'Subject Specialist'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                <span>TSC No: {teacher?.tscNumber || 'Registered'}</span>
                <span>•</span>
                <span>{teacher?.email}</span>
                <span>•</span>
                <span>{allocations.length} Active Teaching Allocation(s)</span>
              </p>
            </div>
          </div>

          {/* Date Indicator */}
          <div className="flex items-center gap-2 p-2.5 bg-sky-50/70 border border-sky-100 rounded-xl text-xs font-semibold text-sky-800 shrink-0">
            <CalendarCheck className="w-4 h-4 text-sky-600" />
            <span>Today: {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Pending Correction Urgent Alert Banner */}
        {alerts.pendingCorrections > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  Mark Correction Requested by Deputy Head ({alerts.pendingCorrections})
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  One or more submitted examination marksheets require correction and have been reopened for editing.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/marks-entry')}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              Review & Fix
            </button>
          </div>
        )}
      </div>

      {/* Class Teacher Section (Rendered dynamically if teacher is assigned a class) */}
      {classTeacher && (
        <div className="bg-gradient-to-br from-sky-50/50 via-white to-sky-50/25 rounded-2xl p-5 border border-sky-200 shadow-glass space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500 text-white shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    My Class: {classTeacher.className}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-sky-700 border border-sky-200 uppercase">
                    {classTeacher.levelCategory?.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  You are the assigned Class Teacher for {classTeacher.studentCount} active enrolled learners.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/class-register')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4" />
                Take Class Register
              </button>
              <button
                onClick={() => navigate('/my-learners')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 text-xs font-bold transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4" />
                Class Learners
              </button>
            </div>
          </div>

          {/* Today's Register Status Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 bg-white rounded-xl border border-sky-100 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Today's Attendance Status
                </div>
                <div className="mt-1">
                  {classTeacher.todayAttendance.isSubmitted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Register Marked & Submitted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Pending Roll Call for Today
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">
                  {classTeacher.todayAttendance.isSubmitted
                    ? `${classTeacher.todayAttendance.presentCount} present • ${classTeacher.todayAttendance.absentCount} absent`
                    : 'Not taken'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-sky-100 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Class Learners
                </div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {classTeacher.studentCount}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-sky-100 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Roll Call Shortcuts
                </div>
                <div className="text-xs text-sky-700 font-bold mt-1 cursor-pointer hover:underline" onClick={() => navigate('/class-register')}>
                  Open → Mark → Save
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-sky-500" />
            </div>
          </div>
        </div>
      )}

      {/* Marksheet Entry & Assessment Tasks Queue */}
      <div className="bg-white/85 backdrop-blur-md rounded-2xl p-5 border border-sky-100 shadow-glass space-y-4">
        <div className="flex items-center justify-between border-b border-sky-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Assessment Marksheet Entry Tasks
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Track active examination mark entry progress for your teaching allocations.
            </p>
          </div>
          <button
            onClick={() => navigate('/marks-entry')}
            className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
          >
            Go to Marksheet Entry <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {markTasks.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs border border-dashed border-sky-100 rounded-2xl">
            No active examination mark entry tasks scheduled currently.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {markTasks.map((task: any) => (
              <div
                key={`${task.examId}-${task.classId}-${task.subjectId}`}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  task.status === 'CORRECTION_REQUESTED'
                    ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                    : task.status === 'SUBMITTED' || task.status === 'APPROVED'
                    ? 'bg-emerald-50/20 border-emerald-200'
                    : 'bg-white border-sky-100 hover:border-sky-300 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {task.examTitle}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                        {task.subjectName} ({task.subjectCode})
                      </h4>
                      <span className="text-xs font-semibold text-sky-700 block mt-0.5">
                        {task.className}
                      </span>
                    </div>

                    {/* Task Status Pill */}
                    {task.status === 'APPROVED' || task.status === 'LOCKED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Approved
                      </span>
                    ) : task.status === 'SUBMITTED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 shrink-0">
                        <Clock className="w-3 h-3 text-sky-600" />
                        Submitted
                      </span>
                    ) : task.status === 'CORRECTION_REQUESTED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0 animate-pulse">
                        <AlertCircle className="w-3 h-3 text-amber-700" />
                        Fix Required
                      </span>
                    ) : task.status === 'DRAFT' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        <FileText className="w-3 h-3 text-slate-500" />
                        In Progress
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200 shrink-0">
                        Not Started
                      </span>
                    )}
                  </div>

                  {/* Correction Reason */}
                  {task.correctionReason && (
                    <div className="mt-2 p-2 bg-white/90 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                      <span className="font-bold">Deputy Feedback:</span> {task.correctionReason}
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium mb-1">
                      <span>Mark Entry Progress</span>
                      <span>
                        {task.scoredStudents} / {task.totalStudents} learners
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          task.scoredStudents >= task.totalStudents && task.totalStudents > 0
                            ? 'bg-emerald-500'
                            : 'bg-sky-500'
                        }`}
                        style={{
                          width: `${
                            task.totalStudents > 0
                              ? Math.min(100, Math.round((task.scoredStudents / task.totalStudents) * 100))
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100/80 flex justify-end">
                  <button
                    onClick={() => navigate('/marks-entry')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Enter Marks <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Teaching Subject Allocations Grid */}
      <div className="bg-white/85 backdrop-blur-md rounded-2xl p-5 border border-sky-100 shadow-glass space-y-4">
        <h3 className="text-base font-bold text-slate-900 border-b border-sky-100 pb-3">
          My Teaching Allocations
        </h3>

        {allocations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No subject allocations assigned yet. Please contact the Deputy Head.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allocations.map((alloc: any) => (
              <div
                key={`${alloc.classId}-${alloc.subjectId}`}
                className="p-3.5 bg-sky-50/40 border border-sky-100 rounded-xl hover:bg-sky-50/70 transition-colors flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {alloc.subjectName}
                  </h4>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Class: <span className="font-semibold text-sky-700">{alloc.className}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-sky-100">
                  {alloc.subjectCode}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workstation Shortcuts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            title: 'Daily Class Register',
            desc: 'Mobile-first attendance roll call for your assigned class',
            icon: CalendarCheck,
            path: '/class-register',
          },
          {
            title: 'Marksheet Entry',
            desc: 'Electronic score entry with real-time CBC rubric calculation',
            icon: BookOpen,
            path: '/marks-entry',
          },
          {
            title: 'Class Learners Directory',
            desc: 'Full learner roster, guardian contacts & controlled SMS',
            icon: Users,
            path: '/my-learners',
          },
          {
            title: 'Subject Performance',
            desc: 'Academic intelligence, rubrics & meeting briefings',
            icon: TrendingUp,
            path: '/subject-performance',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              className="p-4 bg-white/85 backdrop-blur-md rounded-2xl border border-sky-100 hover:border-sky-300 shadow-xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 w-fit mb-2.5 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                {item.title}
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default TeacherDashboardView;
