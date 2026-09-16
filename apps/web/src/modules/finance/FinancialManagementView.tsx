import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  Receipt,
  RotateCcw,
  FileSpreadsheet,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  Calendar,
  DollarSign,
  User,
  GraduationCap,
  ShieldAlert,
  Check,
  X,
  CreditCard,
  Building2,
  Clock,
  Download,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';
import { printElement } from '../../lib/printElement';

interface FinancialSummary {
  academicYear: number;
  termNumber: number | string;
  totalCollected: number;
  totalBilled: number;
  totalPaidFromBills: number;
  totalOutstanding: number;
  totalWaivers: number;
  totalTransactions: number;
  methodBreakdown: Record<string, { count: number; total: number }>;
  pendingReversalsCount: number;
  recentPayments: any[];
}

export const FinancialManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'payment' | 'ledger' | 'reversals' | 'statements'>('overview');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);

  // Payments Ledger State
  const [payments, setPayments] = useState<any[]>([]);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Pending Reversals State
  const [pendingReversals, setPendingReversals] = useState<any[]>([]);
  const [loadingReversals, setLoadingReversals] = useState(false);
  const [processingReversalId, setProcessingReversalId] = useState<string | null>(null);

  // Request Reversal Modal State
  const [reversalModalPayment, setReversalModalPayment] = useState<any | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [requestingReversal, setRequestingReversal] = useState(false);

  // Payment Entry Form State
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: '',
    paymentMethod: 'CASH' as 'CASH' | 'MANUAL_MPESA' | 'BANK_DEPOSIT' | 'CHEQUE' | 'OTHER',
    mpesaRefCode: '',
    bankRefNumber: '',
    paidBy: '',
    notes: '',
    academicYear: 2026,
    termNumber: 1,
  });

  // Receipt Modal State
  const [receiptModalData, setReceiptModalData] = useState<any | null>(null);

  // Student Fee Statement State
  const [statementStudentQuery, setStatementStudentQuery] = useState('');
  const [statementData, setStatementData] = useState<any | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Fetch summary & initial data
  const fetchOverview = async () => {
    try {
      setLoading(true);
      const [sumRes, pndRes] = await Promise.all([
        apiClient.get('/api/finance/summary'),
        apiClient.get('/api/finance/reversals/pending').catch(() => ({ data: { data: [] } })),
      ]);

      if (sumRes.data.data) setSummary(sumRes.data.data);
      if (pndRes.data?.data) setPendingReversals(pndRes.data.data);
    } catch (error: any) {
      toast.error('Failed to load financial summary');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoadingLedger(true);
      const res = await apiClient.get('/api/finance/payments?limit=100');
      if (res.data.data) setPayments(res.data.data);
    } catch (error: any) {
      toast.error('Failed to fetch payments ledger');
    } finally {
      setLoadingLedger(false);
    }
  };

  const fetchReversals = async () => {
    try {
      setLoadingReversals(true);
      const res = await apiClient.get('/api/finance/reversals/pending');
      if (res.data.data) setPendingReversals(res.data.data);
    } catch (error: any) {
      toast.error('Failed to load pending reversals queue');
    } finally {
      setLoadingReversals(false);
    }
  };

  const fetchStudentsForSearch = async () => {
    try {
      const res = await apiClient.get('/api/admissions/students');
      if (res.data.data) setStudentsList(res.data.data);
    } catch (error) {
      console.error('Failed to load students list for payment entry');
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchStudentsForSearch();
  }, []);

  useEffect(() => {
    if (activeTab === 'ledger') fetchPayments();
    if (activeTab === 'reversals') fetchReversals();
  }, [activeTab]);

  // Handle Record Payment Submission
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Please select a learner to record fee payment for');
      return;
    }
    const amount = Number(paymentForm.amountPaid);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive payment amount');
      return;
    }
    if (!paymentForm.paidBy.trim()) {
      toast.error('Payer name is required');
      return;
    }

    try {
      setRecordingPayment(true);
      const payload = {
        studentId: selectedStudent.student.id,
        amountPaid: amount,
        paymentMethod: paymentForm.paymentMethod,
        mpesaRefCode: paymentForm.mpesaRefCode || undefined,
        bankRefNumber: paymentForm.bankRefNumber || undefined,
        paidBy: paymentForm.paidBy,
        notes: paymentForm.notes || undefined,
        academicYear: paymentForm.academicYear,
        termNumber: paymentForm.termNumber,
      };

      const res = await apiClient.post('/api/finance/payments', payload);
      const createdPayment = res.data.data;
      toast.success(res.data.message || 'Payment recorded successfully!');

      // Set Receipt Modal Data
      setReceiptModalData(createdPayment);

      // Reset Form
      setSelectedStudent(null);
      setStudentSearchQuery('');
      setPaymentForm({
        amountPaid: '',
        paymentMethod: 'CASH',
        mpesaRefCode: '',
        bankRefNumber: '',
        paidBy: '',
        notes: '',
        academicYear: 2026,
        termNumber: 1,
      });

      fetchOverview();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Handle Request Reversal
  const handleRequestReversal = async () => {
    if (!reversalModalPayment) return;
    if (!reversalReason.trim()) {
      toast.error('Please provide a reason for payment reversal');
      return;
    }

    try {
      setRequestingReversal(true);
      const res = await apiClient.post('/api/finance/reversals', {
        paymentId: reversalModalPayment.id,
        reason: reversalReason,
      });
      toast.success(res.data.message || 'Reversal requested');
      setReversalModalPayment(null);
      setReversalReason('');
      fetchPayments();
      fetchOverview();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit reversal request');
    } finally {
      setRequestingReversal(false);
    }
  };

  // Handle Approve Reversal
  const handleApproveReversal = async (reversalId: string) => {
    try {
      setProcessingReversalId(reversalId);
      const res = await apiClient.put(`/api/finance/reversals/${reversalId}/approve`);
      toast.success(res.data.message || 'Reversal approved successfully');
      fetchReversals();
      fetchOverview();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve reversal');
    } finally {
      setProcessingReversalId(null);
    }
  };

  // Handle Reject / Dismiss Reversal
  const handleRejectReversal = async (reversalId: string) => {
    try {
      setProcessingReversalId(reversalId);
      await apiClient.put(`/api/finance/reversals/${reversalId}/reject`);
      toast.success('Reversal request dismissed');
      fetchReversals();
      fetchOverview();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to dismiss reversal');
    } finally {
      setProcessingReversalId(null);
    }
  };

  // Handle Search Student Statement
  const handleSearchStatement = async (studentId: string) => {
    try {
      setLoadingStatement(true);
      const res = await apiClient.get(`/api/finance/students/${studentId}/statement`);
      if (res.data.data) {
        setStatementData(res.data.data);
      }
    } catch (error: any) {
      toast.error('Failed to load student fee statement');
    } finally {
      setLoadingStatement(false);
    }
  };

  // Filtered students for manual payment search
  const filteredStudents = studentSearchQuery.trim().length >= 2
    ? studentsList.filter((s) => {
        const q = studentSearchQuery.toLowerCase();
        const fullName = `${s.student.firstName} ${s.student.middleName || ''} ${s.student.lastName}`.toLowerCase();
        const knec = (s.student.assessmentNumber || '').toLowerCase();
        return fullName.includes(q) || knec.includes(q);
      }).slice(0, 8)
    : [];

  // Filtered payments ledger
  const filteredPayments = payments.filter((p) => {
    if (!ledgerSearch.trim()) return true;
    const q = ledgerSearch.toLowerCase();
    const rNo = (p.receiptNumber || '').toLowerCase();
    const name = `${p.studentFirstName || ''} ${p.studentLastName || ''}`.toLowerCase();
    const mpesa = (p.mpesaRefCode || '').toLowerCase();
    const paidBy = (p.paidBy || '').toLowerCase();
    return rNo.includes(q) || name.includes(q) || mpesa.includes(q) || paidBy.includes(q);
  });

  const collectionRate = summary?.totalBilled && summary.totalBilled > 0
    ? Math.round((summary.totalCollected / summary.totalBilled) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-xl border border-sky-100 rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <Wallet className="w-4 h-4 text-sky-600" />
            Financial Oversight & Fee Accounting
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
            School Fee Collections & Financial Management
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Real-time fee collection oversight, manual receipt issuance, payment reversals authorization, and student fee statements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-glass cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Record Fee Payment
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl shadow-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'overview'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/70'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Financial Summary
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payment')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'payment'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/70'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Record Payment
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'ledger'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/70'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Payments Ledger
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reversals')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'reversals'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/70'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Reversals Queue
          {pendingReversals.length > 0 && (
            <span
              className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                activeTab === 'reversals' ? 'bg-white text-sky-600' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {pendingReversals.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('statements')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'statements'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/70'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Fee Statements
        </button>
      </div>

      {/* TAB 1: FINANCIAL OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading financial overview...</div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                <div className="p-4 sm:p-5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Collected</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-sky-600">
                    KES {(summary?.totalCollected || 0).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {summary?.totalTransactions || 0} valid receipt transactions
                  </p>
                </div>

                <div className="p-4 sm:p-5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Billed</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-800">
                    KES {(summary?.totalBilled || 0).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Tuition & term fee allocations</p>
                </div>

                <div className="p-4 sm:p-5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Outstanding Balance</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-800">
                    KES {(summary?.totalOutstanding || 0).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-sky-700 mt-1 font-semibold">Uncollected term balances</p>
                </div>

                <div className="p-4 sm:p-5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Collection Rate</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-sky-600">
                    {collectionRate}%
                  </div>
                  <div className="w-full bg-sky-100 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-sky-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(collectionRate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Collections by Payment Method */}
              <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  Collection Channels & Payment Method Split
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.entries(summary?.methodBreakdown || {}).map(([method, stats]) => (
                    <div key={method} className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl text-center">
                      <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block">
                        {method.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm sm:text-base font-black text-sky-700 block mt-1">
                        KES {stats.total.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block font-semibold">
                        {stats.count} txns
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Payments Section */}
              <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
                <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-sky-600" />
                    Recent Fee Receipts
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ledger')}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                  >
                    View All Ledger <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {summary?.recentPayments?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-6 text-center">No fee payments recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
                        <tr>
                          <th className="py-2.5 px-3">Receipt #</th>
                          <th className="py-2.5 px-3">Learner</th>
                          <th className="py-2.5 px-3">Class</th>
                          <th className="py-2.5 px-3">Method</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-100/60">
                        {summary?.recentPayments?.map((p: any) => (
                          <tr key={p.id} className="hover:bg-sky-50/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-sky-600">{p.receiptNumber}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">{p.studentFirstName} {p.studentLastName}</td>
                            <td className="py-2.5 px-3 text-slate-600">{p.className}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-md border border-sky-100">
                                {p.paymentMethod}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-black text-slate-900">
                              KES {Number(p.amountPaid).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                              {new Date(p.paymentDate).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: RECORD FEE PAYMENT */}
      {activeTab === 'payment' && (
        <form onSubmit={handleRecordPayment} className="space-y-4 sm:space-y-6">
          {/* Step 1: Select Student */}
          <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4 text-sky-600" />
              1. Learner Lookup & Identification
            </h3>

            {selectedStudent ? (
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      {selectedStudent.student.firstName} {selectedStudent.student.middleName || ''} {selectedStudent.student.lastName}
                    </h4>
                    <p className="text-xs text-sky-700 font-semibold">
                      KNEC: {selectedStudent.student.assessmentNumber} | Class: {selectedStudent.class.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-3 py-1.5 bg-white border border-sky-200 text-slate-700 hover:text-rose-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Change Learner
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Type student name or KNEC assessment number..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full pl-10 bg-white border border-sky-100 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                />

                {filteredStudents.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-sky-200 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-sky-50">
                    {filteredStudents.map((item) => (
                      <div
                        key={item.student.id}
                        onClick={() => {
                          setSelectedStudent(item);
                          setPaymentForm((prev) => ({
                            ...prev,
                            paidBy: item.guardian?.fullName || '',
                          }));
                          setStudentSearchQuery('');
                        }}
                        className="p-3 hover:bg-sky-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {item.student.firstName} {item.student.middleName || ''} {item.student.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            KNEC: <span className="font-mono text-sky-600">{item.student.assessmentNumber}</span> | Parent: {item.guardian?.fullName}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-md border border-sky-100">
                          {item.class.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Payment Details */}
          <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-sky-600" />
              2. Transaction Particulars & Amount
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount Paid (KES) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 5000"
                  value={paymentForm.amountPaid}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
                  className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                  className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                >
                  <option value="CASH">Cash Deposit</option>
                  <option value="MANUAL_MPESA">M-Pesa (Manual Code)</option>
                  <option value="BANK_DEPOSIT">Bank Deposit / Slip</option>
                  <option value="CHEQUE">Banker's Cheque</option>
                  <option value="OTHER">Other / Agency</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payer Name / Depositor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mary Kemboi"
                  value={paymentForm.paidBy}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paidBy: e.target.value })}
                  className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {paymentForm.paymentMethod === 'MANUAL_MPESA' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    M-Pesa Transaction Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. QK876XYZ9"
                    value={paymentForm.mpesaRefCode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, mpesaRefCode: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors font-mono"
                  />
                </div>
              )}

              {(paymentForm.paymentMethod === 'BANK_DEPOSIT' || paymentForm.paymentMethod === 'CHEQUE') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Reference / Slip Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BOK-89472"
                    value={paymentForm.bankRefNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bankRefNumber: e.target.value })}
                    className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Term
                </label>
                <select
                  value={paymentForm.termNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, termNumber: Number(e.target.value) })}
                  className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                >
                  <option value={1}>Term 1</option>
                  <option value={2}>Term 2</option>
                  <option value={3}>Term 3</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Optional Notes / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cleared Term 1 balance"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={recordingPayment || !selectedStudent}
              className="w-full sm:w-auto px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center justify-center gap-2 transition-all disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {recordingPayment ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Receipt className="w-4 h-4" />
              )}
              Confirm & Issue Official Receipt
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: PAYMENTS LEDGER */}
      {activeTab === 'ledger' && (
        <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-sky-600" />
                Fee Payments Ledger ({payments.length} Records)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail of fee payments, printed receipts, and reversal status.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search receipt #, student, ref code..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full pl-8 bg-white border border-sky-100 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          {loadingLedger ? (
            <div className="py-12 text-center text-slate-400">Loading ledger records...</div>
          ) : filteredPayments.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-8 text-center">No payment records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[800px]">
                <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
                  <tr>
                    <th className="py-3 px-3 sm:px-4">Receipt #</th>
                    <th className="py-3 px-3 sm:px-4">Student Name</th>
                    <th className="py-3 px-3 sm:px-4">Class</th>
                    <th className="py-3 px-3 sm:px-4">Amount</th>
                    <th className="py-3 px-3 sm:px-4">Method & Ref</th>
                    <th className="py-3 px-3 sm:px-4">Date</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Status</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100/60">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-sky-50/40">
                      <td className="py-3 px-4 font-mono font-bold text-sky-600">
                        {p.receiptNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {p.studentFirstName} {p.studentLastName}
                        <span className="text-[10px] text-slate-400 block font-normal">Paid by: {p.paidBy}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{p.className}</td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        KES {Number(p.amountPaid).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-md border border-sky-100">
                          {p.paymentMethod}
                        </span>
                        {(p.mpesaRefCode || p.bankRefNumber) && (
                          <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                            {p.mpesaRefCode || p.bankRefNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                            p.isReversed
                              ? 'bg-rose-50 border border-rose-200 text-rose-700'
                              : 'bg-sky-50 border border-sky-200 text-sky-700'
                          }`}
                        >
                          {p.isReversed ? 'REVERSED' : 'VALID'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setReceiptModalData(p)}
                            className="px-2 py-1 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                            title="View / Print Receipt"
                          >
                            <Printer className="w-3 h-3 text-sky-600" /> Receipt
                          </button>
                          {!p.isReversed && (
                            <button
                              type="button"
                              onClick={() => {
                                setReversalModalPayment(p);
                                setReversalReason('');
                              }}
                              className="px-2 py-1 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                              title="Request Reversal"
                            >
                              <RotateCcw className="w-3 h-3" /> Reverse
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REVERSALS APPROVAL QUEUE */}
      {activeTab === 'reversals' && (
        <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
          <div className="border-b border-sky-100 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-sky-600" />
              Pending Payment Reversals Queue ({pendingReversals.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Head Teacher review queue for payment cancellations. Approving a reversal marks the payment invalid and re-adjusts the student billing balance.
            </p>
          </div>

          {loadingReversals ? (
            <div className="py-12 text-center text-slate-400">Loading pending reversals...</div>
          ) : pendingReversals.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-sky-500 mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-xs text-slate-600">No pending reversal requests.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">All transactions are settled and verified.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
                  <tr>
                    <th className="py-3 px-3 sm:px-4">Receipt #</th>
                    <th className="py-3 px-3 sm:px-4">Student</th>
                    <th className="py-3 px-3 sm:px-4">Amount</th>
                    <th className="py-3 px-3 sm:px-4">Reversal Reason</th>
                    <th className="py-3 px-3 sm:px-4">Requested By</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100/60">
                  {pendingReversals.map((rev) => (
                    <tr key={rev.reversalId} className="hover:bg-sky-50/40">
                      <td className="py-3 px-4 font-mono font-bold text-sky-600">
                        {rev.receiptNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {rev.studentFirstName} {rev.studentLastName}
                        <span className="text-[10px] text-slate-400 block font-normal">{rev.className}</span>
                      </td>
                      <td className="py-3 px-4 font-black text-rose-600">
                        KES {Number(rev.amountPaid).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs">
                        <p className="font-medium text-xs">{rev.reason}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        <p className="font-semibold">{rev.requestedByFirstName} {rev.requestedByLastName}</p>
                        <p className="text-[10px] text-slate-400">{new Date(rev.requestedAt).toLocaleDateString()}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveReversal(rev.reversalId)}
                            disabled={processingReversalId === rev.reversalId}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve Reversal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectReversal(rev.reversalId)}
                            disabled={processingReversalId === rev.reversalId}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Dismiss
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
      )}

      {/* TAB 5: STUDENT FEE STATEMENTS */}
      {activeTab === 'statements' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-sky-600" />
              Learner Fee Statement Audit
            </h3>

            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search student by name or KNEC number..."
                value={statementStudentQuery}
                onChange={(e) => setStatementStudentQuery(e.target.value)}
                className="w-full pl-10 bg-white border border-sky-100 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />

              {statementStudentQuery.trim().length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-sky-200 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-sky-50 max-h-48 overflow-y-auto">
                  {studentsList
                    .filter((s) => {
                      const q = statementStudentQuery.toLowerCase();
                      const name = `${s.student.firstName} ${s.student.lastName}`.toLowerCase();
                      const knec = (s.student.assessmentNumber || '').toLowerCase();
                      return name.includes(q) || knec.includes(q);
                    })
                    .slice(0, 6)
                    .map((item) => (
                      <div
                        key={item.student.id}
                        onClick={() => {
                          handleSearchStatement(item.student.id);
                          setStatementStudentQuery('');
                        }}
                        className="p-3 hover:bg-sky-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {item.student.firstName} {item.student.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono text-sky-600">
                            {item.student.assessmentNumber}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-sky-700 px-2 py-0.5 bg-sky-50 rounded-md border border-sky-100">
                          {item.class.name}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {loadingStatement ? (
            <div className="py-12 text-center text-slate-400">Loading statement...</div>
          ) : statementData ? (
            <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-5 shadow-glass">
              {/* Statement Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-sky-50/70 border border-sky-100 rounded-2xl">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Official Fee Statement</span>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {statementData.student.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    KNEC: <span className="font-mono text-sky-700">{statementData.student.assessmentNumber}</span> | Class: {statementData.student.className}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Net Outstanding Balance</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-tight">
                      KES {statementData.summary.totalBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized Bills */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Itemized Fee Invoices</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[600px]">
                    <thead className="bg-sky-50 text-sky-900 font-bold">
                      <tr>
                        <th className="p-2.5">Invoice / Term</th>
                        <th className="p-2.5">Billed</th>
                        <th className="p-2.5">Waiver</th>
                        <th className="p-2.5">Paid</th>
                        <th className="p-2.5">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100/60">
                      {statementData.bills?.map((b: any) => (
                        <tr key={b.id}>
                          <td className="p-2.5 font-bold text-slate-800">{b.title}</td>
                          <td className="p-2.5 font-semibold text-slate-700">KES {Number(b.billedAmount).toLocaleString()}</td>
                          <td className="p-2.5 text-slate-500">KES {Number(b.waiverAmount).toLocaleString()}</td>
                          <td className="p-2.5 font-bold text-sky-600">KES {Number(b.paidAmount).toLocaleString()}</td>
                          <td className="p-2.5 font-black text-slate-900">KES {Number(b.balance).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Receipts History */}
              <div className="space-y-2 pt-3 border-t border-sky-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Payment Receipts History</h4>
                {statementData.payments?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4">No receipts recorded for this learner yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[600px]">
                      <thead className="bg-sky-50 text-sky-900 font-bold">
                        <tr>
                          <th className="p-2.5">Receipt #</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Method</th>
                          <th className="p-2.5">Amount</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-100/60">
                        {statementData.payments?.map((pm: any) => (
                          <tr key={pm.id}>
                            <td className="p-2.5 font-mono font-bold text-sky-600">{pm.receiptNumber}</td>
                            <td className="p-2.5 text-slate-500">{new Date(pm.paymentDate).toLocaleDateString()}</td>
                            <td className="p-2.5">{pm.paymentMethod}</td>
                            <td className="p-2.5 font-black text-slate-900">KES {Number(pm.amountPaid).toLocaleString()}</td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                                  pm.isReversed ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700'
                                }`}
                              >
                                {pm.isReversed ? 'REVERSED' : 'CLEARED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 bg-white/80 rounded-2xl border border-sky-100">
              <p className="text-xs">Search and select a student above to inspect their statement.</p>
            </div>
          )}
        </div>
      )}

      {/* Reversal Request Modal */}
      {reversalModalPayment && (
        <Modal
          isOpen={!!reversalModalPayment}
          onClose={() => setReversalModalPayment(null)}
          title="Request Fee Payment Reversal"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800">
                <p className="font-bold">Administrative Approval Required</p>
                <p className="mt-0.5">
                  Submitting this request forwards it to the Head Teacher's queue. Once approved, the receipt is marked void and the student's bill balance is restored.
                </p>
              </div>
            </div>

            <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl space-y-1 text-xs">
              <p><strong className="text-slate-700">Receipt #:</strong> <span className="font-mono text-sky-700 font-bold">{reversalModalPayment.receiptNumber}</span></p>
              <p><strong className="text-slate-700">Learner:</strong> {reversalModalPayment.studentFirstName} {reversalModalPayment.studentLastName}</p>
              <p><strong className="text-slate-700">Amount Paid:</strong> KES {Number(reversalModalPayment.amountPaid).toLocaleString()}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Payment Reversal *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Specify reason (e.g. wrong student credited, bank error, bounced cheque)..."
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full bg-white border border-sky-100 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setReversalModalPayment(null)}
                className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestReversal}
                disabled={requestingReversal || !reversalReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {requestingReversal && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Submit Reversal Request
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Printable Official Receipt Modal */}
      {receiptModalData && (
        <Modal
          isOpen={!!receiptModalData}
          onClose={() => setReceiptModalData(null)}
          title="Official Fee Payment Receipt"
        >
          <div className="space-y-4">
            {/* Printable Receipt Card */}
            <div id="official-receipt-print" className="p-6 bg-white border border-sky-100 rounded-2xl shadow-xs space-y-4">
              {/* Receipt Header */}
              <div className="text-center border-b border-sky-100 pb-4">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Eldoret Muslim Academy
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">P.O. Box 1234, Eldoret, Kenya</p>
                <div className="inline-block px-3 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-extrabold rounded-full mt-2 border border-sky-200">
                  OFFICIAL STUDENT FEE RECEIPT
                </div>
              </div>

              {/* Receipt Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Receipt Number</span>
                  <span className="font-mono font-bold text-sky-600 text-sm">{receiptModalData.receiptNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Date Issued</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(receiptModalData.paymentDate || receiptModalData.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Learner Name</span>
                  <span className="font-bold text-slate-800">
                    {receiptModalData.studentName || `${receiptModalData.studentFirstName || ''} ${receiptModalData.studentLastName || ''}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">KNEC Assessment No</span>
                  <span className="font-mono text-slate-700 font-semibold">{receiptModalData.assessmentNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Payment Channel</span>
                  <span className="font-semibold text-slate-800">{receiptModalData.paymentMethod}</span>
                  {(receiptModalData.mpesaRefCode || receiptModalData.bankRefNumber) && (
                    <span className="text-[10px] font-mono text-slate-500 block">
                      Ref: {receiptModalData.mpesaRefCode || receiptModalData.bankRefNumber}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Received From</span>
                  <span className="font-semibold text-slate-800">{receiptModalData.paidBy}</span>
                </div>
              </div>

              {/* Amount Box */}
              <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-800">Amount Received</span>
                <span className="text-xl font-black text-sky-700">
                  KES {Number(receiptModalData.amountPaid).toLocaleString()}
                </span>
              </div>

              <div className="pt-2 text-center text-[10px] text-slate-400 border-t border-sky-100">
                This is a computer-generated official receipt. Thank you for your payment.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReceiptModalData(null)}
                className="px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => printElement('official-receipt-print', `Receipt - ${receiptModalData?.receiptNumber || 'Official Receipt'}`)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};
