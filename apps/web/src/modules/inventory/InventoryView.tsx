import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, ArrowUpRight, CheckCircle2, AlertTriangle, RefreshCw, BookOpen, Layers } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';

export const InventoryView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'TEXTBOOK',
    description: '',
    totalQuantity: 1,
  });

  const [checkoutForm, setCheckoutForm] = useState({
    itemId: '',
    checkedOutTo: '',
    quantity: 1,
    checkoutDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemRes, chkRes] = await Promise.all([
        apiClient.get('/api/inventory/items'),
        apiClient.get('/api/inventory/checkouts'),
      ]);

      setItems(itemRes.data.data || []);
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
      toast.success('Inventory item cataloged successfully');
      setShowItemModal(false);
      setItemForm({ name: '', category: 'TEXTBOOK', description: '', totalQuantity: 1 });
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
      toast.error('Please select an item to check out');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/api/inventory/checkouts', checkoutForm);
      toast.success('Item checked out successfully');
      setShowCheckoutModal(false);
      setCheckoutForm({
        itemId: '',
        checkedOutTo: '',
        quantity: 1,
        checkoutDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: '',
        notes: '',
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnItem = async (checkoutId: string) => {
    try {
      await apiClient.put(`/api/inventory/checkouts/${checkoutId}/return`);
      toast.success('Item returned to inventory catalog');
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
      className="space-y-6 max-w-6xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl text-white shadow-xl shadow-blue-600/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">School Inventory & Asset Management</h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Track textbooks, classroom accessories, cleaning equipment, checkouts, and overdue items.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowItemModal(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 font-bold text-xs rounded-xl backdrop-blur-md flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Inventory Item
          </button>
          <button
            onClick={() => setShowCheckoutModal(true)}
            className="px-4 py-2.5 bg-white text-blue-600 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            Checkout Asset
          </button>
        </div>
      </div>

      {/* Inventory Catalog Cards */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Asset Catalog ({items.length} Registered Items)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400 italic">
              No inventory items cataloged yet. Click "Add Inventory Item" to register textbooks or supplies.
            </div>
          ) : (
            items.map((row) => (
              <div key={row.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
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

      {/* Active Checkouts & Overdue Log */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-indigo-600" />
          Active Asset Checkouts ({checkouts.length} History Logs)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
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
                    <td className="py-3.5 px-4 text-slate-500">{new Date(row.checkout.checkoutDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {row.checkout.expectedReturnDate ? new Date(row.checkout.expectedReturnDate).toLocaleDateString() : 'N/A'}
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
                          className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-lg hover:bg-emerald-100 flex items-center gap-1 mx-auto transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Return Item
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
              Asset Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Grade 7 Mathematics Textbook / Soft Broom"
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
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="TEXTBOOK">Textbooks & Readers</option>
                <option value="BROOM">Brooms & Sweeping</option>
                <option value="DUSTBIN">Dustbins & Waste</option>
                <option value="CLASSROOM_ACCESSORY">Classroom Accessories</option>
                <option value="EQUIPMENT">Lab / Sports Equipment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Quantity Stock *
              </label>
              <input
                type="number"
                min={1}
                required
                value={itemForm.totalQuantity}
                onChange={(e) => setItemForm({ ...itemForm, totalQuantity: parseInt(e.target.value) || 1 })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Edition / Publisher / Location"
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
              Save Item
            </button>
          </div>
        </form>
      </Modal>

      {/* Checkout Modal */}
      <Modal isOpen={showCheckoutModal} onClose={() => setShowCheckoutModal(false)} title="Checkout Asset to Teacher/Class">
        <form onSubmit={handleCreateCheckout} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Item *
            </label>
            <select
              required
              value={checkoutForm.itemId}
              onChange={(e) => setCheckoutForm({ ...checkoutForm, itemId: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="">-- Select Asset Item --</option>
              {items.map((i) => (
                <option key={i.id} value={i.id} disabled={i.availableQuantity <= 0}>
                  {i.name} ({i.availableQuantity} available)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Checked Out To (Teacher / Class / Dept) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mr. James (Grade 4 Teacher)"
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
                min={1}
                required
                value={checkoutForm.quantity}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, quantity: parseInt(e.target.value) || 1 })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Checkout Date *
              </label>
              <input
                type="date"
                required
                value={checkoutForm.checkoutDate}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, checkoutDate: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
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
              Confirm Checkout
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
