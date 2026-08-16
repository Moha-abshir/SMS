import { db } from '../../config/db.js';
import { feeStructures, academicTerms, eq, inArray, isNull } from '@school/shared';
import { AcademicTermsService } from '../academic-terms/academicTerms.service.js';

const DEFAULT_TERM_FEES: Record<string, number> = {
  PPE: 6000,
  LOWER_PRIMARY: 7000,
  UPPER_PRIMARY: 7500,
  JUNIOR: 11000,
};

const LEVEL_LABELS: Record<string, { title: string; subtitle: string }> = {
  PPE: { title: 'Pre-Primary Education (PPE)', subtitle: 'Playgroup, PP1, PP2' },
  LOWER_PRIMARY: { title: 'Lower Primary Education', subtitle: 'Grades 1, 2, and 3' },
  UPPER_PRIMARY: { title: 'Upper Primary Education', subtitle: 'Grades 4, 5, and 6' },
  JUNIOR: { title: 'Junior Secondary School (JSS)', subtitle: 'Grades 7, 8, and 9' },
};

export class FeeStructuresService {
  static async getFeeMatrix(year: number = 2026) {
    // 1. Ensure all 3 Kenyan terms exist for this academic year
    const terms = await AcademicTermsService.ensureThreeTerms(year);
    const termIds = terms.map((t) => t.id);

    // 2. Fetch existing fee structures for these 3 terms
    const existing = await db
      .select()
      .from(feeStructures)
      .where(inArray(feeStructures.termId, termIds));

    const categories = ['PPE', 'LOWER_PRIMARY', 'UPPER_PRIMARY', 'JUNIOR'];
    const newEntries: Array<{ termId: string; levelCategory: any; totalAmount: string }> = [];

    // Ensure every category has an entry for all 3 terms
    for (const cat of categories) {
      for (const term of terms) {
        const found = existing.find(
          (e) => e.levelCategory === cat && e.termId === term.id
        );
        if (!found) {
          newEntries.push({
            termId: term.id,
            levelCategory: cat as any,
            totalAmount: (DEFAULT_TERM_FEES[cat] || 6000).toString(),
          });
        }
      }
    }

    if (newEntries.length > 0) {
      await db.insert(feeStructures).values(newEntries);
    }

    // Refetch updated fee structures
    const allStructures = await db
      .select()
      .from(feeStructures)
      .where(inArray(feeStructures.termId, termIds));

    // Build 3-Term Matrix
    const matrix = categories.map((cat) => {
      const term1Obj = allStructures.find(
        (s) => s.levelCategory === cat && s.termId === terms[0]?.id
      );
      const term2Obj = allStructures.find(
        (s) => s.levelCategory === cat && s.termId === terms[1]?.id
      );
      const term3Obj = allStructures.find(
        (s) => s.levelCategory === cat && s.termId === terms[2]?.id
      );

      const t1Fee = parseFloat(term1Obj?.totalAmount || '0');
      const t2Fee = parseFloat(term2Obj?.totalAmount || '0');
      const t3Fee = parseFloat(term3Obj?.totalAmount || '0');

      return {
        levelCategory: cat,
        title: LEVEL_LABELS[cat]?.title || cat,
        targetGrades: LEVEL_LABELS[cat]?.subtitle || '',
        term1: {
          id: term1Obj?.id,
          termId: terms[0]?.id,
          amount: t1Fee,
        },
        term2: {
          id: term2Obj?.id,
          termId: terms[1]?.id,
          amount: t2Fee,
        },
        term3: {
          id: term3Obj?.id,
          termId: terms[2]?.id,
          amount: t3Fee,
        },
        annualTotal: t1Fee + t2Fee + t3Fee,
      };
    });

    return {
      year,
      terms,
      matrix,
    };
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

  static async batchUpdate(updates: Array<{ id: string; totalAmount: number }>) {
    const results = [];
    for (const update of updates) {
      if (!update.id || isNaN(update.totalAmount)) continue;
      const res = await this.updateFeeStructure(update.id, update.totalAmount);
      results.push(res);
    }
    return results;
  }
}
