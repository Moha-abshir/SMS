import React from 'react';

export const ClassWorkspaceSkeleton: React.FC<{
  className?: string;
}> = () => {
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden px-4 sm:px-5 py-3 space-y-3 animate-in fade-in duration-150">
      {/* 1. Flat Header Row Skeleton (Max Height: ~44px) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-44 bg-slate-200 dark:bg-slate-800/80 rounded-md animate-pulse" />
          <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse hidden sm:block" />
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse hidden md:block" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800/80 rounded-md animate-pulse hidden sm:block" />
          <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800/80 rounded-md animate-pulse" />
          <div className="h-8 w-36 bg-slate-200 dark:bg-slate-800/80 rounded-md animate-pulse hidden md:block" />
          <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800/80 rounded-md animate-pulse" />
          <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800/80 rounded-md animate-pulse" />
        </div>
      </div>

      {/* 2. Sleek Single-Line Ticker Ribbon Skeleton (Max Height: ~44px, 5 Slots) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-slate-200 dark:divide-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]/70 px-3 py-2 shadow-xs">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between px-3 animate-pulse">
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800/80 rounded" />
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800/80 rounded" />
          </div>
        ))}
      </div>

      {/* 3. Single-Row Controls Bar Skeleton (Max Height: ~36px) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <div className="h-8 w-36 bg-slate-200 dark:bg-slate-800/80 rounded-md animate-pulse" />
          <div className="h-8 w-36 bg-slate-200 dark:bg-slate-800/80 rounded-md animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5 flex-1 max-w-xl justify-end">
          <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800/80 rounded-full animate-pulse" />
          <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800/80 rounded-full animate-pulse" />
          <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800/80 rounded-full animate-pulse" />
          <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800/80 rounded-md animate-pulse ml-2" />
        </div>
      </div>

      {/* 4. High-Density Broadsheet Table Skeleton */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]/70 shadow-xs overflow-hidden">
        {/* Header row */}
        <div className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-3.5 w-10 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
            <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-8">
            <div className="h-3 w-14 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
            <div className="h-3 w-14 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
            <div className="h-3 w-14 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800/80 rounded animate-pulse" />
          </div>
        </div>

        {/* 12 Dense Row Shimmers */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="px-3 py-2 flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3 min-w-[180px]">
                <div className="h-3.5 w-6 bg-slate-200 dark:bg-slate-800/80 rounded" />
                <div className="space-y-1">
                  <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800/80 rounded" />
                  <div className="h-2 w-16 bg-slate-200 dark:bg-slate-800/80 rounded" />
                </div>
              </div>
              <div className="h-3 w-10 bg-slate-200 dark:bg-slate-800/80 rounded" />
              <div className="h-3 w-10 bg-slate-200 dark:bg-slate-800/80 rounded" />
              <div className="h-3 w-10 bg-slate-200 dark:bg-slate-800/80 rounded hidden sm:block" />
              <div className="h-3 w-10 bg-slate-200 dark:bg-slate-800/80 rounded hidden md:block" />
              <div className="h-3 w-10 bg-slate-200 dark:bg-slate-800/80 rounded hidden lg:block" />
              <div className="h-3 w-10 bg-slate-200 dark:bg-slate-800/80 rounded hidden lg:block" />
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800/80 rounded" />
              <div className="h-3.5 w-12 bg-slate-200 dark:bg-slate-800/80 rounded" />
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800/80 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
