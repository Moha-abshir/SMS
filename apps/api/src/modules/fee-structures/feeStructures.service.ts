import { db } from '../../config/db.js';
import { feeStructures, academicTerms, eq, isNull } from '@school/shared';

const DEFAULT_FEES: Record<string, number> = {
  PPE: 6000,
  LOWER_PRIMARY: 7000,
  UPPER_PRIMARY: 7500,
  JUNIOR: 11000,
};

export class FeeStructuresService {
  static async getFeeStructures(termId?: string) {
    // If no term specified, default to active current term or latest term
    let targetTermId = termId;
    if (!targetTermId) {
      const [currentTerm] = await db.select().from(academicTerms).where(eq(academicTerms.isCurrent, true));
      if (currentTerm) {
        targetTermId = currentTerm.id;
      }
    }

    if (!targetTermId) {
      const [latestTerm] = await db.select().from(academicTerms).limit(1);
      if (latestTerm) {
        targetTermId = latestTerm.id;
      }
    }

    if (!targetTermId) {
      return { termId: null, structures: [] };
    }

    const existing = await db
      .select()
      .from(feeStructures)
      .where(eq(feeStructures.termId, targetTermId));

    // If initial fee structures don't exist for this term, seed default 4-tier values
    const categories = ['PPE', 'LOWER_PRIMARY', 'UPPER_PRIMARY', 'JUNIOR'];
    const existingCats = new Set(existing.map((e) => e.levelCategory));

    const missingCats = categories.filter((cat) => !existingCats.has(cat as any));

    if (missingCats.length > 0) {
      const newEntries = missingCats.map((cat) => ({
        termId: targetTermId!,
        levelCategory: cat as any,
        totalAmount: (DEFAULT_FEES[cat] || 6000).toString(),
      }));

      await db.insert(feeStructures).values(newEntries);
    }

    const finalStructures = await db
      .select()
      .from(feeStructures)
      .where(eq(feeStructures.termId, targetTermId));

    return { termId: targetTermId, structures: finalStructures };
  }

  static async updateFeeStructure(id: string, totalAmount: number) {
    const [updated] = await db
      .update(feeStructures)
      .set({
        totalAmount: totalAmount.toString(),
        updatedAt: new Date(),
      })
      .where(eq(feeStructures.id, id))
      .returning();

    return updated;
  }
}
