import { db } from '../../config/db.js';
import { academicTerms, eq, desc, asc, isNull } from '@school/shared';

export class AcademicTermsService {
  static async getAllTerms() {
    return await db
      .select()
      .from(academicTerms)
      .where(isNull(academicTerms.deletedAt))
      .orderBy(desc(academicTerms.year), asc(academicTerms.termNumber));
  }

  static async getCurrentTerm() {
    const [current] = await db
      .select()
      .from(academicTerms)
      .where(eq(academicTerms.isCurrent, true));
    return current || null;
  }

  static async createTerm(data: {
    year: number;
    termNumber: number;
    startDate: string;
    endDate: string;
    isCurrent?: boolean;
  }) {
    if (data.isCurrent) {
      // Unset previous current term
      await db.update(academicTerms).set({ isCurrent: false }).where(eq(academicTerms.isCurrent, true));
    }

    const [created] = await db
      .insert(academicTerms)
      .values({
        year: data.year,
        termNumber: data.termNumber,
        startDate: data.startDate,
        endDate: data.endDate,
        isCurrent: data.isCurrent || false,
      })
      .returning();

    return created;
  }

  static async updateTerm(id: string, data: {
    year?: number;
    termNumber?: number;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
  }) {
    if (data.isCurrent) {
      await db.update(academicTerms).set({ isCurrent: false }).where(eq(academicTerms.isCurrent, true));
    }

    const [updated] = await db
      .update(academicTerms)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(academicTerms.id, id))
      .returning();

    return updated;
  }

  static async deleteTerm(id: string) {
    const [deleted] = await db
      .update(academicTerms)
      .set({ deletedAt: new Date() })
      .where(eq(academicTerms.id, id))
      .returning();

    return deleted;
  }
}
