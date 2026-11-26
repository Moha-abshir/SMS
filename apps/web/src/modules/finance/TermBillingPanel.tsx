import { ContentSkeleton } from '../../components/ContentSkeleton';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useApiResource } from '../../hooks/useApiResource';
import { apiClient } from '../../lib/apiClient';
import { RequestError } from '../../components/RequestError';
import { Modal } from '../../components/Modal';
export function TermBillingPanel({
  year,
  term,
  onGenerated,
}: {
  year: number;
  term: string;
  onGenerated: () => void;
}) {
  const preview = useApiResource<any>(
    term
      ? `/api/finance/billing-preview?academicYear=${year}&termNumber=${term}`
      : null,
    (v: any) =>
      typeof v?.eligible === 'number' &&
      typeof v?.canGenerate === 'boolean' &&
      Array.isArray(v?.missingFeeClasses),
  );
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  const data = preview.data;
  return (
    <section className="workspace-panel space-y-3 p-4">
      <h2 className="text-sm font-semibold">Term billing</h2>
      {!term && (
        <p className="text-sm text-slate-500">
          Select one term to review and generate bills.
        </p>
      )}
      {preview.loading && (
        <ContentSkeleton rows={1}/>
      )}
      {preview.error && (
        <RequestError message={preview.error} onRetry={preview.refresh} />
      )}
      {data && (
        <>
          <p className="text-sm leading-relaxed">
            {data.eligible} active learners · {data.alreadyBilled} already
            billed · {data.newBills} new bills (
            {`KES ${Number(data.totalNewAmount).toLocaleString()}`}).
          </p>
          {data.missingFeeClasses.length > 0 && (
            <p className="text-sm text-amber-600">
              Fees need configuration or head teacher approval:{' '}
              {data.missingFeeClasses.join(', ')}.
            </p>
          )}
          <p className="text-xs text-slate-500">
            Existing bills and payments stay unchanged. Run this again for
            learners admitted later in the term.
          </p>
          <button
            className="workspace-button-primary"
            disabled={busy || !data.canGenerate || !data.newBills}
            onClick={() => setConfirm(true)}
          >
            Review term bills
          </button>
        </>
      )}
      <Modal
        isOpen={confirm}
        onClose={() => !busy && setConfirm(false)}
        title="Generate term bills?"
      >
        <p className="mb-4 text-sm">
          Create {data?.newBills} bills for {year} Term {term}, totaling KES{' '}
          {Number(data?.totalNewAmount || 0).toLocaleString()}? Existing bills
          will be preserved.
        </p>
        <button
          className="workspace-button-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await apiClient.post('/api/finance/billing', {
                academicYear: year,
                termNumber: Number(term),
              });
              toast.success(`${result.data.data.created} term bills created.`);
              setConfirm(false);
              preview.refresh();
              onGenerated();
            } catch (e: any) {
              toast.error(
                e.response?.data?.message || 'Could not generate bills.',
              );
              preview.refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Generating…' : 'Confirm bill generation'}
        </button>
      </Modal>
    </section>
  );
}
