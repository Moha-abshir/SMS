import React, { useState } from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import {
  assertExamPaperFits,
  examTimeLabel,
  examTimeMinutes,
  examTimeRange,
  validateExamSchedule,
  type ExamScheduleConfig,
} from '@school/shared/types';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';
import { RequestError } from '../../components/RequestError';
import { toast } from 'react-toastify';

export function ExamPaperScheduleModal({
  paper,
  exam,
  dates,
  sessions,
  targetDate,
  onClose,
  onSaved,
}: {
  paper: any;
  exam: any;
  dates: string[];
  sessions: any[];
  targetDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(targetDate || paper.session.sessionDate);
  const [start, setStart] = useState(
    paper.session.sessionTime.split('-')[0].trim(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const duration =
    paper.session.durationMinutes ||
    examTimeRange(paper.session.sessionTime).end -
      examTimeRange(paper.session.sessionTime).start;
  let end = '',
    validation = '';
  try {
    const endMinutes = examTimeMinutes(start) + duration;
    if (endMinutes >= 1440)
      throw new Error('The paper must finish within the same examination day.');
    end = examTimeLabel(endMinutes);
    assertExamPaperFits(exam, {
      sessionDate: date,
      sessionTime: `${start} - ${end}`,
      durationMinutes: duration,
    });
    const range = examTimeRange(`${start} - ${end}`);
    if (
      sessions.some(
        (row) =>
          row.session.id !== paper.session.id &&
          row.session.sessionDate === date &&
          (() => {
            const peer = examTimeRange(row.session.sessionTime);
            return range.start < peer.end && range.end > peer.start;
          })(),
      )
    )
      throw new Error('This class already has a paper at that time.');
  } catch (e: any) {
    validation = e.message;
  }
  const save = async () => {
    if (validation || saving) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.put(`/api/exams/sessions/${paper.session.id}`, {
        sessionDate: date,
        sessionTime: `${start} - ${end}`,
      });
      toast.success('Paper date and time updated.');
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Could not update the paper.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!saving) onClose();
      }}
      title={`Schedule ${paper.subject?.name || 'paper'}`}
    >
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Change the date, the start time, or both. The full {duration}-minute
        paper must fit inside examination hours and outside breaks. Invigilator
        clashes are also checked when saving.
      </p>
      <label className="block space-y-1.5 text-xs font-semibold">
        Examination day
        <select
          aria-label="Paper date"
          className="workspace-input w-full"
          value={date}
          disabled={saving}
          onChange={(e) => {
            setDate(e.target.value);
            setError(null);
          }}
        >
          {dates.map((day) => (
            <option key={day} value={day}>
              {new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5 text-xs font-semibold">
          Start time
          <input
            type="time"
            aria-label="Paper start time"
            step={60}
            className="workspace-input w-full"
            value={start}
            disabled={saving}
            onChange={(e) => {
              setStart(e.target.value);
              setError(null);
            }}
          />
        </label>
        <div className="space-y-1.5 text-xs">
          <p className="font-semibold">Finishes at</p>
          <p className="workspace-input flex items-center gap-2 text-slate-500">
            <Clock className="h-4 w-4" />
            {end || '—'}
          </p>
        </div>
      </div>
      {exam.scheduleConfig && (
        <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <p>
            Examination hours: {exam.scheduleConfig.dailyStartTime}–
            {exam.scheduleConfig.dailyEndTime}
          </p>
          {exam.scheduleConfig.breaks.map((pause: any, i: number) => (
            <p key={i}>
              {pause.name}: {pause.startTime}–{pause.endTime}
            </p>
          ))}
          {!exam.scheduleConfig.breaks.length && <p>No breaks configured.</p>}
        </div>
      )}
      {validation && (
        <p role="status" className="text-xs text-amber-700 dark:text-amber-300">
          {validation}
        </p>
      )}
      {error && <RequestError message={error} onRetry={save} />}
      <div className="flex justify-end gap-2">
        <button
          className="workspace-button-secondary"
          disabled={saving}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="workspace-button-primary"
          disabled={saving || Boolean(validation)}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save date & time'}
        </button>
      </div>
    </Modal>
  );
}

export function ExamScheduleSettingsModal({
  exam,
  onClose,
  onSaved,
}: {
  exam: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [config, setConfig] = useState<ExamScheduleConfig>(
    () =>
      exam.scheduleConfig || {
        dailyStartTime: '08:00',
        dailyEndTime: '16:00',
        breaks: [],
      },
  );
  const [confirmed, setConfirmed] = useState(Boolean(exam.scheduleConfig));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  let validation = '';
  try {
    validateExamSchedule(config);
  } catch (e: any) {
    validation = e.message;
  }
  const save = async () => {
    if (saving || validation || !confirmed) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.put(`/api/exams/${exam.id}`, { scheduleConfig: config });
      toast.success('Examination hours and breaks saved.');
      onSaved();
      onClose();
    } catch (e: any) {
      setError(
        e.response?.data?.message || 'Could not save examination hours.',
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Examination hours & breaks"
      maxWidth="max-w-xl"
    >
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        These hours apply to this examination on each testing day. Papers must
        fit in full between breaks. To change rules that conflict with a
        published paper, return the timetable to draft, adjust the papers, and
        publish again.
      </p>
      {!exam.scheduleConfig && (
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Hours and breaks were not stored for this older timetable. Enter the
          actual rules below; the defaults have not been applied.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {(['dailyStartTime', 'dailyEndTime'] as const).map((key, i) => (
          <label key={key} className="space-y-1.5 text-xs font-semibold">
            {i ? 'Closing time' : 'Opening time'}
            <input
              aria-label={
                i ? 'Examination closing time' : 'Examination opening time'
              }
              type="time"
              className="workspace-input w-full"
              value={config[key]}
              disabled={saving}
              onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Breaks</h3>
        <button
          className="workspace-button-secondary"
          disabled={saving || config.breaks.length >= 20}
          onClick={() =>
            setConfig({
              ...config,
              breaks: [
                ...config.breaks,
                { name: 'Break', startTime: '10:00', endTime: '10:30' },
              ],
            })
          }
        >
          <Plus className="h-4 w-4" />
          Add break
        </button>
      </div>
      {config.breaks.map((pause, index) => (
        <div
          key={index}
          className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
        >
          <input
            aria-label={`Break ${index + 1} name`}
            className="workspace-input col-span-2 w-full"
            value={pause.name}
            disabled={saving}
            onChange={(e) =>
              setConfig({
                ...config,
                breaks: config.breaks.map((b, i) =>
                  i === index ? { ...b, name: e.target.value } : b,
                ),
              })
            }
          />
          {(['startTime', 'endTime'] as const).map((key, i) => (
            <label key={key} className="space-y-1 text-xs text-slate-500">
              {i ? 'Ends' : 'Starts'}
              <input
                type="time"
                aria-label={`Break ${index + 1} ${i ? 'end' : 'start'}`}
                className="workspace-input w-full"
                disabled={saving}
                value={pause[key]}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    breaks: config.breaks.map((b, j) =>
                      j === index ? { ...b, [key]: e.target.value } : b,
                    ),
                  })
                }
              />
            </label>
          ))}
          <button
            aria-label={`Remove break ${index + 1}`}
            disabled={saving}
            className="workspace-button-secondary col-span-2"
            onClick={() =>
              setConfig({
                ...config,
                breaks: config.breaks.filter((_, i) => i !== index),
              })
            }
          >
            <Trash2 className="h-4 w-4" />
            Remove break
          </button>
        </div>
      ))}
      {!exam.scheduleConfig && (
        <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={saving}
          />
          I have checked the actual examination hours and breaks.
        </label>
      )}
      {validation && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {validation}
        </p>
      )}
      {error && <RequestError message={error} onRetry={save} />}
      <div className="flex justify-end gap-2">
        <button
          className="workspace-button-secondary"
          disabled={saving}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="workspace-button-primary"
          disabled={saving || Boolean(validation) || !confirmed}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save examination hours'}
        </button>
      </div>
    </Modal>
  );
}
