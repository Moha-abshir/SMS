import React from 'react';

export type SkeletonLayout =
  | 'table'
  | 'dashboard'
  | 'timetable'
  | 'form'
  | 'cards'
  | 'statement'
  | 'audit'
  | 'report'
  | 'fees';
const block = 'rounded-md bg-slate-200 dark:bg-slate-800';
const panel =
  'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900';

/** In-place placeholders reserve the same responsive regions as the loaded content. */
export function ContentSkeleton({
  layout = 'table',
  rows = 5,
  stats = 0,
  header = false,
  filters = false,
}: {
  layout?: SkeletonLayout;
  rows?: number;
  stats?: number;
  header?: boolean;
  filters?: boolean;
}) {
  const metricCount =
    stats || (layout === 'dashboard' ? 8 : layout === 'report' ? 6 : 0);
  const bar = (width: string, height = 'h-3') => (
    <div className={`${block} ${height} ${width} max-w-full`} />
  );
  return (
    <div
      role="status"
      aria-label="Loading content"
      aria-busy="true"
      className="min-w-0 space-y-4 motion-safe:animate-pulse"
      data-skeleton-layout={layout}
    >
      <span className="sr-only">Loading content</span>
      <div aria-hidden="true" className="min-w-0 space-y-4">
        {header && (
          <div className="workspace-header">
            <div className="flex min-w-0 items-start gap-3">
              <div className={`${block} h-8 w-8 shrink-0`} />
              <div className="space-y-2">
                {bar('w-48', 'h-5')}
                {bar('w-64')}
              </div>
            </div>
            <div className={`${block} h-9 w-28`} />
          </div>
        )}
        {filters && (
          <div className={`${panel} grid gap-3 sm:grid-cols-2 lg:max-w-2xl`}>
            {[0, 1].map((i) => (
              <div className="space-y-2" key={i}>
                {bar('w-24')}
                <div className={`${block} h-10 w-full`} />
              </div>
            ))}
          </div>
        )}
        {metricCount > 0 && (
          <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${layout === 'report' ? 'lg:grid-cols-3' : 'xl:grid-cols-4'}`}>
            {Array.from({ length: metricCount }, (_, i) => (
              <div key={i} className={`${panel} space-y-3`}>
                {bar('w-32')}
                {bar('w-28', 'h-6')}
              </div>
            ))}
          </div>
        )}
        {layout === 'dashboard' ? (
          <>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`${block} h-9 w-36`} />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className={`${panel} space-y-4`}>
                  {bar('w-36', 'h-4')}
                  {Array.from({ length: 3 }, (_, j) => (
                    <div
                      key={j}
                      className="flex justify-between gap-4 border-t border-slate-100 py-3 dark:border-slate-800"
                    >
                      <div className="space-y-2">
                        {bar('w-36')}
                        {bar('w-24', 'h-2')}
                      </div>
                      {bar('w-20')}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : layout === 'fees' ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${panel} space-y-4`}>
                {bar('w-28', 'h-5')}
                {Array.from({ length: 4 }, (_, j) => (
                  <div key={j} className="space-y-2">
                    {bar('w-32')}
                    <div className={`${block} h-10 w-full`} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : layout === 'form' ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className={`${panel} space-y-5`}>
                {bar('w-40', 'h-4')}
                {Array.from({ length: 3 }, (_, j) => (
                  <div key={j} className="space-y-2">
                    {bar('w-24')}
                    <div className={`${block} h-10 w-full`} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : layout === 'timetable' ? (
          <div className={`${panel} space-y-5`}>
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="grid gap-3 border-b border-slate-100 pb-5 sm:grid-cols-[140px_1fr] dark:border-slate-800"
              >
                <div className="space-y-2">
                  {bar('w-16', 'h-2')}
                  {bar('w-24')}
                  {bar('w-20', 'h-2')}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[0, 1].map((j) => (
                    <div
                      key={j}
                      className="rounded-lg border border-slate-200 p-4 space-y-3 dark:border-slate-700"
                    >
                      {bar('w-24')}
                      {bar('w-40')}
                      {bar('w-32', 'h-2')}
                      <div className={`${block} h-8 w-full`} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : layout === 'cards' || layout === 'audit' ? (
          <div className="space-y-3">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className={`${panel} space-y-3`}>
                <div className="flex flex-wrap justify-between gap-3">
                  {bar('w-48', 'h-4')}
                  {bar('w-20')}
                </div>
                {bar('w-64', 'h-2')}
                {layout === 'cards' && (
                  <div className="flex gap-2">
                    <div className={`${block} h-8 w-24`} />
                    <div className={`${block} h-8 w-28`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={`${panel} min-w-0 space-y-4`}>
            {layout === 'statement' && (
              <div className="mx-auto space-y-3 py-3 max-w-sm">
                {bar('w-full', 'h-5')}
                {bar('w-full')}
                {bar('w-40')}
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-3">
              {bar('w-40', 'h-5')}
              <div className={`${block} h-9 w-48 max-w-full`} />
            </div>
            <div className="space-y-1">
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-slate-200 py-3 dark:border-slate-700">
                {[0, 1, 2].map((i) => (
                  <div key={i}>{bar('w-20', 'h-2')}</div>
                ))}
              </div>
              {Array.from({ length: rows }, (_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 py-4 dark:border-slate-800"
                >
                  <div className="space-y-2">
                    {bar('w-36')}
                    {bar('w-24', 'h-2')}
                  </div>
                  {bar('w-16')}
                  {bar('w-16')}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function layoutForPath(path: string): SkeletonLayout {
  if (path === '/overview') return 'dashboard';
  if (
    [
      '/expenses',
      '/other-income',
      '/class-exam-progress',
      '/marks-entry',
      '/marking-allocations',
    ].includes(path)
  )
    return 'cards';
  if (path === '/financial-reports') return 'report';
  if (path === '/fee-structures') return 'fees';
  if (path === '/finance-audit') return 'audit';
  if (path.includes('timetable') || path === '/exams') return 'timetable';
  if (path === '/settings' || path.includes('wizard') || path === '/login')
    return 'form';
  return 'table';
}
