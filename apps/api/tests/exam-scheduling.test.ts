import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertExamPaperFits,
  validateExamSchedule,
  examTestingIntervals,
} from '@school/shared';
import { assertNoPaperConflicts } from '../src/modules/exams/examScheduling.js';
const config = {
  dailyStartTime: '08:00',
  dailyEndTime: '16:00',
  breaks: [
    { name: 'Tea', startTime: '10:30', endTime: '11:00' },
    { name: 'Lunch', startTime: '12:30', endTime: '13:30' },
  ],
};
const exam = {
  startDate: '2026-11-23',
  endDate: '2026-11-27',
  scheduleConfig: config,
};
test('paper timing preserves duration, boundaries, breaks and examination dates', () => {
  for (const time of [
    '08:00 - 08:45',
    '09:45 - 10:30',
    '11:00 - 11:45',
    '15:15 - 16:00',
  ])
    assert.doesNotThrow(() =>
      assertExamPaperFits(exam, {
        sessionDate: '2026-11-27',
        sessionTime: time,
        durationMinutes: 45,
      }),
    );
  for (const time of [
    '07:45 - 08:30',
    '10:15 - 11:00',
    '10:30 - 11:15',
    '12:00 - 12:45',
    '15:30 - 16:15',
    '08:00 - 09:00',
  ])
    assert.throws(() =>
      assertExamPaperFits(exam, {
        sessionDate: '2026-11-27',
        sessionTime: time,
        durationMinutes: 45,
      }),
    );
  for (const date of ['2026-11-22', '2026-11-28', '2026-02-30', 'not-a-date'])
    assert.throws(() =>
      assertExamPaperFits(exam, {
        sessionDate: date,
        sessionTime: '08:00 - 08:45',
        durationMinutes: 45,
      }),
    );
  assert.throws(
    () =>
      assertExamPaperFits(
        { ...exam, scheduleConfig: null },
        {
          sessionDate: '2026-11-27',
          sessionTime: '08:00 - 08:45',
          durationMinutes: 45,
        },
      ),
    /hours and breaks/,
  );
  assert.deepEqual(examTestingIntervals(config), [
    { start: 480, end: 630 },
    { start: 660, end: 750 },
    { start: 810, end: 960 },
  ]);
});
test('invalid hours or overlapping breaks cannot be saved', () => {
  for (const value of [
    { ...config, dailyEndTime: '07:00' },
    { ...config, dailyStartTime: '99:00' },
    {
      ...config,
      breaks: [{ name: 'Tea', startTime: '07:00', endTime: '09:00' }],
    },
    {
      ...config,
      breaks: [
        { name: 'Tea', startTime: '10:00', endTime: '11:00' },
        { name: 'Lunch', startTime: '10:30', endTime: '12:00' },
      ],
    },
  ])
    assert.throws(() => validateExamSchedule(value));
});
test('class and shared-invigilator clashes are rejected; adjacent papers are allowed', () => {
  const a = {
    id: 'a',
    classId: 'class-1',
    sessionDate: '2026-11-27',
    sessionTime: '08:00 - 08:45',
  };
  const b = { ...a, id: 'b', sessionTime: '08:30 - 09:15' };
  assert.throws(() => assertNoPaperConflicts([a], [a, b], []), /class/);
  const other = { ...b, classId: 'class-2' };
  assert.doesNotThrow(() => assertNoPaperConflicts([a], [a, other], []));
  assert.throws(
    () =>
      assertNoPaperConflicts(
        [a],
        [a, other],
        [
          { examSessionId: 'a', teacherId: 'teacher' },
          { examSessionId: 'b', teacherId: 'teacher' },
        ],
      ),
    /invigilator/,
  );
  assert.doesNotThrow(() =>
    assertNoPaperConflicts(
      [a],
      [a, { ...b, sessionTime: '08:45 - 09:30' }],
      [],
    ),
  );
});
