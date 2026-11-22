import { db } from '../../config/db.js';
import { examinations, eq, and, isNull, sql } from '@school/shared';
type Reader = Pick<typeof db, 'select'>;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function publishedExam(examId: string, reader: Reader = db) {
  const [exam] = await reader
    .select()
    .from(examinations)
    .where(and(eq(examinations.id, examId), isNull(examinations.deletedAt)));
  if (!exam || !['APPROVED', 'LOCKED'].includes(exam.status))
    throw Object.assign(
      new Error('This examination has not been published by the DoS.'),
      { status: 403, statusCode: 403 },
    );
  return exam;
}

/** Writers share the lifecycle lock; publication/conclusion takes it exclusively. */
export async function writableExam(tx: Transaction, examId: string) {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock_shared(hashtextextended(${`exam-lifecycle:${examId}`}, 0))`,
  );
  const exam = await publishedExam(examId, tx);
  if (exam.status !== 'APPROVED')
    throw new Error(
      'This examination has concluded. Mark entry and review are closed.',
    );
  return exam;
}
