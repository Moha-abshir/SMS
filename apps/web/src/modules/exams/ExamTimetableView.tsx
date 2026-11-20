import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Sparkles,
  Printer,
  RefreshCw,
  Clock,
  ArrowLeftRight,
  Archive,
  Power,
  CheckCircle2,
  X,
  BookOpen,
  Settings,
  Lock,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  parseISO,
  format,
  isWeekend,
  eachDayOfInterval,
  differenceInCalendarDays,
} from 'date-fns';
import { apiClient } from '../../lib/apiClient';
import { useApiResource } from '../../hooks/useApiResource';
import { WorkspaceHeader } from '../../components/WorkspaceHeader';
import { RequestError } from '../../components/RequestError';
import { Modal } from '../../components/Modal';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';
import { ExamTimetableWizardModal } from './ExamTimetableWizardModal';
import {
  ExamPaperScheduleModal,
  ExamScheduleSettingsModal,
} from './ExamPaperScheduleModal';
import { ExamTimetablePrintModal } from './ExamTimetablePrintModal';

interface Paper {
  session: {
    id: string;
    classId: string;
    examId: string;
    sessionDate: string;
    sessionTime: string;
    durationMinutes: number;
  };
  subject: { name: string; code?: string } | null;
  invigilator?: { firstName: string; lastName: string } | null;
}
const dateLabel = (date: string, pattern = 'EEE, d MMM') => {
  const parsed = parseISO(date);
  return Number.isNaN(parsed.getTime()) ? date : format(parsed, pattern);
};

