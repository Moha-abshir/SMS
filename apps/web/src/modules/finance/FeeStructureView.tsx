import { WorkspaceHeader } from '../../components/WorkspaceHeader';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Save, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';

interface MatrixRow {
  levelCategory: string;
  title: string;
  targetGrades: string;
  term1: { id: string; termId: string; amount: number };
  term2: { id: string; termId: string; amount: number };
  term3: { id: string; termId: string; amount: number };
  annualTotal: number;
}

export const FeeStructureView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingRowCat, setSavingRowCat] = useState<string | null>(null);

  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/fee-structures');
      const data = res.data.data;
      if (data) {
        setMatrix(data.matrix || []);

        const initialMap: Record<string, string> = {};
        (data.matrix || []).forEach((row: MatrixRow) => {
          if (row.term1?.id) initialMap[row.term1.id] = row.term1.amount.toString();
          if (row.term2?.id) initialMap[row.term2.id] = row.term2.amount.toString();
          if (row.term3?.id) initialMap[row.term3.id] = row.term3.amount.toString();
        });
        setAmounts(initialMap);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load fee structures matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const handleAmountChange = (id: string, value: string) => {
    setAmounts((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveRow = async (row: MatrixRow) => {
    if (savingRowCat) return;
    const updates = [];
    if (row.term1?.id) updates.push({ id: row.term1.id, totalAmount: parseFloat(amounts[row.term1.id] || '0') });
    if (row.term2?.id) updates.push({ id: row.term2.id, totalAmount: parseFloat(amounts[row.term2.id] || '0') });
    if (row.term3?.id) updates.push({ id: row.term3.id, totalAmount: parseFloat(amounts[row.term3.id] || '0') });

    try {
      setSavingRowCat(row.levelCategory);
      await apiClient.put('/api/fee-structures/batch', { updates });
      toast.success(`${row.title} fee structures saved successfully`);
      await fetchMatrix();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save fee structures');
    } finally {
      setSavingRowCat(null);
    }
  };

  const handleSaveAll = async () => {
    if (submitting) return;
    const updates: Array<{ id: string; totalAmount: number }> = [];
    Object.entries(amounts).forEach(([id, val]) => {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        updates.push({ id, totalAmount: num });
      }
    });

    if (updates.length === 0) return;

    try {
      setSubmitting(true);
      await apiClient.put('/api/fee-structures/batch', { updates });
      toast.success('All 3-term fee structures saved successfully!');
      await fetchMatrix();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to batch save fee structures');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLoadingWrapper
      isLoading={loading}
      title="Tuition & Fee Structures Matrix"
      subtitle="Loading 3-term fee schedules and pedagogical tier matrices..."
      icon={Calculator}
    >
      <div className="workspace-page max-w-5xl mx-auto">
      {/* Header Banner */}
      <WorkspaceHeader icon={Calculator} title="Fee Structures" description="Set term fees for each education level.">
<button
          onClick={handleSaveAll}
          disabled={submitting}
          className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{submitting ? 'Saving Changes...' : 'Save Fee Matrix'}</span>
        </button>
      </WorkspaceHeader>

      {/* Notice Banner */}
      <div className="p-3.5 sm:p-4 bg-sky-50/70 border border-slate-200 rounded-xl sm:rounded-lg flex items-center gap-3 text-xs text-sky-900">
        <ShieldAlert className="w-5 h-5 shrink-0 text-sky-600" />
        <span>
          <strong>Head Teacher Authority Notice:</strong> Modifying fee structures updates term billing rates for all students across Pre-Primary, Lower Primary, Upper Primary, and JSS.
        </span>
      </div>

      {/* 3-Term Matrix Fee Table across All 4 Levels */}
      <div className="workspace-panel space-y-4 min-w-0">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-sky-600" />
          3-Term Fee Structure Matrix
        </h3>

        <div className="space-y-3 sm:hidden">
          {matrix.map(row => (
            <section key={row.levelCategory} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.title}</h4>
                  <p className="mt-0.5 text-xs text-slate-500">{row.targetGrades}</p>
                </div>
                <button onClick={() => handleSaveRow(row)} disabled={savingRowCat !== null} className="min-h-11 rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white disabled:opacity-50">
                  {savingRowCat === row.levelCategory ? 'Saving…' : 'Save level'}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[row.term1, row.term2, row.term3].map((term, index) => (
                  <label key={index} className="min-w-0 text-xs text-slate-500">
                    Term {index + 1} (KES)
                    <input type="number" min="0" aria-label={`${row.title} Term ${index + 1} fee`} value={amounts[term?.id] ?? term?.amount} onChange={event => handleAmountChange(term.id, event.target.value)} className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold tabular-nums text-slate-900 dark:border-slate-700 dark:bg-[#081020] dark:text-slate-100" />
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">Annual total <strong className="float-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">KES {[row.term1, row.term2, row.term3].reduce((sum, term) => sum + (parseFloat(amounts[term?.id] || '0') || 0), 0).toLocaleString()}</strong></p>
            </section>
          ))}
        </div>
        <div className="hidden sm:block overflow-x-auto max-w-full overscroll-x-contain workspace-table-scroll" role="region" aria-label="Fee structures by level and term" tabIndex={0}>
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Education Level</th>
                <th className="py-2.5 px-4">Target Grades</th>
                <th className="py-2.5 px-4 text-center">Term 1 Fee (KES)</th>
                <th className="py-2.5 px-4 text-center">Term 2 Fee (KES)</th>
                <th className="py-2.5 px-4 text-center">Term 3 Fee (KES)</th>
                <th className="py-2.5 px-4 text-right">Annual Total (KES)</th>
                <th className="py-2.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrix.map((row) => {
                const t1Val = parseFloat(amounts[row.term1?.id] || '0') || 0;
                const t2Val = parseFloat(amounts[row.term2?.id] || '0') || 0;
                const t3Val = parseFloat(amounts[row.term3?.id] || '0') || 0;
                const annualSum = t1Val + t2Val + t3Val;

                const isSaving = savingRowCat === row.levelCategory;

                return (
                  <tr key={row.levelCategory} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {row.title}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-semibold">
                      {row.targetGrades}
                    </td>

                    {/* Term 1 Input */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400">KES</span>
                        <input
                          type="number"
                          value={amounts[row.term1?.id] ?? row.term1?.amount}
                          onChange={(e) => handleAmountChange(row.term1.id, e.target.value)}
                          className="w-24 text-right bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                        />
                      </div>
                    </td>

                    {/* Term 2 Input */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400">KES</span>
                        <input
                          type="number"
                          value={amounts[row.term2?.id] ?? row.term2?.amount}
                          onChange={(e) => handleAmountChange(row.term2.id, e.target.value)}
                          className="w-24 text-right bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                        />
                      </div>
                    </td>

                    {/* Term 3 Input */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400">KES</span>
                        <input
                          type="number"
                          value={amounts[row.term3?.id] ?? row.term3?.amount}
                          onChange={(e) => handleAmountChange(row.term3.id, e.target.value)}
                          className="w-24 text-right bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                        />
                      </div>
                    </td>

                    {/* Computed Annual Total */}
                    <td className="py-3 px-4 text-right font-black text-sm text-sky-600">
                      KES {annualSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Row Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleSaveRow(row)}
                        disabled={isSaving}
                        className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1 mx-auto transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </PageLoadingWrapper>
  );
};
