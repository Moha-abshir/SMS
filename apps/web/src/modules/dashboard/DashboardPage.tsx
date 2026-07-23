import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, CalendarCheck, BookOpen, Calculator, FileText,
  ShieldCheck, LogOut, Search, Plus, Bell, CheckCircle2, TrendingUp,
  Receipt, Wallet, History, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Modal } from '../../components/Modal';
import { ThemeToggle } from '../../components/ThemeToggle';
import { PwaInstallPrompt } from '../../components/PwaInstallPrompt';

interface DashboardPageProps {
  user: any;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'admissions' | 'attendance' | 'academics' | 'finance' | 'audit'>('overview');

  // Unified Admission Form Modal State
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentIdNumber, setParentIdNumber] = useState('');
  const [studentFirstName, setStudentFirstName] = useState('');
  const [studentMiddleName, setStudentMiddleName] = useState('');
  const [studentLastName, setStudentLastName] = useState('');
  const [studentGender, setStudentGender] = useState('MALE');
  const [assessmentNumber, setAssessmentNumber] = useState('');
  const [previousGrade, setPreviousGrade] = useState('');
  const [selectedClass, setSelectedClass] = useState('Grade 1');

  // Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Stationery');
  const [expenseAmount, setExpenseAmount] = useState('');

  const handleAdmissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName || !parentPhone || !parentIdNumber || !studentFirstName || !studentLastName) {
      toast.error('Please fill in all required parent and student fields');
      return;
    }

    toast.success(`Student ${studentFirstName} ${studentLastName} admitted successfully under Parent ${parentName}!`);
    setShowAdmissionModal(false);
    // Reset form
    setParentName(''); setParentPhone(''); setParentIdNumber('');
    setStudentFirstName(''); setStudentMiddleName(''); setStudentLastName('');
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle || !expenseAmount) {
      toast.error('Please enter expense title and amount');
      return;
    }

    toast.success(`Expense voucher for Ksh ${expenseAmount} recorded under ${expenseCategory}`);
    setShowExpenseModal(false);
    setExpenseTitle(''); setExpenseAmount('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            SMS
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">Kenyan Primary & Junior Secondary</h1>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{user.role || 'HEAD_TEACHER'} Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />
          <button
            onClick={onLogout}
            className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 flex flex-col gap-6">
        {/* Quick Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'admissions', label: 'Admissions', icon: UserPlus },
            { id: 'attendance', label: 'Attendance & SMS', icon: CalendarCheck },
            { id: 'academics', label: 'DoS & Academics', icon: BookOpen },
            { id: 'finance', label: 'Finance & Expenses', icon: Calculator },
            { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Learners</span>
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">482</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Grades 1–9 & PPE Active</p>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Today Attendance</span>
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">96.4%</div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">18 Absences Recorded</p>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">DoS CAT Progress</span>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">CAT 2</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Grade 6 & Grade 9 Candidates</p>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Term 1 Fee Collections</span>
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">84.2%</div>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Cash & M-Pesa Synced</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20">
              <div>
                <h3 className="text-lg font-bold">Quick Administrative Actions</h3>
                <p className="text-xs text-blue-100 mt-1">Admit new learner, post expense voucher, or trigger parent SMS alerts.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAdmissionModal(true)}
                  className="px-4 py-2.5 bg-white text-blue-600 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Unified Admission
                </button>
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl border border-blue-500 flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Record Expense
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 2: Admissions */}
        {activeTab === 'admissions' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold">Student Admissions & Directory</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Manage student profiles and single guardian records.</p>
              </div>
              <button
                onClick={() => setShowAdmissionModal(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                Admit New Student
              </button>
            </div>

            {/* Student Directory Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Adm No</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Grade</th>
                    <th className="p-4">Assessment No</th>
                    <th className="p-4">Primary Guardian</th>
                    <th className="p-4">Guardian Phone</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {[
                    { adm: 'ADM-2026-001', name: 'Juma Kamau', grade: 'Grade 1', assessment: 'CBC-8921-X', guardian: 'Peter Kamau', phone: '0712345678', status: 'ACTIVE' },
                    { adm: 'ADM-2026-002', name: 'Achieng Otieno', grade: 'Grade 7 (Junior)', assessment: 'CBC-4412-Y', guardian: 'Mary Otieno', phone: '0722998877', status: 'ACTIVE' },
                    { adm: 'ADM-2026-003', name: 'Wanjiru Njoroge', grade: 'Grade 6', assessment: 'CBC-1102-Z', guardian: 'Joseph Njoroge', phone: '0733112233', status: 'ACTIVE' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-4 font-bold text-blue-600 dark:text-blue-400">{row.adm}</td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{row.name}</td>
                      <td className="p-4">{row.grade}</td>
                      <td className="p-4 text-slate-500">{row.assessment}</td>
                      <td className="p-4">{row.guardian}</td>
                      <td className="p-4">{row.phone}</td>
                      <td className="p-4"><span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 rounded-md font-bold text-[10px]">{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Tab 3: Attendance & SMS */}
        {activeTab === 'attendance' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold">Deputy Attendance & SMS Alert Engine</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Class teacher mobile register & automated parent notifications.</p>
              </div>
              <button
                onClick={() => toast.success('Triggering Africa\'s Talking SMS alerts for threshold breaches...')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
              >
                <Bell className="w-4 h-4" /> Send Absence SMS Alerts
              </button>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Absence Threshold Setting</h3>
              <p className="text-xs text-slate-500">Automatically queue Africa's Talking SMS alerts when a learner accumulates missing days.</p>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold">SMS Trigger Threshold:</span>
                <select className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold">
                  <option>3 Consecutive Absent Days</option>
                  <option>2 Consecutive Absent Days</option>
                  <option>5 Cumulative Absent Days</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 4: Academics & DoS */}
        {activeTab === 'academics' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold">Director of Studies (DoS) Academic Analytics</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">CAT 1, 2, 3 diagnostic tracking separate from End-of-Term exam rubrics/points.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400">Primary Grades (1–6) CBC Rubric Marking</h3>
                <p className="text-xs text-slate-500">Converted automatically from raw marks: EE (75–100%), ME (50–74%), AE (25–49%), BE (1–24%).</p>
              </div>

              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Junior Secondary (7–9) Points Marking</h3>
                <p className="text-xs text-slate-500">Points assigned automatically: 90%+ = 8 points down to 1%–10% = 1 point.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 5: Finance & Expenses */}
        {activeTab === 'finance' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold">Bursar Finance & Expense Ledger</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Fee collection (Cash, Manual M-Pesa, STK Push) & Store expense vouchers.</p>
              </div>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Record Expense Voucher
              </button>
            </div>
          </motion.div>
        )}

        {/* Tab 6: Audit Trail */}
        {activeTab === 'audit' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold">System Mandatory Audit Trail</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Logs for report card unlocks, mark edits, fee waivers, and guardian modifications.</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Actor</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Target Entity</th>
                    <th className="p-4">User Identifier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {[
                    { time: 'Just Now', actor: 'Head Teacher', action: 'REPORT_CARD_LOCK', target: 'Grade 6 Term 1', user: 'head@school.co.ke' },
                    { time: '10 mins ago', actor: 'Bursar', action: 'RECORD_FEE_PAYMENT', target: 'Receipt #REC-8812', user: 'bursar@school.co.ke' },
                  ].map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-4 text-slate-400">{row.time}</td>
                      <td className="p-4 font-bold">{row.actor}</td>
                      <td className="p-4 text-blue-600 dark:text-blue-400 font-bold">{row.action}</td>
                      <td className="p-4">{row.target}</td>
                      <td className="p-4 text-slate-500">{row.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {/* UNIFIED ADMISSION SLIDE-UP MODAL */}
      <Modal isOpen={showAdmissionModal} onClose={() => setShowAdmissionModal(false)} title="Unified Parent & Student Admission Form" maxWidth="max-w-2xl">
        <form onSubmit={handleAdmissionSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Section 1: Parent Information */}
          <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-3">
            <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Primary Parent / Guardian Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold mb-1">Parent Full Name *</label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="e.g. Mary Otieno"
                  required
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">Phone Number (SMS) *</label>
                <input
                  type="text"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="0722998877"
                  required
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">National ID Number *</label>
                <input
                  type="text"
                  value={parentIdNumber}
                  onChange={(e) => setParentIdNumber(e.target.value)}
                  placeholder="e.g. 28910293"
                  required
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Student Information */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Learner Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold mb-1">First Name *</label>
                <input
                  type="text"
                  value={studentFirstName}
                  onChange={(e) => setStudentFirstName(e.target.value)}
                  placeholder="First name"
                  required
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">Middle Name (Optional)</label>
                <input
                  type="text"
                  value={studentMiddleName}
                  onChange={(e) => setStudentMiddleName(e.target.value)}
                  placeholder="Middle name"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">Last Name *</label>
                <input
                  type="text"
                  value={studentLastName}
                  onChange={(e) => setStudentLastName(e.target.value)}
                  placeholder="Last name"
                  required
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold mb-1">Gender *</label>
                <select
                  value={studentGender}
                  onChange={(e) => setStudentGender(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1">Classroom Assignment *</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold text-blue-600 dark:text-blue-400"
                >
                  {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7 (Junior)', 'Grade 8 (Junior)', 'Grade 9 (Junior)', 'PPE 1', 'PPE 2'].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1">Assessment No (NEMIS/CBC)</label>
                <input
                  type="text"
                  value={assessmentNumber}
                  onChange={(e) => setAssessmentNumber(e.target.value)}
                  placeholder="e.g. CBC-9920-X"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">Previous Grade (If transfer student)</label>
              <input
                type="text"
                value={previousGrade}
                onChange={(e) => setPreviousGrade(e.target.value)}
                placeholder="e.g. Grade 5 at St. Marys School"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            Complete Learner & Parent Admission
          </button>
        </form>
      </Modal>

      {/* RECORD EXPENSE SLIDE-UP MODAL */}
      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Record Store Expense Voucher">
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1">Expense Title *</label>
            <input
              type="text"
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              placeholder="e.g. Fuel for generator / Exam papers"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">Category *</label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="Stationery">Stationery</option>
                <option value="Fuel">Fuel</option>
                <option value="Repairs">Repairs</option>
                <option value="Utilities">Utilities</option>
                <option value="Food Supplies">Food Supplies</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Amount (Ksh) *</label>
              <input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="4500"
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30"
          >
            Submit Expense Voucher
          </button>
        </form>
      </Modal>

      {/* PWA Install Prompt Banner */}
      <PwaInstallPrompt />
    </div>
  );
};
