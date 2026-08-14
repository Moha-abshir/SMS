import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { School, Save, Building, Phone, Mail, MapPin, Calendar, Bell, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';

export const SettingsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/settings');
      if (res.data.data) {
        setForm({
          schoolName: res.data.data.schoolName || '',
          schoolMotto: res.data.data.schoolMotto || '',
          contactPhone: res.data.data.contactPhone || '',
          contactEmail: res.data.data.contactEmail || '',
          address: res.data.data.address || '',
          poBox: res.data.data.poBox || '',
          county: res.data.data.county || 'Uasin Gishu',
          logoUrl: res.data.data.logoUrl || '',
          absenceSmsThreshold: res.data.data.absenceSmsThreshold || 3,
          currentAcademicYear: res.data.data.currentAcademicYear || 2026,
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load school settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
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
              Configure official identity, contact details, academic year defaults, and system thresholds.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic School Identity Card */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            School Identity & Motto
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
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                School Motto
              </label>
              <input
                type="text"
                value={form.schoolMotto}
                onChange={(e) => setForm({ ...form, schoolMotto: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Contact & Location Details */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            Contact & Postal Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full pl-9 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full pl-9 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                P.O. Box Address
              </label>
              <input
                type="text"
                placeholder="P.O. Box 1234 - 30100, Eldoret"
                value={form.poBox}
                onChange={(e) => setForm({ ...form, poBox: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
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
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Physical Campus Address
              </label>
              <textarea
                rows={2}
                placeholder="Kisumu Road, Eldoret"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Academic Defaults & Operational Thresholds */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Academic Defaults & Thresholds
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Active Academic Year
              </label>
              <input
                type="number"
                value={form.currentAcademicYear}
                onChange={(e) => setForm({ ...form, currentAcademicYear: parseInt(e.target.value) || 2026 })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-500" /> Absence SMS Trigger Threshold (Days)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.absenceSmsThreshold}
                onChange={(e) => setForm({ ...form, absenceSmsThreshold: parseInt(e.target.value) || 3 })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Triggers consecutive absence warnings to parents when exceeded.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Action Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
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
    </motion.div>
  );
};
