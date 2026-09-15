import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, XCircle, ChevronRight, GraduationCap } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

export const AcceptInvitationPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Extract query params
  const searchParams = new URLSearchParams(window.location.search);
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  useEffect(() => {
    const validateToken = async () => {
      if (!email || !token) {
        setError('Invalid invitation link. Missing parameters.');
        setLoading(false);
        return;
      }

      try {
        const res = await apiClient.post('/api/auth/invitations/validate', { email, token });
        setInvitationData(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invalid or expired invitation link.');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [email, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      await apiClient.post('/api/auth/invitations/accept', {
        email,
        token,
        password
      });

      setSuccess(true);
      // Wait a moment before redirecting to login
      setTimeout(() => {
        window.location.href = '/'; // Go to login
      }, 3000);
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50/50 via-white to-sky-50/30 text-slate-800">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
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
          className="bg-white/85 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-glass border border-sky-100"
        >
          {error && !invitationData ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-rose-50 border border-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <XCircle className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Invitation Invalid</h1>
              <p className="text-slate-600 text-xs sm:text-sm">{error}</p>
              <a href="/" className="inline-flex items-center justify-center w-full min-h-[44px] px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-colors mt-4 text-sm shadow-md shadow-sky-500/20">
                Go to Login
              </a>
            </div>
          ) : success ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-sky-50 border border-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Account Created!</h1>
              <p className="text-slate-600 text-xs sm:text-sm">Your account has been successfully set up. Redirecting you to login...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Welcome aboard!</h1>
                <p className="text-slate-600 text-xs sm:text-sm">
                  Hi {invitationData.firstName}, you've been invited as a <strong className="text-sky-700 font-semibold">{invitationData.roleName}</strong>. Create your password to activate your account.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3.5 sm:p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs sm:text-sm font-medium flex items-start gap-3">
                  <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 pl-1 uppercase tracking-wider">
                    Create Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      className="w-full pl-11 pr-12 py-3 sm:py-3.5 bg-white/90 border border-sky-200/70 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all font-medium text-sm"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors min-w-[36px] min-h-[36px] justify-center"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 pl-1 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      className="w-full pl-11 pr-12 py-3 sm:py-3.5 bg-white/90 border border-sky-200/70 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all font-medium text-sm"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[44px] py-3 sm:py-3.5 px-6 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md shadow-sky-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group mt-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <span>Activate Account</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};
