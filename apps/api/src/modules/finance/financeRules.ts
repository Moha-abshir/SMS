import { db } from '../../config/db.js';
import { academicTerms, auditLogs, eq, and, isNull } from '@school/shared';
export class FinanceValidationError extends Error {
  name = 'FinanceValidationError';
  status = 400;
}
export type FinanceTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];
export function cents(value: unknown, allowZero = false): number {
  const text = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text))
    throw new FinanceValidationError(
      'Amount must have at most two decimal places.',
    );
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (
    !Number.isSafeInteger(result) ||
    result > 9999999999 ||
    result < (allowZero ? 0 : 1)
  )
    throw new FinanceValidationError(
      'Amount must be positive and within the supported range.',
    );
  return result;
}
export const money = (minor: number) => {
  if (!Number.isSafeInteger(minor))
    throw new FinanceValidationError('Invalid monetary total.');
  return `${minor < 0 ? '-' : ''}${Math.floor(Math.abs(minor) / 100)}.${String(Math.abs(minor) % 100).padStart(2, '0')}`;
};
export async function termForFinance(
  year?: number,
  termNumber?: number,
  reader: Pick<typeof db, 'select'> = db,
) {
  if (
    !Number.isInteger(year) ||
    year! < 2000 ||
    year! > 2200 ||
    ![1, 2, 3].includes(termNumber!)
  )
    throw new FinanceValidationError(
      'Choose an explicit academic year and term (1–3).',
    );
  const [term] = await reader
    .select()
    .from(academicTerms)
    .where(
      and(
        eq(academicTerms.year, year!),
        eq(academicTerms.termNumber, termNumber!),
        isNull(academicTerms.deletedAt),
      ),
    );
  if (!term)
    throw new FinanceValidationError(
      'The selected academic term has not been configured.',
    );
  return term;
}
/** Financial audit events commit or roll back with the business transaction. */
export async function financeAudit(
  tx: FinanceTransaction,
  actorId: string,
  action: string,
  entityName: string,
  entityId: string,
  oldValues: unknown,
  newValues: unknown,
) {
  await tx.insert(auditLogs).values({
    actorId,
    userIdentifier: actorId,
    action,
    entityName,
    entityId,
    oldValues,
    newValues,
  });
}
