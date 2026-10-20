import { db } from '../../config/db.js';
import { reportCardLocks, classes, academicTerms, users, markSubmissions, eq, and, isNull } from '@school/shared';

export class ReportLocksService {
  static async getReportLocks(termId?: string) {
    let targetTermId = termId;
    if (!targetTermId) {
      const [currentTerm] = await db
        .select()
        .from(academicTerms)
        .where(eq(academicTerms.isCurrent, true));
      targetTermId = currentTerm?.id;
    }

    const classList = await db
      .select({
        class: classes,
        classTeacher: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(classes)
      .leftJoin(users, eq(classes.classTeacherId, users.id))
      .where(isNull(classes.deletedAt))
      .orderBy(classes.numericOrder);

    const locks = targetTermId
      ? await db
          .select()
          .from(reportCardLocks)
          .where(eq(reportCardLocks.termId, targetTermId))
      : [];

    const submissions = await db
      .select({
        id: markSubmissions.id,
        classId: markSubmissions.classId,
        status: markSubmissions.status,
      })
      .from(markSubmissions)
      .where(isNull(markSubmissions.deletedAt));

    return classList.map((c) => {
      const lockRecord = locks.find((l) => l.classId === c.class.id);
      const classSubs = submissions.filter((s) => s.classId === c.class.id);
      const totalSubs = classSubs.length;
      const approvedSubs = classSubs.filter((s) => s.status === 'APPROVED' || s.status === 'LOCKED').length;
      const marksApproved = totalSubs > 0 && approvedSubs === totalSubs;

      return {
        class: c.class,
        classTeacher: c.classTeacher?.id ? c.classTeacher : null,
        isLocked: lockRecord ? lockRecord.isLocked : true, // Default locked until explicitly released
        lockId: lockRecord ? lockRecord.id : null,
        lockedAt: lockRecord ? lockRecord.lockedAt : null,
        totalMarkSubmissions: totalSubs,
        approvedMarkSubmissions: approvedSubs,
        marksApproved,
      };
    });
  }

  static async toggleReportLock(
    data: {
      classId: string;
      termId?: string;
      isLocked: boolean;
    },
    userId: string
  ) {
    let targetTermId = data.termId;
    if (!targetTermId) {
      const [currentTerm] = await db
        .select()
        .from(academicTerms)
        .where(eq(academicTerms.isCurrent, true));
      targetTermId = currentTerm?.id;
    }

    if (!targetTermId) throw new Error('Active academic term required');

    const [existing] = await db
      .select()
      .from(reportCardLocks)
      .where(
        and(
          eq(reportCardLocks.classId, data.classId),
          eq(reportCardLocks.termId, targetTermId)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(reportCardLocks)
        .set({
          isLocked: data.isLocked,
          lockedById: userId,
          lockedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(reportCardLocks.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await db
      .insert(reportCardLocks)
      .values({
        classId: data.classId,
        termId: targetTermId,
        isLocked: data.isLocked,
        lockedById: userId,
        lockedAt: new Date(),
      })
      .returning();

    return created;
  }
}
