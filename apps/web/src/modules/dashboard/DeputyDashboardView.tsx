import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Clock, Package, UserX, ClipboardCheck, Award, TrendingUp,
  CalendarCheck, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';

interface DeputyDashboardViewProps {
  onNavigate?: (viewId: string) => void;
}

export const DeputyDashboardView: React.FC<DeputyDashboardViewProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalClasses: number;
    activeAllocations: number;
    totalMarkSubmissions: number;
    approvedMarkSubmissions: number;
    pendingMarkReviews: number;
    schoolName: string;
    academicYear: number;
    currentTermNumber: number;
    attendance: {
      totalStudents: number;
      presentCount: number;
      absentCount: number;
      attendanceRate: number;
      registersSubmitted: number;
      totalClasses: number;
    };
    inventory: {
      activeCheckouts: number;
      overdueCheckouts: number;
    };
    staffOnLeaveToday: number;
  }>({
    totalClasses: 12,
    activeAllocations: 0,
    totalMarkSubmissions: 0,
    approvedMarkSubmissions: 0,
    pendingMarkReviews: 0,
    schoolName: 'Eldoret Muslim Academy',
    academicYear: 2026,
    currentTermNumber: 1,
    attendance: {
      totalStudents: 0,
      presentCount: 0,
      absentCount: 0,
      attendanceRate: 0,
      registersSubmitted: 0,
      totalClasses: 0,
    },
    inventory: {
      activeCheckouts: 0,
      overdueCheckouts: 0,
    },
    staffOnLeaveToday: 0,
  });

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/dashboard/deputy');
      if (res.data?.data) {
        const d = res.data.data;
        setData({
          totalClasses: d.totalClasses ?? 12,
          activeAllocations: d.activeAllocations ?? 0,
          totalMarkSubmissions: d.totalMarkSubmissions ?? 0,
          approvedMarkSubmissions: d.approvedMarkSubmissions ?? 0,
          pendingMarkReviews: d.pendingMarkReviews ?? 0,
          schoolName: d.schoolName || 'Eldoret Muslim Academy',
          academicYear: d.academicYear || 2026,
          currentTermNumber: d.currentTermNumber || 1,
          attendance: {
            totalStudents: d.attendance?.totalStudents ?? 0,
            presentCount: d.attendance?.presentCount ?? 0,
            absentCount: d.attendance?.absentCount ?? d.todayAbsentCount ?? 0,
            attendanceRate: d.attendance?.attendanceRate ?? d.todayAttendancePercentage ?? 0,
            registersSubmitted: d.attendance?.registersSubmitted ?? 0,
            totalClasses: d.attendance?.totalClasses ?? d.totalClasses ?? 12,
          },
          inventory: {
            activeCheckouts: d.inventory?.activeCheckouts ?? d.activeCheckoutsCount ?? 0,
            overdueCheckouts: d.inventory?.overdueCheckouts ?? d.overdueCheckoutsCount ?? 0,
          },
          staffOnLeaveToday: d.staffOnLeaveToday ?? d.staffOnLeaveTodayCount ?? 0,
        });
      }
    } catch (error) {
      console.error('Failed to load deputy dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleGo = (viewId: string, path: string) => {
    if (onNavigate) {
      onNavigate(viewId);
    }
    navigate(path);
  };

  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <PageLoadingWrapper
      isLoading={loading}
      title="Deputy Principal Dashboard"
      subtitle="Loading roll call submissions, academic reviews, and school assets..."
      icon={ClipboardCheck}
    >
      <div className="space-y-3.5 max-w-7xl mx-auto">
        {/* 1. Flattened Header Row (Max Height: ~48px) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Left: Role title + user details + active term badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              DH
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Deputy Head Operational Workstation
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80">
                Deputy Head
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                Term {data.currentTermNumber} · {data.academicYear}
              </span>
            </div>
          </div>

          {/* Right: Date Indicator Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] text-xs font-medium text-slate-600 dark:text-slate-300 shadow-xs shrink-0 self-start sm:self-auto">
            <CalendarCheck className="w-3.5 h-3.5 text-sky-500" />
            <span>Today: {todayFormatted}</span>
          </div>
        </div>

        {/* 2. Sleek Operational Metric Ribbon (Max Height: ~44px) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]/70 px-3 py-2 text-xs shadow-xs">
          {/* 1. Attendance Today */}
          <div
            onClick={() => handleGo('attendance_oversight', '/attendance')}
            className="flex items-center gap-2.5 px-2 py-1 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded transition-colors"
          >
            <UserX className="w-4 h-4 text-sky-500 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                  {data.attendance.registersSubmitted > 0 ? `${data.attendance.attendanceRate}%` : '0%'}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Attendance Today
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                {data.attendance.registersSubmitted > 0
                  ? `${data.attendance.presentCount} / ${data.attendance.totalStudents} present`
                  : `0 / ${data.attendance.totalStudents || 361} present (Roll call pending)`}
              </span>
            </div>
          </div>

          {/* 2. Staff Allocations */}
          <div
            onClick={() => handleGo('allocations', '/allocations')}
            className="flex items-center gap-2.5 px-2 py-1 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded transition-colors"
          >
            <Award className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                  {data.activeAllocations}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Staff Allocations
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                Across {data.totalClasses || 12} Active Classes
              </span>
            </div>
          </div>

          {/* 3. Asset Checkouts */}
          <div
            onClick={() => handleGo('inventory', '/inventory')}
            className="flex items-center gap-2.5 px-2 py-1 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded transition-colors"
          >
            <Package className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                  {data.inventory.activeCheckouts}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Asset Checkouts
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                {data.inventory.overdueCheckouts > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    {data.inventory.overdueCheckouts} Overdue Items
                  </span>
                ) : (
                  '0 Overdue Items'
                )}
              </span>
            </div>
          </div>

          {/* 4. Staff on Leave */}
          <div
            onClick={() => handleGo('leave_requests', '/leave-requests')}
            className="flex items-center gap-2.5 px-2 py-1 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded transition-colors"
          >
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                  {data.staffOnLeaveToday}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Staff on Leave
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                Active Permission Slips
              </span>
            </div>
          </div>
        </div>

        {/* 3. Compact Management Workspaces Grid (4 Items) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] p-3 shadow-xs">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Operational Management Workspaces
              </h2>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">4 Direct Modules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. Attendance Oversight */}
            <button
              onClick={() => handleGo('attendance_oversight', '/attendance')}
              className="flex flex-col justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-sky-50/60 dark:hover:bg-[#122444] hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UserX className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Attendance Oversight & SMS
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  Inspect daily registers & dispatch 1-click bulk SMS
                </p>
              </div>
            </button>

            {/* 2. Staff Leave Out Sheets */}
            <button
              onClick={() => handleGo('leave_requests', '/leave-requests')}
              className="flex flex-col justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-sky-50/60 dark:hover:bg-[#122444] hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Clock className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Teaching Staff Leave-Out Sheets
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  Official 3-reason slips & printable sheet formats
                </p>
              </div>
            </button>

            {/* 3. Class & Teacher Allocations */}
            <button
              onClick={() => handleGo('allocations', '/allocations')}
              className="flex flex-col justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-sky-50/60 dark:hover:bg-[#122444] hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Class & Teacher Allocations
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  CBC rules: Grade 1–3 auto vs Grade 4–9 specialist
                </p>
              </div>
            </button>

            {/* 4. School Inventory & Assets */}
            <button
              onClick={() => handleGo('inventory', '/inventory')}
              className="flex flex-col justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-sky-50/60 dark:hover:bg-[#122444] hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Package className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  School Inventory & Assets
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  Textbooks, lab equipment & item checkout registry
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 4. Academic Review & Oversight Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div
            onClick={() => handleGo('timetable', '/timetable')}
            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">School Master Timetable</span>
              <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
            </div>
            <p className="text-[10px] text-slate-400">
              Weekly class & teacher schedule matrix
            </p>
          </div>

          <div
            onClick={() => handleGo('school_results', '/school-results')}
            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Schoolwide Performance</span>
              <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
            </div>
            <p className="text-[10px] text-slate-400">
              Exam marksheet progress & grade averages
            </p>
          </div>

          <div
            onClick={() => handleGo('subject_performance', '/subject-performance')}
            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Subject Performance Analysis</span>
              <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
            </div>
            <p className="text-[10px] text-slate-400">
              Curriculum diagnostics & teacher grading
            </p>
          </div>
        </div>
      </div>
    </PageLoadingWrapper>
  );
};

export default DeputyDashboardView;
