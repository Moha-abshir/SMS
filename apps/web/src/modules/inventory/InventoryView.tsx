import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, CheckCircle, ArrowUpRight, RotateCcw, AlertTriangle, Layers, BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { formatDate } from '../../lib/formatters';
import { Modal } from '../../components/Modal';

export const InventoryView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Textbooks',
    description: '',
    totalQuantity: 1,
  });

  const [checkoutForm, setCheckoutForm] = useState({
    itemId: '',
    checkedOutTo: '',
    quantity: 1,
    expectedReturnDate: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itRes, chkRes] = await Promise.all([
        apiClient.get('/api/inventory/items'),
        apiClient.get('/api/inventory/checkouts'),
      ]);

      setItems(itRes.data.data || []);
      setCheckouts(chkRes.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiClient.post('/api/inventory/items', itemForm);
      toast.success('Inventory item cataloged');
      setShowItemModal(false);
      setItemForm({ name: '', category: 'Textbooks', description: '', totalQuantity: 1 });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutForm.itemId) {
      toast.error('Please select an inventory item');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/api/inventory/checkouts', checkoutForm);
      toast.success('Asset checkout recorded');
      setShowCheckoutModal(false);
      setCheckoutForm({ itemId: '', checkedOutTo: '', quantity: 1, expectedReturnDate: '', notes: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to checkout item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnItem = async (checkoutId: string) => {
    try {
      await apiClient.put(`/api/inventory/checkouts/${checkoutId}/return`);
      toast.success('Asset marked as returned');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process return');
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
      className="space-y-4 sm:space-y-6 max-w-6xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-950 dark:via-slate-900 dark:to-slate-900 text-white rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-600/15 dark:shadow-none border border-blue-500/30 dark:border-blue-900/40">
        <div>
          <div className="flex items-center gap-2 text-blue-100 dark:text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
            <Package className="w-4 h-4 text-blue-200 dark:text-blue-400" />
            Asset Management & Textbook Tracking
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">School Inventory & Asset Management</h2>
          <p className="text-xs text-blue-100 dark:text-slate-400 mt-1 font-medium max-w-xl">
            Catalog textbooks, classroom accessories & equipment, track staff checkouts, returns & overdue alerts.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setShowItemModal(true)}
            className="flex-1 sm:flex-initial justify-center min-h-[42px] px-4 py-2.5 bg-white/15 hover:bg-white/25 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-white dark:text-slate-200 border border-white/20 dark:border-slate-800 rounded-xl font-bold text-xs flex items-center gap-2 backdrop-blur-md transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-blue-200 dark:text-blue-400" />
            Add Item
          </button>
          <button
            onClick={() => setShowCheckoutModal(true)}
            className="flex-1 sm:flex-initial justify-center min-h-[42px] px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-black/10 dark:shadow-blue-600/20 transition-all whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4" />
            Checkout Item
          </button>
        </div>
      </div>

      {/* Inventory Catalog Cards */}
      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Asset Catalog ({items.length} Registered Items)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {items.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400 italic">
              No inventory items cataloged yet. Click "Add Inventory Item" to register textbooks or supplies.
            </div>
          ) : (
            items.map((row) => (
              <div key={row.id} className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl space-y-2">
                <div className="flex justify-between items-start">
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-[10px] font-extrabold rounded-full uppercase">
                    {row.category}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    {row.availableQuantity} / {row.totalQuantity} Available
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{row.name}</h4>
                {row.description && <p className="text-[11px] text-slate-500 truncate">{row.description}</p>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Active Checkouts Table */}
      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-blue-600" />
          Asset Checkouts & Returns Register ({checkouts.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Item Name</th>
                <th className="py-3.5 px-4">Checked Out To</th>
                <th className="py-3.5 px-4 text-center">Qty</th>
                <th className="py-3.5 px-4">Checkout Date</th>
                <th className="py-3.5 px-4">Expected Return</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {checkouts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No active asset checkouts recorded yet.
                  </td>
                </tr>
              ) : (
                checkouts.map((row) => (
                  <tr key={row.checkout.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {row.item.name}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">
                      {row.checkout.checkedOutTo}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">{row.checkout.quantity}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">{formatDate(row.checkout.checkoutDate)}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {row.checkout.expectedReturnDate ? formatDate(row.checkout.expectedReturnDate) : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                        row.checkout.status === 'RETURNED'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                          : row.checkout.status === 'OVERDUE'
                          ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 animate-pulse'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                      }`}>
                        {row.checkout.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.checkout.status !== 'RETURNED' && (
                        <button
                          onClick={() => handleReturnItem(row.checkout.id)}
                          className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 font-bold text-[10px] rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Mark Returned
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      <Modal isOpen={showItemModal} onClose={() => setShowItemModal(false)} title="Catalog New Inventory Asset">
        <form onSubmit={handleCreateItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Item / Asset Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Grade 7 Mathematics Pupil's Book"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                required
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="Textbooks">Textbooks</option>
                <option value="Brooms">Brooms & Sweepers</option>
                <option value="Dustbins">Dustbins & Waste Bins</option>
                <option value="Classroom Accessories">Classroom Accessories (Chalk/Erasers)</option>
                <option value="Equipment">Sports & Science Equipment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Initial Quantity *
              </label>
              <input
                type="number"
                required
                min={1}
                value={itemForm.totalQuantity}
                onChange={(e) => setItemForm({ ...itemForm, totalQuantity: parseInt(e.target.value) || 1 })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Asset Serial Info
            </label>
            <input
              type="text"
              placeholder="e.g. KLB Edition 2026 Batch #04"
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowItemModal(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Save Asset Item
            </button>
          </div>
        </form>
      </Modal>

      {/* Checkout Asset Modal */}
      <Modal isOpen={showCheckoutModal} onClose={() => setShowCheckoutModal(false)} title="Checkout Asset to Teacher/Class">
        <form onSubmit={handleCreateCheckout} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Inventory Item *
            </label>
            <select
              required
              value={checkoutForm.itemId}
              onChange={(e) => setCheckoutForm({ ...checkoutForm, itemId: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="">-- Select Item --</option>
              {items.map((i) => (
                <option key={i.id} value={i.id} disabled={i.availableQuantity <= 0}>
                  {i.name} ({i.category}) — {i.availableQuantity} left
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Checked Out To (Teacher Name / Class) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mr. James (Grade 7 Teacher)"
                value={checkoutForm.checkedOutTo}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, checkedOutTo: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                required
                min={1}
                value={checkoutForm.quantity}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, quantity: parseInt(e.target.value) || 1 })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expected Return Date
            </label>
            <input
              type="date"
              value={checkoutForm.expectedReturnDate}
              onChange={(e) => setCheckoutForm({ ...checkoutForm, expectedReturnDate: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCheckoutModal(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Complete Checkout
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
