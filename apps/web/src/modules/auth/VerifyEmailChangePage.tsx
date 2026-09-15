import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle2, XCircle, Loader2, ChevronRight, ArrowRight, ShieldCheck, GraduationCap } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

export const VerifyEmailChangePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [details, setDetails] = useState<{ firstName: string; lastName: string; oldEmail: string; newEmail: string } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email') || '';
  const tokenParam = urlParams.get('token') || '';

  useEffect(() => {
    const verifyToken = async () => {
      if (!emailParam || !tokenParam) {
        setErrorMessage('This email change verification link is incomplete or invalid.');
        setLoading(false);
        return;
      }

      try {
        const res = await apiClient.post('/api/auth/email-change/verify', {
          email: emailParam,
          token: tokenParam,
        });

        if (res.data.success) {
          setDetails(res.data.data);
          setValid(true);
        } else {
          setErrorMessage(res.data.message || 'This email change verification link is invalid or has expired.');
        }
      } catch (err: any) {
        setErrorMessage(err.response?.data?.message || 'This email change verification link is invalid or has expired. Please contact your Head Teacher.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [emailParam, tokenParam]);

  const handleConfirmUpdate = async () => {
    setSubmitting(true);
    try {
      const res = await apiClient.post('/api/auth/email-change/complete', {
        email: emailParam,
        token: tokenParam,
      });

      if (res.data.success) {
        setCompleted(true);
      } else {
        alert(res.data.message || 'Failed to update email address.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update email address.');
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
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Invalid or Expired Verification Link</h2>
          <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">
            {errorMessage || 'This email verification link is invalid or has expired. Please request another verification link from your Head Teacher.'}
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
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Email Updated Successfully!</h2>
          <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">
            Your account email address has been updated to <strong className="text-sky-700 break-all">{details?.newEmail}</strong>. All active sessions have been logged out for security.
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
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Verify New Email Address</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Confirm updating email for <span className="text-slate-900 font-semibold">{details?.firstName} {details?.lastName}</span>
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-sky-50/50 rounded-2xl border border-sky-100 space-y-3">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Current Account Email</span>
                <span className="text-sm font-medium text-slate-500 line-through break-all">{details?.oldEmail}</span>
              </div>
              <div className="flex justify-center my-1">
                <ArrowRight className="w-4 h-4 text-sky-500" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">New Verified Email</span>
                <span className="text-sm sm:text-base font-bold text-slate-900 break-all">{details?.newEmail}</span>
              </div>
            </div>

            <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
              <p className="text-xs text-sky-800 leading-relaxed">
                Clicking confirm will update your existing account email address. No new account will be created.
              </p>
            </div>
          </div>

          <button
            onClick={handleConfirmUpdate}
            disabled={submitting}
            className="w-full min-h-[44px] py-3 sm:py-3.5 px-4 bg-sky-500 hover:bg-sky-600 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Updating Account Email...
              </>
            ) : (
              'Confirm & Update Account Email'
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
};
