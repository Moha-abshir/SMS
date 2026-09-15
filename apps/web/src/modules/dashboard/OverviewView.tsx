import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, CheckCircle2, BookOpen, Wallet, UserPlus, FileText, Settings, ShieldCheck, TrendingUp } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

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
    todayAttendancePercentage: 98.2,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* Welcome Glass Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <TrendingUp className="w-4 h-4 text-sky-500" />
            Executive Oversight & System Dashboard
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{data.schoolName} Executive Dashboard</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Real-time operational summary of student admissions, attendance, staff, and financial oversight.
          </p>
        </div>

        <div className="flex items-center justify-around sm:justify-start gap-4 px-4 sm:px-5 py-2.5 sm:py-3 bg-sky-50/70 border border-sky-100 rounded-xl sm:rounded-2xl w-full sm:w-auto shrink-0">
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-bold text-slate-800 leading-none">{data.academicYear}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-1 block">Academic Year</span>
          </div>
          <div className="w-[1px] h-8 bg-sky-200/60" />
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-bold text-sky-600 leading-none">Term {data.currentTermNumber}</span>
            <span className="text-[10px] font-bold tracking-wider text-sky-700 uppercase mt-1 block">Active Term</span>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Active Learners</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{data.totalLearners}</div>
          <p className="text-xs text-slate-500 mt-1">PPE, Lower, Upper & JSS</p>
        </div>

        <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today Attendance</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{data.todayAttendancePercentage}%</div>
          <p className="text-xs text-sky-700 mt-1 font-medium">{data.absentCount} Absences Recorded Today</p>
        </div>

        <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Staff Directory</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{data.totalStaff}</div>
          <p className="text-xs text-slate-500 mt-1">Teachers & Administrative Staff</p>
        </div>

        <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Term Fee Collection Rate</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{data.feeCollectionRate}%</div>
          <p className="text-xs text-sky-700 mt-1 truncate font-medium">
            KES {data.totalOutstandingBalance.toLocaleString()} Outstanding
          </p>
        </div>
      </div>

      {/* Quick Administrative Shortcuts */}
      <div className="p-4 sm:p-6 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky-500" />
          Executive Shortcuts & Module Navigation
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          <button
            onClick={() => {
              if (onNavigate) onNavigate('admissions');
              navigate('/admissions');
            }}
            className="p-4 bg-sky-50/40 hover:bg-sky-50/80 border border-sky-100 hover:border-sky-200 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 mb-2 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900">Admit New Learner</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">KNEC Assessment Number registration</p>
          </button>

          <button
            onClick={() => {
              if (onNavigate) onNavigate('letters');
              navigate('/letters');
            }}
            className="p-4 bg-sky-50/40 hover:bg-sky-50/80 border border-sky-100 hover:border-sky-200 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer"
          >
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 mb-2 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900">Official Letterhead</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Draft & print official school letters</p>
          </button>

          <button
            onClick={() => {
              if (onNavigate) onNavigate('settings');
              navigate('/settings');
            }}
            className="p-4 bg-sky-50/40 hover:bg-sky-50/80 border border-sky-100 hover:border-sky-200 rounded-xl sm:rounded-2xl text-left transition-all group min-h-[44px] cursor-pointer sm:col-span-2 lg:col-span-1"
          >
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 mb-2 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-bold text-slate-900">School Profile Settings</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Motto, address & academic terms</p>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
