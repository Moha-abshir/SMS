import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Plus, RotateCcw, Layers, BookOpen,
  Search, X, ChevronDown, ArrowUpRight, Pencil
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { formatDate } from '../../lib/formatters';
import { Modal } from '../../components/Modal';
import { SearchableSelect } from '../../components/SearchableSelect';

export const InventoryView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [allItemsForCheckout, setAllItemsForCheckout] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Pagination and database search state
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 5,
    offset: 0,
    hasMore: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Textbooks',
    description: '',
    totalQuantity: 1,
  });

  const [editForm, setEditForm] = useState({
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
  const [returningCheckoutId, setReturningCheckoutId] = useState<string | null>(null);

  // Initial load: 5 items catalog + checkouts + full items list for checkout dropdown + teachers
  const fetchData = async () => {
    try {
      setLoading(true);
      const [itRes, chkRes, allItRes, allocRes] = await Promise.all([
        apiClient.get('/api/inventory/items', { params: { limit: 5, offset: 0 } }),
        apiClient.get('/api/inventory/checkouts'),
        apiClient.get('/api/inventory/items', { params: { all: 'true' } }),
        apiClient.get('/api/allocations').catch(() => ({ data: { data: { teachers: [] } } })),
      ]);

      const initialBatch = (itRes.data.data || []).slice(0, 5);
      const totalCount = itRes.data.pagination?.total ?? (itRes.data.data || []).length;
      setItems(initialBatch);
      setPagination({
        total: totalCount,
        limit: 5,
        offset: 0,
        hasMore: initialBatch.length < totalCount,
      });
      setCheckouts(chkRes.data.data || []);
      setAllItemsForCheckout(allItRes.data.data || itRes.data.data || []);
      setTeachers(allocRes.data?.data?.teachers || []);
      setActiveSearch('');
      setSearchTerm('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Database search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSearching(true);
      const res = await apiClient.get('/api/inventory/items', {
        params: { search: searchTerm.trim() || undefined, limit: 5, offset: 0 },
      });
      const searchBatch = (res.data.data || []).slice(0, 5);
      const totalCount = res.data.pagination?.total ?? searchBatch.length;
      setItems(searchBatch);
      setPagination({
        total: totalCount,
        limit: 5,
        offset: 0,
        hasMore: searchBatch.length < totalCount,
      });
      setActiveSearch(searchTerm.trim());
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = async () => {
    setSearchTerm('');
    setActiveSearch('');
    try {
      setSearching(true);
      const res = await apiClient.get('/api/inventory/items', {
        params: { limit: 5, offset: 0 },
      });
      const initialBatch = (res.data.data || []).slice(0, 5);
      const totalCount = res.data.pagination?.total ?? initialBatch.length;
      setItems(initialBatch);
      setPagination({
        total: totalCount,
        limit: 5,
        offset: 0,
        hasMore: initialBatch.length < totalCount,
      });
    } catch (error: any) {
      toast.error('Failed to reset catalog list');
    } finally {
      setSearching(false);
    }
  };

  // Load More pagination - strictly 5 items increment
  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      const nextOffset = items.length;
      const res = await apiClient.get('/api/inventory/items', {
        params: {
          search: activeSearch || undefined,
          limit: 5,
          offset: nextOffset,
        },
      });

      const newItems = (res.data.data || []).slice(0, 5);
      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const filtered = newItems.filter((i: any) => !existingIds.has(i.id));
        return [...prev, ...filtered];
      });

      const totalCount = res.data.pagination?.total ?? pagination.total;
      const loadedCount = items.length + newItems.length;
      setPagination({
        total: totalCount,
        limit: 5,
        offset: nextOffset,
        hasMore: loadedCount < totalCount,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load more items');
    } finally {
      setLoadingMore(false);
    }
  };

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

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      category: item.category,
      description: item.description || '',
      totalQuantity: item.totalQuantity,
    });
    setShowEditModal(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      setSubmitting(true);
      await apiClient.put(`/api/inventory/items/${editingItem.id}`, editForm);
      toast.success('Inventory item details updated');
      setShowEditModal(false);
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update item details');
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
    if (!checkoutForm.checkedOutTo) {
      toast.error('Please select a teacher');
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
    if (returningCheckoutId) return;
    try {
      setReturningCheckoutId(checkoutId);
      await apiClient.put(`/api/inventory/checkouts/${checkoutId}/return`);
      toast.success('Asset marked as returned');
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process return');
    } finally {
      setReturningCheckoutId(null);
    }
  };

  const handleOpenCheckoutModal = async (preselectedItemId?: string) => {
    try {
      const [allRes, allocRes] = await Promise.all([
        apiClient.get('/api/inventory/items', { params: { all: 'true' } }),
        teachers.length === 0
          ? apiClient.get('/api/allocations').catch(() => ({ data: { data: { teachers: [] } } }))
          : Promise.resolve({ data: { data: { teachers } } }),
      ]);
      setAllItemsForCheckout(allRes.data.data || []);
      if (allocRes.data?.data?.teachers) {
        setTeachers(allocRes.data.data.teachers);
      }
    } catch {
      // Keep existing
    }
    setCheckoutForm({
      itemId: preselectedItemId || '',
      checkedOutTo: '',
      quantity: 1,
      expectedReturnDate: '',
      notes: '',
    });
    setShowCheckoutModal(true);
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
      className="space-y-4 sm:space-y-6 max-w-6xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-xl border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-widest mb-1">
            <Package className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            Asset Management & Textbook Tracking
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            School Inventory & Asset Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-xl">
            Catalog textbooks, classroom accessories & equipment, track staff checkouts, returns & overdue alerts.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setShowItemModal(true)}
            className="flex-1 sm:flex-initial justify-center min-h-[42px] px-4 py-2.5 bg-white dark:bg-[#0d1c38] border border-sky-200 dark:border-[#1d3863] hover:bg-sky-50 dark:hover:bg-[#13274c] text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            Add Item
          </button>
          <button
            onClick={() => handleOpenCheckoutModal()}
            className="flex-1 sm:flex-initial justify-center min-h-[42px] px-4 py-2.5 bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-glass transition-all whitespace-nowrap cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            Checkout Item
          </button>
        </div>
      </div>

      {/* Asset Catalog Section */}
      <div className="p-4 sm:p-6 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        {/* Header line with database search on the same line */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-sky-100/60 dark:border-[#162b4d]/70">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Asset Catalog ({pagination.total} Registered Items)</span>
            {activeSearch && (
              <span className="text-[11px] font-normal normal-case text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-[#072648] px-2 py-0.5 rounded-full border border-sky-100 dark:border-[#0c4a6e]">
                Filtered by "{activeSearch}"
              </span>
            )}
          </h3>

          {/* Database search bar at the top right of the list on the same line */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search database..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-44 sm:w-60 pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-[#0c1830] border border-sky-200/80 dark:border-[#1a335a] text-slate-800 dark:text-slate-100 rounded-xl placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500 transition-all shadow-xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={searching}
              className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
            >
              {searching ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Search</span>
            </button>
          </form>
        </div>

        {/* List Format View (Replacing 4-column Grid) */}
        <div className="divide-y divide-sky-100/70 dark:divide-[#162b4d] border border-sky-100 dark:border-[#162b4d] rounded-2xl overflow-hidden bg-white/70 dark:bg-[#091326]/60">
          {items.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {activeSearch ? `No inventory assets matched "${activeSearch}"` : 'No inventory items cataloged yet.'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {activeSearch ? (
                  <button
                    onClick={handleClearSearch}
                    className="text-sky-600 dark:text-sky-400 font-bold hover:underline cursor-pointer"
                  >
                    Clear search filter
                  </button>
                ) : (
                  'Click "Add Item" above to register new school textbooks or equipment.'
                )}
              </p>
            </div>
          ) : (
            items.map((row) => {
              const checkedOutCount = Math.max(0, row.totalQuantity - row.availableQuantity);
              const isOutOfStock = row.availableQuantity <= 0;
              const isLowStock = row.availableQuantity > 0 && row.availableQuantity <= 3;

              return (
                <div
                  key={row.id}
                  className="p-3.5 sm:p-4 hover:bg-sky-50/50 dark:hover:bg-[#0c1830] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Item Name, Category & Description beneath */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {row.name}
                      </h4>
                      <span className="px-2 py-0.5 bg-sky-50 dark:bg-[#072648] text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-[#0c4a6e] text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                        {row.category}
                      </span>
                    </div>
                    {/* User requirement: "The description column should be beneath the item name" */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {row.description ? (
                        row.description
                      ) : (
                        <span className="italic text-slate-400 dark:text-slate-600">No notes cataloged</span>
                      )}
                    </p>
                  </div>

                  {/* Quantities, Stock Status, and Checkout Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-sky-100/50 dark:border-[#162b4d]/50">
                    <div className="text-left sm:text-center min-w-[70px]">
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 block">
                        {row.availableQuantity} / {row.totalQuantity}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Available
                      </span>
                    </div>

                    <div className="text-left sm:text-center min-w-[50px]">
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 block">
                        {checkedOutCount}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        In Use
                      </span>
                    </div>

                    <div className="min-w-[85px] text-center">
                      <span
                        className={`inline-block px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase border ${
                          isOutOfStock
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50'
                            : isLowStock
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                        }`}
                      >
                        {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenEditModal(row)}
                      className="px-3 py-1.5 bg-sky-50 dark:bg-[#0d1c38] text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-[#1d3863] hover:bg-sky-100 dark:hover:bg-[#13274c] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
                      title="Edit details of this item"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Load More Button at the end of the list */}
        {pagination.hasMore && (
          <div className="pt-2 flex flex-col items-center gap-1.5">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-5 py-2.5 bg-white dark:bg-[#0d1c38] border border-sky-200 dark:border-[#1d3863] hover:bg-sky-50 dark:hover:bg-[#13274c] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loadingMore ? (
                <div className="w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              )}
              <span>Load More Items ({pagination.total - items.length} remaining)</span>
            </button>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Showing {items.length} of {pagination.total} cataloged assets
            </p>
          </div>
        )}
        {!pagination.hasMore && items.length > 0 && (
          <div className="pt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Showing all {items.length} of {pagination.total} cataloged assets
          </div>
        )}
      </div>

      {/* Active Checkouts Table */}
      <div className="p-4 sm:p-6 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          Asset Checkouts & Returns Register ({checkouts.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead className="bg-sky-50/80 dark:bg-[#0d1c38] text-sky-900 dark:text-[#7dd3fc] font-bold uppercase tracking-wider border-b border-sky-100 dark:border-[#162b4d]">
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
            <tbody className="divide-y divide-sky-100/60 dark:divide-[#132540]">
              {checkouts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500 italic">
                    No active asset checkouts recorded yet.
                  </td>
                </tr>
              ) : (
                checkouts.map((row) => (
                  <tr key={row.checkout.id} className="hover:bg-sky-50/40 dark:hover:bg-[#0c1830] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                      {row.item.name}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-sky-700 dark:text-sky-400">
                      {row.checkout.checkedOutTo}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-100">
                      {row.checkout.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono">
                      {formatDate(row.checkout.checkoutDate)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono">
                      {row.checkout.expectedReturnDate ? formatDate(row.checkout.expectedReturnDate) : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase border ${
                          row.checkout.status === 'RETURNED'
                            ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-[#072648] dark:text-sky-300 dark:border-[#0c4a6e]'
                            : row.checkout.status === 'OVERDUE'
                            ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 animate-pulse'
                            : 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-[#072648] dark:text-sky-300 dark:border-[#0c4a6e]'
                        }`}
                      >
                        {row.checkout.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.checkout.status !== 'RETURNED' && (
                        <button
                          onClick={() => handleReturnItem(row.checkout.id)}
                          disabled={returningCheckoutId === row.checkout.id}
                          className="px-2.5 py-1 bg-sky-50 dark:bg-[#0d1c38] text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-[#1d3863] hover:bg-sky-100 dark:hover:bg-[#13274c] font-bold text-[10px] rounded-lg transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {returningCheckoutId === row.checkout.id ? (
                            <div className="w-3 h-3 border-2 border-sky-600 dark:border-sky-400 border-t-transparent rounded-full animate-spin shrink-0" />
                          ) : (
                            <RotateCcw className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                          )}
                          <span>{returningCheckoutId === row.checkout.id ? 'Returning...' : 'Mark Returned'}</span>
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
              className="w-full bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <SearchableSelect
                required
                value={itemForm.category}
                onChange={(val) => setItemForm({ ...itemForm, category: val })}
                placeholder="-- Select Category --"
                searchPlaceholder="Search category..."
                options={[
                  { value: 'Textbooks', label: 'Textbooks (CBC Curriculum)' },
                  { value: 'Classroom Accessories', label: 'Classroom Accessories (Chalk/Erasers/Stationery)' },
                  { value: 'Equipment', label: 'Sports, Science Lab & Electronics Equipment' },
                  { value: 'Brooms', label: 'Brooms & Cleaning Gear' },
                  { value: 'Dustbins', label: 'Dustbins & Waste Bins' },
                ]}
              />
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
                className="w-full bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
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
              className="w-full bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sky-100 dark:border-[#162b4d]">
            <button
              type="button"
              onClick={() => setShowItemModal(false)}
              className="px-4 py-2 bg-white dark:bg-[#0d1c38] border border-sky-200 dark:border-[#1d3863] hover:bg-sky-50 dark:hover:bg-[#13274c] text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
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
            <SearchableSelect
              required
              value={checkoutForm.itemId}
              onChange={(val) => setCheckoutForm({ ...checkoutForm, itemId: val })}
              placeholder="-- Select Item --"
              searchPlaceholder="Search catalog items..."
              options={allItemsForCheckout.map((i) => ({
                value: i.id,
                label: i.name,
                badge: i.category,
                sublabel: `${i.availableQuantity} available in stock (Total: ${i.totalQuantity})`,
                disabled: i.availableQuantity <= 0,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Checked Out To (Teacher Name) *
              </label>
              <SearchableSelect
                required
                value={checkoutForm.checkedOutTo}
                onChange={(val) => setCheckoutForm({ ...checkoutForm, checkedOutTo: val })}
                placeholder="-- Select Teacher --"
                searchPlaceholder="Search teacher by name or phone..."
                options={teachers.map((t) => ({
                  value: `${t.firstName} ${t.lastName}`,
                  label: `${t.firstName} ${t.lastName}`,
                  badge: 'Teacher',
                  sublabel: t.phoneNumber ? `Phone: ${t.phoneNumber}` : (t.email || undefined),
                }))}
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
                className="w-full bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
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
              className="w-full bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sky-100 dark:border-[#162b4d]">
            <button
              type="button"
              onClick={() => setShowCheckoutModal(false)}
              className="px-4 py-2 bg-white dark:bg-[#0d1c38] border border-sky-200 dark:border-[#1d3863] hover:bg-sky-50 dark:hover:bg-[#13274c] text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Complete Checkout
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Item Details Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingItem(null);
        }}
        title="Edit Inventory Asset Details"
      >
        <form onSubmit={handleUpdateItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Item / Asset Name *
            </label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <SearchableSelect
                required
                value={editForm.category}
                onChange={(val) => setEditForm({ ...editForm, category: val })}
                placeholder="-- Select Category --"
                searchPlaceholder="Search category..."
                options={[
                  { value: 'Textbooks', label: 'Textbooks (CBC Curriculum)' },
                  { value: 'Classroom Accessories', label: 'Classroom Accessories (Chalk/Erasers/Stationery)' },
                  { value: 'Equipment', label: 'Sports, Science Lab & Electronics Equipment' },
                  { value: 'Brooms', label: 'Brooms & Cleaning Gear' },
                  { value: 'Dustbins', label: 'Dustbins & Waste Bins' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Quantity *
              </label>
              <input
                type="number"
                required
                min={editingItem ? Math.max(1, editingItem.totalQuantity - editingItem.availableQuantity) : 1}
                value={editForm.totalQuantity}
                onChange={(e) => setEditForm({ ...editForm, totalQuantity: parseInt(e.target.value) || 1 })}
                className="w-full bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
              />
              {editingItem && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Currently in use by teachers: {Math.max(0, editingItem.totalQuantity - editingItem.availableQuantity)}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes
            </label>
            <input
              type="text"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#1a335a] rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sky-100 dark:border-[#162b4d]">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setEditingItem(null);
              }}
              className="px-4 py-2 bg-white dark:bg-[#0d1c38] border border-sky-200 dark:border-[#1d3863] hover:bg-sky-50 dark:hover:bg-[#13274c] text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
