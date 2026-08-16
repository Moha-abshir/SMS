import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Printer, Plus, Trash2, Eye, School } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { formatDate } from '../../lib/formatters';
import { Modal } from '../../components/Modal';

interface LetterItem {
  id: string;
  title: string;
  recipientName?: string;
  recipientAddress?: string;
  body: string;
  letterDate: string;
  status: string;
}

export const OfficialLetterView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [letters, setLetters] = useState<LetterItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [printModalData, setPrintModalData] = useState<{ letter: LetterItem; settings: any } | null>(null);

  const [form, setForm] = useState({
    title: '',
    recipientName: '',
    recipientAddress: '',
    body: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/official-letters');
      setLetters(res.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load official letters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLetters();
  }, []);

  const handleCreateLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiClient.post('/api/official-letters', form);
      toast.success('Official letter generated and archived');
      setShowCreateModal(false);
      setForm({ title: '', recipientName: '', recipientAddress: '', body: '' });
      fetchLetters();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate letter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPrintPreview = async (letterId: string) => {
    try {
      const res = await apiClient.get(`/api/official-letters/${letterId}/print`);
      setPrintModalData(res.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to prepare print preview');
    }
  };

  const handleDeleteLetter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this letter?')) return;
    try {
      await apiClient.delete(`/api/official-letters/${id}`);
      toast.success('Letter deleted');
      fetchLetters();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete letter');
    }
  };

  const triggerPrint = () => {
    window.print();
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
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* Print CSS isolation styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #official-letter-paper, #official-letter-paper * {
            visibility: visible !important;
          }
          #official-letter-paper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 15mm 15mm;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl text-white shadow-xl shadow-blue-600/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Official Letter Generator & Archive</h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Draft formal letters on official school letterhead and store archived communications.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-white text-blue-600 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Generate New Letter
        </button>
      </div>

      {/* Letters List Table */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Archived Official Letters ({letters.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Subject Title</th>
                <th className="py-3.5 px-4">Recipient Name</th>
                <th className="py-3.5 px-4">Recipient Address</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {letters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    No official letters generated yet. Click "Generate New Letter" to create your first letterhead.
                  </td>
                </tr>
              ) : (
                letters.map((letItem) => (
                  <tr key={letItem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-500 font-mono">
                      {formatDate(letItem.letterDate)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {letItem.title}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {letItem.recipientName || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {letItem.recipientAddress || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenPrintPreview(letItem.id)}
                          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview / Print
                        </button>
                        <button
                          onClick={() => handleDeleteLetter(letItem.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Letter Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Generate Official Letter" maxWidth="max-w-2xl">
        <form onSubmit={handleCreateLetter} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Letter Title / Subject Line *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Official Recommendation Letter for Learner Transfer"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recipient Name
              </label>
              <input
                type="text"
                placeholder="e.g. Mr. John Doe / To Whom It May Concern"
                value={form.recipientName}
                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recipient Address / Institution
              </label>
              <input
                type="text"
                placeholder="e.g. Ministry of Education / Eldoret"
                value={form.recipientAddress}
                onChange={(e) => setForm({ ...form, recipientAddress: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Official Letter Content / Body *
            </label>
            <textarea
              required
              rows={8}
              placeholder="Write the official body text of the letter here..."
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs text-slate-900 dark:text-white leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
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
              Generate & Archive
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable A4 Letterhead Preview Modal */}
      {printModalData && (
        <Modal isOpen={!!printModalData} onClose={() => setPrintModalData(null)} title="Official Letterhead Preview" maxWidth="max-w-3xl">
          <div className="space-y-3">
            <div className="no-print flex justify-end pb-1">
              <button
                onClick={triggerPrint}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Printer className="w-4 h-4" /> Print A4 Letter
              </button>
            </div>

            {/* Pure A4 Letter Paper Canvas */}
            <div id="official-letter-paper" className="p-8 sm:p-10 bg-white text-slate-900 rounded-xl border border-slate-200 shadow-md space-y-6 mx-auto">
              {/* Header Letterhead */}
              <div className="flex items-center gap-6 border-b-2 border-slate-900 pb-5 text-left">
                <div className="w-24 h-24 shrink-0 flex items-center justify-center">
                  {printModalData.settings.logoUrl ? (
                    <img src={printModalData.settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <School className="w-14 h-14 text-blue-700" />
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900 leading-tight">
                    {printModalData.settings.schoolName || 'ELDORET MUSLIM ACADEMY'}
                  </h1>
                  {printModalData.settings.schoolMotto && (
                    <p className="text-xs font-bold italic text-slate-700 mt-0.5">
                      "{printModalData.settings.schoolMotto}"
                    </p>
                  )}
                  <p className="text-xs text-slate-700 pt-1">
                    {printModalData.settings.poBox ? printModalData.settings.poBox : 'P.O. Box 7768 – 30100, Eldoret'}
                    {printModalData.settings.county ? ` | ${printModalData.settings.county}` : ' | Eldoret, Uasin Gishu'}
                  </p>
                  <p className="text-xs text-slate-700">
                    Tel: {printModalData.settings.contactPhone || '+254 714731331'} | Email: {printModalData.settings.contactEmail || 'eldoretmuslimacademy@gmail.com'}
                  </p>
                </div>
              </div>

              {/* Date & Recipient */}
              <div className="flex justify-between text-xs sm:text-sm font-semibold text-slate-800 pt-2">
                <div>
                  <p className="font-bold text-slate-900 text-xs">To:</p>
                  <p className="font-bold text-sm sm:text-base text-slate-900">{printModalData.letter.recipientName || 'To Whom It May Concern'}</p>
                  {printModalData.letter.recipientAddress && <p className="text-slate-700">{printModalData.letter.recipientAddress}</p>}
                </div>
                <div className="text-right">
                  <p><span className="font-bold">Date:</span> {formatDate(printModalData.letter.letterDate)}</p>
                  <p><span className="font-bold">Ref:</span> EMA/HT/{printModalData.letter.id.substring(0, 6).toUpperCase()}</p>
                </div>
              </div>

              {/* Subject Title */}
              <div className="text-center py-3 border-y-2 border-slate-300 font-extrabold uppercase tracking-wider text-sm sm:text-base text-slate-900">
                RE: {printModalData.letter.title}
              </div>

              {/* Letter Body */}
              <div className="text-xs sm:text-sm leading-relaxed text-slate-900 whitespace-pre-wrap min-h-[280px]">
                {printModalData.letter.body}
              </div>

              {/* Footer Signature */}
              <div className="pt-10 text-xs sm:text-sm text-slate-900 space-y-12">
                <div>
                  <p className="font-semibold">Yours faithfully,</p>
                  <div className="h-14 border-b border-dashed border-slate-400 w-56 mt-2" />
                  <p className="font-extrabold mt-2 text-slate-900">Headteacher</p>
                  <p className="text-slate-700 font-medium">{printModalData.settings.schoolName || 'Eldoret Muslim Academy'}</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};
