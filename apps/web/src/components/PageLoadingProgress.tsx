import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

export interface PageLoadingWrapperProps {
  isLoading: boolean;
  title?: string;
  subtitle?: string;
  icon?: React.ElementType;
  skeleton?: React.ReactNode;
  variant?: 'table' | 'dashboard' | 'timetable' | 'form' | 'register' | 'cards';
  statCount?: number;
  rowCount?: number;
  children: React.ReactNode;
}

export interface PageLoadingProgressProps {
  isLoading: boolean;
  title?: string;
  subtitle?: string;
  onComplete?: () => void;
  icon?: React.ElementType;
}

/**
 * Standard Table Page Skeleton (matches Admissions, Staff, Learners, Finance, Leave, etc.)
 */
export const TablePageSkeleton: React.FC<{
  title?: string;
  subtitle?: string;
  icon?: React.ElementType;
  statCount?: number;
  rowCount?: number;
}> = ({
  title,
  subtitle,
  icon: IconComponent = GraduationCap,
  statCount = 4,
  rowCount = 8,
}) => {
  const gridColsClass =
    statCount === 1
      ? 'md:grid-cols-1'
      : statCount === 2
      ? 'md:grid-cols-2'
      : statCount === 3
      ? 'md:grid-cols-3'
      : statCount === 5
      ? 'md:grid-cols-5'
      : 'md:grid-cols-4';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-200">
      {/* 1. Header Banner & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-wider mb-1">
            {IconComponent && <IconComponent className="w-4 h-4 text-sky-500 shrink-0" />}
            <span>{title || 'Loading Module...'}</span>
          </div>
          <div className="h-6 w-56 sm:w-72 bg-slate-200 dark:bg-slate-800/80 rounded-lg animate-pulse mb-1.5" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xl truncate">
            {subtitle || 'Synchronizing workspace records and operational metrics...'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="h-9 w-24 sm:w-28 bg-slate-200 dark:bg-slate-800/80 rounded-xl animate-pulse" />
          <div className="h-9 w-28 sm:w-32 bg-slate-200 dark:bg-slate-800/80 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* 2. Metric / Summary Ribbon Shimmer */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800/80 dark:bg-[#111827] shadow-xs">
        <div className={`grid grid-cols-2 ${gridColsClass} gap-3 lg:divide-x divide-slate-100 dark:divide-slate-800/80`}>
          {Array.from({ length: statCount }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2 px-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800/80 shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-2.5 w-16 bg-slate-200 dark:bg-slate-800/80 rounded" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800/80 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Search & Filter Bar Shimmer */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-10 w-full sm:w-80 bg-slate-200 dark:bg-slate-800/80 rounded-xl animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 bg-slate-200 dark:bg-slate-800/80 rounded-lg animate-pulse" />
          <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800/80 rounded-lg animate-pulse" />
          <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800/80 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* 4. Main Data Table Shimmer (Matches exact column count & layout) */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse hidden sm:block" />
          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse hidden md:block" />
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse hidden lg:block" />
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
        </div>

        {/* Table Shimmer Rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-4 animate-pulse">
              {/* Entity info with avatar */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800/80 shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-3.5 w-32 sm:w-48 bg-slate-200 dark:bg-slate-800/80 rounded" />
                  <div className="h-2.5 w-24 sm:w-32 bg-slate-200 dark:bg-slate-800/80 rounded" />
                </div>
              </div>

              {/* Status / Category Badges */}
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800/80 rounded-full hidden sm:block shrink-0" />
              <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800/80 rounded hidden md:block shrink-0" />
              <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800/80 rounded-full hidden lg:block shrink-0" />

              {/* Action Button */}
              <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800/80 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Dashboard Page Skeleton (matches Executive, Teacher, Deputy, DoS Dashboards)
 */
export const DashboardPageSkeleton: React.FC<{
  title?: string;
  subtitle?: string;
  icon?: React.ElementType;
}> = ({ title, subtitle, icon: IconComponent = GraduationCap }) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-wider mb-1">
            {IconComponent && <IconComponent className="w-4 h-4 text-sky-500 shrink-0" />}
            <span>{title || 'Dashboard'}</span>
          </div>
          <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800/80 rounded-lg animate-pulse mb-1.5" />
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
            {subtitle || 'Real-time overview of academic progress, census, and operations...'}
          </p>
        </div>
        <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800/80 rounded-xl animate-pulse shrink-0" />
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800/80" />
              <div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-slate-800/80" />
            </div>
            <div className="space-y-1">
              <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800/80 rounded-lg" />
              <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800/80 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* 2-Column Split Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800/80 rounded" />
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800/80 rounded" />
          </div>
          <div className="h-56 w-full bg-slate-200 dark:bg-slate-800/80 rounded-xl" />
        </div>
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4 animate-pulse">
          <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800/80 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-12 w-full bg-slate-200 dark:bg-slate-800/80 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Timetable Calendar Grid Skeleton
 */
export const TimetablePageSkeleton: React.FC<{
  title?: string;
  subtitle?: string;
  icon?: React.ElementType;
}> = ({ title, subtitle, icon: IconComponent = GraduationCap }) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-wider mb-1">
            {IconComponent && <IconComponent className="w-4 h-4 text-sky-500 shrink-0" />}
            <span>{title || 'School Timetable'}</span>
          </div>
          <div className="h-6 w-60 bg-slate-200 dark:bg-slate-800/80 rounded-lg animate-pulse mb-1.5" />
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle || 'Loading teaching schedules...'}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800/80 rounded-xl animate-pulse" />
          <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800/80 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Timetable Weekly Grid (5 columns, 7 period rows) */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] shadow-xs overflow-hidden p-4 space-y-3">
        <div className="grid grid-cols-5 gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
            <div key={day} className="h-6 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((period) => (
            <div key={period} className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((d) => (
                <div key={d} className="h-16 bg-slate-200 dark:bg-slate-800/80 rounded-xl animate-pulse p-2 space-y-1.5">
                  <div className="h-3 w-16 bg-slate-300 dark:bg-slate-700/80 rounded" />
                  <div className="h-2.5 w-12 bg-slate-300 dark:bg-slate-700/80 rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Settings & Form Page Skeleton
 */
export const FormPageSkeleton: React.FC<{
  title?: string;
  subtitle?: string;
  icon?: React.ElementType;
}> = ({ title, subtitle, icon: IconComponent = GraduationCap }) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between p-4 sm:p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-wider mb-1">
            {IconComponent && <IconComponent className="w-4 h-4 text-sky-500 shrink-0" />}
            <span>{title || 'Settings'}</span>
          </div>
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800/80 rounded-lg animate-pulse mb-1.5" />
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle || 'Configure system preferences...'}</p>
        </div>
        <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800/80 rounded-xl animate-pulse" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4 animate-pulse">
            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800/80 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800/80 rounded" />
                <div className="h-10 w-full bg-slate-200 dark:bg-slate-800/80 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800/80 rounded" />
                <div className="h-10 w-full bg-slate-200 dark:bg-slate-800/80 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Universal PageLoadingWrapper
 * Replaces the old centered popup "SYNCHRONIZING" animation with layout-preserving
 * skeletons matching the exact page UI structure.
 */
export const PageLoadingWrapper: React.FC<PageLoadingWrapperProps> = ({
  isLoading,
  title,
  subtitle,
  icon,
  skeleton,
  variant,
  statCount = 4,
  rowCount = 8,
  children,
}) => {
  if (isLoading) {
    if (skeleton) {
      return <>{skeleton}</>;
    }

    const t = (title || '').toLowerCase();

    // Auto-detect layout variant from title if not explicitly set
    const effectiveVariant =
      variant ||
      (t.includes('dashboard') || t.includes('workstation') || t.includes('overview')
        ? 'dashboard'
        : t.includes('timetable')
        ? 'timetable'
        : t.includes('setting') || t.includes('profile')
        ? 'form'
        : 'table');

    if (effectiveVariant === 'dashboard') {
      return <DashboardPageSkeleton title={title} subtitle={subtitle} icon={icon} />;
    }

    if (effectiveVariant === 'timetable') {
      return <TimetablePageSkeleton title={title} subtitle={subtitle} icon={icon} />;
    }

    if (effectiveVariant === 'form') {
      return <FormPageSkeleton title={title} subtitle={subtitle} icon={icon} />;
    }

    return (
      <TablePageSkeleton
        title={title}
        subtitle={subtitle}
        icon={icon}
        statCount={statCount}
        rowCount={rowCount}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Deprecated component alias:
 * If any modal or legacy component still imports PageLoadingProgress directly,
 * immediately render a fast skeleton placeholder without the blocking popup card.
 */
export const PageLoadingProgress: React.FC<PageLoadingProgressProps> = ({
  isLoading,
  title,
  subtitle,
  onComplete,
  icon: IconComponent = GraduationCap,
}) => {
  useEffect(() => {
    if (!isLoading) {
      onComplete?.();
    }
  }, [isLoading, onComplete]);

  return (
    <div className="w-full p-4 space-y-3 animate-in fade-in duration-150">
      <div className="flex items-center gap-2 mb-2">
        {IconComponent && <IconComponent className="w-4 h-4 text-sky-500 animate-pulse" />}
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{title || 'Loading...'}</span>
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-full bg-slate-200 dark:bg-slate-800/80 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
};
