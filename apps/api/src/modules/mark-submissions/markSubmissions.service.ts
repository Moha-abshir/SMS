import { db } from '../../config/db.js';
import { markSubmissions, classes, subjects, users, eq, isNull, desc } from '@school/shared';

export class MarkSubmissionsService {
  static async getSubmissions(filterStatus?: string) {
    const list = await db
      .select({
        submission: markSubmissions,
        class: classes,
        subject: subjects,
        submittedBy: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(markSubmissions)
      .innerJoin(classes, eq(markSubmissions.classId, classes.id))
      .innerJoin(subjects, eq(markSubmissions.subjectId, subjects.id))
      .innerJoin(users, eq(markSubmissions.teacherId, users.id))
      .where(isNull(markSubmissions.deletedAt))
      .orderBy(desc(markSubmissions.updatedAt));

    return list;
  }

  static async approveSubmission(id: string, reviewedById: string) {
    const [updated] = await db
      .update(markSubmissions)
      .set({
        status: 'APPROVED',
        reviewedById,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(markSubmissions.id, id))
      .returning();

    return updated;
  }

  static async requestCorrection(id: string, reason: string) {
    const [updated] = await db
      .update(markSubmissions)
      .set({
        status: 'CORRECTION_REQUESTED',
        correctionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(markSubmissions.id, id))
      .returning();

    return updated;
  }

  static async lockSubmission(id: string, reviewedById: string) {
    const [updated] = await db
      .update(markSubmissions)
      .set({
        status: 'LOCKED',
        reviewedById,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(markSubmissions.id, id))
      .returning();

    return updated;
  }
}
