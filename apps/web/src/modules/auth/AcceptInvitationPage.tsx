import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  GraduationCap,
  Clock,
  ShieldAlert,
  UserCheck,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

export const AcceptInvitationPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<any>(null);
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
        setErrorCode('INVITATION_INVALID');
        setError('Invalid invitation link. Email or security token parameter is missing.');
        setLoading(false);
        return;
      }

      try {
        const res = await apiClient.post('/api/auth/invitations/validate', { email, token });
        setInvitationData(res.data.data);
      } catch (err: any) {
        const data = err.response?.data;
        setErrorCode(data?.code || 'INVITATION_INVALID');
        setError(data?.message || 'Invalid or expired invitation link.');
        setErrorDetails(data?.details || null);
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
        password,
      });

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2500);
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.code && data.code !== 'INVITATION_INVALID') {
        setErrorCode(data.code);
        setErrorDetails(data.details);
      }
      setError(data?.message || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-50/50 via-white to-sky-50/30 text-slate-800 p-4">
        <div className="w-12 h-12 rounded-2xl bg-white/90 border border-sky-100 shadow-glass flex items-center justify-center mb-3">
          <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
        </div>
        <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
          Verifying Invitation Security Token...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3.5 sm:p-6 bg-gradient-to-br from-sky-50/50 via-white to-sky-50/30 text-slate-800">
      <div className="w-full max-w-md">
        {/* School Crest / Branding Icon */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-sky-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-glass border border-sky-100"
        >
          {/* ========================================================= */}
          {/* CASE 1: EXPIRED INVITATION (60 minutes passed)            */}
          {/* ========================================================= */}
          {error && errorCode === 'INVITATION_EXPIRED' && !invitationData ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-50 border border-amber-200/80 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                <Clock className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-2">
                  <Clock className="w-3 h-3 text-amber-600" /> Expired Security Window (60 Mins)
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Invitation Link Expired
                </h1>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200/70 rounded-xl text-left text-xs text-amber-900 leading-relaxed space-y-2">
                <p>
                  For institutional security, staff invitation links are strictly valid for <strong>60 minutes</strong> from issuance.
                </p>
                <p className="text-[11px] text-amber-800/90">
                  This invitation has expired and can no longer be used to activate an account.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-left text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>💡 How to proceed:</span>
                </p>
                <p>
                  Please contact your <strong>Headteacher</strong> or School Administrator to resend a new invitation link from the Staff Management console.
                </p>
              </div>

              <a
                href="/"
                className="inline-flex items-center justify-center w-full min-h-[44px] px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-all text-xs sm:text-sm shadow-md shadow-sky-500/20 cursor-pointer"
              >
                Return to Sign In
              </a>
            </div>
          ) : /* ========================================================= */
          /* CASE 2: CANCELLED INVITATION (Revoked by Headteacher)     */
          /* ========================================================= */
          error && errorCode === 'INVITATION_CANCELLED' && !invitationData ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-rose-50 border border-rose-200/80 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 mb-2">
                  <ShieldAlert className="w-3 h-3 text-rose-600" /> Invitation Revoked
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Invitation Cancelled
                </h1>
              </div>

              <div className="p-4 bg-rose-50/70 border border-rose-200/70 rounded-xl text-left text-xs text-rose-900 leading-relaxed space-y-2">
                <p>
                  This invitation was formally <strong>cancelled by the Headteacher / School Administration</strong>.
                </p>
                <p className="text-[11px] text-rose-800/90">
                  The security token attached to this invitation has been revoked. Account registration cannot proceed.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-left text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>💡 Have questions?</span>
                </p>
                <p>
                  If you believe this cancellation was made in error, please contact your school administration or Headteacher directly.
                </p>
              </div>

              <a
                href="/"
                className="inline-flex items-center justify-center w-full min-h-[44px] px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-all text-xs sm:text-sm shadow-md shadow-sky-500/20 cursor-pointer"
              >
                Return to Sign In
              </a>
            </div>
          ) : /* ========================================================= */
          /* CASE 3: ALREADY USED / ACCEPTED INVITATION                */
          /* ========================================================= */
          error && errorCode === 'INVITATION_ACCEPTED' && !invitationData ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-sky-50 border border-sky-200/80 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                <UserCheck className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200 mb-2">
                  <CheckCircle2 className="w-3 h-3 text-sky-600" /> Account Active
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Invitation Already Used
                </h1>
              </div>

              <div className="p-4 bg-sky-50/70 border border-sky-200/70 rounded-xl text-left text-xs text-sky-900 leading-relaxed space-y-2">
                <p>
                  This invitation has already been accepted and your staff account is active.
                </p>
                <p className="text-[11px] text-sky-800/90">
                  You do not need to register again. You can sign in immediately using your registered email and the password you created.
                </p>
              </div>

              <a
                href="/"
                className="inline-flex items-center justify-center w-full min-h-[44px] px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-all text-xs sm:text-sm shadow-md shadow-sky-500/20 gap-2 cursor-pointer"
              >
                <span>Sign In to Workstation</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ) : /* ========================================================= */
          /* CASE 4: GENERIC / INVALID / CORRUPTED TOKEN               */
          /* ========================================================= */
          error && !invitationData ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-rose-50 border border-rose-200/80 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                <XCircle className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 mb-2">
                  Invalid Link
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Invalid Invitation Link
                </h1>
              </div>

              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                {error || 'This invitation link is invalid or incomplete.'}
              </p>

              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-left text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">💡 What happened?</p>
                <p>
                  The URL may have been partially copied or altered. Please verify the complete link in your email or contact your Headteacher for assistance.
                </p>
              </div>

              <a
                href="/"
                className="inline-flex items-center justify-center w-full min-h-[44px] px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-all text-xs sm:text-sm shadow-md shadow-sky-500/20 cursor-pointer"
              >
                Return to Sign In
              </a>
            </div>
          ) : /* ========================================================= */
          /* CASE 5: SUCCESS STATE (Account Created)                    */
          /* ========================================================= */
          success ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-sky-50 border border-sky-200/80 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Account Created Successfully!
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Your staff credentials have been saved. Redirecting you to the workstation login...
              </p>
              <div className="pt-2">
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* CASE 6: VALID INVITATION FORM (Set Password)              */
            /* ========================================================= */
            <>
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 mb-2.5">
                  <span>60-Minute Security Window Active</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 tracking-tight">
                  Welcome to the Team!
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Hi <strong>{invitationData.firstName} {invitationData.lastName}</strong>, you have been invited as{' '}
                  <strong className="text-sky-700 font-bold">{invitationData.roleName?.replace(/_/g, ' ')}</strong>.
                  Please create a secure password to activate your workstation account.
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
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-1">
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
                      className="w-full pl-11 pr-12 py-3 sm:py-3.5 bg-white border border-sky-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all font-medium text-sm"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors min-w-[36px] min-h-[36px] justify-center cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-1">
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
                      className="w-full pl-11 pr-12 py-3 sm:py-3.5 bg-white border border-sky-200/80 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all font-medium text-sm"
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
                      Activating Account...
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
