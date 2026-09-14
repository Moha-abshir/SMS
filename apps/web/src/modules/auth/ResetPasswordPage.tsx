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
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-slate-400 text-sm">Verifying security token...</p>
        </div>
      </div>
    );
  }

  if (!valid && !completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3.5 sm:p-6 bg-slate-950 text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-red-500/20 text-center shadow-2xl"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4 sm:mb-6">
            <XCircle className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Invalid or Expired Link</h2>
          <p className="text-slate-400 text-xs sm:text-sm mb-6 leading-relaxed">
            {errorMessage || 'This password reset link is invalid or has expired. Please request a new password reset link from the login page.'}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center w-full min-h-[44px] px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all"
          >
            Return to Login
          </a>
        </motion.div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3.5 sm:p-6 bg-slate-950 text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-emerald-500/20 text-center shadow-2xl"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto mb-4 sm:mb-6">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Password Reset Successful!</h2>
          <p className="text-slate-400 text-xs sm:text-sm mb-6 leading-relaxed">
            Your password has been changed. All active sessions have been logged out. Please sign in with your new password and complete 2FA verification.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20"
          >
            Proceed to Login <ChevronRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3.5 sm:p-6 bg-slate-950 text-white">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/80 backdrop-blur-xl p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl"
        >
          <div className="mb-5 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Create New Password</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Set a new password for <span className="text-blue-400 font-semibold break-all">{staffInfo?.email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-11 py-3 text-sm text-white placeholder-slate-600 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 min-w-[36px] min-h-[36px] flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-11 py-3 text-sm text-white placeholder-slate-600 transition-all outline-none"
                />
              </div>
            </div>

            <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300/90 leading-relaxed">
                After saving your new password, you will be directed to sign in. 2FA verification will be required during your next login.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] py-3 sm:py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
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
