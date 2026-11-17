import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, CheckCircle2, BookOpen, Wallet, UserPlus, FileText, Settings,
  ShieldCheck, TrendingUp, CalendarCheck, ArrowRight, Clock, Award
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';

interface OverviewViewProps {
  onNavigate?: (viewId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalLearners: number;
    totalStaff: number;
    todayAttendancePercentage: number;
    absentCount: number;
    totalFeePaid: number;
    totalFeeBilled: number;
    totalOutstandingBalance: number;
    feeCollectionRate: number;
    schoolName: string;
    academicYear: number;
    currentTermNumber: number;
  }>({
    totalLearners: 0,
    totalStaff: 0,
    todayAttendancePercentage: 0,
    absentCount: 0,
    totalFeePaid: 0,
    totalFeeBilled: 0,
    totalOutstandingBalance: 0,
    feeCollectionRate: 0,
    schoolName: 'Eldoret Muslim Academy',
    academicYear: 2026,
    currentTermNumber: 1,
  });

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/dashboard/head-teacher');
      if (res.data.data) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load head teacher overview stats', error);
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
      title="Executive Dashboard"
      subtitle="Synthesizing academic census, financial balances, and attendance rates..."
      icon={TrendingUp}
    >
      <div className="space-y-3.5 max-w-7xl mx-auto">
        {/* 1. Flattened Header Row (Max Height: ~48px) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Left: Role title + user details + active term badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              HT
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {data.schoolName} · Executive Dashboard
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80">
                Head Teacher
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                Term {data.currentTermNumber} · {data.academicYear}
              </span>
            </div>
          </div>

          {/* Right: Academic Year / Term Indicator & Date */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] text-xs font-medium text-slate-600 dark:text-slate-300 shadow-xs">
              <CalendarCheck className="w-3.5 h-3.5 text-sky-500" />
              <span>Today: {todayFormatted}</span>
            </div>
          </div>
        </div>

        {/* 2. Sleek Executive Ticker Ribbon (Max Height: ~44px) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]/70 px-3 py-2 text-xs shadow-xs">
          {/* 1. Active Learners */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <Users className="w-4 h-4 text-sky-500 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                  {data.totalLearners}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Active Learners
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">PPE, Lower, Upper, JSS</span>
            </div>
          </div>

          {/* 2. Today Attendance */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                  {data.todayAttendancePercentage > 0 ? `${data.todayAttendancePercentage}%` : '0%'}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Attendance Today
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                {data.todayAttendancePercentage > 0
                  ? `${data.absentCount} absent today`
                  : 'Roll call pending today'}
              </span>
            </div>
          </div>

          {/* 3. Active Staff Directory */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                  {data.totalStaff}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Active Staff
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">Teachers & Admin Staff</span>
            </div>
          </div>

          {/* 4. Term Fee Collection Rate */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <Wallet className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                  {data.feeCollectionRate}%
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Fee Collection
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                KES {data.totalOutstandingBalance.toLocaleString()} Outstanding
              </span>
            </div>
          </div>
        </div>

        {/* 3. Executive Shortcuts & Management Strip */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] p-3 shadow-xs">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Executive Shortcuts & Governance
              </h2>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">Quick Operations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={() => handleGo('admissions', '/admissions')}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-sky-50/60 dark:hover:bg-[#122444] hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    Admit New Learner
                  </h3>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  KNEC assessment registration
                </p>
              </div>
            </button>

            <button
              onClick={() => handleGo('letters', '/letters')}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-sky-50/60 dark:hover:bg-[#122444] hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    Official Letterhead
                  </h3>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Draft & print official letters
                </p>
              </div>
            </button>

            <button
              onClick={() => handleGo('settings', '/settings')}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-sky-50/60 dark:hover:bg-[#122444] hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Settings className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    School Profile Settings
                  </h3>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Motto, address & academic terms
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 4. Secondary Operational Navigation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div
            onClick={() => handleGo('staff', '/staff')}
            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Staff Management</span>
              <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
            </div>
            <p className="text-[10px] text-slate-400">
              {data.totalStaff} staff profiles, roles & permissions
            </p>
          </div>

          <div
            onClick={() => handleGo('attendance', '/attendance')}
            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Daily Attendance</span>
              <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
            </div>
            <p className="text-[10px] text-slate-400">
              Schoolwide roll call inspection & SMS
            </p>
          </div>

          <div
            onClick={() => handleGo('school_results', '/school-results')}
            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Schoolwide Results</span>
              <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
            </div>
            <p className="text-[10px] text-slate-400">
              CBC rubric analysis & rankings
            </p>
          </div>

          <div
            onClick={() => handleGo('finance', '/finance')}
            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Fee Accounts</span>
              <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
            </div>
            <p className="text-[10px] text-slate-400">
              Fee collections & balance ledgers
            </p>
          </div>
        </div>
      </div>
    </PageLoadingWrapper>
  );
};

export default OverviewView;
