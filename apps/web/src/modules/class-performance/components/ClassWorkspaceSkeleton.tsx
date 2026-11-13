import React from 'react';
import { Award, GraduationCap } from 'lucide-react';

export const ClassWorkspaceSkeleton: React.FC<{
  className?: string;
}> = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-200">
      {/* 1. Top Header Row Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Award className="w-4 h-4 text-sky-500 shrink-0" />
            <span>Class Performance Workspace</span>
          </div>
          <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800/80 rounded-lg animate-pulse mb-1.5" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="h-9 w-44 bg-slate-200 dark:bg-slate-800/80 rounded-xl animate-pulse" />
          <div className="h-9 w-36 bg-slate-200 dark:bg-slate-800/80 rounded-xl animate-pulse" />
          <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800/80 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* 2. Single-Row Operational Ribbon Skeleton (~52px, 5 slots, divide-x) */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800/80 dark:bg-[#111827] shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:divide-x divide-slate-100 dark:divide-slate-800/80">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse space-y-1.5 px-2">
              <div className="h-2.5 w-16 bg-slate-200 dark:bg-slate-800/80 rounded" />
              <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800/80 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Segmented Workspace Bar & Quick Filters Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
          <div className="h-8 w-44 bg-slate-200 dark:bg-slate-700/80 rounded-lg animate-pulse" />
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700/80 rounded-lg animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800/80 rounded-lg animate-pulse hidden md:block" />
          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800/80 rounded-lg animate-pulse hidden md:block" />
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800/80 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* 4. High-Density Broadsheet Table Skeleton (with matching sticky columns) */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] shadow-xs overflow-hidden">
        {/* Header row */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="h-3.5 w-36 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
          <div className="flex items-center gap-6">
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
          </div>
        </div>

        {/* 10 Detailed Row Shimmers */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3 min-w-[200px]">
                <div className="h-4 w-7 bg-slate-200 dark:bg-slate-800/80 rounded" />
                <div className="space-y-1">
                  <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-800/80 rounded" />
                  <div className="h-2.5 w-20 bg-slate-200 dark:bg-slate-800/80 rounded" />
                </div>
              </div>
              <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800/80 rounded" />
              <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800/80 rounded" />
              <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800/80 rounded hidden sm:block" />
              <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800/80 rounded hidden md:block" />
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800/80 rounded" />
              <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800/80 rounded-full" />
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800/80 rounded hidden lg:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
