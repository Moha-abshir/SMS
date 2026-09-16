import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Award, Calendar, BookOpen,
  Printer, User, Phone, CheckCircle2, AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Modal } from '../../components/Modal';
import { apiClient } from '../../lib/apiClient';

interface LearnerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
}

export const LearnerProfileModal: React.FC<LearnerProfileModalProps> = ({
  isOpen,
  onClose,
  studentId,
}) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!studentId || !isOpen) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/api/teacher/learners/${studentId}/performance`);
        setProfile(res.data?.data);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load learner performance profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [studentId, isOpen]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Learner Academic Profile & Performance History">
      <div className="space-y-5">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Loading learner performance history...
          </div>
        ) : !profile ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No profile data found for this learner.
          </div>
        ) : (
          <>
            {/* Student Header Card */}
            <div className="p-4 bg-gradient-to-br from-sky-50/70 via-white to-sky-50/40 border border-sky-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-bold text-base shadow-xs">
                  {profile.student.fullName[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {profile.student.fullName}
                  </h3>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="font-semibold text-sky-700">{profile.student.className}</span>
                    <span>•</span>
                    <span>Assess #: {profile.student.assessmentNumber || '—'}</span>
                    <span>•</span>
                    <span>Adm #: {profile.student.admissionNumber || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Trend Pill */}
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Performance Trend
                  </div>
                  <div className="mt-0.5">
                    {profile.trend === 'IMPROVING' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        Improving
                      </span>
                    ) : profile.trend === 'DECLINING' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                        Declining
                      </span>
                    ) : profile.trend === 'STABLE' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                        <Minus className="w-3.5 h-3.5 text-sky-600" />
                        Stable
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-semibold">1 Exam Recorded</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Guardian & Contact Card */}
            <div className="p-3 bg-slate-50/70 border border-sky-100 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <User className="w-4 h-4 text-sky-500" />
                <span>Primary Guardian:</span>
                <span className="font-bold text-slate-800">{profile.student.guardianName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-700 font-bold">
                <Phone className="w-3.5 h-3.5" />
                {profile.student.guardianPhone}
              </div>
            </div>

            {/* Examination Scorecards */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Examination Assessments
              </h4>

              {profile.examHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-sky-200 rounded-2xl">
                  No recorded examination scores for this learner yet.
                </div>
              ) : (
                profile.examHistory.map((ex: any) => (
                  <div
                    key={ex.examId}
                    className="p-4 bg-white border border-sky-100 rounded-2xl shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-sky-50 pb-2.5">
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                          {ex.examTitle}
                        </h5>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Assessed in {ex.subjectCount} subject learning area(s)
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-sky-700">{ex.averageMark}%</span>
                        <div className="text-[10px] text-slate-400">Exam Average</div>
                      </div>
                    </div>

                    {/* Subject scores table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[10px] text-slate-400 font-bold uppercase border-b border-sky-50">
                          <tr>
                            <th className="py-1.5 px-2">Subject</th>
                            <th className="py-1.5 px-2 text-center w-20">Score</th>
                            <th className="py-1.5 px-2 text-center w-24">CBC Level</th>
                            <th className="py-1.5 px-2 text-center w-16">Points</th>
                            <th className="py-1.5 px-2">Teacher Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                          {ex.scores.map((sc: any) => (
                            <tr key={sc.subjectId} className="hover:bg-sky-50/20">
                              <td className="py-2 px-2 font-semibold text-slate-800">
                                {sc.subjectName}{' '}
                                <span className="text-[10px] text-slate-400">({sc.subjectCode})</span>
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-slate-900">
                                {sc.marksObtained} <span className="text-[10px] text-slate-400 font-normal">/ {sc.maxMarks}</span>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                    sc.cbcRubricLevel === 'EE'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                      : sc.cbcRubricLevel === 'ME'
                                      ? 'bg-sky-100 text-sky-800 border-sky-200'
                                      : sc.cbcRubricLevel === 'AE'
                                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                                      : 'bg-rose-100 text-rose-800 border-rose-200'
                                  }`}
                                >
                                  {sc.cbcRubricLevel || '—'}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center text-slate-600 font-bold">
                                {sc.juniorPoints ? `${sc.juniorPoints} pts` : '—'}
                              </td>
                              <td className="py-2 px-2 text-slate-500 text-[11px]">
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

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-sky-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
