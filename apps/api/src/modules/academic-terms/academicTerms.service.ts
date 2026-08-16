import { db } from '../../config/db.js';
import { academicTerms, eq, desc, asc, isNull, and } from '@school/shared';

export class AcademicTermsService {
  static async ensureThreeTerms(year: number = 2026) {
    const existingTerms = await db
      .select()
      .from(academicTerms)
      .where(and(eq(academicTerms.year, year), isNull(academicTerms.deletedAt)))
      .orderBy(asc(academicTerms.termNumber));

    const existingTermNumbers = new Set(existingTerms.map((t) => t.termNumber));

    // Kenya 3-term system defaults for the academic year
    const defaultTerms = [
      {
        year,
        termNumber: 1,
        startDate: `${year}-01-08`,
        endDate: `${year}-04-05`,
        isCurrent: true,
      },
      {
        year,
        termNumber: 2,
        startDate: `${year}-05-06`,
        endDate: `${year}-08-08`,
        isCurrent: false,
      },
      {
        year,
        termNumber: 3,
        startDate: `${year}-08-26`,
        endDate: `${year}-11-20`,
        isCurrent: false,
      },
    ];

    const missingTerms = defaultTerms.filter((dt) => !existingTermNumbers.has(dt.termNumber));

    if (missingTerms.length > 0) {
      // Check if any active current term already exists before setting default current
      const hasCurrent = existingTerms.some((t) => t.isCurrent);
      const toInsert = missingTerms.map((t) => ({
        ...t,
        isCurrent: hasCurrent ? false : t.isCurrent,
      }));

      await db.insert(academicTerms).values(toInsert);
    }

    return await db
      .select()
      .from(academicTerms)
      .where(and(eq(academicTerms.year, year), isNull(academicTerms.deletedAt)))
      .orderBy(asc(academicTerms.termNumber));
  }

  static async getAllTerms() {
    // Automatically ensure all 3 terms exist for the academic year
    await this.ensureThreeTerms(2026);

    return await db
      .select()
      .from(academicTerms)
      .where(isNull(academicTerms.deletedAt))
      .orderBy(desc(academicTerms.year), asc(academicTerms.termNumber));
  }

  static async getCurrentTerm() {
    await this.ensureThreeTerms(2026);
    const [current] = await db
      .select()
      .from(academicTerms)
      .where(eq(academicTerms.isCurrent, true));
    return current || null;
  }

  static async updateTerm(id: string, data: {
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
  }) {
    if (data.isCurrent) {
      await db.update(academicTerms).set({ isCurrent: false }).where(eq(academicTerms.isCurrent, true));
    }

    const updatePayload: any = { updatedAt: new Date() };
    if (data.startDate) updatePayload.startDate = data.startDate;
    if (data.endDate) updatePayload.endDate = data.endDate;
    if (data.isCurrent !== undefined) updatePayload.isCurrent = data.isCurrent;

    const [updated] = await db
      .update(academicTerms)
      .set(updatePayload)
      .where(eq(academicTerms.id, id))
      .returning();

    return updated;
  }
}
