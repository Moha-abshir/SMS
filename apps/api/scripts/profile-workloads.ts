import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { TimetableEngine, type DayPeriodSlot } from '../src/modules/timetable/timetable.engine.js';

// Synthetic, database-free profiling. Results describe this machine, not production capacity.
const cats = Array.from({ length: 240 }, (_, i) => ({ id: `cat${i}` }));
const scores = Array.from({ length: 24000 }, (_, i) => ({ catId: `cat${i % cats.length}`, mark: i % 101 }));
function repeatedScan() { return cats.map(cat => scores.filter(score => score.catId === cat.id).reduce((sum, score) => sum + score.mark, 0)); }
function indexed() {
  const groups = new Map<string, typeof scores>();
  for (const score of scores) {
    const group = groups.get(score.catId) || [];
    group.push(score);
    groups.set(score.catId, group);
  }
  return cats.map(cat => (groups.get(cat.id) || []).reduce((sum, score) => sum + score.mark, 0));
}
assert.deepEqual(indexed(), repeatedScan());
function measure(name: string, operation: () => unknown, repeats: number) {
  const times: number[] = [];
  const cpu = process.cpuUsage();
  global.gc?.();
  const beforeHeap = process.memoryUsage().heapUsed;
  for (let i = 0; i < repeats; i++) { const start = performance.now(); operation(); times.push(performance.now() - start); }
  const usage = process.cpuUsage(cpu);
  global.gc?.();
  times.sort((a,b) => a-b);
  console.log(JSON.stringify({ name, runs: repeats, p50Ms: times[Math.floor(times.length*.5)], p95Ms: times[Math.floor(times.length*.95)], cpuMs: (usage.user+usage.system)/1000, heapDeltaBytes: process.memoryUsage().heapUsed-beforeHeap, rssBytes: process.memoryUsage().rss, maxRssBytes: process.resourceUsage().maxRSS * 1024 }));
}
measure('CAT repeated scans, 240 assessments / 24000 scores', repeatedScan, 20);
measure('CAT grouped lookup, same output', indexed, 20);
const days = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'];
const periodsGrid = new Map<string, DayPeriodSlot[]>(days.map(day => [day, Array.from({ length: 10 }, (_, i) => ({ day, periodIndex: i+1, startTime: TimetableEngine.minutesToTime(480+i*40), endTime: TimetableEngine.minutesToTime(520+i*40), isBreak: false, sessionTier: i<3 ? 'EARLY_MORNING' : i<6 ? 'MID_MORNING' : 'AFTERNOON' }))]));
const allocations = Array.from({ length: 48 }, (_, i) => ({ classId: `c${Math.floor(i/8)}`, className: `Class ${Math.floor(i/8)}`, subjectId: `s${i%8}`, subjectCode: `S${i%8}`, subjectName: `Subject ${i%8}`, teacherId: `t${i%8}`, teacherName: `Teacher ${i%8}`, lessonsPerWeek: 4, doubleLessonsCount: 0 }));
measure('Timetable generation, 6 classes / 8 teachers / 192 requested lessons', () => {
  const result = TimetableEngine.generate({ periodsGrid, allocations });
  const teacherSlots = new Set<string>(), classSlots = new Set<string>();
  for (const slot of result.slots) {
    const teacherKey = `${slot.dayOfWeek}:${slot.periodIndex}:${slot.teacherId}`;
    const classKey = `${slot.dayOfWeek}:${slot.periodIndex}:${slot.classId}`;
    assert(!teacherSlots.has(teacherKey)); assert(!classSlots.has(classKey));
    teacherSlots.add(teacherKey); classSlots.add(classKey);
  }
}, 10);
