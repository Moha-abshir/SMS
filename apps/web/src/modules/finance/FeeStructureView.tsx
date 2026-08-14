import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Save, CheckCircle, ShieldAlert, Edit2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';

interface FeeStructure {
  id: string;
  termId: string;
  levelCategory: 'PPE' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY' | 'JUNIOR';
  totalAmount: string;
}

export const FeeStructureView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [editingAmounts, setEditingAmounts] = useState<Record<string, string>>({});

  const levelCategoryLabels: Record<string, { title: string; subtitle: string }> = {
    PPE: { title: 'Pre-Primary Education (PPE)', subtitle: 'Playgroup, PP1, PP2' },
    LOWER_PRIMARY: { title: 'Lower Primary Education', subtitle: 'Grades 1, 2, and 3' },
    UPPER_PRIMARY: { title: 'Upper Primary Education', subtitle: 'Grades 4, 5, and 6' },
    JUNIOR: { title: 'Junior Secondary School (JSS)', subtitle: 'Grades 7, 8, and 9' },
  };

  const fetchFeeStructures = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/fee-structures');
      const items: FeeStructure[] = res.data.data?.structures || [];
      setStructures(items);

      const initialMap: Record<string, string> = {};
      items.forEach((item) => {
        initialMap[item.id] = item.totalAmount;
      });
      setEditingAmounts(initialMap);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load fee structures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeStructures();
  }, []);

  const handleSave = async (id: string) => {
    const amount = editingAmounts[id];
    if (!amount || isNaN(parseFloat(amount))) {
      toast.error('Please enter a valid numeric fee amount');
      return;
    }

    try {
      setSavingId(id);
      await apiClient.put(`/api/fee-structures/${id}`, { totalAmount: parseFloat(amount) });
      toast.success('Fee amount updated successfully');
      fetchFeeStructures();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update fee amount');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl text-white shadow-xl shadow-blue-600/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">School Fee Structure Management</h2>
            <p className="text-xs text-blue-100 mt-0.5">
              4-Tier Fee Configuration per Term (Playgroup/PPE, Lower Primary, Upper Primary, Junior Secondary).
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
        <span>
          <strong>Head Teacher Authority Notice:</strong> Fee structure modifications directly affect student term billings across all categories.
        </span>
      </div>

      {/* 4-Tier Editable Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-4 px-6">Education Level Category</th>
              <th className="py-4 px-6">Target Grades / Level</th>
              <th className="py-4 px-6 text-right">Term Total Fee (KES)</th>
              <th className="py-4 px-6 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {['PPE', 'LOWER_PRIMARY', 'UPPER_PRIMARY', 'JUNIOR'].map((cat) => {
              const item = structures.find((s) => s.levelCategory === cat);
              const label = levelCategoryLabels[cat] || { title: cat, subtitle: '' };
              const currentEdit = item ? editingAmounts[item.id] || item.totalAmount : '0';
              const isDirty = item && parseFloat(currentEdit) !== parseFloat(item.totalAmount);

              return (
                <tr key={cat} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                    {label.title}
                  </td>
                  <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-semibold">
                    {label.subtitle}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {item ? (
                      <div className="inline-flex items-center gap-2">
                        <span className="text-slate-400 font-bold">KES</span>
                        <input
                          type="number"
                          value={currentEdit}
                          onChange={(e) => setEditingAmounts({ ...editingAmounts, [item.id]: e.target.value })}
                          className="w-32 text-right bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 font-extrabold text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Not set</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {item && (
                      <button
                        onClick={() => handleSave(item.id)}
                        disabled={savingId === item.id || !isDirty}
                        className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 mx-auto transition-all ${
                          isDirty
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {savingId === item.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        Save
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
