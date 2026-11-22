import { getPublicSettings } from '../../lib/publicSettings';
import {
  ReconciliationPanel,
  ReversalHistoryPanel,
} from './FinanceReviewPanels';
import { useApiResource } from '../../hooks/useApiResource';
import { TermBillingPanel } from './TermBillingPanel';
import { WorkspaceStats } from '../../components/WorkspaceStats';
import { WorkspaceHeader } from '../../components/WorkspaceHeader';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  CheckCircle2,
  ArrowRight,
  Printer,
  RotateCcw,
  GraduationCap,
  ShieldAlert,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { RequestError } from '../../components/RequestError';
import { Modal } from '../../components/Modal';
import { printElement } from '../../lib/printElement';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';

interface FinancialSummary {
  academicYear: number;
  termNumber: number | string;
  totalCollected: number;
  totalBilled: number;
  totalPaidFromBills: number;
  totalOutstanding: number;
  totalWaivers: number;
  totalCredits?: number;
  totalTransactions: number;
  methodBreakdown: Record<string, { count: number; total: number }>;
  pendingReversalsCount: number;
  recentPayments: any[];
}

export const FinancialManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'payment' | 'ledger' | 'reversals' | 'statements' | 'history'
  >('overview');
  const [year, setYear] = useState(new Date().getFullYear());
  useEffect(() => {
    let active = true;
    getPublicSettings()
      .then((res) => {
        if (active && Number.isInteger(res.data?.data?.currentAcademicYear))
          setYear(res.data.data.currentAcademicYear);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const [term, setTerm] = useState('1');
  const [reversalPage, setReversalPage] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(0),
    [debouncedSearch, setDebouncedSearch] = useState('');
  const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
  const isHead = (authUser.roleName || authUser.role) === 'HEAD_TEACHER';
  const period = `academicYear=${year}${term ? `&termNumber=${term}` : ''}`;
  const summaryResource = useApiResource<FinancialSummary>(
    `/api/finance/summary?${period}`,
    (v: any) =>
      typeof v?.totalBilled === 'number' && Array.isArray(v?.recentPayments),
  );
  const summary = summaryResource.data,
    loading = summaryResource.loading;
  const ledgerResource = useApiResource<{
    items: any[];
    total: number;
    limit: number;
    offset: number;
  }>(
    activeTab === 'ledger'
      ? `/api/finance/payments?${period}&limit=25&offset=${ledgerPage * 25}&search=${encodeURIComponent(debouncedSearch)}`
      : null,
    (v: any) => Array.isArray(v?.items) && typeof v?.total === 'number',
  );
  const payments = ledgerResource.data?.items || [],
    loadingLedger = ledgerResource.loading;
  const reversalsResource = useApiResource<{ items: any[]; hasMore: boolean }>(
    activeTab === 'reversals'
      ? `/api/finance/reversals/pending?${period}&offset=${reversalPage * 25}`
      : null,
    (value: any) =>
      Array.isArray(value?.items) && typeof value?.hasMore === 'boolean',
  );
  const pendingReversals = reversalsResource.data?.items || [],
    loadingReversals = reversalsResource.loading;
  const [rejectId, setRejectId] = useState<string | null>(null),
    [rejectReason, setRejectReason] = useState('');
  const [attemptNotice, setAttemptNotice] = useState(false);

  // Payments Ledger State
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Pending Reversals State
  const [processingReversalId, setProcessingReversalId] = useState<
    string | null
  >(null);
  const [processingReversalAction, setProcessingReversalAction] = useState<
    'APPROVE' | 'REJECT' | null
  >(null);

  // Request Reversal Modal State
  const [reversalModalPayment, setReversalModalPayment] = useState<any | null>(
    null,
  );
  const [reversalReason, setReversalReason] = useState('');
  const [requestingReversal, setRequestingReversal] = useState(false);

  // Payment Entry Form State
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: '',
    paymentMethod: 'CASH' as 'CASH' | 'MANUAL_MPESA',
    mpesaRefCode: '',
    paidBy: '',
    notes: '',
    academicYear: new Date().getFullYear(),
    termNumber: 1,
  });

  // Receipt Modal State
  const [receiptModalData, setReceiptModalData] = useState<any | null>(null);

  // Student Fee Statement State
  const [statementStudentQuery, setStatementStudentQuery] = useState('');
  const [statementData, setStatementData] = useState<any | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  const fetchOverview = async () => summaryResource.refresh();
  const fetchPayments = async () => ledgerResource.refresh();
  const fetchReversals = async () => reversalsResource.refresh();
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(ledgerSearch);
      setLedgerPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [ledgerSearch]);
  useEffect(() => {
    setLedgerPage(0);
    setReversalPage(0);
  }, [year, term]);

  const fetchStudentsForSearch = async () => {
    try {
      const res = await apiClient.get('/api/admissions/students');
      if (res.data.data) setStudentsList(res.data.data);
    } catch (error) {
      console.error('Failed to load students list for payment entry');
    }
  };

  useEffect(() => {
    fetchStudentsForSearch();
  }, []);

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
    if (recordingPayment) return;

    try {
      setRecordingPayment(true);
      const payload = {
        studentId: selectedStudent.student.id,
        amountPaid: paymentForm.amountPaid,
        paymentMethod: paymentForm.paymentMethod,
        mpesaRefCode: paymentForm.mpesaRefCode || undefined,
        paidBy: paymentForm.paidBy,
        notes: paymentForm.notes || undefined,
        academicYear: year,
        termNumber: Number(term),
      };

      if (!term)
        throw new Error('Select a specific term before recording a payment.');
      const hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(JSON.stringify(payload)),
          ),
        ),
      )
        .map((n) => n.toString(16).padStart(2, '0'))
        .join('');
      const storageKey = `finance-payment-attempt:${authUser.id}`;
      let attempt: any = null;
      try {
        attempt = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      } catch {}
      if (attempt && attempt.signature !== hash) {
        setAttemptNotice(true);
        throw new Error(
          'A previous payment may have been recorded. Retry its original details or check the ledger before starting another payment.',
        );
      }
      if (!attempt) {
        attempt = { signature: hash, key: crypto.randomUUID() };
        sessionStorage.setItem(storageKey, JSON.stringify(attempt));
      }
      const res = await apiClient.post('/api/finance/payments', {
        ...payload,
        requestKey: attempt.key,
      });
      const verified = res.data?.data;
      if (
        res.data?.success !== true ||
        typeof verified?.id !== 'string' ||
        typeof verified.receiptNumber !== 'string' ||
        verified.studentId !== payload.studentId ||
        Number(verified.amountPaid) !== Number(payload.amountPaid) ||
        verified.paymentMethod !== payload.paymentMethod ||
        verified.academicYear !== payload.academicYear ||
        verified.termNumber !== payload.termNumber
      )
        throw new Error(
          'The payment response could not be verified. Check the ledger or retry the same details.',
        );
      sessionStorage.removeItem(storageKey);
      setAttemptNotice(false);
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
        paidBy: '',
        notes: '',
        academicYear: new Date().getFullYear(),
        termNumber: 1,
      });

      fetchOverview();
    } catch (error: any) {
      if (
        error.response?.status >= 400 &&
        error.response?.status < 500 &&
        error.response?.status !== 408 &&
        error.response?.status !== 429
      )
        sessionStorage.removeItem(`finance-payment-attempt:${authUser.id}`);
      else setAttemptNotice(true);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Failed to record payment',
      );
    } finally {
      setRecordingPayment(false);
    }
  };

  // Handle Request Reversal
  const handleRequestReversal = async () => {
    if (!reversalModalPayment || requestingReversal) return;
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
      toast.error(
        error.response?.data?.message || 'Failed to submit reversal request',
      );
    } finally {
      setRequestingReversal(false);
    }
  };

  // Handle Approve Reversal
  const handleApproveReversal = async (reversalId: string) => {
    if (processingReversalId) return;
    try {
      setProcessingReversalId(reversalId);
      setProcessingReversalAction('APPROVE');
      const res = await apiClient.put(
        `/api/finance/reversals/${reversalId}/approve`,
      );
      toast.success(res.data.message || 'Reversal approved successfully');
      await Promise.all([fetchReversals(), fetchOverview()]);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Failed to approve reversal',
      );
    } finally {
      setProcessingReversalId(null);
      setProcessingReversalAction(null);
    }
  };

  // Handle Reject / Dismiss Reversal
  const handleRejectReversal = async (reversalId: string) => {
    if (processingReversalId) return;
    try {
      setProcessingReversalId(reversalId);
      setProcessingReversalAction('REJECT');
      await apiClient.put(`/api/finance/reversals/${reversalId}/reject`, {
        reason: rejectReason,
      });
      setRejectId(null);
      setRejectReason('');
      toast.success('Reversal request rejected and retained in history.');
      await Promise.all([fetchReversals(), fetchOverview()]);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Failed to dismiss reversal',
      );
    } finally {
      setProcessingReversalId(null);
      setProcessingReversalAction(null);
    }
  };

  const statementRequest = useRef<AbortController | null>(null);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [statementStudentId, setStatementStudentId] = useState('');
  useEffect(() => () => statementRequest.current?.abort(), []);

  // Handle Search Student Statement
  const handleSearchStatement = async (studentId: string) => {
    statementRequest.current?.abort();
    const controller = new AbortController();
    statementRequest.current = controller;
    setStatementStudentId(studentId);
    setStatementData(null);
    setStatementError(null);
    try {
      setLoadingStatement(true);
      const res = await apiClient.get(
        `/api/finance/students/${studentId}/statement?${period}`,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      if (
        res.data?.success !== true ||
        res.data.data?.student?.id !== studentId ||
        !Array.isArray(res.data.data?.bills) ||
        !Array.isArray(res.data.data?.payments) ||
        typeof res.data.data?.summary?.totalBalance !== 'number'
      )
        throw new Error(
          'The server returned an unexpected fee statement. Please retry.',
        );
      setStatementData(res.data.data);
    } catch (error: any) {
      if (controller.signal.aborted) return;
      setStatementError(
        error.response?.data?.message ||
          error.message ||
          'Failed to load student fee statement',
      );
    } finally {
      if (!controller.signal.aborted) setLoadingStatement(false);
    }
  };

  useEffect(() => {
    if (statementStudentId) handleSearchStatement(statementStudentId);
  }, [year, term]);

  // Filtered students for manual payment search
  const filteredStudents =
    studentSearchQuery.trim().length >= 2
      ? studentsList
          .filter((s) => {
            const q = studentSearchQuery.toLowerCase();
            const fullName =
              `${s.student.firstName} ${s.student.middleName || ''} ${s.student.lastName}`.toLowerCase();
            const knec = (s.student.assessmentNumber || '').toLowerCase();
            return fullName.includes(q) || knec.includes(q);
          })
          .slice(0, 8)
      : [];

  const filteredPayments = payments;

  const collectionRate =
    summary?.totalBilled && summary.totalBilled > 0
      ? Math.round((summary.totalCollected / summary.totalBilled) * 100)
      : 0;

  return (
    <PageLoadingWrapper
      isLoading={loading}
      title="Financial Management & Fee Accounting"
      subtitle="Auditing fee collections, billed balances, and payment transaction logs..."
      icon={GraduationCap}
    >
      <div className="workspace-page">
        {/* Header Banner */}
        <WorkspaceHeader
          icon={GraduationCap}
          title="Financial Management"
          description="Track collections, record payments, and review fee statements."
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('payment')}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              Record Fee Payment
            </button>
          </div>
        </WorkspaceHeader>

        <div className="workspace-panel flex flex-wrap items-end gap-3 p-4">
          <label className="min-w-0 space-y-1 text-xs font-semibold">
            Academic year
            <input
              aria-label="Finance academic year"
              className="workspace-input w-32"
              type="number"
              min="2000"
              max="2200"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
          <label className="min-w-0 space-y-1 text-xs font-semibold">
            Term
            <select
              aria-label="Finance term"
              className="workspace-input w-40"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            >
              <option value="">All terms</option>
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  Term {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        {summaryResource.error && (
          <RequestError
            message={summaryResource.error}
            onRetry={summaryResource.refresh}
          />
        )}
        {activeTab === 'overview' && <ReconciliationPanel period={period} />}
        {activeTab === 'history' && <ReversalHistoryPanel period={period} />}
        {activeTab === 'overview' && summary && (
          <TermBillingPanel
            year={year}
            term={term}
            onGenerated={() => summaryResource.refresh()}
          />
        )}
        {attemptNotice && (
          <div className="workspace-panel space-y-2 p-4 text-sm text-amber-700 dark:text-amber-400">
            <p>
              A payment attempt is unresolved. Retrying the same details uses
              the same request key. Check the payment ledger before starting a
              different payment.
            </p>
            <button
              className="workspace-button-secondary"
              onClick={() => setActiveTab('ledger')}
            >
              Check payment ledger
            </button>
            <button
              className="workspace-button-secondary"
              onClick={() => {
                if (
                  window.confirm(
                    'Have you checked the ledger and confirmed that a new payment should be started?',
                  )
                ) {
                  sessionStorage.removeItem(
                    `finance-payment-attempt:${authUser.id}`,
                  );
                  setAttemptNotice(false);
                }
              }}
            >
              Start a new payment after review
            </button>
          </div>
        )}

        <Modal
          isOpen={Boolean(rejectId)}
          onClose={() => !processingReversalId && setRejectId(null)}
          title="Reject reversal request"
        >
          <label className="block space-y-2 text-sm">
            Decision reason
            <textarea
              aria-label="Reversal rejection reason"
              className="workspace-input w-full"
              value={rejectReason}
              maxLength={2000}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </label>
          <button
            className="workspace-button-primary mt-4"
            disabled={Boolean(processingReversalId) || !rejectReason.trim()}
            onClick={() => rejectId && handleRejectReversal(rejectId)}
          >
            Confirm reversal rejection
          </button>
        </Modal>
        {/* Tabs Navigation */}
        <button
          className="workspace-button-secondary"
          onClick={() => setActiveTab('history')}
        >
          Reversal decision history
        </button>
        <div
          className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-lg shadow-xs overflow-x-auto max-w-full overscroll-x-contain workspace-table-scroll"
          role="region"
          aria-label="Page sections"
          tabIndex={0}
        >
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-sky-500 text-white shadow-glass'
                : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/70'
            } `}
          >
            Financial Summary
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'payment'
                ? 'bg-sky-500 text-white shadow-glass'
                : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/70'
            } `}
          >
            Record Payment
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-sky-500 text-white shadow-glass'
                : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/70'
            } `}
          >
            Payments Ledger
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reversals')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'reversals'
                ? 'bg-sky-500 text-white shadow-glass'
                : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/70'
            } `}
          >
            Reversals Queue
            {pendingReversals.length > 0 && (
              <span
                className={`ml-1.5 px-2 py-0.5 text-[10px] font-black rounded-full ${
                  activeTab === 'reversals'
                    ? 'bg-white text-sky-600'
                    : 'bg-rose-100 text-rose-700'
                } `}
              >
                {pendingReversals.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('statements')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'statements'
                ? 'bg-sky-500 text-white shadow-glass'
                : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/70'
            } `}
          >
            Fee Statements
          </button>
        </div>

        {/* TAB 1: FINANCIAL OVERVIEW */}
        {activeTab === 'overview' && summary && (
          <div className="space-y-4 min-w-0">
            <p className="text-xs text-slate-500">
              Credits held on existing bills: KES{' '}
              {(summary?.totalCredits || 0).toLocaleString()}. Credit transfers
              and carry-forward are not automatic.
            </p>
            <WorkspaceStats
              items={[
                {
                  label: 'Collected',
                  value: `KES ${(summary?.totalCollected || 0).toLocaleString()}`,
                  detail: `${summary?.totalTransactions || 0} receipts`,
                },
                {
                  label: 'Billed',
                  value: `KES ${(summary?.totalBilled || 0).toLocaleString()}`,
                  detail: 'Tuition and term fees',
                },
                {
                  label: 'Outstanding',
                  value: `KES ${(summary?.totalOutstanding || 0).toLocaleString()}`,
                  detail: 'Uncollected balance',
                },
                {
                  label: 'Collection rate',
                  value: `${collectionRate}%`,
                  detail: 'Of total billed fees',
                },
              ]}
            />

            {/* Collections by Payment Method */}
            <div className="workspace-panel space-y-4 min-w-0">
              <h3 className="text-sm font-bold text-slate-800">
                Collections by payment method
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-sky-50/60 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                      Cash Deposit
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-full">
                      Active Channel
                    </span>
                  </div>
                  <span className="text-lg font-bold text-sky-700 block mt-2 font-mono">
                    KES{' '}
                    {(
                      summary?.methodBreakdown?.CASH?.total || 0
                    ).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block font-semibold">
                    {summary?.methodBreakdown?.CASH?.count || 0} transactions
                  </span>
                </div>

                <div className="p-4 bg-sky-50/60 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                      Manual M-Pesa
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-sky-100 text-sky-800 border border-sky-200 font-bold rounded-full">
                      Active Channel
                    </span>
                  </div>
                  <span className="text-lg font-bold text-sky-700 block mt-2 font-mono">
                    KES{' '}
                    {(
                      summary?.methodBreakdown?.MANUAL_MPESA?.total || 0
                    ).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block font-semibold">
                    {summary?.methodBreakdown?.MANUAL_MPESA?.count || 0}{' '}
                    transactions (Manual Ref Entry)
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Payments Section */}
            <div className="workspace-panel space-y-4 min-w-0">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-800">
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
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  No fee payments recorded yet.
                </p>
              ) : (
                <div
                  className="overflow-x-auto max-w-full overscroll-x-contain workspace-table-scroll"
                  role="region"
                  aria-label="Scrollable table"
                  tabIndex={0}
                >
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Receipt #</th>
                        <th className="py-2.5 px-3">Learner</th>
                        <th className="py-2.5 px-3">Class</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary?.recentPayments?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-sky-50/40">
                          <td className="py-2.5 px-3 font-mono font-bold text-sky-600">
                            {p.receiptNumber}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {p.studentFirstName} {p.studentLastName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {p.className}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-md border border-slate-200">
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
          </div>
        )}

        {/* TAB 2: RECORD FEE PAYMENT */}
        {activeTab === 'payment' && (
          <form onSubmit={handleRecordPayment} className="space-y-4 min-w-0">
            {/* Step 1: Select Student */}
            <div className="workspace-panel space-y-4 min-w-0">
              <h3 className="text-sm font-bold text-slate-700">
                1. Learner Lookup & Identification
              </h3>

              {selectedStudent ? (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {selectedStudent.student.firstName}{' '}
                        {selectedStudent.student.middleName || ''}{' '}
                        {selectedStudent.student.lastName}
                      </h4>
                      <p className="text-xs text-sky-700 font-semibold">
                        KNEC: {selectedStudent.student.assessmentNumber} |
                        Class: {selectedStudent.class.name}
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
                    className="w-full pl-10 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                  />

                  {filteredStudents.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-sky-200 rounded-lg shadow-xl z-20 overflow-hidden divide-y divide-sky-50">
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
                              {item.student.firstName}{' '}
                              {item.student.middleName || ''}{' '}
                              {item.student.lastName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              KNEC:{' '}
                              <span className="font-mono text-sky-600">
                                {item.student.assessmentNumber}
                              </span>{' '}
                              | Parent: {item.guardian?.fullName}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-md border border-slate-200">
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
            <div className="workspace-panel space-y-4 min-w-0">
              <h3 className="text-sm font-bold text-slate-700">
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
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        amountPaid: e.target.value,
                      })
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        paymentMethod: e.target.value as
                          'CASH' | 'MANUAL_MPESA',
                      })
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                  >
                    <option value="CASH">Cash Payment</option>
                    <option value="MANUAL_MPESA">
                      M-Pesa (Manual Code Entry)
                    </option>
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
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, paidBy: e.target.value })
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                {paymentForm.paymentMethod === 'MANUAL_MPESA' && (
                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      M-Pesa Transaction Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. QK876XYZ9"
                      value={paymentForm.mpesaRefCode}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          mpesaRefCode: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Term
                  </label>
                  <select
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
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
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, notes: e.target.value })
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={recordingPayment || !selectedStudent || !term}
                className="w-full sm:w-auto px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] cursor-pointer"
              >
                {recordingPayment && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                )}
                {recordingPayment
                  ? 'Recording Payment...'
                  : 'Confirm & Issue Official Receipt'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: PAYMENTS LEDGER */}
        {activeTab === 'ledger' && (
          <div className="workspace-panel space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Fee Payments Ledger ({payments.length} Records)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audit trail of fee payments, printed receipts, and reversal
                  status.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search receipt #, student, ref code..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full pl-8 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            {ledgerResource.error && (
              <RequestError
                message={ledgerResource.error}
                onRetry={ledgerResource.refresh}
              />
            )}
            {ledgerResource.error ? null : loadingLedger ? (
              <div className="py-12 text-center text-slate-400">
                Loading ledger records...
              </div>
            ) : filteredPayments.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center">
                No payment records found.
              </p>
            ) : (
              <div
                className="overflow-x-auto max-w-full overscroll-x-contain workspace-table-scroll"
                role="region"
                aria-label="Scrollable table"
                tabIndex={0}
              >
                <table className="w-full text-left text-xs min-w-[800px]">
                  <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-slate-200">
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
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-sky-50/40">
                        <td className="py-3 px-4 font-mono font-bold text-sky-600">
                          {p.receiptNumber}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {p.studentFirstName} {p.studentLastName}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            Paid by: {p.paidBy}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {p.className}
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900">
                          KES {Number(p.amountPaid).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-md border border-slate-200">
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
                            } `}
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
                              <Printer className="w-3 h-3 text-sky-600" />{' '}
                              Receipt
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
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <span>
                {ledgerResource.data ? ledgerResource.data.total : '—'} matching
                payments · Page {ledgerPage + 1}
              </span>
              <div className="flex gap-2">
                <button
                  className="workspace-button-secondary"
                  disabled={loadingLedger || ledgerPage === 0}
                  onClick={() => setLedgerPage((page) => page - 1)}
                >
                  Previous payments
                </button>
                <button
                  className="workspace-button-secondary"
                  disabled={
                    loadingLedger ||
                    !ledgerResource.data ||
                    (ledgerPage + 1) * 25 >= ledgerResource.data.total
                  }
                  onClick={() => setLedgerPage((page) => page + 1)}
                >
                  Next payments
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REVERSALS APPROVAL QUEUE */}
        {activeTab === 'reversals' && (
          <div className="workspace-panel space-y-4 min-w-0">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                Pending Payment Reversals Queue ({pendingReversals.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Head Teacher review queue for payment cancellations. Approving a
                reversal marks the payment invalid and re-adjusts the student
                billing balance.
              </p>
            </div>

            {reversalsResource.error && (
              <RequestError
                message={reversalsResource.error}
                onRetry={reversalsResource.refresh}
              />
            )}
            {reversalsResource.error ? null : loadingReversals ? (
              <div className="py-12 text-center text-slate-400">
                Loading pending reversals...
              </div>
            ) : pendingReversals.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-sky-500 mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-xs text-slate-600">
                  No pending reversal requests.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  All transactions are settled and verified.
                </p>
              </div>
            ) : (
              <div
                className="overflow-x-auto max-w-full overscroll-x-contain workspace-table-scroll"
                role="region"
                aria-label="Scrollable table"
                tabIndex={0}
              >
                <table className="w-full text-left text-xs min-w-[760px]">
                  <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 sm:px-4">Receipt #</th>
                      <th className="py-3 px-3 sm:px-4">Student</th>
                      <th className="py-3 px-3 sm:px-4">Amount</th>
                      <th className="py-3 px-3 sm:px-4">Reversal Reason</th>
                      <th className="py-3 px-3 sm:px-4">Requested By</th>
                      <th className="py-3 px-3 sm:px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingReversals.map((rev) => (
                      <tr key={rev.reversalId} className="hover:bg-sky-50/40">
                        <td className="py-3 px-4 font-mono font-bold text-sky-600">
                          {rev.receiptNumber}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {rev.studentFirstName} {rev.studentLastName}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {rev.className}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-rose-600">
                          KES {Number(rev.amountPaid).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs">
                          <p className="font-medium text-xs">{rev.reason}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">
                          <p className="font-semibold">
                            {rev.requestedByFirstName} {rev.requestedByLastName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(rev.requestedAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isHead && rev.requestedById !== authUser.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleApproveReversal(rev.reversalId)
                                }
                                disabled={
                                  !!processingReversalId ||
                                  !isHead ||
                                  rev.requestedById === authUser.id
                                }
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processingReversalId === rev.reversalId &&
                                processingReversalAction === 'APPROVE' ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {processingReversalId === rev.reversalId &&
                                  processingReversalAction === 'APPROVE'
                                    ? 'Approving...'
                                    : 'Approve Reversal'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectId(rev.reversalId);
                                  setRejectReason('');
                                }}
                                disabled={
                                  !!processingReversalId ||
                                  !isHead ||
                                  rev.requestedById === authUser.id
                                }
                                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {processingReversalId === rev.reversalId &&
                                processingReversalAction === 'REJECT' ? (
                                  <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin shrink-0" />
                                ) : (
                                  <X className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {processingReversalId === rev.reversalId &&
                                  processingReversalAction === 'REJECT'
                                    ? 'Dismissing...'
                                    : 'Reject with reason'}
                                </span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Awaiting independent head teacher review
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>Page {reversalPage + 1}</span>
              <div className="flex gap-2">
                <button
                  className="workspace-button-secondary"
                  disabled={loadingReversals || !reversalPage}
                  onClick={() => setReversalPage((p) => p - 1)}
                >
                  Previous requests
                </button>
                <button
                  className="workspace-button-secondary"
                  disabled={
                    loadingReversals || !reversalsResource.data?.hasMore
                  }
                  onClick={() => setReversalPage((p) => p + 1)}
                >
                  Next requests
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STUDENT FEE STATEMENTS */}
        {activeTab === 'statements' && (
          <div className="space-y-4 min-w-0">
            <div className="workspace-panel space-y-4 min-w-0">
              <h3 className="text-sm font-bold text-slate-800">
                Learner Fee Statement Audit
              </h3>

              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search student by name or KNEC number..."
                  value={statementStudentQuery}
                  onChange={(e) => setStatementStudentQuery(e.target.value)}
                  className="w-full pl-10 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
                />

                {statementStudentQuery.trim().length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-sky-200 rounded-lg shadow-xl z-20 overflow-hidden divide-y divide-sky-50 max-h-48 overflow-y-auto">
                    {studentsList
                      .filter((s) => {
                        const q = statementStudentQuery.toLowerCase();
                        const name =
                          `${s.student.firstName} ${s.student.lastName}`.toLowerCase();
                        const knec = (
                          s.student.assessmentNumber || ''
                        ).toLowerCase();
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
                          <span className="text-[10px] font-bold text-sky-700 px-2 py-0.5 bg-sky-50 rounded-md border border-slate-200">
                            {item.class.name}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {statementError ? (
              <RequestError
                message={statementError}
                onRetry={() => handleSearchStatement(statementStudentId)}
              />
            ) : loadingStatement ? (
              <div className="py-12 text-center text-slate-400">
                Loading statement...
              </div>
            ) : statementData ? (
              <div className="workspace-panel space-y-5">
                {/* Statement Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-sky-50/70 border border-slate-200 rounded-lg">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">
                      Official Fee Statement
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {statementData.student.fullName}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      KNEC:{' '}
                      <span className="font-mono text-sky-700">
                        {statementData.student.assessmentNumber}
                      </span>{' '}
                      | Class: {statementData.student.className}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">
                        Net Outstanding Balance
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-tight">
                        KES{' '}
                        {statementData.summary.totalBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Itemized Bills */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Itemized Fee Invoices
                  </h4>
                  <div
                    className="overflow-x-auto max-w-full overscroll-x-contain workspace-table-scroll"
                    role="region"
                    aria-label="Scrollable table"
                    tabIndex={0}
                  >
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
                      <tbody className="divide-y divide-slate-100">
                        {statementData.bills?.map((b: any) => (
                          <tr key={b.id}>
                            <td className="p-2.5 font-bold text-slate-800">
                              {b.title}
                            </td>
                            <td className="p-2.5 font-semibold text-slate-700">
                              KES {Number(b.billedAmount).toLocaleString()}
                            </td>
                            <td className="p-2.5 text-slate-500">
                              KES {Number(b.waiverAmount).toLocaleString()}
                            </td>
                            <td className="p-2.5 font-bold text-sky-600">
                              KES {Number(b.paidAmount).toLocaleString()}
                            </td>
                            <td className="p-2.5 font-black text-slate-900">
                              KES {Number(b.balance).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Receipts History */}
                <div className="space-y-2 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Payment Receipts History
                  </h4>
                  {statementData.payments?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3">
                      No receipts recorded for this learner yet.
                    </p>
                  ) : (
                    <div
                      className="overflow-x-auto max-w-full overscroll-x-contain workspace-table-scroll"
                      role="region"
                      aria-label="Scrollable table"
                      tabIndex={0}
                    >
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
                        <tbody className="divide-y divide-slate-100">
                          {statementData.payments?.map((pm: any) => (
                            <tr key={pm.id}>
                              <td className="p-2.5 font-mono font-bold text-sky-600">
                                {pm.receiptNumber}
                              </td>
                              <td className="p-2.5 text-slate-500">
                                {new Date(pm.paymentDate).toLocaleDateString()}
                              </td>
                              <td className="p-2.5">{pm.paymentMethod}</td>
                              <td className="p-2.5 font-black text-slate-900">
                                KES {Number(pm.amountPaid).toLocaleString()}
                              </td>
                              <td className="p-2.5">
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                                    pm.isReversed
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-sky-50 text-sky-700'
                                  } `}
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
              <div className="p-8 text-center text-slate-400 bg-white rounded-lg border border-slate-200">
                <p className="text-xs">
                  Search and select a student above to inspect their statement.
                </p>
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
            <div className="space-y-4 min-w-0">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-800">
                  <p className="font-bold">Administrative Approval Required</p>
                  <p className="mt-0.5">
                    Submitting this request forwards it to the Head Teacher's
                    queue. Once approved, the receipt is marked void and the
                    student's bill balance is restored.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-sky-50/50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <p>
                  <strong className="text-slate-700">Receipt #:</strong>{' '}
                  <span className="font-mono text-sky-700 font-bold">
                    {reversalModalPayment.receiptNumber}
                  </span>
                </p>
                <p>
                  <strong className="text-slate-700">Learner:</strong>{' '}
                  {reversalModalPayment.studentFirstName}{' '}
                  {reversalModalPayment.studentLastName}
                </p>
                <p>
                  <strong className="text-slate-700">Amount Paid:</strong> KES{' '}
                  {Number(reversalModalPayment.amountPaid).toLocaleString()}
                </p>
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
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {requestingReversal && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                  {requestingReversal
                    ? 'Submitting Reversal...'
                    : 'Submit Reversal Request'}
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
            <div className="space-y-4 min-w-0">
              {/* Printable Receipt Card */}
              <div
                id="official-receipt-print"
                className="p-6 bg-white border border-slate-200 rounded-lg shadow-xs space-y-4"
              >
                {/* Receipt Header */}
                <div className="text-center border-b border-slate-200 pb-4">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    Eldoret Muslim Academy
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    P.O. Box 1234, Eldoret, Kenya
                  </p>
                  <div className="inline-block px-3 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-full mt-2 border border-sky-200">
                    OFFICIAL STUDENT FEE RECEIPT
                  </div>
                </div>

                {/* Receipt Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">
                      Receipt Number
                    </span>
                    <span className="font-mono font-bold text-sky-600 text-sm">
                      {receiptModalData.receiptNumber}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">
                      Date Issued
                    </span>
                    <span className="font-semibold text-slate-700">
                      {new Date(
                        receiptModalData.paymentDate ||
                          receiptModalData.createdAt,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">
                      Learner Name
                    </span>
                    <span className="font-bold text-slate-800">
                      {receiptModalData.studentName ||
                        `${receiptModalData.studentFirstName || ''} ${receiptModalData.studentLastName || ''}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">
                      KNEC Assessment No
                    </span>
                    <span className="font-mono text-slate-700 font-semibold">
                      {receiptModalData.assessmentNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">
                      Payment Channel
                    </span>
                    <span className="font-semibold text-slate-800">
                      {receiptModalData.paymentMethod}
                    </span>
                    {(receiptModalData.mpesaRefCode ||
                      receiptModalData.bankRefNumber) && (
                      <span className="text-[10px] font-mono text-slate-500 block">
                        Ref:{' '}
                        {receiptModalData.mpesaRefCode ||
                          receiptModalData.bankRefNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">
                      Received From
                    </span>
                    <span className="font-semibold text-slate-800">
                      {receiptModalData.paidBy}
                    </span>
                  </div>
                </div>

                {/* Amount Box */}
                <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                    Amount Received
                  </span>
                  <span className="text-xl font-black text-sky-700">
                    KES {Number(receiptModalData.amountPaid).toLocaleString()}
                  </span>
                </div>

                <div className="pt-2 text-center text-[10px] text-slate-400 border-t border-slate-200">
                  This is a computer-generated official receipt. Thank you for
                  your payment.
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
                  onClick={() =>
                    printElement(
                      'official-receipt-print',
                      `Receipt - ${receiptModalData?.receiptNumber || 'Official Receipt'}`,
                    )
                  }
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Receipt
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </PageLoadingWrapper>
  );
};
