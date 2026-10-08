import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Save, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 sm:space-y-6 max-w-5xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-xl border border-sky-100 rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <Calculator className="w-4 h-4 text-sky-600" />
            Financial Oversight & Billing Matrix
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">School Fee Structure & Term Billing Matrix</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Configure and edit term-by-term fees for all 4 education levels across Kenya's 3 official terms.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={submitting}
          className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-xs flex items-center gap-2 shadow-glass transition-all shrink-0 cursor-pointer"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{submitting ? 'Saving Changes...' : 'Save Fee Matrix'}</span>
        </button>
      </div>

      {/* Notice Banner */}
      <div className="p-3.5 sm:p-4 bg-sky-50/70 border border-sky-100 rounded-xl sm:rounded-2xl flex items-center gap-3 text-xs text-sky-900">
        <ShieldAlert className="w-5 h-5 shrink-0 text-sky-600" />
        <span>
          <strong>Head Teacher Authority Notice:</strong> Modifying fee structures updates term billing rates for all students across Pre-Primary, Lower Primary, Upper Primary, and JSS.
        </span>
      </div>

      {/* 3-Term Matrix Fee Table across All 4 Levels */}
      <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-sky-600" />
          3-Term Fee Structure Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
              <tr>
                <th className="py-3.5 px-4">Education Level</th>
                <th className="py-3.5 px-4">Target Grades</th>
                <th className="py-3.5 px-4 text-center">Term 1 Fee (KES)</th>
                <th className="py-3.5 px-4 text-center">Term 2 Fee (KES)</th>
                <th className="py-3.5 px-4 text-center">Term 3 Fee (KES)</th>
                <th className="py-3.5 px-4 text-right">Annual Total (KES)</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/60">
              {matrix.map((row) => {
                const t1Val = parseFloat(amounts[row.term1?.id] || '0') || 0;
                const t2Val = parseFloat(amounts[row.term2?.id] || '0') || 0;
                const t3Val = parseFloat(amounts[row.term3?.id] || '0') || 0;
                const annualSum = t1Val + t2Val + t3Val;

                const isSaving = savingRowCat === row.levelCategory;

                return (
                  <tr key={row.levelCategory} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-4 px-4 font-extrabold text-slate-800">
                      {row.title}
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-semibold">
                      {row.targetGrades}
                    </td>

                    {/* Term 1 Input */}
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400">KES</span>
                        <input
                          type="number"
                          value={amounts[row.term1?.id] ?? row.term1?.amount}
                          onChange={(e) => handleAmountChange(row.term1.id, e.target.value)}
                          className="w-24 text-right bg-white border border-sky-100 rounded-xl px-2.5 py-1.5 font-bold text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                        />
                      </div>
                    </td>

                    {/* Term 2 Input */}
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400">KES</span>
                        <input
                          type="number"
                          value={amounts[row.term2?.id] ?? row.term2?.amount}
                          onChange={(e) => handleAmountChange(row.term2.id, e.target.value)}
                          className="w-24 text-right bg-white border border-sky-100 rounded-xl px-2.5 py-1.5 font-bold text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                        />
                      </div>
                    </td>

                    {/* Term 3 Input */}
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400">KES</span>
                        <input
                          type="number"
                          value={amounts[row.term3?.id] ?? row.term3?.amount}
                          onChange={(e) => handleAmountChange(row.term3.id, e.target.value)}
                          className="w-24 text-right bg-white border border-sky-100 rounded-xl px-2.5 py-1.5 font-bold text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                        />
                      </div>
                    </td>

                    {/* Computed Annual Total */}
                    <td className="py-4 px-4 text-right font-black text-sm text-sky-600">
                      KES {annualSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Row Action */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleSaveRow(row)}
                        disabled={isSaving}
                        className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center justify-center gap-1 mx-auto transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
    </motion.div>
  );
};
