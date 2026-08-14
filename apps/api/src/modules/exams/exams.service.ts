import { db } from '../../config/db.js';
import { examinations, examSessions, academicTerms, subjects, eq, and, isNull, desc } from '@school/shared';

export class ExamsService {
  static async getExams() {
    const list = await db
      .select({
        exam: examinations,
        term: academicTerms,
      })
      .from(examinations)
      .innerJoin(academicTerms, eq(examinations.termId, academicTerms.id))
      .where(isNull(examinations.deletedAt))
      .orderBy(desc(examinations.createdAt));

    return list;
  }

  static async createExam(data: { termId: string; title: string }) {
    const [created] = await db
      .insert(examinations)
      .values({
        termId: data.termId,
        title: data.title,
        status: 'DRAFT',
      })
      .returning();

    return created;
  }

  static async getExamSessions(examId: string) {
    const sessions = await db
      .select({
        session: examSessions,
        subject: subjects,
      })
      .from(examSessions)
      .innerJoin(subjects, eq(examSessions.subjectId, subjects.id))
      .where(and(eq(examSessions.examId, examId), isNull(examSessions.deletedAt)))
      .orderBy(examSessions.sessionDate);

    return sessions;
  }

  static async createExamSession(data: {
    examId: string;
    subjectId: string;
    sessionDate: string;
    sessionTime: string;
  }) {
    const [session] = await db
      .insert(examSessions)
      .values({
        examId: data.examId,
        subjectId: data.subjectId,
        sessionDate: data.sessionDate,
        sessionTime: data.sessionTime,
      })
      .returning();

    return session;
  }

  static async deleteExamSession(id: string) {
    const [deleted] = await db
      .update(examSessions)
      .set({ deletedAt: new Date() })
      .where(eq(examSessions.id, id))
      .returning();

    return deleted;
  }
}
