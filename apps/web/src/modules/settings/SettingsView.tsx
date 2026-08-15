import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { School, Save, Building, Phone, Mail, MapPin, Calendar, Bell, Plus, CheckCircle, Trash2, Upload, Image } from 'lucide-react';
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
  const [showTermModal, setShowTermModal] = useState(false);

  const [termForm, setTermForm] = useState({
    year: 2026,
    termNumber: 1,
    startDate: '',
    endDate: '',
    isCurrent: false,
  });

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
      const [settingsRes, termsRes] = await Promise.all([
        apiClient.get('/api/settings'),
        apiClient.get('/api/academic-terms'),
      ]);

      if (settingsRes.data.data) {
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
          currentAcademicYear: settingsRes.data.data.currentAcademicYear || 2026,
        });
      }

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

      const uploadedUrl = res.data.logoUrl;
      setForm((prev) => ({ ...prev, logoUrl: uploadedUrl }));
      toast.success('Official school logo uploaded & compressed successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/academic-terms', termForm);
      toast.success('Academic term created successfully');
      setShowTermModal(false);
      setTermForm({
        year: 2026,
        termNumber: 1,
        startDate: '',
        endDate: '',
        isCurrent: false,
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create term');
    }
  };

  const handleSetCurrentTerm = async (termId: string) => {
    try {
      setSettingActiveTermId(termId);
      await apiClient.put(`/api/academic-terms/${termId}`, { isCurrent: true });
      toast.success('Current academic term updated');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update current term');
    } finally {
      setSettingActiveTermId(null);
    }
  };

  const handleDeleteTerm = async (termId: string) => {
    if (!confirm('Are you sure you want to delete this term?')) return;
    try {
      await apiClient.delete(`/api/academic-terms/${termId}`);
      toast.success('Term deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete term');
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
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">School Settings & Profile</h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Configure official identity, logo branding, contact details, academic calendar, and Cloudflare R2 storage.
            </p>
          </div>
        </div>
      </div>

      {/* Official School Logo Upload Card */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Image className="w-4 h-4 text-blue-600" />
          Official School Branding & Logo (Cloudflare R2 Storage)
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <div className="relative w-24 h-24 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="School Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <School className="w-10 h-10 text-slate-300 dark:text-slate-700" />
            )}
            {uploadingLogo && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Upload Official School Crest / Logo</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The logo is automatically compressed with Sharp and uploaded to Cloudflare R2 storage. It is displayed on the Login Screen, Sidebar Header, Accept Invitations, and Official Letterheads.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer inline-flex items-center gap-2 transition-all">
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

              {form.logoUrl && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Logo Active
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic School Identity Card */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            School Profile Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official School Name *
              </label>
              <input
                type="text"
                required
                value={form.schoolName}
                onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                School Motto / Tagline
              </label>
              <input
                type="text"
                value={form.schoolMotto}
                onChange={(e) => setForm({ ...form, schoolMotto: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                P.O. Box Details
              </label>
              <input
                type="text"
                value={form.poBox}
                onChange={(e) => setForm({ ...form, poBox: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                County Location
              </label>
              <input
                type="text"
                value={form.county}
                onChange={(e) => setForm({ ...form, county: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-600" />
            Contact & Location Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Primary Phone Number
              </label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official Email Address
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Physical Address / Land Mark
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* System Thresholds */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            System Defaults & Automation Rules
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Default Academic Year
              </label>
              <input
                type="number"
                value={form.currentAcademicYear}
                onChange={(e) => setForm({ ...form, currentAcademicYear: parseInt(e.target.value) || 2026 })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Absence SMS Alert Threshold (Consecutive Days)
              </label>
              <input
                type="number"
                value={form.absenceSmsThreshold}
                onChange={(e) => setForm({ ...form, absenceSmsThreshold: parseInt(e.target.value) || 3 })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all"
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
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Academic Terms & Calendar Manager
          </h3>
          <button
            onClick={() => setShowTermModal(true)}
            className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Term
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Year</th>
                <th className="py-3.5 px-4">Term</th>
                <th className="py-3.5 px-4">Start Date</th>
                <th className="py-3.5 px-4">End Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {terms.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{t.year}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">Term {t.termNumber}</td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono font-medium">{formatDate(t.startDate)}</td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono font-medium">{formatDate(t.endDate)}</td>
                  <td className="py-3.5 px-4 text-center">
                    {t.isCurrent ? (
                      <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px] rounded-full inline-flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Active Term
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[10px] rounded-full">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {!t.isCurrent && (
                        <button
                          onClick={() => handleSetCurrentTerm(t.id)}
                          disabled={settingActiveTermId === t.id}
                          className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {settingActiveTermId === t.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              <span>Setting...</span>
                            </>
                          ) : (
                            <span>Set Active</span>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTerm(t.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Term Modal */}
      <Modal isOpen={showTermModal} onClose={() => setShowTermModal(false)} title="Create New Academic Term">
        <form onSubmit={handleCreateTerm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academic Year *
              </label>
              <input
                type="number"
                required
                value={termForm.year}
                onChange={(e) => setTermForm({ ...termForm, year: parseInt(e.target.value) || 2026 })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Term Number *
              </label>
              <select
                required
                value={termForm.termNumber}
                onChange={(e) => setTermForm({ ...termForm, termNumber: parseInt(e.target.value) || 1 })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value={1}>Term 1</option>
                <option value={2}>Term 2</option>
                <option value={3}>Term 3</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={termForm.startDate}
                onChange={(e) => setTermForm({ ...termForm, startDate: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={termForm.endDate}
                onChange={(e) => setTermForm({ ...termForm, endDate: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isCurrent"
              checked={termForm.isCurrent}
              onChange={(e) => setTermForm({ ...termForm, isCurrent: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isCurrent" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Set as current active term immediately
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowTermModal(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md"
            >
              Create Term
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
