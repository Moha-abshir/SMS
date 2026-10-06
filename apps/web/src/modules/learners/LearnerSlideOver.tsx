import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowLeft, BookOpen, MessageSquare, Phone, User,
  TrendingUp, TrendingDown, Minus, Send, CheckCircle2,
  AlertCircle, ShieldAlert, Award
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { isJuniorSecondaryClass } from '@school/shared/types';

interface LearnerSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  activePanel: 'profile' | 'contact';
  onPanelChange: (panel: 'profile' | 'contact') => void;
  preloadedLearner?: {
    studentId: string;
    fullName: string;
    className?: string;
    guardianName: string;
    guardianPhone: string;
    academicAverage?: number | null;
    assessmentNumber?: string;
    admissionNumber?: string;
    gender?: string;
  } | null;
}

export const LearnerSlideOver: React.FC<LearnerSlideOverProps> = ({
  isOpen,
  onClose,
  studentId,
  activePanel,
  onPanelChange,
  preloadedLearner,
}) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // Outreach / SMS state
  const [templateType, setTemplateType] = useState<
    'ACADEMIC_PROGRESS' | 'ATTENDANCE_CONCERN' | 'COMMENDATION' | 'CUSTOM_CONTROLLED'
  >('ACADEMIC_PROGRESS');
  const [customNote, setCustomNote] = useState('');
  const [sendingSms, setSendingSms] = useState(false);

  // Prevent background scroll when slide-over is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch student performance profile when studentId changes
  useEffect(() => {
    if (!studentId || !isOpen) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/api/teacher/learners/${studentId}/performance`);
        setProfile(res.data?.data);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load learner academic profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [studentId, isOpen]);

  if (!isOpen) return null;

  // Resolve learner details (from API profile or preloaded table row)
  const student = profile?.student || preloadedLearner || null;
  const studentName = student?.fullName || 'Learner Profile';
  const className = student?.className || preloadedLearner?.className || 'Class';
  const assessNo = student?.assessmentNumber || preloadedLearner?.assessmentNumber || '—';
  const admNo = student?.admissionNumber || preloadedLearner?.admissionNumber || '—';
  const guardianName = student?.guardianName || preloadedLearner?.guardianName || 'Parent / Guardian';
  const guardianPhone = student?.guardianPhone || preloadedLearner?.guardianPhone || '';
  const academicAverage = student?.academicAverage ?? preloadedLearner?.academicAverage ?? null;

  const isJunior = profile?.isJunior ?? isJuniorSecondaryClass({ name: className });

  // Generate live SMS preview
  const getSmsPreviewText = () => {
    const school = 'Eldoret Muslim Academy';
    switch (templateType) {
      case 'ACADEMIC_PROGRESS':
        return `${school} Academic Notice: Dear ${guardianName}, this is an academic update for ${studentName} (${className}). Recent assessment average: ${academicAverage ? `${academicAverage}%` : 'recorded'}. Regular assessments are ongoing. Please review their progress and encourage consistent study habits at home.`;
      case 'ATTENDANCE_CONCERN':
        return `${school} Attendance Notice: Dear ${guardianName}, ${studentName} has accumulated repeated absences in ${className}. Consistent class attendance is vital for learning. Please contact the class teacher urgently.`;
      case 'COMMENDATION':
        return `${school} Commendation: Dear ${guardianName}, we are pleased to commend ${studentName} (${className}) for commendable effort, diligence, and positive character in class. Keep up the great work!`;
      case 'CUSTOM_CONTROLLED':
        return `${school} Class Teacher Note: Dear ${guardianName} (re: ${studentName}), ${customNote.trim() || '[Your message note will appear here]'}`;
      default:
        return '';
    }
  };

  const smsPreview = getSmsPreviewText();
  const charCount = smsPreview.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  const handleSendSms = async () => {
    if (!studentId) return;
    if (templateType === 'CUSTOM_CONTROLLED' && !customNote.trim()) {
      toast.error('Please enter a note for the custom message');
      return;
    }

    setSendingSms(true);
    try {
      const payload = {
        studentId,
        templateType,
        customNote: templateType === 'CUSTOM_CONTROLLED' ? customNote.trim() : undefined,
      };

      const res = await apiClient.post('/api/teacher/send-learner-sms', payload);
      toast.success(res.data?.message || 'Guardian SMS notification dispatched successfully!');
      setCustomNote('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch SMS');
    } finally {
      setSendingSms(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
          {/* Responsive Slide-Over Sheet (Full screen on mobile, wide panel on monitor) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="w-screen h-full sm:max-w-2xl lg:max-w-3xl bg-white dark:bg-[#0c1830] border-l border-sky-100 dark:border-[#1a335a] shadow-2xl flex flex-col z-50"
          >
            {/* Top Navigation & Sticky Header */}
            <div className="p-4 sm:p-5 border-b border-sky-100 dark:border-[#1a335a] bg-white/95 dark:bg-[#0c1830]/95 backdrop-blur-md shrink-0 space-y-3">
              <div className="flex items-center justify-between gap-3">
                {/* Mobile Back button or Desktop Title */}
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="sm:hidden p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Back to Learners"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                    {studentName[0] || 'L'}
                  </div>

                  <div className="truncate min-w-0">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                      {studentName}
                    </h2>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5 truncate">
                      <span className="font-bold text-sky-600 dark:text-sky-400">{className}</span>
                      <span>•</span>
                      <span>Adm: {admNo}</span>
                      <span>•</span>
                      <span>Assess: {assessNo}</span>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Close Slide-Over (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Segmented Tab Switcher (Academic Profile vs Guardian Outreach) */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => onPanelChange('profile')}
                  className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activePanel === 'profile'
                      ? 'bg-white dark:bg-[#0c1830] text-sky-700 dark:text-sky-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>Academic Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => onPanelChange('contact')}
                  className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activePanel === 'contact'
                      ? 'bg-white dark:bg-[#0c1830] text-sky-700 dark:text-sky-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>Contact Guardian</span>
                </button>
              </div>
            </div>

            {/* Scrollable Slide-Over Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* TAB 1: ACADEMIC PROFILE */}
              {activePanel === 'profile' && (
                <div className="space-y-4">
                  {loading ? (
                    <div className="p-16 text-center text-slate-400 text-sm">
                      <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      Loading academic performance records...
                    </div>
                  ) : !profile ? (
                    <div className="p-12 text-center text-slate-400 text-sm">
                      No profile data available for this learner.
                    </div>
                  ) : (
                    <>
                      {/* Performance Trend Card */}
                      <div className="p-4 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Academic Assessment Standing
                          </span>
                          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-2">
                            <span>
                              {profile.academicAverage !== null && profile.academicAverage !== undefined
                                ? `${profile.academicAverage}%`
                                : 'Ongoing Assessment'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Trend:
                          </span>
                          {profile.trend === 'IMPROVING' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                              Improving
                            </span>
                          ) : profile.trend === 'DECLINING' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                              Declining
                            </span>
                          ) : profile.trend === 'STABLE' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              <Minus className="w-3.5 h-3.5 text-sky-600" />
                              Stable
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                              Recorded
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Guardian & Quick Contact Strip */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <User className="w-4 h-4 text-sky-500 shrink-0" />
                          <span>Primary Guardian:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{guardianName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-sky-500" />
                            {guardianPhone || 'No phone'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onPanelChange('contact')}
                            className="ml-2 px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 hover:bg-sky-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Send SMS
                          </button>
                        </div>
                      </div>

                      {/* Examination Assessments History */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                          <Award className="w-4 h-4 text-sky-500" />
                          Examination Assessments History
                        </h4>

                        {!profile.examHistory || profile.examHistory.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-sky-200 dark:border-slate-800 rounded-2xl">
                            No recorded examination scores for this learner yet.
                          </div>
                        ) : (
                          profile.examHistory.map((ex: any) => (
                            <div
                              key={ex.examId}
                              className="p-4 bg-white dark:bg-slate-900/60 border border-sky-100 dark:border-[#1a335a] rounded-2xl shadow-xs space-y-3"
                            >
                              <div className="flex items-center justify-between border-b border-sky-50 dark:border-slate-800 pb-2.5">
                                <div>
                                  <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {ex.examTitle}
                                  </h5>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Assessed in {ex.subjectCount} learning area(s)
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-base font-black text-sky-600 dark:text-sky-400">
                                    {ex.averageMark}%
                                  </span>
                                  <div className="text-[10px] text-slate-400">Exam Average</div>
                                </div>
                              </div>

                              {/* Subject scores table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left min-w-[480px]">
                                  <thead className="text-[10px] text-slate-400 font-bold uppercase border-b border-sky-50 dark:border-slate-800">
                                    <tr>
                                      <th className="py-2 px-2.5">Subject</th>
                                      <th className="py-2 px-2.5 text-center w-24">Score</th>
                                      <th className="py-2 px-2.5 text-center w-28">
                                        {isJunior ? 'Points (1–8)' : 'CBC Rubric'}
                                      </th>
                                      <th className="py-2 px-2.5">Teacher Remarks</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 font-medium">
                                    {ex.scores?.map((sc: any) => (
                                      <tr key={sc.subjectId} className="hover:bg-sky-50/30 dark:hover:bg-sky-950/20">
                                        <td className="py-2 px-2.5 font-semibold text-slate-800 dark:text-slate-200">
                                          {sc.subjectName}{' '}
                                          <span className="text-[10px] text-slate-400">({sc.subjectCode})</span>
                                        </td>
                                        <td className="py-2 px-2.5 text-center font-bold text-slate-900 dark:text-slate-100">
                                          {sc.marksObtained}{' '}
                                          <span className="text-[10px] text-slate-400 font-normal">/ {sc.maxMarks}</span>
                                        </td>
                                        <td className="py-2 px-2.5 text-center">
                                          {isJunior ? (
                                            sc.juniorPoints !== null && sc.juniorPoints !== undefined ? (
                                              <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                                  sc.juniorPoints === 8
                                                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                                    : sc.juniorPoints === 7
                                                    ? 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300'
                                                    : sc.juniorPoints === 6
                                                    ? 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300'
                                                    : sc.juniorPoints === 5
                                                    ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
                                                    : sc.juniorPoints === 4
                                                    ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                                    : sc.juniorPoints === 3
                                                    ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                                                    : sc.juniorPoints === 2
                                                    ? 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300'
                                                    : 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                                                }`}
                                              >
                                                {sc.juniorPoints} pts
                                              </span>
                                            ) : (
                                              <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                            )
                                          ) : sc.cbcRubricLevel ? (
                                            <span
                                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                                sc.cbcRubricLevel === 'EE'
                                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                                  : sc.cbcRubricLevel === 'ME'
                                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                                                  : sc.cbcRubricLevel === 'AE'
                                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                              }`}
                                            >
                                              {sc.cbcRubricLevel}
                                            </span>
                                          ) : (
                                            <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-2.5 text-slate-500 dark:text-slate-400 text-[11px]">
                                          {sc.teacherRemarks || '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: GUARDIAN OUTREACH / SMS */}
              {activePanel === 'contact' && (
                <div className="space-y-4">
                  {/* Recipient Card */}
                  <div className="p-4 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {guardianName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Primary Guardian of <strong className="text-sky-600 dark:text-sky-400">{studentName}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-[#0c1830] rounded-xl border border-sky-200 dark:border-slate-700 text-xs font-mono font-bold text-sky-700 dark:text-sky-300 shadow-xs">
                      <Phone className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      {guardianPhone || 'No Phone Registered'}
                    </div>
                  </div>

                  {/* Template Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Select Message Template
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        {
                          id: 'ACADEMIC_PROGRESS',
                          title: 'Academic Progress Update',
                          desc: 'Shares recent performance and study encouragement',
                        },
                        {
                          id: 'ATTENDANCE_CONCERN',
                          title: 'Attendance Concern Notice',
                          desc: 'Alerts guardian to repeated learner absences',
                        },
                        {
                          id: 'COMMENDATION',
                          title: 'Positive Commendation',
                          desc: 'Recognizes exceptional conduct and effort',
                        },
                        {
                          id: 'CUSTOM_CONTROLLED',
                          title: 'Custom Teacher Note',
                          desc: 'Brief personalized note with school branding',
                        },
                      ].map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setTemplateType(t.id as any)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            templateType === t.id
                              ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-500 shadow-xs'
                              : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-sky-200 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                            {t.title}
                            {templateType === t.id && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            {t.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom Note Input */}
                  {templateType === 'CUSTOM_CONTROLLED' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Custom Teacher Note
                      </label>
                      <textarea
                        rows={3}
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        placeholder="Write a clear, professional note for the guardian (e.g. Please send student with geometry set tomorrow)..."
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-sky-500 transition-colors"
                      />
                    </div>
                  )}

                  {/* Live SMS Preview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
                        Live SMS Preview
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {charCount} characters ({smsSegments} SMS)
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-black text-slate-100 font-mono text-xs border border-slate-800 leading-relaxed break-words shadow-inner">
                      {smsPreview}
                    </div>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                      SMS messages are dispatched directly to the guardian's verified mobile phone.
                    </p>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSendSms}
                      disabled={sendingSms || !guardianPhone}
                      className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingSms ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{sendingSms ? 'Sending SMS...' : 'Dispatch SMS to Guardian'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
export default LearnerSlideOver;
