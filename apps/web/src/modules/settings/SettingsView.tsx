import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { School, Save, Building, Phone, Calendar, Bell, CheckCircle, Upload, Image, Edit2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { formatDate } from '../../lib/formatters';
import { Modal } from '../../components/Modal';

export const SettingsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [settingActiveTermId, setSettingActiveTermId] = useState<string | null>(null);
  const [terms, setTerms] = useState<any[]>([]);

  // Edit Term Dates modal state
  const [editingTerm, setEditingTerm] = useState<any | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [savingTerm, setSavingTerm] = useState(false);

  const [form, setForm] = useState({
    schoolName: '',
    schoolMotto: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    poBox: '',
    county: 'Uasin Gishu',
    logoUrl: '',
    absenceSmsThreshold: 3,
    currentAcademicYear: 2026,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const settingsRes = await apiClient.get('/api/settings');
      let targetYear = 2026;

      if (settingsRes.data.data) {
        targetYear = settingsRes.data.data.currentAcademicYear || 2026;
        setForm({
          schoolName: settingsRes.data.data.schoolName || '',
          schoolMotto: settingsRes.data.data.schoolMotto || '',
          contactPhone: settingsRes.data.data.contactPhone || '',
          contactEmail: settingsRes.data.data.contactEmail || '',
          address: settingsRes.data.data.address || '',
          poBox: settingsRes.data.data.poBox || '',
          county: settingsRes.data.data.county || 'Uasin Gishu',
          logoUrl: settingsRes.data.data.logoUrl || '',
          absenceSmsThreshold: settingsRes.data.data.absenceSmsThreshold || 3,
          currentAcademicYear: targetYear,
        });
      }

      const termsRes = await apiClient.get(`/api/academic-terms?year=${targetYear}`);
      if (termsRes.data.data) {
        setTerms(termsRes.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load school settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiClient.put('/api/settings', form);
      toast.success('School settings updated successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('logo', file);

      const res = await apiClient.post('/api/settings/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newLogoUrl = res.data.data?.logoUrl;
      if (newLogoUrl) {
        setForm((prev) => ({ ...prev, logoUrl: newLogoUrl }));
        toast.success('School logo compressed and uploaded to Cloudflare R2!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSetCurrentTerm = async (termId: string) => {
    try {
      setSettingActiveTermId(termId);
      await apiClient.put(`/api/academic-terms/${termId}`, { isCurrent: true });
      toast.success('Current active term updated');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update current term');
    } finally {
      setSettingActiveTermId(null);
    }
  };

  const handleOpenEditTerm = (t: any) => {
    setEditingTerm(t);
    setEditStartDate(t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : '');
    setEditEndDate(t.endDate ? new Date(t.endDate).toISOString().split('T')[0] : '');
  };

  const handleSaveTermDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTerm) return;

    try {
      setSavingTerm(true);
      await apiClient.put(`/api/academic-terms/${editingTerm.id}`, {
        startDate: editStartDate,
        endDate: editEndDate,
      });
      toast.success(`Term ${editingTerm.termNumber} dates updated successfully`);
      setEditingTerm(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update term dates');
    } finally {
      setSavingTerm(false);
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
      className="space-y-4 sm:space-y-6 max-w-4xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-xl border border-sky-100 rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <School className="w-4 h-4 text-sky-600" />
            School Governance & System Settings
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">School Settings & Profile</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Configure official identity, logo branding, contact details, academic calendar, and Cloudflare R2 storage.
          </p>
        </div>

        <div className="flex items-center justify-around sm:justify-start gap-4 px-4 sm:px-5 py-2.5 sm:py-3 bg-sky-50/70 border border-sky-100 rounded-xl sm:rounded-2xl backdrop-blur-md w-full sm:w-auto shrink-0 shadow-xs">
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-bold text-sky-700 leading-none">{form.currentAcademicYear}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-1 block">Active Year</span>
          </div>
          <div className="w-[1px] h-8 bg-sky-200" />
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-bold text-sky-600 leading-none">3 Terms</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-1 block">Supported</span>
          </div>
        </div>
      </div>

      {/* Official School Logo Upload Card */}
      <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Image className="w-4 h-4 text-sky-600" />
          Official School Branding & Logo (Cloudflare R2 Storage)
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-sky-50/40 rounded-xl sm:rounded-2xl border border-sky-100">
          <div className="relative w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-sky-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="School Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <School className="w-10 h-10 text-slate-300" />
            )}
            {uploadingLogo && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <h4 className="text-sm font-bold text-slate-800">Upload Official School Crest / Logo</h4>
            <p className="text-xs text-slate-500">
              The logo is automatically compressed with Sharp and uploaded to Cloudflare R2 storage. It is displayed on the Login Screen, Sidebar Header, Accept Invitations, and Official Letterheads.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <label className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass cursor-pointer inline-flex items-center gap-2 transition-all">
                <Upload className="w-4 h-4" />
                {uploadingLogo ? 'Compressing & Uploading...' : 'Select & Upload Logo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={uploadingLogo}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* School Identity */}
        <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Building className="w-4 h-4 text-sky-600" />
            School Identity & Official Header Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official School Name *
              </label>
              <input
                type="text"
                required
                value={form.schoolName}
                onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                School Motto
              </label>
              <input
                type="text"
                value={form.schoolMotto}
                onChange={(e) => setForm({ ...form, schoolMotto: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                P.O. Box Address
              </label>
              <input
                type="text"
                placeholder="e.g. P.O. Box 7768 – 30100, Eldoret"
                value={form.poBox}
                onChange={(e) => setForm({ ...form, poBox: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                County / District
              </label>
              <input
                type="text"
                placeholder="e.g. Eldoret, Uasin Gishu"
                value={form.county}
                onChange={(e) => setForm({ ...form, county: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Phone className="w-4 h-4 text-sky-600" />
            Contact & Location Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Phone Number
              </label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Email Address
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Physical Address / Land Mark
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* System Thresholds */}
        <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Bell className="w-4 h-4 text-sky-600" />
            System Defaults & Automation Rules
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Default Academic Year
              </label>
              <input
                type="number"
                value={form.currentAcademicYear}
                onChange={(e) => setForm({ ...form, currentAcademicYear: parseInt(e.target.value) || 2026 })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Absence SMS Alert Threshold (Consecutive Days)
              </label>
              <input
                type="number"
                value={form.absenceSmsThreshold}
                onChange={(e) => setForm({ ...form, absenceSmsThreshold: parseInt(e.target.value) || 3 })}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto justify-center min-h-[44px] px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-2 transition-all cursor-pointer"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save School Settings
          </button>
        </div>
      </form>

      {/* Academic Term Manager Section */}
      <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            Kenyan 3-Term Schedule ({form.currentAcademicYear} Academic Year)
          </h3>
          <span className="self-start sm:self-auto px-3 py-1 bg-sky-50 text-sky-700 text-xs font-bold rounded-xl border border-sky-100">
            Standard 3-Term System
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
              <tr>
                <th className="py-3.5 px-6">Term Name</th>
                <th className="py-3.5 px-6">Start Date</th>
                <th className="py-3.5 px-6">End Date</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                <th className="py-3.5 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/60">
              {terms.map((t) => (
                <tr key={t.id} className="hover:bg-sky-50/40 transition-colors">
                  <td className="py-4 px-6 font-extrabold text-sm text-slate-800">
                    Term {t.termNumber}
                  </td>
                  <td className="py-4 px-6 text-slate-600 font-mono font-semibold">
                    {formatDate(t.startDate)}
                  </td>
                  <td className="py-4 px-6 text-slate-600 font-mono font-semibold">
                    {formatDate(t.endDate)}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {t.isCurrent ? (
                      <span className="px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 font-extrabold text-[11px] rounded-full inline-flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-sky-600" /> Active Term
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-500 font-bold text-[11px] rounded-full">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {!t.isCurrent && (
                        <button
                          onClick={() => handleSetCurrentTerm(t.id)}
                          disabled={settingActiveTermId === t.id}
                          className="px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                        >
                          {settingActiveTermId === t.id ? 'Setting...' : 'Set Active'}
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditTerm(t)}
                        className="px-3 py-1.5 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-sky-600" /> Edit Dates
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Term Dates Modal */}
      {editingTerm && (
        <Modal
          isOpen={!!editingTerm}
          onClose={() => setEditingTerm(null)}
          title={`Edit Term ${editingTerm.termNumber} Dates (${editingTerm.year})`}
        >
          <form onSubmit={handleSaveTermDates} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Term Opening / Start Date *
              </label>
              <input
                type="date"
                required
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Term Closing / End Date *
              </label>
              <input
                type="date"
                required
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setEditingTerm(null)}
                className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingTerm}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors"
              >
                {savingTerm && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Save Term Dates
              </button>
            </div>
          </form>
        </Modal>
      )}
    </motion.div>
  );
};
