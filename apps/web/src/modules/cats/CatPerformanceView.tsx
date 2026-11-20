import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  Users,
  AlertCircle,
  RefreshCw,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { WorkspaceHeader } from '../../components/WorkspaceHeader';
import { RequestError } from '../../components/RequestError';
import { Modal } from '../../components/Modal';

const percent = (value: number | null | undefined) =>
  value == null ? '—' : `${Number(value).toFixed(1)}%`;
function Pager({
  page,
  total,
  size,
  onChange,
}: {
  page: number;
  total: number;
  size: number;
  onChange: (page: number) => void;
}) {
  const count = Math.max(1, Math.ceil(total / size));
  if (count < 2) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-3 text-xs text-slate-500 dark:border-slate-800">
      <span>
        Page {page} of {count} · {total} results
      </span>
      <div className="flex gap-2">
        <button
          className="workspace-button-secondary"
          aria-label="Previous results"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          className="workspace-button-secondary"
          aria-label="Next results"
          disabled={page >= count}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
export const CatPerformanceView: React.FC = () => {
  const [termId, setTermId] = useState(''),
    [classId, setClassId] = useState(''),
    [subjectId, setSubjectId] = useState(''),
    [catNumber, setCatNumber] = useState('');
  const [tab, setTab] = useState<'cats' | 'subjects' | 'support'>('cats');
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [selectedCat, setSelectedCat] = useState<any>(null);
  const params = new URLSearchParams({
    ...(termId ? { termId } : {}),
    ...(classId ? { classId } : {}),
    ...(subjectId ? { subjectId } : {}),
    ...(catNumber ? { catNumber } : {}),
  });
  const { data, loading, error, refresh } = useApiResource<any>(
    `/api/cats/performance?${params}`,
    (value) =>
      Boolean(
        value &&
        typeof value === 'object' &&
        (value as any).summary &&
        Array.isArray((value as any).terms) &&
        Array.isArray((value as any).grades) &&
        Array.isArray((value as any).subjects) &&
        Array.isArray((value as any).filters?.classes) &&
        Array.isArray((value as any).filters?.subjects) &&
        Array.isArray((value as any).filters?.catNumbers) &&
        Array.isArray((value as any).assessments) &&
        Array.isArray((value as any).supportLearners),
      ),
  );
  const [metadata, setMetadata] = useState<any>({
    terms: [],
    filters: { classes: [], subjects: [], catNumbers: [] },
  });
  useEffect(() => {
    if (data) setMetadata({ terms: data.terms, filters: data.filters });
  }, [data]);
  useEffect(() => {
    setPage(1);
    setSelectedCat(null);
  }, [termId, classId, subjectId, catNumber, tab, search]);
  const options = data || metadata;
  const summary = data?.summary;
  const support = useMemo(
    () =>
      (data?.supportLearners || []).filter((row: any) =>
        `${row.fullName} ${row.className} ${row.assessmentNumber} ${row.concerns.map((item: any) => item.subjectName).join(' ')}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [data, search],
  );
  const rows =
    tab === 'cats'
      ? data?.assessments || []
      : tab === 'subjects'
        ? data?.subjects || []
        : support;
  const size = tab === 'support' ? 20 : 12;
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(rows.length / size)),
  );
  const visible = rows.slice((currentPage - 1) * size, currentPage * size);
  const assessmentsBySubject = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const cat of data?.assessments || []) {
      const key = `${cat.classId}:${cat.subjectId}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(cat);
    }
    return map;
  }, [data]);
  const scoredSubjects = (data?.subjects || []).filter(
    (row: any) => row.mean !== null,
  );
  const high = scoredSubjects[0],
    low = scoredSubjects[scoredSubjects.length - 1];
  return (
    <div className="workspace-page pb-6">
      <WorkspaceHeader
        icon={Activity}
        title="CAT Performance"
        description="Follow every continuous assessment across Grades 3, 6 and 9."
      >
        <button
          className="workspace-button-secondary"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </WorkspaceHeader>
      <section
        className="workspace-panel grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="CAT performance filters"
      >
        <label className="min-w-0 space-y-1.5 text-xs font-semibold">
          Academic term
          <select
            aria-label="CAT academic term"
            className="workspace-input w-full"
            value={termId || data?.selectedTerm?.id || ''}
            onChange={(e) => {
              setTermId(e.target.value);
              setSubjectId('');
              setCatNumber('');
            }}
          >
            {!options.terms.length && (
              <option value="">No academic terms</option>
            )}
            {options.terms.map((term: any) => (
              <option key={term.id} value={term.id}>
                {term.year} · Term {term.termNumber}
                {term.isCurrent ? ' · Current' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 space-y-1.5 text-xs font-semibold">
          Grade
          <select
            aria-label="CAT grade"
            className="workspace-input w-full"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSubjectId('');
              setCatNumber('');
            }}
          >
            <option value="">All CAT grades</option>
            {options.filters.classes.map((cls: any) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 space-y-1.5 text-xs font-semibold">
          Learning area
          <select
            aria-label="CAT learning area"
            className="workspace-input w-full"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setCatNumber('');
            }}
          >
            <option value="">All learning areas</option>
            {options.filters.subjects.map((subject: any) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 space-y-1.5 text-xs font-semibold">
          Assessment
          <select
            aria-label="CAT number"
            className="workspace-input w-full"
            value={catNumber}
            onChange={(e) => setCatNumber(e.target.value)}
          >
            <option value="">Every CAT</option>
            {options.filters.catNumbers.map((number: number) => (
              <option key={number} value={number}>
                CAT {number}
              </option>
            ))}
          </select>
        </label>
      </section>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Averages use recorded scores normalized to 100%. Missing marks are shown
        separately. “Needs support” counts a learner once if any selected CAT
        score is below 50%. Coverage uses the current active class roster.
      </p>
      {error && <RequestError message={error} onRetry={refresh} />}
      {loading ? (
        <div
          role="status"
          className="workspace-panel p-6 text-sm text-slate-500"
        >
          Loading CAT results…
        </div>
      ) : (
        data &&
        !error && (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                {
                  label: 'Average recorded score',
                  value: percent(summary.mean),
                  icon: Activity,
                },
                {
                  label: 'CATs assessed',
                  value: summary.assessments,
                  icon: BookOpen,
                },
                {
                  label: 'Learners with scores',
                  value: `${summary.learnersAssessed} / ${summary.enrolled}`,
                  icon: Users,
                },
                {
                  label: 'Learners needing support',
                  value: summary.needsSupport,
                  icon: AlertCircle,
                },
              ].map((item) => (
                <div key={item.label} className="workspace-panel min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.label}
                    </p>
                    <item.icon className="h-4 w-4 shrink-0 text-sky-600" />
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            {summary.invalidScoreCount > 0 && (
              <p
                role="alert"
                className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
              >
                {summary.invalidScoreCount} invalid score entries were excluded.
                Inspect the relevant CAT marksheet before relying on its
                summary.
              </p>
            )}
            <section
              className="grid gap-3 md:grid-cols-3"
              aria-label="CAT grade overview"
            >
              {data.grades.map((grade: any) => (
                <button
                  key={grade.id}
                  className="workspace-panel text-left transition-colors hover:border-sky-400"
                  onClick={() => {
                    setClassId(grade.id);
                    setSubjectId('');
                    setCatNumber('');
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">{grade.name}</h2>
                    <span className="text-lg font-semibold text-sky-700 dark:text-sky-300">
                      {percent(grade.mean)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {grade.assessments} CATs · {grade.enrolled} active learners
                  </p>
                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs">
                    <span>
                      {grade.scored} / {grade.expected} marks recorded
                    </span>
                    <span
                      className={
                        grade.needsSupport
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-slate-500'
                      }
                    >
                      {grade.needsSupport} need support
                    </span>
                  </div>
                </button>
              ))}
            </section>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Highest subject mean', row: high },
                { label: 'Lowest subject mean', row: low },
              ].map((item) => (
                <div key={item.label} className="workspace-panel">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {item.row
                      ? `${item.row.subjectName} · ${percent(item.row.mean)}`
                      : 'No scored learning areas yet'}
                  </p>
                  {item.row && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {item.row.className} · {item.row.scored} recorded scores
                    </p>
                  )}
                </div>
              ))}
            </div>
            <section className="workspace-panel overflow-hidden p-0 sm:p-0">
              <div
                className="flex max-w-full gap-1 overflow-x-auto border-b border-slate-100 p-3 dark:border-slate-800"
                role="tablist"
                aria-label="CAT analysis sections"
              >
                {[
                  {
                    id: 'cats',
                    label: `CAT results (${data.assessments.length})`,
                  },
                  {
                    id: 'subjects',
                    label: `Subject comparison (${data.subjects.length})`,
                  },
                  {
                    id: 'support',
                    label: `Needs support (${summary.needsSupport})`,
                  },
                ].map((item) => (
                  <button
                    role="tab"
                    aria-selected={tab === item.id}
                    key={item.id}
                    className={`min-h-10 shrink-0 rounded-lg px-3 text-xs font-semibold ${tab === item.id ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900'}`}
                    onClick={() => setTab(item.id as typeof tab)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {tab === 'support' && (
                <label className="relative m-4 block">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    aria-label="Search learners needing support"
                    className="workspace-input w-full pl-9"
                    placeholder="Learner, assessment number or learning area…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              )}
              {!rows.length ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  {tab === 'support'
                    ? 'No scored learner is below 50% in the selected CATs. Unscored learners are not classified.'
                    : 'No CAT results match these filters yet.'}
                </div>
              ) : tab === 'cats' ? (
                <div className="grid gap-3 p-4 md:grid-cols-2">
                  {visible.map((cat: any) => (
                    <article
                      key={cat.id}
                      className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                            {cat.className} · CAT {cat.catNumber}
                          </p>
                          <h3 className="mt-1 break-words text-sm font-semibold">
                            {cat.subjectName}
                          </h3>
                        </div>
                        <span className="text-xl font-semibold">
                          {percent(cat.mean)}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        {cat.scored} / {cat.enrolled} scored · {cat.missing}{' '}
                        missing
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{
                            width: `${cat.enrolled ? (cat.scored / cat.enrolled) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs">
                        <span className="text-amber-700 dark:text-amber-300">
                          {cat.needsSupport} need support
                        </span>
                        <span className="text-slate-500">
                          Low {percent(cat.lowest)} · High{' '}
                          {percent(cat.highest)}
                        </span>
                      </div>
                      <button
                        className="workspace-button-secondary mt-4 w-full"
                        onClick={() => setSelectedCat(cat)}
                      >
                        <Eye className="h-4 w-4" />
                        View learners
                      </button>
                    </article>
                  ))}
                </div>
              ) : tab === 'subjects' ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visible.map((subject: any) => (
                    <article
                      key={`${subject.classId}_${subject.subjectId}`}
                      className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold">
                          {subject.subjectName}{' '}
                          <span className="font-normal text-slate-500">
                            · {subject.className}
                          </span>
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {subject.assessments} CATs · {subject.scored} recorded
                          scores · {subject.missing} missing ·{' '}
                          {subject.needsSupport} learners need support
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(
                            assessmentsBySubject.get(
                              `${subject.classId}:${subject.subjectId}`,
                            ) || []
                          ).map((cat: any) => (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCat(cat)}
                              className="min-h-9 rounded-lg border border-slate-200 px-2 text-xs text-sky-700 dark:border-slate-700 dark:text-sky-300"
                            >
                              CAT {cat.catNumber}: {percent(cat.mean)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-xl font-semibold">
                        {percent(subject.mean)}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visible.map((learner: any) => (
                    <article key={learner.studentId} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold">
                            {learner.fullName}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {learner.className} ·{' '}
                            {learner.admissionNumber ||
                              learner.assessmentNumber}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500">
                          Recorded mean: {percent(learner.mean)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {learner.concerns.map((concern: any) => (
                          <button
                            key={concern.catId}
                            className="min-h-9 rounded-lg bg-amber-50 px-2 text-left text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                            onClick={() =>
                              setSelectedCat(
                                data.assessments.find(
                                  (cat: any) => cat.id === concern.catId,
                                ),
                              )
                            }
                          >
                            {concern.subjectName} · CAT {concern.catNumber}:{' '}
                            {percent(concern.percentage)}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <Pager
                page={currentPage}
                total={rows.length}
                size={size}
                onChange={setPage}
              />
            </section>
          </>
        )
      )}
      {selectedCat && (
        <CatResultModal
          key={selectedCat.id}
          cat={selectedCat}
          onClose={() => setSelectedCat(null)}
        />
      )}
    </div>
  );
};
function CatResultModal({ cat, onClose }: { cat: any; onClose: () => void }) {
  const { data, loading, error, refresh } = useApiResource<any>(
    `/api/cats/${cat.id}/marksheet`,
    (value: any) => value?.cat?.id === cat.id && Array.isArray(value.learners),
  );
  const [filter, setFilter] = useState('ALL'),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1);
  const learners = (data?.learners || []).filter(
    (row: any) =>
      row.fullName.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'ALL' ||
        (filter === 'MISSING'
          ? row.marksObtained == null
          : row.percentage != null && row.percentage < 50)),
  );
  useEffect(() => setPage(1), [filter, search]);
  const current = Math.min(page, Math.max(1, Math.ceil(learners.length / 20)));
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${cat.className} · ${cat.subjectName} · CAT ${cat.catNumber}`}
      maxWidth="max-w-3xl"
    >
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Read-only assessment results · Maximum{' '}
        {data?.cat?.maxMarks ?? cat.maxMarks} marks. Support threshold: below
        50%; missing scores are separate.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="workspace-input min-w-0 flex-1"
          aria-label="Search CAT learners"
          placeholder="Search learner…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="workspace-input"
          aria-label="Filter CAT learner results"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="ALL">All learners</option>
          <option value="SUPPORT">Needs support</option>
          <option value="MISSING">Missing scores</option>
        </select>
      </div>
      {error ? (
        <RequestError message={error} onRetry={refresh} />
      ) : loading ? (
        <p role="status" className="p-5 text-sm text-slate-500">
          Loading learner results…
        </p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {learners.slice((current - 1) * 20, current * 20).map((row: any) => (
            <div
              key={row.studentId}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-medium">
                  {row.fullName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {row.admissionNumber || row.assessmentNumber || '—'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold">
                  {row.marksObtained == null
                    ? 'Not scored'
                    : `${row.marksObtained} / ${data.cat.maxMarks}`}
                </p>
                <p
                  className={`mt-1 text-xs ${row.percentage != null && row.percentage < 50 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500'}`}
                >
                  {row.percentage == null
                    ? 'Missing score'
                    : `${percent(row.percentage)} · ${row.percentage < 50 ? 'Needs support' : row.rubric || 'Meeting threshold'}`}
                </p>
              </div>
            </div>
          ))}
          {!learners.length && (
            <p className="p-5 text-center text-sm text-slate-500">
              No learners match this filter.
            </p>
          )}
          <Pager
            page={current}
            total={learners.length}
            size={20}
            onChange={setPage}
          />
        </div>
      )}
    </Modal>
  );
}