export const ExamTimetableView: React.FC = () => {
  const examsResource = useApiResource<any[]>('/api/exams', Array.isArray);
  const classesResource = useApiResource<any[]>(
    '/api/admissions/classes',
    Array.isArray,
  );
  const settings = useApiResource<any>('/api/settings/public');
  const [examSelection, setExamSelection] = useState('');
  const [classSelection, setClassSelection] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [movingPaper, setMovingPaper] = useState<Paper | null>(null);
  const [swapPaper, setSwapPaper] = useState<Paper | null>(null);
  const [busy, setBusy] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [moveDate, setMoveDate] = useState<string | undefined>();
  const exams = Array.isArray(examsResource.data) ? examsResource.data : [];
  const classes = useMemo(
    () =>
      (Array.isArray(classesResource.data) ? classesResource.data : []).filter(
        (row) => row.name.toLowerCase() !== 'playgroup',
      ),
    [classesResource.data],
  );
  const selectedExam =
    exams.find((row) => row.exam.id === examSelection) ||
    exams.find((row) => row.exam.status === 'APPROVED') ||
    exams[0];
  const selectedClass =
    classes.find((row) => row.id === classSelection) || classes[0];
  const examId = selectedExam?.exam.id;
  const classId = selectedClass?.id;
  useEffect(() => {
    if (examId && !examSelection) setExamSelection(examId);
  }, [examId, examSelection]);
  const timetable = useApiResource<Paper[]>(
    examId && classId
      ? `/api/exams/${examId}/sessions?classId=${classId}`
      : null,
    (value: any) =>
      Array.isArray(value) &&
      value.every(
        (row) =>
          row.session?.examId === examId &&
          row.session?.classId === classId &&
          typeof row.session?.sessionDate === 'string' &&
          typeof row.session?.sessionTime === 'string',
      ),
  );
  const sessions = Array.isArray(timetable.data) ? timetable.data : [];
  const error = examsResource.error || classesResource.error || timetable.error;
  const concluded = selectedExam?.exam.status === 'LOCKED';
  const byDate = useMemo(() => {
    const groups = new Map<string, Paper[]>();
    for (const paper of sessions) {
      const date = paper.session.sessionDate;
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date)!.push(paper);
    }
    for (const group of groups.values())
      group.sort((a, b) =>
        a.session.sessionTime.localeCompare(b.session.sessionTime),
      );
    return groups;
  }, [sessions]);
  const dates = useMemo(() => {
    const result = new Set(byDate.keys());
    const start =
      selectedExam?.exam.startDate && parseISO(selectedExam.exam.startDate);
    const end =
      selectedExam?.exam.endDate && parseISO(selectedExam.exam.endDate);
    if (
      start &&
      end &&
      !isNaN(start.getTime()) &&
      !isNaN(end.getTime()) &&
      start <= end &&
      differenceInCalendarDays(end, start) <= 366
    ) {
      for (const date of eachDayOfInterval({ start, end }))
        if (!isWeekend(date)) result.add(format(date, 'yyyy-MM-dd'));
    }
    return [...result].sort();
  }, [byDate, selectedExam]);
  useEffect(() => {
    setSwapPaper(null);
    setMovingPaper(null);
    setHoursOpen(false);
    setMoveDate(undefined);
    setPrintOpen(false);
  }, [examId, classId]);
  const refresh = () => {
    examsResource.refresh();
    classesResource.refresh();
    timetable.refresh();
  };
  const action = async (
    request: () => Promise<unknown>,
    message: string,
    done?: () => void,
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      await request();
      toast.success(message);
      done?.();
      timetable.refresh();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'The change could not be saved.',
      );
    } finally {
      setBusy(false);
    }
  };
  const move = (paper: Paper, date?: string) => {
    if (!selectedExam?.exam.scheduleConfig) {
      setHoursOpen(true);
      return;
    }
    setMoveDate(date);
    setMovingPaper(paper);
  };
  const swap = (paper: Paper) => {
    if (concluded) return;
    if (!selectedExam?.exam.scheduleConfig) {
      setHoursOpen(true);
      return;
    }
    if (!swapPaper) {
      setSwapPaper(paper);
      return;
    }
    if (swapPaper.session.id === paper.session.id) {
      setSwapPaper(null);
      return;
    }
    if (swapPaper.session.durationMinutes !== paper.session.durationMinutes) {
      toast.error('Choose a paper with the same duration to swap.');
      return;
    }
    action(
      () =>
        apiClient.post('/api/exams/sessions/swap', {
          sessionAId: swapPaper.session.id,
          sessionBId: paper.session.id,
        }),
      'Examination papers swapped.',
      () => setSwapPaper(null),
    );
  };

  return (
    <div className="workspace-page pb-6">
      <WorkspaceHeader
        icon={Calendar}
        title="Exam Timetabling"
        description="Plan examination days, adjust papers, and publish a clear class schedule."
      >
        <button
          className="workspace-button-secondary"
          onClick={refresh}
          disabled={busy || examsResource.loading || timetable.loading}
          aria-label="Refresh exam timetable"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
        <button
          className="workspace-button-primary"
          onClick={() => setWizardOpen(true)}
          disabled={busy}
        >
          <Sparkles className="h-4 w-4" />{' '}
          {concluded ? 'New examination' : 'Generate timetable'}
        </button>
      </WorkspaceHeader>
      {error && <RequestError message={error} onRetry={refresh} />}
      <PageLoadingWrapper
        isLoading={examsResource.loading || classesResource.loading}
        title="Exam Timetabling"
        icon={Calendar}
        variant="timetable"
      >
        {!error && (
          <div className="space-y-4">
            <section className="workspace-panel p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                <label className="min-w-0 space-y-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Examination
                  <select
                    aria-label="Examination"
                    className="workspace-input block w-full"
                    value={examId || ''}
                    disabled={busy || !exams.length}
                    onChange={(event) => setExamSelection(event.target.value)}
                  >
                    {!exams.length && (
                      <option value="">No examinations yet</option>
                    )}
                    {exams.map((row) => (
                      <option key={row.exam.id} value={row.exam.id}>
                        {row.exam.title} · {row.term?.year} / Term{' '}
                        {row.term?.termNumber}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-0 space-y-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Class
                  <select
                    aria-label="Class"
                    className="workspace-input block w-full"
                    value={classId || ''}
                    disabled={busy || !classes.length}
                    onChange={(event) => setClassSelection(event.target.value)}
                  >
                    {!classes.length && (
                      <option value="">No classes available</option>
                    )}
                    {classes.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="workspace-button-secondary w-full sm:col-span-2 lg:col-span-1 lg:w-auto"
                  onClick={() => setArchiveOpen(true)}
                  disabled={busy}
                >
                  <Archive className="h-4 w-4" /> Exam archive
                </button>
              </div>
            </section>
            {selectedExam && (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    { label: 'Class', value: selectedClass?.name || '—' },
                    {
                      label: 'Scheduled papers',
                      value: timetable.loading ? '—' : sessions.length,
                    },
                    { label: 'Exam days', value: dates.length },
                    {
                      label: 'Timetable status',
                      value:
                        selectedExam.exam.status === 'APPROVED'
                          ? 'Published'
                          : selectedExam.exam.status
                              .toLowerCase()
                              .replaceAll('_', ' '),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="workspace-panel min-w-0 p-3 sm:p-4"
                    >
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-2 break-words text-base font-semibold capitalize text-slate-900 dark:text-slate-100">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
                <section
                  className="workspace-panel overflow-hidden"
                  aria-busy={timetable.loading}
                >
                  <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {selectedExam.exam.title}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {selectedExam.exam.startDate
                          ? `${dateLabel(selectedExam.exam.startDate)} – ${dateLabel(selectedExam.exam.endDate || selectedExam.exam.startDate)}`
                          : 'Dates will appear after generation'}{' '}
                        · {selectedClass?.name}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="workspace-button-secondary flex-1 sm:flex-none"
                        onClick={() => setPrintOpen(true)}
                        disabled={busy || timetable.loading || !sessions.length}
                      >
                        <Printer className="h-4 w-4" /> Print
                      </button>
                      {!concluded && (
                        <button
                          className="workspace-button-primary flex-1 sm:flex-none"
                          disabled={
                            busy || timetable.loading || !sessions.length
                          }
                          onClick={() =>
                            action(
                              () =>
                                apiClient.put(`/api/exams/${examId}/status`, {
                                  status:
                                    selectedExam.exam.status === 'APPROVED'
                                      ? 'DRAFT'
                                      : 'APPROVED',
                                }),
                              'Timetable status updated.',
                              examsResource.refresh,
                            )
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {selectedExam.exam.status === 'APPROVED'
                            ? 'Return to draft'
                            : 'Publish'}
                        </button>
                      )}
                      <button
                        className="workspace-button-secondary"
                        disabled={busy || concluded}
                        onClick={() => setHoursOpen(true)}
                      >
                        <Settings className="h-4 w-4" />
                        Hours &amp; breaks
                      </button>
                    </div>
                  </div>
                  {swapPaper && (
                    <div className="flex items-start justify-between gap-3 border-b border-sky-100 bg-sky-50 p-4 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                      <p>
                        <strong>{swapPaper.subject?.name}</strong> selected.
                        Choose “Swap here” on a paper with the same duration, or
                        move it to an open day.
                      </p>
                      <button
                        disabled={busy}
                        aria-label="Cancel swap"
                        onClick={() => setSwapPaper(null)}
                        className="p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {timetable.loading ? (
                    <div
                      role="status"
                      className="p-8 text-center text-sm text-slate-500"
                    >
                      Loading this class schedule…
                    </div>
                  ) : !sessions.length ? (
                    <div className="p-8 text-center">
                      <BookOpen className="mx-auto mb-3 h-7 w-7 text-slate-400" />
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        No papers scheduled for this class
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                        Generate a timetable to arrange learning areas across
                        the examination period.
                      </p>
                      <button
                        className="workspace-button-primary mx-auto mt-4"
                        onClick={() => setWizardOpen(true)}
                      >
                        Generate timetable
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {dates.map((date, index) => {
                        const papers = byDate.get(date) || [];
                        return (
                          <section
                            key={date}
                            className="grid min-w-0 gap-3 p-4 lg:grid-cols-[140px_minmax(0,1fr)] lg:gap-5 lg:p-5"
                          >
                            <div className="flex items-center justify-between gap-2 lg:block">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                                  Day {index + 1}
                                </p>
                                <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {dateLabel(date, 'EEEE')}
                                </h3>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {dateLabel(date, 'd MMM yyyy')}
                                </p>
                              </div>
                              <span className="text-xs text-slate-400 lg:mt-3 lg:block">
                                {papers.length}{' '}
                                {papers.length === 1 ? 'paper' : 'papers'}
                              </span>
                            </div>
                            <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {papers.map((paper) => (
                                <article
                                  key={paper.session.id}
                                  className={`flex min-w-0 flex-col rounded-xl border p-3.5 ${swapPaper?.session.id === paper.session.id ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/30' : 'border-slate-200 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/30'}`}
                                >
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                                    <Clock className="h-3.5 w-3.5 shrink-0" />
                                    <span>{paper.session.sessionTime}</span>
                                  </div>
                                  <h4 className="mt-3 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {paper.subject?.name || 'Learning area'}
                                  </h4>
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {paper.subject?.code} ·{' '}
                                    {paper.session.durationMinutes} minutes
                                  </p>
                                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    Invigilator:{' '}
                                    {paper.invigilator
                                      ? `${paper.invigilator.firstName} ${paper.invigilator.lastName}`
                                      : 'Not assigned'}
                                  </p>
                                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                                    <button
                                      className="min-h-9 flex-1 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-600 hover:border-sky-400 dark:border-slate-700 dark:text-slate-300 disabled:opacity-50"
                                      disabled={busy || concluded}
                                      onClick={() => move(paper)}
                                    >
                                      Change date / time
                                    </button>
                                    <button
                                      className="flex min-h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-600 hover:border-sky-400 dark:border-slate-700 dark:text-slate-300 disabled:opacity-50"
                                      disabled={busy || concluded}
                                      onClick={() => swap(paper)}
                                    >
                                      <ArrowLeftRight className="h-3.5 w-3.5" />
                                      {swapPaper?.session.id ===
                                      paper.session.id
                                        ? 'Cancel'
                                        : swapPaper
                                          ? 'Swap here'
                                          : 'Swap'}
                                    </button>
                                  </div>
                                </article>
                              ))}
                              {!papers.length && (
                                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500 md:col-span-2 xl:col-span-3 dark:border-slate-700">
                                  <p>
                                    No papers scheduled. This day is available.
                                  </p>
                                  {swapPaper && (
                                    <button
                                      disabled={busy}
                                      className="workspace-button-secondary mt-3"
                                      onClick={() => move(swapPaper, date)}
                                    >
                                      Move {swapPaper.subject?.name} here
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  )}
                </section>
                <div className="workspace-panel flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {concluded && <Lock className="h-4 w-4" />}
                      {concluded
                        ? 'Examination concluded'
                        : 'Examination period'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {concluded
                        ? 'This examination is closed. Its timetable remains available for reference and printing. Create a new examination for future work.'
                        : 'Conclude this examination when its work is complete. Concluded examinations cannot be reactivated.'}
                    </p>
                  </div>
                  {!concluded && (
                    <button
                      className="workspace-button-secondary w-full sm:w-auto"
                      disabled={busy}
                      onClick={() => setTerminateOpen(true)}
                    >
                      <Power className="h-4 w-4" />
                      Conclude examination
                    </button>
                  )}
                </div>
              </>
            )}
            {!selectedExam && (
              <div className="workspace-panel p-8 text-center text-sm text-slate-500">
                Create your first examination timetable using “Generate
                timetable”.
              </div>
            )}
          </div>
        )}
      </PageLoadingWrapper>
      <Modal
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title="Examination archive"
        maxWidth="max-w-xl"
      >
        <div className="space-y-2">
          {exams.map((row) => (
            <button
              key={row.exam.id}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-left text-xs dark:border-slate-800"
              onClick={() => {
                setExamSelection(row.exam.id);
                setArchiveOpen(false);
              }}
            >
              <span>
                <strong className="block text-slate-800 dark:text-slate-100">
                  {row.exam.title}
                </strong>
                <span className="mt-1 block text-slate-500">
                  {row.term?.year} · Term {row.term?.termNumber}
                </span>
              </span>
              <span className="text-slate-500">{row.exam.status}</span>
            </button>
          ))}
          {!exams.length && (
            <p className="text-sm text-slate-500">No examinations available.</p>
          )}
        </div>
      </Modal>
      {movingPaper && (
        <ExamPaperScheduleModal
          key={`${movingPaper.session.id}_${moveDate || ''}`}
          paper={movingPaper}
          exam={selectedExam.exam}
          dates={dates}
          sessions={sessions}
          targetDate={moveDate}
          onClose={() => setMovingPaper(null)}
          onSaved={() => {
            setSwapPaper(null);
            timetable.refresh();
          }}
        />
      )}
      {hoursOpen && selectedExam && (
        <ExamScheduleSettingsModal
          key={examId}
          exam={selectedExam.exam}
          onClose={() => setHoursOpen(false)}
          onSaved={examsResource.refresh}
        />
      )}
      <Modal
        isOpen={terminateOpen}
        onClose={() => {
          if (!busy) setTerminateOpen(false);
        }}
        title="Conclude examination period?"
      >
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          This locks active examination papers and switches workstations to
          continuous assessment (CAT) mode.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            disabled={busy}
            className="workspace-button-secondary"
            onClick={() => setTerminateOpen(false)}
          >
            Cancel
          </button>
          <button
            disabled={busy}
            className="workspace-button-primary"
            onClick={() =>
              action(
                () => apiClient.post('/api/exams/terminate-period', { examId }),
                'Examination period concluded.',
                () => {
                  setTerminateOpen(false);
                  examsResource.refresh();
                },
              )
            }
          >
            {busy ? 'Concluding…' : 'Conclude & switch to CATs'}
          </button>
        </div>
      </Modal>
      {wizardOpen && (
        <ExamTimetableWizardModal
          isOpen
          onClose={() => setWizardOpen(false)}
          existingExamId={concluded ? undefined : examId}
          onGenerated={(id) => {
            if (id) setExamSelection(id);
            examsResource.refresh();
            timetable.refresh();
          }}
        />
      )}
      {printOpen && (
        <ExamTimetablePrintModal
          isOpen
          onClose={() => setPrintOpen(false)}
          exam={selectedExam?.exam}
          term={selectedExam?.term}
          className={selectedClass?.name || 'Class'}
          sessions={sessions}
          breaks={selectedExam?.exam.scheduleConfig?.breaks || []}
          schoolSettings={settings.data}
        />
      )}
    </div>
  );
};
