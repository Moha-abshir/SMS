import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { GraduationCap, Lock, Mail, Key, ArrowRight, ShieldCheck, Eye, EyeOff, RefreshCw, School } from 'lucide-react';
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

  // View State
  const [view, setView] = useState<'login' | 'otp'>('login');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

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
      let apiUrl = import.meta.env.VITE_API_URL || '';
      if (apiUrl && !apiUrl.startsWith('http')) apiUrl = `https://${apiUrl}`;
      const response = await axios.post(`${apiUrl}/api/auth/login`, { email, password });
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
      let apiUrl = import.meta.env.VITE_API_URL || '';
      if (apiUrl && !apiUrl.startsWith('http')) apiUrl = `https://${apiUrl}`;
      const response = await axios.post(`${apiUrl}/api/auth/verify-2fa`, { email, otp: otpCode });
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
      let apiUrl = import.meta.env.VITE_API_URL || '';
      if (apiUrl && !apiUrl.startsWith('http')) apiUrl = `https://${apiUrl}`;
      const response = await axios.post(`${apiUrl}/api/auth/resend-otp`, { email });
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between relative overflow-hidden">
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 overflow-hidden p-1">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <School className="w-6 h-6" />
            )}
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{schoolName}</h1>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">CBC Primary & Junior Secondary</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Login Card with Slide-Up Transition */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl relative"
        >
          {/* School Uniform Blue Accent Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-blue-600/10 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-4 overflow-hidden p-2 shadow-inner">
              {logoUrl ? (
                <img src={logoUrl} alt="School Crest Logo" className="w-full h-full object-contain" />
              ) : (
                <ShieldCheck className="w-10 h-10" />
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{schoolName} Staff Portal</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter your registered email and password</p>
          </div>

          {view === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
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
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
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
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                A 6-digit 2FA verification code was sent to <strong className="font-bold">{email}</strong>.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
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
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 text-center font-mono tracking-widest font-bold text-lg transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all"
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
                  className="hover:underline font-bold text-slate-700 dark:text-slate-300"
                >
                  ← Back to Sign In
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendLoading}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                  <span>Resend Code</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 z-10">
        © 2026 {schoolName}. All rights reserved. Powered by AGY SMS.
      </footer>
    </div>
  );
};

export default LoginPage;
