import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { GraduationCap, Lock, Mail, Key, ArrowRight, ShieldCheck, Eye, EyeOff, RefreshCw, School, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { ThemeToggle } from '../../components/ThemeToggle';
import { apiClient } from '../../lib/apiClient';

interface LoginPageProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // School Public Info & Logo
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>('Eldoret Muslim Academy');

  // View State: 'login' | 'otp' | 'forgot_password'
  const [view, setView] = useState<'login' | 'otp' | 'forgot_password'>('login');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Forgot Password State
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    apiClient.get('/api/settings/public').then((res) => {
      if (res.data.data) {
        if (res.data.data.logoUrl) setLogoUrl(res.data.data.logoUrl);
        if (res.data.data.schoolName) setSchoolName(res.data.data.schoolName);
      }
    }).catch(() => {});
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warn('Please provide both email address and password');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/api/auth/login', { email, password });
      const data = response.data;

      if (data.requires2FA) {
        toast.info('2FA verification code sent to your email address!');
        setView('otp');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Unable to reach the server. Please try again later.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.warn('2FA code must be exactly 6 digits');
      return;
    }

    setOtpLoading(true);
    try {
      const response = await apiClient.post('/api/auth/verify-2fa', { email, otp: otpCode });
      const data = response.data;

      if (data.success) {
        toast.success(`Welcome back, ${data.user.firstName}!`);
        onLoginSuccess(data.user, data.token || data.tokens?.accessToken);
        return;
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Verification failed. Please try again.';
      toast.error(message);
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    try {
      const response = await apiClient.post('/api/auth/resend-otp', { email });
      if (response.data.success) {
        toast.success('A new verification code has been sent to your email.');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to resend code. Please try again.';
      toast.error(message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.warn('Please provide your staff email address');
      return;
    }

    setResetLoading(true);
    try {
      const response = await apiClient.post('/api/auth/password-reset/request', { email: resetEmail });
      if (response.data.success) {
        setResetSent(true);
        toast.success('Password reset link sent to your email.');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send password reset link. Please try again.';
      toast.error(message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50/40 via-white to-sky-50/30 flex flex-col justify-between relative overflow-x-hidden">
      {/* Top Navbar */}
      <header className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20 overflow-hidden p-1 shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <School className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">{schoolName}</h1>
            <p className="text-[11px] sm:text-xs text-sky-600 font-semibold truncate">CBC Primary & Junior Secondary</p>
          </div>
        </div>
      </header>

      {/* Main Login Card with Slide-Up Transition */}
      <main className="flex-1 flex items-center justify-center p-3.5 sm:p-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-md bg-white/85 backdrop-blur-xl border border-sky-100 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-glass relative"
        >
          {/* Sky Blue Accent Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 mx-auto mb-3 sm:mb-4 overflow-hidden p-2 shadow-xs">
              {logoUrl ? (
                <img src={logoUrl} alt="School Crest Logo" className="w-full h-full object-contain" />
              ) : (
                <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10" />
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {view === 'forgot_password' ? 'Reset Password' : view === 'otp' ? 'Security Verification' : `${schoolName} Staff Portal`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {view === 'forgot_password'
                ? 'Request a secure link to reset your account password'
                : view === 'otp'
                ? 'Enter the 6-digit verification code sent to your email'
                : 'Enter your registered email and password'}
            </p>
          </div>

          {view === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Staff Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@school.co.ke"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/90 border border-sky-200/70 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setResetSent(false);
                      setView('forgot_password');
                    }}
                    className="text-xs font-semibold text-sky-600 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-11 pr-12 py-3 bg-white/90 border border-sky-200/70 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] py-3 sm:py-3.5 bg-sky-500 hover:bg-sky-600 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Workstation</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : view === 'otp' ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-xs text-sky-800">
                A 6-digit 2FA verification code was sent to <strong className="font-bold">{email}</strong>.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Enter 6-Digit 2FA Code
                </label>
                <div className="relative">
                  <Key className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/90 border border-sky-200/70 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-center font-mono tracking-widest font-bold text-base sm:text-lg transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                className="w-full min-h-[44px] py-3 sm:py-3.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm rounded-xl shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {otpLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Verify 2FA Code & Sign In</span>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="hover:underline font-bold text-slate-700 min-h-[36px] flex items-center cursor-pointer"
                >
                  ← Back to Sign In
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendLoading}
                  className="text-sky-600 hover:underline font-bold flex items-center gap-1 min-h-[36px] cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                  <span>Resend Code</span>
                </button>
              </div>
            </form>
          ) : (
            /* Forgot Password View */
            <div className="space-y-5">
              {resetSent ? (
                <div className="space-y-5">
                  <div className="p-4 bg-sky-50/80 border border-sky-200/70 rounded-2xl text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-sky-900">Reset Link Sent</h3>
                    <p className="text-xs text-sky-800 leading-relaxed">
                      If an active account is registered with <strong className="font-semibold">{resetEmail}</strong>, a secure password reset link has been dispatched.
                    </p>
                    <p className="text-xs text-slate-500">
                      Please check your email inbox and click the link within 60 minutes.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setView('login');
                      setResetSent(false);
                    }}
                    className="w-full min-h-[44px] py-3 sm:py-3.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm rounded-xl shadow-md shadow-sky-500/20 transition-all cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestPasswordReset} className="space-y-5">
                  <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-xs text-sky-800 leading-relaxed">
                    Enter your registered staff email address and we will send you a secure link to reset your password.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Staff Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="teacher@school.co.ke"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-white/90 border border-sky-200/70 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-sm transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full min-h-[44px] py-3 sm:py-3.5 bg-sky-500 hover:bg-sky-600 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {resetLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send Reset Link</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setView('login')}
                      className="text-xs font-bold text-slate-600 hover:underline cursor-pointer min-h-[36px]"
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-3 sm:py-4 px-4 text-center text-xs text-slate-400 z-10">
        © 2026 {schoolName}. All rights reserved. Powered by AGY SMS.
      </footer>
    </div>
  );
};

export default LoginPage;
