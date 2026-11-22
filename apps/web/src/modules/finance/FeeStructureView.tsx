import { getPublicSettings } from '../../lib/publicSettings';
import React, { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { toast } from 'react-toastify';
import { useApiResource } from '../../hooks/useApiResource';
import { apiClient } from '../../lib/apiClient';
import { WorkspaceHeader } from '../../components/WorkspaceHeader';
import { RequestError } from '../../components/RequestError';
import { Modal } from '../../components/Modal';
type Cell = {
  id: string | null;
  termId: string | null;
  amount: number | null;
  approved: boolean;
};
type Row = {
  levelCategory: string;
  title: string;
  term1: Cell;
  term2: Cell;
  term3: Cell;
};
export const FeeStructureView: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  useEffect(() => {
    let active = true;
    getPublicSettings()
      .then((res) => {
        if (active && Number.isInteger(res.data?.data?.currentAcademicYear))
          setYear(res.data.data.currentAcademicYear);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const resource = useApiResource<{
    terms: any[];
    matrix: Row[];
    savedRates: any[];
  }>(
    `/api/fee-structures?year=${year}`,
    (v: any) =>
      Array.isArray(v?.matrix) &&
      Array.isArray(v?.terms) &&
      Array.isArray(v?.savedRates),
  );
  const [amounts, setAmounts] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [approveTerm, setApproveTerm] = useState<any>(null);
  const role = JSON.parse(localStorage.getItem('auth_user') || '{}');
  const isHead = (role.roleName || role.role) === 'HEAD_TEACHER';
  const key = (row: Row, index: number) => `${row.levelCategory}:${index}`;
  useEffect(() => {
    const values: Record<string, string> = {};
    for (const row of resource.data?.matrix || [])
      [row.term1, row.term2, row.term3].forEach((cell, index) => {
        values[key(row, index)] =
          cell.amount == null ? '' : String(cell.amount);
      });
    setAmounts(values);
  }, [resource.data]);
  const save = async () => {
    const updates = (resource.data?.matrix || []).flatMap((row) =>
      [row.term1, row.term2, row.term3].flatMap((cell, index) => {
        const value = amounts[key(row, index)] ?? '';
        if (!cell.termId || value === '') return [];
        if (cell.amount !== null && Number(value) === cell.amount) return [];
        return [
          {
            ...(cell.id
              ? { id: cell.id }
              : { termId: cell.termId, levelCategory: row.levelCategory }),
            totalAmount: value,
          },
        ];
      }),
    );
    if (!updates.length) {
      toast.info('There are no fee changes to save.');
      return;
    }
    setBusy(true);
    try {
      await apiClient.put('/api/fee-structures/batch', { updates });
      toast.success(
        'Fees saved for head teacher approval. Existing bills were not changed.',
      );
      resource.refresh();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save fees.');
    } finally {
      setBusy(false);
    }
  };
  const dirty = (resource.data?.matrix || []).some((row) =>
    [row.term1, row.term2, row.term3].some(
      (cell, index) =>
        (amounts[key(row, index)] ?? '') !==
        (cell.amount == null ? '' : String(cell.amount)),
    ),
  );
  return (
    <div className="workspace-page space-y-4">
      <WorkspaceHeader
        icon={Calculator}
        title="Fee Structures"
        description="Prepare term rates, approve them, then generate learner bills."
      >
        <button
          className="workspace-button-primary"
          disabled={busy || resource.loading || !resource.data || !dirty}
          onClick={save}
        >
          {busy ? 'Saving…' : 'Save fee changes'}
        </button>
      </WorkspaceHeader>
      <label className="block max-w-xs space-y-1 text-xs font-semibold">
        Academic year
        <input
          aria-label="Fee academic year"
          type="number"
          min="2000"
          max="2200"
          className="workspace-input w-full"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />
      </label>
      <p className="workspace-panel p-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Bursars prepare rates; the head teacher approves each term. Saving a
        changed amount removes its approval. Approved rates apply to newly
        generated bills; existing bills keep their original amounts.
      </p>
      {resource.error && (
        <RequestError message={resource.error} onRetry={resource.refresh} />
      )}
      {resource.loading && <p role="status">Loading fee schedules…</p>}
      {resource.data && !resource.data.terms.length && (
        <p className="workspace-panel p-4 text-sm">
          No academic terms exist for {year}. Ask the head teacher to configure
          the academic year in settings before entering fees.
        </p>
      )}
      {resource.data && (
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((number) => {
            const term = resource.data?.terms.find(
              (t) => t.termNumber === number,
            );
            return (
              <section
                key={number}
                className="workspace-panel min-w-0 space-y-4 p-4"
              >
                <h2 className="text-sm font-semibold">Term {number}</h2>
                {!term ? (
                  <p className="text-sm text-slate-500">Term not configured.</p>
                ) : (
                  (resource.data?.matrix || []).map((row) => {
                    const cell = [row.term1, row.term2, row.term3][number - 1];
                    return (
                      <label
                        key={row.levelCategory}
                        className="block space-y-1 text-xs"
                      >
                        <span className="flex flex-wrap justify-between gap-1">
                          <span>{row.title} (KES)</span>
                          <span
                            className={
                              cell.approved
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            }
                          >
                            {cell.approved
                              ? 'Approved'
                              : cell.id
                                ? 'Needs approval'
                                : 'Not configured'}
                          </span>
                        </span>
                        <input
                          aria-label={`${row.title} Term ${number} fee`}
                          type="number"
                          min="0"
                          max="99999999.99"
                          step="0.01"
                          className="workspace-input w-full"
                          value={amounts[key(row, number - 1)] ?? ''}
                          disabled={busy || resource.loading}
                          onChange={(e) =>
                            setAmounts((current) => ({
                              ...current,
                              [key(row, number - 1)]: e.target.value,
                            }))
                          }
                          placeholder="Enter an explicit amount"
                        />
                      </label>
                    );
                  })
                )}
                {isHead && term && (
                  <button
                    className="workspace-button-secondary w-full"
                    disabled={busy || dirty || resource.loading}
                    onClick={() => setApproveTerm(term)}
                  >
                    Review & approve Term {number}
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}
      <Modal
        isOpen={Boolean(approveTerm)}
        onClose={() => !busy && setApproveTerm(null)}
        title="Approve term fee rates?"
      >
        <p className="text-sm leading-relaxed">
          Approve the saved {year} Term {approveTerm?.termNumber} rates shown
          below for billing. Unconfigured levels will still block billing for
          their learners.
        </p>
        <ul className="my-4 space-y-2 text-sm">
          {(resource.data?.savedRates || [])
            .filter((row) => row.termId === approveTerm?.id)
            .map((row) => (
              <li key={row.id}>
                {row.className || row.levelCategory}: KES{' '}
                {Number(row.totalAmount).toLocaleString()}
              </li>
            ))}
        </ul>
        <button
          className="workspace-button-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await apiClient.post(
                `/api/fee-structures/terms/${approveTerm.id}/approve`,
                {
                  expected: (resource.data?.savedRates || [])
                    .filter((row) => row.termId === approveTerm.id)
                    .map(({ id, totalAmount }) => ({ id, totalAmount })),
                },
              );
              toast.success('Term fees approved.');
              setApproveTerm(null);
              resource.refresh();
            } catch (e: any) {
              toast.error(
                e.response?.data?.message || 'Could not approve fees.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Confirm fee approval
        </button>
      </Modal>
    </div>
  );
};
