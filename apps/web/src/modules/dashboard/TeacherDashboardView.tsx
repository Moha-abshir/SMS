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
                  {classTeacher.isStandingIn && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                      Standing-In
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {classTeacher.isStandingIn ? (
                    <span className="text-amber-700 dark:text-amber-400 font-semibold">
                      You are the temporary Standing-In Class Teacher (covering for {classTeacher.standingInFor || 'assigned teacher'}) for {classTeacher.studentCount} active enrolled learners.
                    </span>
                  ) : (
                    `You are the assigned Class Teacher for ${classTeacher.studentCount} active enrolled learners.`
                  )}
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

      {/* Workstation Actions & Call to Action (CTA) Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Workstation Quick Actions
          </h2>
          <span className="text-xs text-slate-400">
            {allocations.length} Active Allocation(s)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Marksheet Entry CTA */}
          <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md rounded-2xl p-5 border border-sky-100 dark:border-[#162b4d] shadow-glass dark:shadow-none flex flex-col justify-between transition-all hover:border-sky-300 group">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  <BookOpen className="w-5 h-5" />
                </div>
                {alerts.pendingCorrections > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    {alerts.pendingCorrections} Fix Required
                  </span>
                ) : markTasks.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 border border-sky-200 dark:border-sky-800">
                    {markTasks.length} Papers
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    No Pending
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Marksheet Entry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {markTasks.length > 0
                  ? `${markTasks.filter((t: any) => t.isComplete).length} of ${markTasks.length} marksheets completed`
                  : 'Electronic score recording with automated CBC rubrics'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => navigate('/marks-entry')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Go to Marksheet Entry <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2. Daily Class Register CTA */}
          <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md rounded-2xl p-5 border border-sky-100 dark:border-[#162b4d] shadow-glass dark:shadow-none flex flex-col justify-between transition-all hover:border-sky-300 group">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                {classTeacher ? (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      classTeacher.todayAttendance?.isSubmitted
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {classTeacher.todayAttendance?.isSubmitted ? 'Roll Call Taken' : 'Pending Today'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Attendance
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Daily Class Register
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {classTeacher
                  ? `Roll call oversight for ${classTeacher.className}`
                  : 'Class-level daily student attendance and rolls'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => navigate('/class-register')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-sky-200 hover:bg-sky-50 text-sky-700 dark:bg-[#0c1a33] dark:border-[#1e3a66] dark:text-sky-300 dark:hover:bg-[#122444] text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Take Class Register <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3. Class Learners CTA */}
          <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md rounded-2xl p-5 border border-sky-100 dark:border-[#162b4d] shadow-glass dark:shadow-none flex flex-col justify-between transition-all hover:border-sky-300 group">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  <Users className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 border border-sky-200 dark:border-sky-800">
                  {classTeacher ? `${classTeacher.studentCount} Learners` : 'Directory'}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Class Learners
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Learner directory, guardian phone numbers & emergency profiles
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => navigate('/my-learners')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-sky-200 hover:bg-sky-50 text-sky-700 dark:bg-[#0c1a33] dark:border-[#1e3a66] dark:text-sky-300 dark:hover:bg-[#122444] text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                View Class Learners <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4. Subject Performance CTA */}
          <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md rounded-2xl p-5 border border-sky-100 dark:border-[#162b4d] shadow-glass dark:shadow-none flex flex-col justify-between transition-all hover:border-sky-300 group">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 border border-sky-200 dark:border-sky-800">
                  Analytics
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Subject Performance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                CBC rubric distributions, subject averages & academic briefings
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => navigate('/subject-performance')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-sky-200 hover:bg-sky-50 text-sky-700 dark:bg-[#0c1a33] dark:border-[#1e3a66] dark:text-sky-300 dark:hover:bg-[#122444] text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                View Performance <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Teaching Subject Allocations Grid */}
      <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md rounded-2xl p-5 border border-sky-100 dark:border-[#162b4d] shadow-glass dark:shadow-none space-y-4">
        <div className="flex items-center justify-between border-b border-sky-100 dark:border-[#162b4d] pb-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            My Teaching Allocations
          </h3>
          <span className="text-xs text-sky-600 dark:text-sky-400 font-bold">
            {allocations.length} Active Subject(s)
          </span>
        </div>

        {allocations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No subject allocations assigned yet. Please contact the Deputy Head.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allocations.map((alloc: any) => (
              <div
                key={`${alloc.classId}-${alloc.subjectId}`}
                className="p-3.5 bg-sky-50/40 dark:bg-[#0b172c] border border-sky-100 dark:border-[#162b4d] rounded-xl hover:bg-sky-50/70 dark:hover:bg-[#0f1f3d] transition-colors flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {alloc.subjectName}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Class: <span className="font-semibold text-sky-700 dark:text-sky-300">{alloc.className}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-300 border border-sky-100 dark:border-slate-800">
                  {alloc.subjectCode}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default TeacherDashboardView;
