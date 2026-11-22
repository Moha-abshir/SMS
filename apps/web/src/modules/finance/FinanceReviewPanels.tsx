import React, { useEffect, useState } from 'react';
import { useApiResource } from '../../hooks/useApiResource';
import { RequestError } from '../../components/RequestError';
export function ReconciliationPanel({ period }: { period: string }) {
  const report = useApiResource<any>(
    `/api/finance/reconciliation?${period}`,
    (v: any) =>
      typeof v?.mismatchCount === 'number' &&
      typeof v?.unlinkedPayments === 'number' &&
      Array.isArray(v?.items),
  );
  return (
    <section className="workspace-panel space-y-3 p-4">
      <h2 className="text-sm font-semibold">Internal balance checks</h2>
      <p className="text-xs leading-relaxed text-slate-500">
        Compares bill balances with recorded, unreversed payments. Compare the
        payment ledger against physical cash, bank statements and M-Pesa records
        separately.
      </p>
      {report.error && (
        <RequestError message={report.error} onRetry={report.refresh} />
      )}
      {report.loading && <p role="status">Checking balances…</p>}
      {report.data && (
        <>
          <p
            className={`text-sm ${report.data.mismatchCount || report.data.unlinkedPayments ? 'text-amber-600' : 'text-emerald-600'}`}
          >
            {report.data.mismatchCount} bill mismatch(es) ·{' '}
            {report.data.unlinkedPayments} payment(s) with missing or
            inconsistent bill links.
          </p>
          {report.data.items.length > 0 && (
            <p className="text-xs text-slate-500">
              Review these bill IDs with the head teacher; no automatic balance
              correction has been made:{' '}
              {report.data.items.map((row: any) => row.billId).join(', ')}.
              Showing up to {report.data.limit}.
            </p>
          )}
          <button
            className="workspace-button-secondary"
            onClick={report.refresh}
          >
            Recheck balances
          </button>
        </>
      )}
    </section>
  );
}
export function ReversalHistoryPanel({ period }: { period: string }) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [period]);
  const history = useApiResource<any>(
    `/api/finance/reversals/history?${period}&offset=${page * 25}`,
    (v: any) => Array.isArray(v?.items) && typeof v?.total === 'number',
  );
  return (
    <section className="workspace-panel space-y-4 p-4">
      <h2 className="text-sm font-semibold">Reversal decision history</h2>
      {history.error && (
        <RequestError message={history.error} onRetry={history.refresh} />
      )}
      {history.loading && <p role="status">Loading decisions…</p>}
      {history.data && !history.data.items.length && (
        <p className="text-sm text-slate-500">No decisions for this period.</p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {history.data?.items.map((row: any) => (
          <article
            key={row.id}
            className="min-w-0 space-y-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"
          >
            <p className="flex flex-wrap justify-between gap-2 font-semibold">
              <span>{row.receiptNumber}</span>
              <span>{row.status}</span>
            </p>
            <p className="break-words">Request: {row.reason}</p>
            <p className="break-words">
              Decision:{' '}
              {row.decisionReason || 'Legacy approval — reason not recorded'}
            </p>
            <p className="text-xs text-slate-500">
              Requested by {row.requestedBy}; reviewed by {row.decidedBy}.{' '}
              {row.decidedAt
                ? new Date(row.decidedAt).toLocaleString()
                : 'Legacy approval'}
            </p>
          </article>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span>
          {history.data?.total ?? 0} decisions · Page {page + 1}
        </span>
        <div className="flex gap-2">
          <button
            className="workspace-button-secondary"
            disabled={history.loading || !page}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous decisions
          </button>
          <button
            className="workspace-button-secondary"
            disabled={
              history.loading ||
              !history.data ||
              (page + 1) * 25 >= history.data.total
            }
            onClick={() => setPage((p) => p + 1)}
          >
            Next decisions
          </button>
        </div>
      </div>
    </section>
  );
}
