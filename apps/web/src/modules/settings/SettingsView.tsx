import { WorkspaceHeader } from '../../components/WorkspaceHeader';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { School, Save, Building, Phone, Calendar, Bell, CheckCircle, Upload, Image, Edit2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { formatDate } from '../../lib/formatters';
import { Modal } from '../../components/Modal';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';

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
    if (submitting) return;
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
    if (uploadingLogo) return;
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
    if (settingActiveTermId) return;
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
    if (!editingTerm || savingTerm) return;

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

  return (
    <PageLoadingWrapper
      isLoading={loading}
      title="School Governance Settings"
      subtitle="Loading institution branding, active terms, and system configurations..."
      icon={School}
    >
      <div className="workspace-page max-w-5xl mx-auto">
      {/* Header Banner */}
      <WorkspaceHeader icon={School} title="School Settings" description="Manage school identity, contact details, and academic terms.">
<span className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">{form.currentAcademicYear} academic year</span>
      </WorkspaceHeader>

      {/* Official School Logo Upload Card */}
      <div className="workspace-panel space-y-4 min-w-0">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Image className="w-4 h-4 text-sky-600" />
          School logo
        </h3>

        <div className="flex items-start gap-3 p-3 bg-sky-50/40 rounded-xl sm:rounded-lg border border-slate-200">
          <div className="relative w-16 h-16 rounded-lg bg-white border-2 border-dashed border-sky-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="School Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <School className="w-10 h-10 text-slate-300" />
            )}
            {uploadingLogo && (
              <div className="absolute inset-0 bg-white flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-2 text-left min-w-0 flex-1">
            <h4 className="text-sm font-bold text-slate-800">School crest</h4>
            <p className="text-xs text-slate-500">
              Used on the staff portal, invitations, and printed school documents.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <label className={`w-full sm:w-auto justify-center min-h-[42px] px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-2 transition-all ${
                uploadingLogo ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
              } `}>
                {uploadingLogo ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploadingLogo ? 'Uploading...' : 'Upload logo'}
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
      <form onSubmit={handleSubmit} className="workspace-page">
        {/* School Identity */}
        <div className="workspace-panel space-y-4 min-w-0">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Building className="w-4 h-4 text-sky-600" />
            School identity
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="workspace-panel space-y-4 min-w-0">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Phone className="w-4 h-4 text-sky-600" />
            Contact details
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* System Thresholds */}
        <div className="workspace-panel space-y-4 min-w-0">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Bell className="w-4 h-4 text-sky-600" />
            Academic defaults
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto justify-center min-h-[44px] px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {submitting ? 'Saving School Settings...' : 'Save School Settings'}
          </button>
        </div>
      </form>

      {/* Academic Term Manager Section */}
      <div className="workspace-panel space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            Kenyan 3-Term Schedule ({form.currentAcademicYear} Academic Year)
          </h3>
          <span className="self-start sm:self-auto px-3 py-1 bg-sky-50 text-sky-700 text-xs font-bold rounded-xl border border-slate-200">
            Standard 3-Term System
          </span>
        </div>

        <div className="overflow-x-auto max-w-full overscroll-x-contain workspace-table-scroll" role="region" aria-label="Scrollable table" tabIndex={0}>
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-6">Term Name</th>
                <th className="py-2.5 px-6">Start Date</th>
                <th className="py-2.5 px-6">End Date</th>
                <th className="py-2.5 px-6 text-center">Status</th>
                <th className="py-2.5 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {terms.map((t) => (
                <tr key={t.id} className="hover:bg-sky-50/40 transition-colors">
                  <td className="py-3 px-6 font-bold text-sm text-slate-800">
                    Term {t.termNumber}
                  </td>
                  <td className="py-3 px-6 text-slate-600 font-mono font-semibold">
                    {formatDate(t.startDate)}
                  </td>
                  <td className="py-3 px-6 text-slate-600 font-mono font-semibold">
                    {formatDate(t.endDate)}
                  </td>
                  <td className="py-3 px-6 text-center">
                    {t.isCurrent ? (
                      <span className="px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 font-bold text-[11px] rounded-full inline-flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-sky-600" /> Active Term
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-500 font-bold text-[11px] rounded-full">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {!t.isCurrent && (
                        <button
                          onClick={() => handleSetCurrentTerm(t.id)}
                          disabled={settingActiveTermId === t.id}
                          className="px-3 py-1.5 bg-sky-50 text-sky-700 border border-slate-200 hover:bg-sky-100 font-bold text-xs rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                        >
                          {settingActiveTermId === t.id && (
                            <div className="w-3 h-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin shrink-0" />
                          )}
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
          <form onSubmit={handleSaveTermDates} className="space-y-4 min-w-0">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Term Opening / Start Date *
              </label>
              <input
                type="date"
                required
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500"
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
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
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {savingTerm && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                {savingTerm ? 'Saving...' : 'Save Term Dates'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      </div>
    </PageLoadingWrapper>
  );
};
