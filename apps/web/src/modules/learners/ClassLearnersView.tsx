import React, { useState, useEffect } from 'react';
import {
  Users, Search, Phone, BookOpen, AlertTriangle, CheckCircle2,
  TrendingUp, MessageSquare, Award, Filter, ArrowUpDown
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { LearnerProfileModal } from './LearnerProfileModal';
import { ContactParentModal } from './ContactParentModal';

export const ClassLearnersView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'CHRONIC' | 'GOOD'>('ALL');
  const [sortBy, setSortBy] = useState<'NAME' | 'ATTENDANCE' | 'ACADEMIC'>('NAME');

  const [classInfo, setClassInfo] = useState<any>(null);
  const [learners, setLearners] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalLearners: 0,
    overallClassAverage: 0,
    chronicAbsenteeCount: 0,
  });
  const [notAssignedMessage, setNotAssignedMessage] = useState<string | null>(null);

  // Modal states
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<string | null>(null);
  const [selectedStudentForContact, setSelectedStudentForContact] = useState<any | null>(null);

  useEffect(() => {
    const fetchLearners = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/api/teacher/class-learners');
        const data = res.data?.data;
        if (data) {
          setClassInfo(data.class);
          setLearners(data.learners || []);
          setSummary({
            totalLearners: data.totalLearners,
            overallClassAverage: data.overallClassAverage,
            chronicAbsenteeCount: data.chronicAbsenteeCount,
          });
        }
      } catch (err: any) {
        if (err.response?.status === 400 && err.response?.data?.message?.includes('No class assigned')) {
          setNotAssignedMessage(err.response?.data?.message || 'No class assigned to you as Class Teacher');
        } else {
          toast.error(err.response?.data?.message || 'Failed to load class learners');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLearners();
  }, []);

  // Filter and sort learners
  const filteredLearners = learners
    .filter((l) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        l.fullName.toLowerCase().includes(q) ||
        (l.assessmentNumber && l.assessmentNumber.toLowerCase().includes(q)) ||
        (l.admissionNumber && l.admissionNumber.toLowerCase().includes(q)) ||
        l.guardianName.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (attendanceFilter === 'CHRONIC') return l.attendance.isChronicAbsent;
      if (attendanceFilter === 'GOOD') return !l.attendance.isChronicAbsent;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'ATTENDANCE') {
        return a.attendance.attendanceRate - b.attendance.attendanceRate;
      }
      if (sortBy === 'ACADEMIC') {
        return (b.academicAverage || 0) - (a.academicAverage || 0);
      }
      return a.fullName.localeCompare(b.fullName);
    });

  if (!loading && notAssignedMessage) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 sm:p-12 border border-sky-100 shadow-glass text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto text-sky-600 shadow-xs">
            <Users className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">No Class Assigned Yet</h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              You are currently not assigned as a Class Teacher to any class. The Deputy Head Teacher assigns class teachers via Class & Teacher Allocations.
            </p>
          </div>
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-100">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Role: Subject Specialist / Unassigned Class Teacher
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-sky-100 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                Class Teacher Hub
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200">
                {classInfo?.name || 'Class Roster'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Class Learners & Guardian Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Inspect comprehensive learner profiles, attendance rates, academic standing, and initiate controlled guardian outreach.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 border border-sky-100 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Enrolled</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{summary.totalLearners}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active learners on class register</div>
        </div>

        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 border border-sky-100 shadow-xs">
          <div className="text-xs font-bold text-sky-700 uppercase tracking-wider">Class Academic Standing</div>
          <div className="text-2xl font-black text-sky-700 mt-1">{summary.overallClassAverage}%</div>
          <div className="text-[11px] text-sky-600 mt-0.5">Overall assessment average</div>
        </div>

        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 border border-rose-100 shadow-xs">
          <div className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> Chronic Absenteeism Risk
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">{summary.chronicAbsenteeCount}</div>
          <div className="text-[11px] text-rose-600 mt-0.5">Learners with &lt; 85% attendance</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/85 backdrop-blur-md p-3 rounded-2xl border border-sky-100 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by learner name, assessment number, or guardian..."
            className="w-full bg-slate-50/70 border border-sky-100 rounded-xl pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-400 outline-hidden transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={attendanceFilter}
            onChange={(e) => setAttendanceFilter(e.target.value as any)}
            className="bg-sky-50 text-xs font-bold text-slate-700 px-3 py-1.5 rounded-xl border border-sky-200 outline-hidden cursor-pointer"
          >
            <option value="ALL">All Attendance</option>
            <option value="CHRONIC">Chronic Absent (&lt;85%)</option>
            <option value="GOOD">Good Standing (≥85%)</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-sky-50 text-xs font-bold text-slate-700 px-3 py-1.5 rounded-xl border border-sky-200 outline-hidden cursor-pointer"
          >
            <option value="NAME">Sort by Name</option>
            <option value="ATTENDANCE">Sort by Attendance Rate</option>
            <option value="ACADEMIC">Sort by Academic Score</option>
          </select>
        </div>
      </div>

      {/* Learners Table */}
      <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-sky-100 shadow-glass overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Loading class learners directory...
          </div>
        ) : filteredLearners.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            No learners found matching the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sky-50/60 text-slate-600 border-b border-sky-100 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5 w-10 text-center">#</th>
                  <th className="py-3 px-4">Learner Name</th>
                  <th className="py-3 px-3 w-28">Assess / Adm #</th>
                  <th className="py-3 px-4">Guardian Contact</th>
                  <th className="py-3 px-3 text-center w-28">Attendance Rate</th>
                  <th className="py-3 px-3 text-center w-24">Academic Avg</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/60 font-medium">
                {filteredLearners.map((learner, idx) => (
                  <tr
                    key={learner.studentId}
                    className={`hover:bg-sky-50/40 transition-colors ${
                      learner.attendance.isChronicAbsent ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-3.5 text-center text-slate-400 font-bold">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{learner.fullName}</div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {learner.gender?.toLowerCase()}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {learner.assessmentNumber || learner.admissionNumber || '—'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{learner.guardianName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-sky-500" />
                        {learner.guardianPhone}
                      </div>
                    </td>

                    {/* Attendance Rate */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`font-black text-xs ${
                            learner.attendance.isChronicAbsent ? 'text-rose-600' : 'text-slate-800'
                          }`}
                        >
                          {learner.attendance.attendanceRate}%
                        </span>
                        {learner.attendance.isChronicAbsent && (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        )}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {learner.attendance.presentDays} of {learner.attendance.totalDays} days
                      </div>
                    </td>

                    {/* Academic Average */}
                    <td className="py-3 px-3 text-center">
                      {learner.academicAverage !== null ? (
                        <span
                          className={`font-black text-xs ${
                            learner.academicAverage >= 80
                              ? 'text-emerald-700'
                              : learner.academicAverage >= 65
                              ? 'text-sky-700'
                              : learner.academicAverage >= 50
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {learner.academicAverage}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedStudentForProfile(learner.studentId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Profile
                        </button>

                        <button
                          onClick={() =>
                            setSelectedStudentForContact({
                              studentId: learner.studentId,
                              fullName: learner.fullName,
                              className: classInfo?.name,
                              guardianName: learner.guardianName,
                              guardianPhone: learner.guardianPhone,
                              academicAverage: learner.academicAverage,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                          Contact
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Learner Performance Modal */}
      {selectedStudentForProfile && (
        <LearnerProfileModal
          isOpen={!!selectedStudentForProfile}
          onClose={() => setSelectedStudentForProfile(null)}
          studentId={selectedStudentForProfile}
        />
      )}

      {/* Controlled Parent Contact Modal */}
      {selectedStudentForContact && (
        <ContactParentModal
          isOpen={!!selectedStudentForContact}
          onClose={() => setSelectedStudentForContact(null)}
          student={selectedStudentForContact}
        />
      )}
    </div>
  );
};
export default ClassLearnersView;
