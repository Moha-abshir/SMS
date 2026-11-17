import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck, BookOpen, Users, Award, AlertCircle, CheckCircle2,
  Clock, ArrowRight, ChevronRight, UserCheck, Calendar,
  ShieldAlert, Sparkles
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';

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

  const teacher = data?.teacher;
  const classTeacher = data?.classTeacher;
  const allocations = data?.subjectAllocations || [];
  const markTasks = data?.markEntryTasks || [];
  const alerts = data?.alerts || { pendingCorrections: 0, hasUnmarkedAttendanceToday: false };
  const currentTerm = data?.currentTermNumber || 1;
  const academicYear = data?.academicYear || new Date().getFullYear();

  const completedMarksheets = markTasks.filter((t: any) => t.isComplete).length;
  const totalMarksheets = markTasks.length;

  // Timetable engine is exclusively designed for Grades 4 through 9 (UPPER_PRIMARY & JUNIOR)
  const isTargetTimetableClass = (item: any) => {
    if (!item) return false;
    if (
      item.levelCategory === 'UPPER_PRIMARY' ||
      item.levelCategory === 'JUNIOR' ||
      item.levelCategory === 'JUNIOR_SECONDARY'
    ) {
      return true;
    }
    if (typeof item.numericOrder === 'number' && item.numericOrder >= 7) {
      return true;
    }
    if (typeof item.className === 'string' && /Grade\s*[4-9]/i.test(item.className)) {
      return true;
    }
    return false;
  };

  const hasTimetableAllocations =
    allocations.some(isTargetTimetableClass) || isTargetTimetableClass(classTeacher);

  const todayDateFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <PageLoadingWrapper
      isLoading={loading}
      title="Teacher Workstation"
      subtitle="Loading allocated streams, teaching schedules, and active tasks..."
      icon={Award}
    >
      <div className="space-y-3.5 max-w-7xl mx-auto">
        {/* 1. Flattened Header Row (Max Height: ~48px) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Left: Role title + user details + active term badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              {teacher?.firstName?.[0] || 'T'}{teacher?.lastName?.[0] || 'C'}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Teacher {teacher?.firstName} {teacher?.lastName}
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80">
                {classTeacher ? `Class Teacher · ${classTeacher.className}` : 'Subject Specialist'}
              </span>
              {classTeacher?.isStandingIn && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 uppercase">
                  Standing-In
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                TSC: {teacher?.tscNumber || 'Registered'}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                Term {currentTerm} · {academicYear}
              </span>
            </div>
          </div>

          {/* Right: Date Indicator Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] text-xs font-medium text-slate-600 dark:text-slate-300 shadow-xs shrink-0 self-start sm:self-auto">
            <CalendarCheck className="w-3.5 h-3.5 text-sky-500" />
            <span>Today: {todayDateFormatted}</span>
          </div>
        </div>

        {/* Pending Mark Correction Alert Banner (Compact) */}
        {alerts.pendingCorrections > 0 && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>{alerts.pendingCorrections} Marksheet(s) Unlocked:</strong> Class Teacher requested score correction.
              </span>
            </div>
            <button
              onClick={() => navigate('/marks-entry')}
              className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0"
            >
              Review & Fix →
            </button>
          </div>
        )}

        {/* 2. Sleek Metric Ribbon (Max Height: ~44px) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]/70 px-3 py-2 text-xs shadow-xs">
          {/* Slot 1: Attendance Status */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            {classTeacher ? (
              classTeacher.todayAttendance?.isSubmitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] leading-tight">
                      Roll Call Taken
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {classTeacher.todayAttendance.presentCount} present · {classTeacher.todayAttendance.absentCount} absent
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-700 dark:text-amber-400 block text-[11px] leading-tight">
                      Pending Roll Call
                    </span>
                    <span className="text-[10px] text-slate-400">Not submitted today</span>
                  </div>
                </>
              )
            ) : (
              <>
                <Award className="w-4 h-4 text-sky-500 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] leading-tight">
                    Subject Specialist
                  </span>
                  <span className="text-[10px] text-slate-400">Class oversight N/A</span>
                </div>
              </>
            )}
          </div>

          {/* Slot 2: Total Learners */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <UserCheck className="w-4 h-4 text-sky-500 shrink-0" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] leading-tight">
                {classTeacher ? `${classTeacher.studentCount} Learners Enrolled` : 'All School Streams'}
              </span>
              <span className="text-[10px] text-slate-400">
                {classTeacher ? `${classTeacher.className} (${classTeacher.levelCategory?.replace('_', ' ')})` : 'Specialist Roster'}
              </span>
            </div>
          </div>

          {/* Slot 3: Marksheet Progress */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] leading-tight">
                Marksheets: {completedMarksheets}/{totalMarksheets} Done
              </span>
              <span className="text-[10px] text-slate-400">
                {totalMarksheets > 0
                  ? `${Math.round((completedMarksheets / totalMarksheets) * 100)}% completed`
                  : 'No active papers'}
              </span>
            </div>
          </div>

          {/* Slot 4: Active Allocations */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] leading-tight">
                {allocations.length} Teaching Allocation{allocations.length === 1 ? '' : 's'}
              </span>
              <span className="text-[10px] text-slate-400">Assigned classes & subjects</span>
            </div>
          </div>
        </div>

        {/* 3. Streamlined Class Operations Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-[#0c1830]/70 backdrop-blur-xs shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
              Class Operations:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {classTeacher && (
              <button
                onClick={() => navigate('/class-register')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  classTeacher.todayAttendance?.isSubmitted
                    ? 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                    : 'bg-sky-600 hover:bg-sky-500 text-white'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>{classTeacher.todayAttendance?.isSubmitted ? 'View Class Register' : 'Take Daily Register'}</span>
              </button>
            )}

            <button
              onClick={() => navigate('/marks-entry')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-sky-300 dark:hover:border-sky-600 transition-all shadow-xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-500" />
              <span>Enter Marks</span>
              {totalMarksheets > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-semibold">
                  {totalMarksheets}
                </span>
              )}
            </button>

            {classTeacher && (
              <button
                onClick={() => navigate('/my-learners')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-sky-300 dark:hover:border-sky-600 transition-all shadow-xs cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Class Learners</span>
                <span className="text-[10px] text-slate-400">({classTeacher.studentCount})</span>
              </button>
            )}

            {hasTimetableAllocations && (
              <button
                onClick={() => navigate('/timetable')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-sky-300 dark:hover:border-sky-600 transition-all shadow-xs cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>My Timetable</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. High-Density Teaching Allocations Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                My Teaching Allocations & Learning Areas
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              {allocations.length} Active Subject{allocations.length === 1 ? '' : 's'}
            </span>
          </div>

          {allocations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No subject allocations assigned yet. Please contact the Deputy Head.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Class</th>
                    <th className="py-2.5 px-4">Level</th>
                    <th className="py-2.5 px-4">Learning Area / Subject</th>
                    <th className="py-2.5 px-4 text-center">Code</th>
                    <th className="py-2.5 px-4 text-center">Marksheet Task</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {allocations.map((alloc: any) => {
                    const task = markTasks.find(
                      (t: any) => t.classId === alloc.classId && t.subjectId === alloc.subjectId
                    );

                    return (
                      <tr
                        key={`${alloc.classId}-${alloc.subjectId}`}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {alloc.className}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                          {alloc.levelCategory?.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 font-semibold">
                          {alloc.subjectName}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {alloc.subjectCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {task ? (
                            task.isComplete ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {task.scoredStudents}/{task.totalStudents} Scored (100%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                <Clock className="w-3.5 h-3.5" />
                                {task.scoredStudents}/{task.totalStudents} Scored
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => navigate('/marks-entry')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60 transition-colors cursor-pointer"
                          >
                            <span>Marksheet</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageLoadingWrapper>
  );
};

export default TeacherDashboardView;
