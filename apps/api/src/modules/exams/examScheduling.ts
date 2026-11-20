import { db } from '../../config/db.js';
import {
  examinations,
  examSessions,
  invigilatorAllocations,
  eq,
  and,
  isNull,
  ne,
  inArray,
  sql,
  examTimeRange,
  assertExamPaperFits,
} from '@school/shared';
type Reader = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function lockExamSchedule(tx: Reader, examId: string) {
  // One ordering for generation, conclusion, configuration and individual edits.
  // Global serialization also prevents invigilator conflicts across exam series.
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended('exam-timetable-edit', 0))`,
  );
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`exam-timetable:${examId}`}, 0))`,
  );
  const [exam] = await tx
    .select()
    .from(examinations)
    .where(and(eq(examinations.id, examId), isNull(examinations.deletedAt)));
  if (!exam) throw new Error('Examination series not found');
  if (exam.status === 'LOCKED')
    throw new Error(
      'This examination has concluded. Create a new examination instead of reopening or editing it.',
    );
  return exam;
}
export type ScheduledPaper = {
  id: string;
  classId: string | null;
  sessionDate: string;
  sessionTime: string;
  durationMinutes?: number | null;
};
export function assertNoPaperConflicts(
  candidates: ScheduledPaper[],
  calendar: ScheduledPaper[],
  invigilators: { examSessionId: string; teacherId: string }[],
) {
  const staffByPaper = new Map<string, Set<string>>();
  for (const row of invigilators) {
    if (!staffByPaper.has(row.examSessionId))
      staffByPaper.set(row.examSessionId, new Set());
    staffByPaper.get(row.examSessionId)!.add(row.teacherId);
  }
  const byDate = new Map<string, ScheduledPaper[]>();
  for (const paper of calendar) {
    if (!byDate.has(paper.sessionDate)) byDate.set(paper.sessionDate, []);
    byDate.get(paper.sessionDate)!.push(paper);
  }
  for (const paper of candidates) {
    const range = examTimeRange(paper.sessionTime);
    for (const peer of byDate.get(paper.sessionDate) || []) {
      if (paper.id === peer.id) continue;
      const other = examTimeRange(peer.sessionTime);
      if (range.start >= other.end || range.end <= other.start) continue;
      if (paper.classId && paper.classId === peer.classId)
        throw new Error(
          'This class already has another paper at the selected time.',
        );
      const staff = staffByPaper.get(paper.id);
      if (staff && [...staff].some((id) => staffByPaper.get(peer.id)?.has(id)))
        throw new Error(
          'An assigned invigilator has another paper at the selected time.',
        );
    }
  }
}
export async function validatePaperEdits(
  tx: Reader,
  exam: typeof examinations.$inferSelect,
  candidates: ScheduledPaper[],
  replacingIds: string[],
  addedInvigilators: { examSessionId: string; teacherId: string }[] = [],
) {
  for (const paper of candidates) assertExamPaperFits(exam, paper);
  if (!candidates.length) return;
  const dates = [...new Set(candidates.map((row) => row.sessionDate))];
  const peers = await tx
    .select({
      id: examSessions.id,
      classId: examSessions.classId,
      sessionDate: examSessions.sessionDate,
      sessionTime: examSessions.sessionTime,
    })
    .from(examSessions)
    .innerJoin(examinations, eq(examSessions.examId, examinations.id))
    .where(
      and(
        inArray(examSessions.sessionDate, dates),
        isNull(examSessions.deletedAt),
        isNull(examinations.deletedAt),
        ne(examinations.status, 'LOCKED'),
      ),
    );
  const replacing = new Set(replacingIds);
  const calendar = [
    ...peers.filter((row) => !replacing.has(row.id)),
    ...candidates,
  ];
  const ids = [...new Set([...calendar.map((row) => row.id), ...replacingIds])];
  const assigned = ids.length
    ? await tx
        .select({
          examSessionId: invigilatorAllocations.examSessionId,
          teacherId: invigilatorAllocations.teacherId,
        })
        .from(invigilatorAllocations)
        .where(
          and(
            inArray(invigilatorAllocations.examSessionId, ids),
            isNull(invigilatorAllocations.deletedAt),
          ),
        )
    : [];
  assertNoPaperConflicts(candidates, calendar, [
    ...assigned,
    ...addedInvigilators,
  ]);
}
