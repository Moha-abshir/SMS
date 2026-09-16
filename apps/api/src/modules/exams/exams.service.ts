import { db } from '../../config/db.js';
import {
  examinations,
  examSessions,
  academicTerms,
  subjects,
  invigilatorAllocations,
  eq,
  and,
  isNull,
  desc,
} from '@school/shared';

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

  static async updateExamStatus(id: string, status: any) {
    const validStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUESTED', 'RESUBMITTED', 'APPROVED', 'LOCKED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const [updated] = await db
      .update(examinations)
      .set({ status, updatedAt: new Date() })
      .where(eq(examinations.id, id))
      .returning();

    return updated;
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
      .orderBy(examSessions.sessionDate, examSessions.sessionTime);

    // Count assigned invigilators per session
    const invigAllocs = await db
      .select({
        sessionId: invigilatorAllocations.examSessionId,
      })
      .from(invigilatorAllocations)
      .where(isNull(invigilatorAllocations.deletedAt));

    const invigCountMap = new Map<string, number>();
    invigAllocs.forEach((a) => {
      invigCountMap.set(a.sessionId, (invigCountMap.get(a.sessionId) || 0) + 1);
    });

    return sessions.map((s) => ({
      ...s,
      invigilatorsCount: invigCountMap.get(s.session.id) || 0,
    }));
  }

  static async createExamSession(data: {
    examId: string;
    subjectId: string;
    sessionDate: string;
    sessionTime: string;
  }) {
    // Conflict check: is this exact subject already scheduled on the same date for this exam?
    const existing = await db
      .select()
      .from(examSessions)
      .where(
        and(
          eq(examSessions.examId, data.examId),
          eq(examSessions.subjectId, data.subjectId),
          eq(examSessions.sessionDate, data.sessionDate),
          isNull(examSessions.deletedAt)
        )
      );

    if (existing.length > 0) {
      throw new Error('This subject has already been scheduled for this date in the exam timetable.');
    }

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

