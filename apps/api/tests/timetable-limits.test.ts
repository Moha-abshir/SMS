import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TimetableEngine } from '../src/modules/timetable/timetable.engine.js';
test('timetable input bounds prevent unbounded period/task allocation', () => {
  assert.equal(TimetableEngine.timeToMinutes('99999999999999999:00'), 0);
  assert.equal(TimetableEngine.timeToMinutes('08:40'), 520);
  const config = { schoolDays: ['MONDAY'], startTime: '08:00', endTime: '16:00', lessonDurationMinutes: 40, breaks: [] };
  assert(TimetableEngine.computePeriodsGrid(config).get('MONDAY')!.length > 0);
  assert.throws(() => TimetableEngine.computePeriodsGrid({ ...config, lessonDurationMinutes: Infinity }), /duration/);
  assert.throws(() => TimetableEngine.computePeriodsGrid({ ...config, schoolDays: Array(100).fill('MONDAY') }), /school days/);
  assert.throws(() => TimetableEngine.generate({ periodsGrid: new Map(), allocations: [{ lessonsPerWeek: Infinity, doubleLessonsCount: 0 } as any] }), /limits/);
});
