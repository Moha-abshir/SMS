import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Printer, Plus, Trash2, Eye, School } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { formatDate } from '../../lib/formatters';
import { Modal } from '../../components/Modal';
import { printElement } from '../../lib/printElement';

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
    printElement('official-letter-paper', printModalData?.letter.title || 'Official Letter');
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
      {/* Print CSS isolation styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #official-letter-print-root, #official-letter-print-root * {
            visibility: visible;
          }
          #official-letter-print-root {
            position: fixed !important;
            inset: 0 !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 999999 !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #official-letter-paper {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 12mm 16mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-xl border border-sky-100 rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <FileText className="w-4 h-4 text-sky-600" />
            Official Communications & Correspondence
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Official Letter Generator & Archive</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Draft formal letters on official school letterhead and store archived communications.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-glass transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Generate New Letter
        </button>
      </div>

      {/* Letters List Table */}
      <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <FileText className="w-4 h-4 text-sky-600" />
          Archived Official Letters ({letters.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Subject Title</th>
                <th className="py-3.5 px-4">Recipient Name</th>
                <th className="py-3.5 px-4">Recipient Address</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/60">
              {letters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    No official letters generated yet. Click "Generate New Letter" to create your first letterhead.
                  </td>
                </tr>
              ) : (
                letters.map((letItem) => (
                  <tr key={letItem.id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-500 font-mono">
                      {formatDate(letItem.letterDate)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {letItem.title}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {letItem.recipientName || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {letItem.recipientAddress || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenPrintPreview(letItem.id)}
                          className="px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 font-bold text-[11px] rounded-xl transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-600" /> Preview / Print
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Letter Title / Subject Line *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Official Recommendation Letter for Learner Transfer"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recipient Name
              </label>
              <input
                type="text"
                placeholder="e.g. Mr. John Doe / To Whom It May Concern"
                value={form.recipientName}
                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recipient Address / Institution
              </label>
              <input
                type="text"
                placeholder="e.g. Ministry of Education / Eldoret"
                value={form.recipientAddress}
                onChange={(e) => setForm({ ...form, recipientAddress: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Official Letter Content / Body *
            </label>
            <textarea
              required
              rows={8}
              placeholder="Write the official body text of the letter here..."
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full bg-white border border-sky-100 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors"
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
          <div id="official-letter-print-root" className="space-y-3">
            <div className="no-print flex justify-end pb-1">
              <button
                onClick={triggerPrint}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print A4 Letter
              </button>
            </div>

            {/* Pure A4 Letter Paper Canvas on Desk Backdrop */}
            <div className="overflow-x-auto p-3 sm:p-6 bg-slate-200/70 dark:bg-[#060c18] rounded-2xl">
              <div
                id="official-letter-paper"
                className="physical-paper-document min-w-[580px] max-w-[760px] p-6 sm:p-12 md:p-14 bg-white text-black rounded-sm border border-slate-300 shadow-2xl shadow-black/40 space-y-6 mx-auto select-text"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  fontFamily: "'Times New Roman', Times, serif",
                  lineHeight: '1.6',
                  boxSizing: 'border-box',
                }}
              >
                {/* Header Letterhead */}
                <div className="flex items-center gap-4 sm:gap-5 border-b-2 border-slate-900 pb-4 text-left">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
                    {printModalData.settings.logoUrl ? (
                      <img src={printModalData.settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <School className="w-10 h-10 sm:w-12 sm:h-12 text-sky-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-slate-900 leading-tight">
                      {printModalData.settings.schoolName || 'ELDORET MUSLIM ACADEMY'}
                    </h1>
                    {printModalData.settings.schoolMotto && (
                      <p className="text-xs font-bold italic text-slate-700 mt-0.5">
                        "{printModalData.settings.schoolMotto}"
                      </p>
                    )}
                    <p className="text-[10px] sm:text-[11px] text-slate-700 pt-1">
                      {printModalData.settings.poBox ? printModalData.settings.poBox : 'P.O. Box 7768 – 30100, Eldoret'}
                      {printModalData.settings.county ? ` | ${printModalData.settings.county}` : ' | Eldoret, Uasin Gishu'}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-slate-700">
                      Tel: {printModalData.settings.contactPhone || '+254 714731331'} | Email: {printModalData.settings.contactEmail || 'eldoretmuslimacademy@gmail.com'}
                    </p>
                  </div>
                </div>

                {/* Date & Recipient */}
                <div className="flex justify-between text-xs font-semibold text-slate-800 pt-2">
                  <div>
                    <p className="font-bold text-slate-900 text-xs">To:</p>
                    <p className="font-bold text-sm text-slate-900">{printModalData.letter.recipientName || 'To Whom It May Concern'}</p>
                    {printModalData.letter.recipientAddress && <p className="text-slate-700 text-xs">{printModalData.letter.recipientAddress}</p>}
                  </div>
                  <div className="text-right text-xs">
                    <p><span className="font-bold">Date:</span> {formatDate(printModalData.letter.letterDate)}</p>
                    <p><span className="font-bold">Ref:</span> EMA/HT/{printModalData.letter.id.substring(0, 6).toUpperCase()}</p>
                  </div>
                </div>

              {/* Subject Title */}
              <div className="text-center py-2.5 border-y-2 border-slate-300 font-extrabold uppercase tracking-wider text-xs sm:text-sm text-slate-900">
                RE: {printModalData.letter.title}
              </div>

              {/* Letter Body */}
              <div className="text-xs sm:text-sm leading-relaxed text-slate-900 whitespace-pre-wrap min-h-[220px] py-2">
                {printModalData.letter.body}
              </div>

              {/* Footer Signature & School Stamp Block */}
              <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-6 text-xs text-slate-900">
                <div className="space-y-1">
                  <p className="font-semibold">Yours faithfully,</p>
                  <div className="pt-8">
                    <div className="border-b border-slate-800 w-44 mb-1" />
                    <p className="font-bold text-slate-900 uppercase text-[11px]">Headteacher's Signature</p>
                    <p className="text-slate-600 text-[11px] font-medium">{printModalData.settings.schoolName || 'Eldoret Muslim Academy'}</p>
                    <p className="text-[10px] text-slate-500 pt-2">Date: ________________________</p>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-end">
                  {/* Clean Empty Dashed Box for Physical Rubber Stamp */}
                  <div className="w-36 h-24 border-2 border-dashed border-slate-400 rounded-xl bg-transparent" />
                </div>
              </div>
            </div>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};
