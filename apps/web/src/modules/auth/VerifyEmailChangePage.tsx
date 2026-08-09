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
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-slate-400 text-sm">Verifying security token...</p>
        </div>
      </div>
    );
  }

  if (!valid && !completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-red-500/20 text-center shadow-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-6">
            <XCircle className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Invalid or Expired Verification Link</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            {errorMessage || 'This email verification link is invalid or has expired. Please request another verification link from your Head Teacher.'}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all"
          >
            Return to Login
          </a>
        </motion.div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-emerald-500/20 text-center shadow-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Email Updated Successfully!</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Your account email address has been updated to <strong className="text-emerald-400">{details?.newEmail}</strong>. All active sessions have been logged out for security.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20"
          >
            Proceed to Login <ChevronRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <GraduationCap className="w-10 h-10" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-2xl"
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Verify New Email Address</h1>
            <p className="text-slate-400 text-sm mt-1">
              Confirm updating email for <span className="text-white font-semibold">{details?.firstName} {details?.lastName}</span>
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Current Account Email</span>
                <span className="text-sm font-medium text-slate-400 line-through">{details?.oldEmail}</span>
              </div>
              <div className="flex justify-center my-1">
                <ArrowRight className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">New Verified Email</span>
                <span className="text-base font-bold text-white">{details?.newEmail}</span>
              </div>
            </div>

            <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300/90 leading-relaxed">
                Clicking confirm will update your existing account email address. No new account will be created.
              </p>
            </div>
          </div>

          <button
            onClick={handleConfirmUpdate}
            disabled={submitting}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
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
