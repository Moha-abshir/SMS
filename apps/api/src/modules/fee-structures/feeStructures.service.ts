import { randomUUID } from 'node:crypto';
import { db } from '../../config/db.js';
import {
  feeStructures,
  academicTerms,
  auditLogs,
  classes,
  eq,
  and,
  inArray,
  isNull,
  asc,
  sql,
} from '@school/shared';
import { cents, money, financeAudit } from '../finance/financeRules.js';
const labels = {
  PPE: 'Pre-Primary',
  LOWER_PRIMARY: 'Lower Primary',
  UPPER_PRIMARY: 'Upper Primary',
  JUNIOR: 'Junior Secondary',
} as const;
type Level = keyof typeof labels;
export interface FeeUpdate {
  id?: string;
  termId?: string;
  levelCategory?: Level;
  totalAmount: number | string;
}
export class FeeStructuresService {
  static async getFeeMatrix(year: number) {
    if (!Number.isInteger(year) || year < 2000 || year > 2200)
      throw new Error('Choose a valid academic year.');
    const terms = await db
      .select()
      .from(academicTerms)
      .where(and(eq(academicTerms.year, year), isNull(academicTerms.deletedAt)))
      .orderBy(asc(academicTerms.termNumber));
    const existing = terms.length
      ? await db
          .select({ structure: feeStructures, className: classes.name })
          .from(feeStructures)
          .leftJoin(classes, eq(feeStructures.classId, classes.id))
          .where(
            and(
              inArray(
                feeStructures.termId,
                terms.map((t) => t.id),
              ),
              isNull(feeStructures.deletedAt),
            ),
          )
      : [];
    const lookup = new Map(
      existing
        .filter((row) => !row.structure.classId)
        .map(({ structure: row }) => [
          `${row.levelCategory}:${row.termId}`,
          row,
        ]),
    );
    return {
      year,
      terms,
      savedRates: existing.map(({ structure: row, className }) => ({
        id: row.id,
        termId: row.termId,
        levelCategory: row.levelCategory,
        className,
        totalAmount: row.totalAmount,
      })),
      matrix: Object.entries(labels).map(([levelCategory, title]) => ({
        levelCategory,
        title,
        targetGrades: title,
        ...Object.fromEntries(
          [1, 2, 3].map((number) => {
            const term = terms.find((t) => t.termNumber === number);
            const row = term
              ? lookup.get(`${levelCategory}:${term.id}`)
              : undefined;
            return [
              `term${number}`,
              {
                id: row?.id || null,
                termId: term?.id || null,
                amount: row ? Number(row.totalAmount) : null,
                approved: Boolean(row?.approvedAt),
                approvedAt: row?.approvedAt || null,
              },
            ];
          }),
        ),
      })),
    };
  }
  static async updateFeeStructure(
    id: string,
    totalAmount: number | string,
    actorId: string,
  ) {
    return (await this.batchUpdate([{ id, totalAmount }], actorId))[0];
  }
  static async batchUpdate(updates: FeeUpdate[], actorId: string) {
    if (!Array.isArray(updates) || !updates.length || updates.length > 100)
      throw new Error('Provide 1–100 fee changes.');
    const normalized = updates.map((row) => ({
      ...row,
      amount: money(cents(row.totalAmount, true)),
    }));
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended('fee-configuration',0))`,
      );
      const ids = normalized.flatMap((row) => (row.id ? [row.id] : []));
      if (new Set(ids).size !== ids.length)
        throw new Error('Duplicate fee changes are not allowed.');
      const existing = ids.length
        ? await tx
            .select()
            .from(feeStructures)
            .where(
              and(
                inArray(feeStructures.id, ids),
                isNull(feeStructures.deletedAt),
              ),
            )
        : [];
      if (existing.length !== ids.length)
        throw new Error('One or more fee structures were not found.');
      const byId = new Map(existing.map((row) => [row.id, row]));
      const termIds = [
        ...new Set(
          normalized
            .map((row) => (row.id ? byId.get(row.id)!.termId : row.termId))
            .filter(Boolean),
        ),
      ] as string[];
      const terms = termIds.length
        ? await tx
            .select()
            .from(academicTerms)
            .where(
              and(
                inArray(academicTerms.id, termIds),
                isNull(academicTerms.deletedAt),
              ),
            )
        : [];
      const validTerms = new Set(terms.map((row) => row.id));
      const keys = new Set<string>();
      const unchanged: typeof existing = [];
      const values: Array<typeof feeStructures.$inferInsert> = [];
      for (const row of normalized) {
        const before = row.id ? byId.get(row.id)! : null;
        const termId = before?.termId || row.termId;
        const levelCategory = before?.levelCategory || row.levelCategory;
        if (
          !termId ||
          !validTerms.has(termId) ||
          !levelCategory ||
          !(levelCategory in labels)
        )
          throw new Error('Choose a configured term and education level.');
        const key = `${termId}:${before?.classId || levelCategory}`;
        if (keys.has(key))
          throw new Error('Duplicate fee changes are not allowed.');
        keys.add(key);
        if (before && before.totalAmount === row.amount) {
          unchanged.push(before);
          continue;
        }
        values.push({
          id: before?.id || randomUUID(),
          termId,
          levelCategory,
          classId: before?.classId || null,
          totalAmount: row.amount,
          approvedAt: null,
          approvedById: null,
          updatedAt: new Date(),
        });
      }
      if (!values.length) return unchanged;
      const saved = await tx
        .insert(feeStructures)
        .values(values)
        .onConflictDoUpdate({
          target: feeStructures.id,
          set: {
            totalAmount: sql`excluded.total_amount`,
            approvedAt: null,
            approvedById: null,
            updatedAt: new Date(),
          },
        })
        .returning();
      await tx
        .insert(auditLogs)
        .values(
          saved.map((row) => ({
            actorId,
            userIdentifier: actorId,
            action: 'FEE_STRUCTURE_SAVED',
            entityName: 'fee_structures',
            entityId: row.id,
            oldValues: byId.get(row.id) || null,
            newValues: row,
          })),
        );
      return [...unchanged, ...saved];
    });
  }
  static async approveTerm(
    termId: string,
    actorId: string,
    expected: Array<{ id: string; totalAmount: string | number }>,
  ) {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended('fee-configuration',0))`,
      );
      const [term] = await tx
        .select()
        .from(academicTerms)
        .where(
          and(eq(academicTerms.id, termId), isNull(academicTerms.deletedAt)),
        );
      if (!term) throw new Error('Academic term not found.');
      const structures = await tx
        .select()
        .from(feeStructures)
        .where(
          and(
            eq(feeStructures.termId, termId),
            isNull(feeStructures.deletedAt),
          ),
        );
      if (!structures.length)
        throw new Error('Configure fees before approval.');
      const reviewed = new Map(
        expected.map((row) => [row.id, money(cents(row.totalAmount, true))]),
      );
      if (
        reviewed.size !== structures.length ||
        structures.some((row) => reviewed.get(row.id) !== row.totalAmount)
      )
        throw new Error(
          'Fee rates changed since your review. Refresh and review the saved amounts again.',
        );
      for (const row of structures) cents(row.totalAmount, true);
      const saved = await tx
        .update(feeStructures)
        .set({
          approvedAt: new Date(),
          approvedById: actorId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(feeStructures.termId, termId),
            isNull(feeStructures.deletedAt),
          ),
        )
        .returning();
      await financeAudit(
        tx,
        actorId,
        'TERM_FEES_APPROVED',
        'academic_terms',
        termId,
        structures,
        saved,
      );
      return saved;
    });
  }
}
