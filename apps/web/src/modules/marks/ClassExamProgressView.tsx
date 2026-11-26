import { ContentSkeleton } from '../../components/ContentSkeleton';
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Layers,
  BookOpen,
  Search,
  Eye,
  Send,
  RefreshCw,
  Lock,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';
import { WorkspaceHeader } from '../../components/WorkspaceHeader';
import { RequestError } from '../../components/RequestError';
import { Modal } from '../../components/Modal';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';
import { MarksheetEntrySlideOver } from './MarksheetEntrySlideOver';

interface Teacher {
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string | null;
}
interface Paper {
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  status: string;
  forwardedToDeputyAt?: string | null;
  submittedBy?: Teacher | null;
  allocatedTeacher?: Teacher | null;
  correctionReason?: string | null;
}
const statuses: Record<string, { label: string; style: string }> = {
  NOT_STARTED: {
    label: 'Not started',
    style: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  DRAFT: {
    label: 'In progress',
    style:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
  SUBMITTED: {
    label: 'Submitted',
    style: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  },
  UNDER_REVIEW: {
    label: 'Under review',
    style:
      'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  },
  CORRECTION_REQUESTED: {
    label: 'Unlock requested',
    style:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
  APPROVED: {
    label: 'Approved',
    style:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  LOCKED: {
    label: 'Locked',
    style:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
};
const submittedStatuses = new Set([
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'LOCKED',
]);

export const ClassExamProgressView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selection, setSelection] = useState(searchParams.get('examId') || '');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const ws = useApiResource<any>('/api/teacher/workstation');
  const examResource = useApiResource<any[]>(
    '/api/exams?publishedOnly=true',
    Array.isArray,
  );
  const assignedClass = ws.data?.classTeacher;
  const exams = useMemo(
    () =>
      (Array.isArray(examResource.data) ? examResource.data : []).map(
        (row) => ({ ...row.exam, term: row.term }),
      ),
    [examResource.data],
  );
  const activeExam =
    exams.find((exam) => exam.id === selection) ||
    exams.find((exam) => exam.status === 'APPROVED') ||
    exams[0];
  const examId = activeExam?.id || '';
  const classId = assignedClass?.classId;
  const overview = useApiResource<any[]>(
    classId && examId
      ? `/api/mark-submissions/classes-overview?examId=${examId}`
      : null,
    Array.isArray,
  );
  const classOverview = Array.isArray(overview.data)
    ? overview.data.find((row) => row.class?.id === classId)
    : null;
  const papers: Paper[] = Array.isArray(classOverview?.papers)
    ? classOverview.papers
    : [];
  const error = ws.error || examResource.error || overview.error;
  const submitted = papers.filter((paper) =>
    submittedStatuses.has(paper.status),
  ).length;
  const corrections = papers.filter(
    (paper) => paper.status === 'CORRECTION_REQUESTED',
  ).length;
  const locked =
    papers.length > 0 && papers.every((paper) => paper.status === 'LOCKED');
  const forwarded =
    papers.length > 0 &&
    papers.every(
      (paper) =>
        Boolean(paper.forwardedToDeputyAt) &&
        ['LOCKED', 'APPROVED'].includes(paper.status),
    );
  const canSubmit =
    activeExam?.status === 'APPROVED' &&
    papers.length > 0 &&
    submitted === papers.length &&
    !forwarded &&
    !error &&
    !overview.loading;
  const percent = papers.length
    ? Math.round((submitted / papers.length) * 100)
    : 0;
  const visible = papers.filter((paper) => {
    const teacher = paper.submittedBy || paper.allocatedTeacher;
    const matches =
      `${paper.subjectName} ${paper.subjectCode || ''} ${teacher?.firstName || ''} ${teacher?.lastName || ''}`
        .toLowerCase()
        .includes(search.toLowerCase());
    return (
      matches &&
      (filter === 'ALL' ||
        (filter === 'PENDING'
          ? !submittedStatuses.has(paper.status)
          : paper.status === filter))
    );
  });
  const closeSheet = () => {
    const params = new URLSearchParams(searchParams);
    ['examId', 'classId', 'subjectId'].forEach((key) => params.delete(key));
    setSearchParams(params, { replace: true });
    overview.refresh();
  };
  const openSheet = (paper: Paper) => {
    setSearchParams({ examId, classId, subjectId: paper.subjectId });
  };
  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const response = await apiClient.put(
        `/api/mark-submissions/classes/${classId}/submit-to-deputy`,
        { examId },
      );
      toast.success(
        response.data?.message ||
          'Class marksheet submitted to the Deputy Head.',
      );
      setConfirmOpen(false);
      overview.refresh();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Could not submit class marksheet.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="workspace-page pb-6">
      <WorkspaceHeader
        icon={Layers}
        title="Class Exam Progress"
        description="Check each learning area, review marks, and forward your class marksheet."
      >
        {assignedClass && (
          <span className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
            {assignedClass.className}
          </span>
        )}
        <button
          className="workspace-button-secondary"
          onClick={() => {
            ws.refresh();
            examResource.refresh();
            overview.refresh();
          }}
          disabled={ws.loading || examResource.loading || overview.loading}
          aria-label="Refresh class progress"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </WorkspaceHeader>
      {error && (
        <RequestError
          message={error}
          onRetry={() => {
            ws.refresh();
            examResource.refresh();
            overview.refresh();
          }}
        />
      )}
      <PageLoadingWrapper
        header={false}
        isLoading={ws.loading || examResource.loading}
        title="Class Exam Progress"
        icon={Layers}
      >
        {!error && !assignedClass ? (
          <div className="workspace-panel p-6 text-sm text-slate-500 dark:text-slate-400">
            <BookOpen className="mb-3 h-6 w-6 text-sky-600" />
            You need an active class teacher assignment to review class
            submissions.
          </div>
        ) : !error && !exams.length ? (
          <div className="workspace-panel p-6 text-sm text-slate-500">
            No published examinations are available yet.
          </div>
        ) : (
          !error && (
            <div className="space-y-4">
              <div className="workspace-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
                <label className="block w-full space-y-1.5 sm:max-w-sm">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Examination
                  </span>
                  <select
                    aria-label="Examination"
                    className="workspace-input w-full"
                    value={examId}
                    onChange={(event) => {
                      setSelection(event.target.value);
                      setSearchParams({}, { replace: true });
                    }}
                  >
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title} · {exam.term?.year} / Term{' '}
                        {exam.term?.termNumber}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeExam?.term?.year} · Term {activeExam?.term?.termNumber}{' '}
                  · {papers.length} learning areas
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  {
                    label: 'Learning areas',
                    value: papers.length,
                    icon: BookOpen,
                  },
                  { label: 'Submitted', value: submitted, icon: CheckCircle2 },
                  {
                    label: 'Awaiting submission',
                    value: papers.length - submitted,
                    icon: Clock,
                  },
                  {
                    label: 'Unlock requests',
                    value: corrections,
                    icon: AlertCircle,
                  },
                ].map((item) => (
                  <div key={item.label} className="workspace-panel p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {item.label}
                      </span>
                      <item.icon className="h-4 w-4 shrink-0 text-slate-400" />
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                      {overview.loading ? '—' : item.value}
                    </p>
                  </div>
                ))}
              </div>
              <section className="workspace-panel p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {locked
                        ? 'Class marksheet locked'
                        : forwarded
                          ? 'Forwarded for review'
                          : canSubmit
                            ? 'Ready to forward'
                            : 'Submission progress'}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {locked
                        ? 'Scores are locked. Further changes require an explicit unlock.'
                        : forwarded
                          ? 'The Deputy Head can now review your class marksheet.'
                          : 'Review submitted marks and follow up on outstanding learning areas.'}
                    </p>
                  </div>
                  <button
                    className="workspace-button-primary w-full sm:w-auto"
                    disabled={!canSubmit || submitting}
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Send className="h-4 w-4" /> Forward to Deputy Head
                  </button>
                </div>
                <div className="mt-4 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {submitted} of {papers.length} submitted
                  </span>
                  <span>{percent}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Subjects submitted"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                >
                  <div
                    style={{ width: `${percent}%` }}
                    className="h-full rounded-full bg-sky-500 transition-all"
                  />
                </div>
              </section>
              <section
                className="workspace-panel overflow-hidden"
                aria-busy={overview.loading}
              >
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Learning areas
                  </h2>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        aria-label="Search learning areas or teachers"
                        className="workspace-input w-full pl-9"
                        placeholder="Subject or teacher…"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Filter submission status"
                      className="workspace-input"
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                    >
                      <option value="ALL">All statuses</option>
                      <option value="PENDING">Awaiting submission</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="CORRECTION_REQUESTED">
                        Unlock requested
                      </option>
                      <option value="LOCKED">Locked</option>
                    </select>
                  </div>
                </div>
                {overview.loading ? (
                  <ContentSkeleton layout="cards" rows={4}/>
                ) : !visible.length ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    {papers.length
                      ? 'No learning areas match these filters.'
                      : 'No learning areas are allocated to this class for this examination.'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visible.map((paper) => {
                      const teacher =
                        paper.submittedBy || paper.allocatedTeacher;
                      const status = statuses[paper.status] || {
                        label: 'Unknown status',
                        style: statuses.NOT_STARTED.style,
                      };
                      return (
                        <article
                          key={paper.subjectId}
                          className="grid min-w-0 gap-3 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {paper.subjectName}
                              </h3>
                              <span className="text-[11px] text-slate-400">
                                {paper.subjectCode}
                              </span>
                            </div>
                            <span
                              className={`mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${status.style}`}
                            >
                              {paper.status === 'LOCKED' && (
                                <Lock className="h-3 w-3" />
                              )}
                              {status.label}
                            </span>
                          </div>
                          <div className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
                            <p className="font-medium text-slate-700 dark:text-slate-200">
                              {teacher
                                ? `${teacher.firstName} ${teacher.lastName}`
                                : 'No teacher allocated'}
                            </p>
                            {teacher?.email && (
                              <p className="mt-1 break-all">{teacher.email}</p>
                            )}
                            {teacher?.phoneNumber && (
                              <a
                                href={`tel:${teacher.phoneNumber.replace(/\s+/g, '')}`}
                                className="mt-1 inline-flex min-h-8 items-center gap-1 text-sky-600 dark:text-sky-400"
                              >
                                <Phone className="h-3 w-3" />
                                {teacher.phoneNumber}
                              </a>
                            )}
                            {paper.correctionReason && (
                              <p className="mt-1 break-words text-amber-700 dark:text-amber-300">
                                {paper.correctionReason}
                              </p>
                            )}
                          </div>
                          <button
                            className="workspace-button-secondary w-full md:w-auto"
                            onClick={() => openSheet(paper)}
                          >
                            <Eye className="h-4 w-4" />
                            {paper.status === 'CORRECTION_REQUESTED'
                              ? 'Review & unlock'
                              : 'Review marks'}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )
        )}
      </PageLoadingWrapper>
      <MarksheetEntrySlideOver
        key={`${examId}_${classId}_${searchParams.get('subjectId')}`}
        isOpen={Boolean(
          searchParams.get('subjectId') &&
          searchParams.get('examId') === examId &&
          searchParams.get('classId') === classId,
        )}
        examId={examId || null}
        classId={classId || null}
        subjectId={searchParams.get('subjectId')}
        onClose={closeSheet}
        onSubmitted={overview.refresh}
        isClassTeacherOversight
      />
      <Modal
        isOpen={confirmOpen}
        onClose={() => {
          if (!submitting) setConfirmOpen(false);
        }}
        title="Forward class marksheet?"
      >
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Forward {assignedClass?.className} for {activeExam?.title} to the
          Deputy Head. This locks the subject marksheets; further changes
          require an explicit unlock.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            className="workspace-button-secondary"
            disabled={submitting}
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </button>
          <button
            className="workspace-button-primary"
            disabled={!canSubmit || submitting}
            onClick={submit}
          >
            {submitting ? 'Submitting…' : 'Confirm & forward'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
