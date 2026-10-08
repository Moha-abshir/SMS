import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, XCircle, ChevronRight, ShieldAlert, GraduationCap } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

export const ResetPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [staffInfo, setStaffInfo] = useState<{ firstName: string; lastName: string; email: string } | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Extract query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email') || '';
  const tokenParam = urlParams.get('token') || '';

  useEffect(() => {
    const verifyToken = async () => {
      if (!emailParam || !tokenParam) {
        setErrorMessage('This password reset link is invalid or incomplete.');
        setLoading(false);
        return;
      }

      try {
        const res = await apiClient.post('/api/auth/password-reset/verify', {
          email: emailParam,
          token: tokenParam,
        });

        if (res.data.success) {
          setStaffInfo(res.data.data);
          setValid(true);
        } else {
          setErrorMessage(res.data.message || 'This password reset link is invalid or has expired.');
        }
      } catch (err: any) {
        setErrorMessage(err.response?.data?.message || 'This password reset link is invalid or has expired. Please request another password reset.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [emailParam, tokenParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (password.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/api/auth/password-reset/complete', {
        email: emailParam,
        token: tokenParam,
        password,
      });

      if (res.data.success) {
        setCompleted(true);
      } else {
        alert(res.data.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50/50 via-white to-sky-50/30 text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
          <p className="text-slate-500 text-sm">Verifying security token...</p>
        </div>
      </div>
    );
  }

  if (!valid && !completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3.5 sm:p-6 bg-gradient-to-br from-sky-50/50 via-white to-sky-50/30 text-slate-800">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white/85 backdrop-blur-xl p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-rose-200 text-center shadow-glass"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto mb-4 sm:mb-6">
            <XCircle className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Invalid or Expired Link</h2>
          <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">
            {errorMessage || 'This password reset link is invalid or has expired. Please request a new password reset link from the login page.'}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center w-full min-h-[44px] px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-all shadow-md shadow-sky-500/20"
          >
            Return to Login
          </a>
        </motion.div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3.5 sm:p-6 bg-gradient-to-br from-sky-50/50 via-white to-sky-50/30 text-slate-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/85 backdrop-blur-xl p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-sky-100 text-center shadow-glass"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mx-auto mb-4 sm:mb-6">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Password Reset Successful!</h2>
          <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">
            Your password has been changed. All active sessions have been logged out. Please sign in with your new password and complete 2FA verification.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-all shadow-md shadow-sky-500/20"
          >
            Proceed to Login <ChevronRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3.5 sm:p-6 bg-gradient-to-br from-sky-50/50 via-white to-sky-50/30 text-slate-800">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-sky-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/85 backdrop-blur-xl p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-sky-100 shadow-glass"
        >
          <div className="mb-5 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Create New Password</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Set a new password for <span className="text-sky-600 font-semibold break-all">{staffInfo?.email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-white/90 border border-sky-200/70 focus:border-sky-400 focus:ring-2 focus:ring-sky-200 rounded-xl px-11 py-3 text-sm text-slate-900 placeholder-slate-400 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 min-w-[36px] min-h-[36px] flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full bg-white/90 border border-sky-200/70 focus:border-sky-400 focus:ring-2 focus:ring-sky-200 rounded-xl px-11 py-3 text-sm text-slate-900 placeholder-slate-400 transition-all outline-none"
                />
              </div>
            </div>

            <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
              <p className="text-xs text-sky-800 leading-relaxed">
                After saving your new password, you will be directed to sign in. 2FA verification will be required during your next login.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] py-3 sm:py-3.5 px-4 bg-sky-500 hover:bg-sky-600 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Saving Password...
                </>
              ) : (
                'Set New Password & Complete'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
