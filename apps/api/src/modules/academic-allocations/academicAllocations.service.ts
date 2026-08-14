import { db } from '../../config/db.js';
import { invigilatorAllocations, markingAllocations, examSessions, examinations, classes, subjects, users, eq, isNull, and, desc } from '@school/shared';

export class AcademicAllocationsService {
  // --- Invigilators ---
  static async getInvigilators(examSessionId?: string) {
    let query = db
      .select({
        allocation: invigilatorAllocations,
        session: examSessions,
        class: classes,
        teacher: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(invigilatorAllocations)
      .innerJoin(examSessions, eq(invigilatorAllocations.examSessionId, examSessions.id))
      .innerJoin(classes, eq(invigilatorAllocations.classId, classes.id))
      .innerJoin(users, eq(invigilatorAllocations.teacherId, users.id))
      .where(isNull(invigilatorAllocations.deletedAt))
      .orderBy(desc(invigilatorAllocations.createdAt));

    return await query;
  }

  static async assignInvigilator(data: {
    examSessionId: string;
    classId: string;
    teacherId: string;
  }) {
    const [created] = await db
      .insert(invigilatorAllocations)
      .values({
        examSessionId: data.examSessionId,
        classId: data.classId,
        teacherId: data.teacherId,
      })
      .returning();

    return created;
  }

  static async removeInvigilator(id: string) {
    const [deleted] = await db
      .update(invigilatorAllocations)
      .set({ deletedAt: new Date() })
      .where(eq(invigilatorAllocations.id, id))
      .returning();

    return deleted;
  }

  // --- Marking Allocations ---
  static async getMarkingAllocations() {
    return await db
      .select({
        allocation: markingAllocations,
        exam: examinations,
        subject: subjects,
        class: classes,
        teacher: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(markingAllocations)
      .innerJoin(examinations, eq(markingAllocations.examId, examinations.id))
      .innerJoin(subjects, eq(markingAllocations.subjectId, subjects.id))
      .innerJoin(classes, eq(markingAllocations.classId, classes.id))
      .innerJoin(users, eq(markingAllocations.teacherId, users.id))
      .where(isNull(markingAllocations.deletedAt))
      .orderBy(desc(markingAllocations.createdAt));
  }

  static async assignMarking(data: {
    examId: string;
    subjectId: string;
    classId: string;
    teacherId: string;
  }) {
    const [created] = await db
      .insert(markingAllocations)
      .values({
        examId: data.examId,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      })
      .returning();

    return created;
  }

  static async removeMarking(id: string) {
    const [deleted] = await db
      .update(markingAllocations)
      .set({ deletedAt: new Date() })
      .where(eq(markingAllocations.id, id))
      .returning();

    return deleted;
  }
}
