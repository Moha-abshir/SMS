import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { GraduationCap, Lock, Mail, Key, ArrowRight, ShieldCheck, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { ThemeToggle } from '../../components/ThemeToggle';

interface LoginPageProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // View State
  const [view, setView] = useState<'login' | 'otp'>('login');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

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
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">School Management System</h1>
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
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Staff Portal Sign In</h2>
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Proceed <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <motion.form 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleVerifyOtp} 
              className="space-y-4"
            >
              <div className="text-center py-2">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Key className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  We have sent a 6-digit verification code to <span className="font-semibold text-blue-600 dark:text-blue-400">{email || 'your email'}</span>.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  This code expires in 5 minutes.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 text-center">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center text-2xl font-mono tracking-[0.5em] py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length !== 6}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {otpLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Verify & Log In'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendLoading}
                  className="w-full py-3 px-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {resendLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Resend Code
                </button>
                
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2 text-center mt-2"
                >
                  Back to Login
                </button>
              </div>
            </motion.form>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-600">
        &copy; {new Date().getFullYear()} ELDORET MUSLIM ACADEMY
      </footer>
    </div>
  );
};
