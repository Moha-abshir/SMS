import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Package, UserX, ClipboardCheck, Award, ArrowUpRight, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
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
      attendanceRate: 100,
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
            attendanceRate: d.attendance?.attendanceRate ?? d.todayAttendancePercentage ?? 100,
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
    } else {
      navigate(path);
    }
  };

  return (
    <PageLoadingWrapper
      isLoading={loading}
      title="Deputy Principal Dashboard"
      subtitle="Loading roll call submissions, academic reviews, and school assets..."
      icon={ClipboardCheck}
    >
      <div className="space-y-4 sm:space-y-6">
      {/* Welcome Glass Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white/80 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-widest mb-1">
            <TrendingUp className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            Deputy Headteacher Operational Workstation
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{data.schoolName} Academic & Operational Oversight</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-xl">
            Oversee classroom registers, dispatch bulk parent SMS, review teacher exam marksheets, manage inventory, and administer staff leave out sheets.
          </p>
        </div>

        <div className="flex items-center justify-around sm:justify-start gap-4 px-4 sm:px-5 py-2.5 sm:py-3 bg-sky-50/70 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-xl sm:rounded-2xl w-full sm:w-auto shrink-0">
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 leading-none">{data.academicYear}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-1 block">Academic Year</span>
          </div>
          <div className="w-[1px] h-8 bg-sky-200/60 dark:bg-[#162b4d]" />
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-bold text-sky-600 dark:text-sky-400 leading-none">Term {data.currentTermNumber}</span>
            <span className="text-[10px] font-bold tracking-wider text-sky-700 dark:text-sky-300 uppercase mt-1 block">Active Term</span>
          </div>
        </div>
      </div>

      {/* Real-time Operational KPI Grid (5 Live Indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Attendance KPI */}
        <div
          onClick={() => handleGo('attendance_oversight', '/attendance')}
          className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass hover:border-sky-300 dark:hover:border-sky-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Attendance Today</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1f3d] border border-sky-100 dark:border-[#163660] text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">{data?.attendance?.attendanceRate ?? 100}%</div>
          <p className="text-xs text-sky-700 dark:text-sky-400 mt-1 font-medium">
            {data?.attendance?.presentCount ?? 0} / {data?.attendance?.totalStudents ?? 0} present ({data?.attendance?.absentCount ?? 0} absent)
          </p>
        </div>

        {/* Mark Reviews Queue KPI */}
        <div
          onClick={() => handleGo('mark_review', '/mark-review')}
          className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass hover:border-sky-300 dark:hover:border-sky-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Marks</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1f3d] border border-sky-100 dark:border-[#163660] text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">{data?.pendingMarkReviews ?? 0}</div>
          <p className="text-xs text-sky-700 dark:text-sky-400 mt-1 font-medium">
            {data?.approvedMarkSubmissions ?? 0} / {data?.totalMarkSubmissions ?? 0} marksheets approved
          </p>
        </div>

        {/* Teacher Allocations KPI */}
        <div
          onClick={() => handleGo('allocations', '/allocations')}
          className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass hover:border-sky-300 dark:hover:border-sky-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Staff Allocations</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1f3d] border border-sky-100 dark:border-[#163660] text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">{data?.activeAllocations ?? 0}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across {data?.totalClasses ?? 12} Active Classes</p>
        </div>

        {/* Inventory Overdue & Checkouts KPI */}
        <div
          onClick={() => handleGo('inventory', '/inventory')}
          className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass hover:border-sky-300 dark:hover:border-sky-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Asset Checkouts</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1f3d] border border-sky-100 dark:border-[#163660] text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">{data?.inventory?.activeCheckouts ?? 0}</div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
            {(data?.inventory?.overdueCheckouts ?? 0) > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold">{data?.inventory?.overdueCheckouts ?? 0} Overdue Items</span>
            ) : (
              <span className="text-sky-700 dark:text-sky-400">0 Overdue Items</span>
            )}
          </p>
        </div>

        {/* Staff on Leave Today KPI */}
        <div
          onClick={() => handleGo('leave_requests', '/leave-requests')}
          className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass hover:border-sky-300 dark:hover:border-sky-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Staff On Leave</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1f3d] border border-sky-100 dark:border-[#163660] text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">{data?.staffOnLeaveToday ?? 0}</div>
          <p className="text-xs text-sky-700 dark:text-sky-400 mt-1 font-medium">Active Permission Slips</p>
        </div>
      </div>

      {/* Quick Deputy Navigation Shortcuts */}
      <div className="p-4 sm:p-6 bg-white/80 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-sky-500 dark:text-sky-400" />
          Deputy Headteacher Quick Management Workspaces
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          <button
            onClick={() => handleGo('attendance_oversight', '/attendance')}
            className="p-4 bg-sky-50/40 dark:bg-[#0c1830] hover:bg-sky-50/80 dark:hover:bg-[#0f2042] border border-sky-100 dark:border-[#162b4d] hover:border-sky-200 dark:hover:border-sky-500 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <UserX className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 dark:text-sky-400 mb-2 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Attendance Oversight & Parent SMS</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Inspect daily registers & 1-click bulk SMS</p>
          </button>

          <button
            onClick={() => handleGo('mark_review', '/mark-review')}
            className="p-4 bg-sky-50/40 dark:bg-[#0c1830] hover:bg-sky-50/80 dark:hover:bg-[#0f2042] border border-sky-100 dark:border-[#162b4d] hover:border-sky-200 dark:hover:border-sky-500 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 dark:text-sky-400 mb-2 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Exam Mark Review & Approval</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Inspect student scores, rubric stats & request corrections</p>
          </button>

          <button
            onClick={() => handleGo('leave_requests', '/leave-requests')}
            className="p-4 bg-sky-50/40 dark:bg-[#0c1830] hover:bg-sky-50/80 dark:hover:bg-[#0f2042] border border-sky-100 dark:border-[#162b4d] hover:border-sky-200 dark:hover:border-sky-500 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 dark:text-sky-400 mb-2 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Teaching Staff Leave Out Sheets</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Official 3-reason slips & printable sheet format</p>
          </button>

          <button
            onClick={() => handleGo('allocations', '/allocations')}
            className="p-4 bg-sky-50/40 dark:bg-[#0c1830] hover:bg-sky-50/80 dark:hover:bg-[#0f2042] border border-sky-100 dark:border-[#162b4d] hover:border-sky-200 dark:hover:border-sky-500 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 dark:text-sky-400 mb-2 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Class & Teacher Allocations</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Grade 1-3 & Grade 4-9 CBC curriculum rules</p>
          </button>

          <button
            onClick={() => handleGo('inventory', '/inventory')}
            className="p-4 bg-sky-50/40 dark:bg-[#0c1830] hover:bg-sky-50/80 dark:hover:bg-[#0f2042] border border-sky-100 dark:border-[#162b4d] hover:border-sky-200 dark:hover:border-sky-500 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 dark:text-sky-400 mb-2 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">School Inventory & Assets</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Textbooks, lab equipment, checkouts & overdue items</p>
          </button>
        </div>
      </div>
      </div>
    </PageLoadingWrapper>
  );
};

