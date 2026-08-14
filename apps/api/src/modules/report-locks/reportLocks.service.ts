import { db } from '../../config/db.js';
import { reportCardLocks, classes, academicTerms, eq, and, isNull } from '@school/shared';

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
      .select()
      .from(classes)
      .where(isNull(classes.deletedAt))
      .orderBy(classes.numericOrder);

    const locks = targetTermId
      ? await db
          .select()
          .from(reportCardLocks)
          .where(eq(reportCardLocks.termId, targetTermId))
      : [];

    return classList.map((c) => {
      const lockRecord = locks.find((l) => l.classId === c.id);
      return {
        class: c,
        isLocked: lockRecord ? lockRecord.isLocked : true, // Default locked until explicitly released
        lockId: lockRecord ? lockRecord.id : null,
        lockedAt: lockRecord ? lockRecord.lockedAt : null,
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
