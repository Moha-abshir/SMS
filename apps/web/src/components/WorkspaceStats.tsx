import React from 'react';

interface WorkspaceStat {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}

/** A compact summary that keeps long totals readable at phone widths. */
export const WorkspaceStats: React.FC<{ items: WorkspaceStat[] }> = ({ items }) => (
  <dl className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 lg:grid-cols-4">
    {items.map(item => (
      <div key={item.label} className="min-w-0 bg-white p-3 dark:bg-[#0c1830]">
        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</dt>
        <dd className="mt-1 text-base font-bold tabular-nums leading-snug text-slate-900 [overflow-wrap:anywhere] dark:text-slate-100 sm:text-lg">{item.value}</dd>
        {item.detail && <dd className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.detail}</dd>}
      </div>
    ))}
  </dl>
);
