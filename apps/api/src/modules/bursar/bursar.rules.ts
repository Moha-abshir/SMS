import { z } from "zod";
import { cents, FinanceValidationError } from "../finance/financeRules.js";

export const financeDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Choose a valid date.");
export const periodFilters = z
  .object({
    academicYear: z.coerce.number().int().min(2000).max(2200),
    termNumber: z.coerce.number().int().min(1).max(3).optional(),
    from: financeDate.optional(),
    to: financeDate.optional(),
  })
  .refine(
    (v) => !v.from || !v.to || v.from <= v.to,
    "Start date must precede end date.",
  );
export const pageFilters = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
  search: z.string().trim().max(100).default(""),
});
export const balanceFilters = periodFilters.and(pageFilters).and(
  z.object({
    classId: z.uuid().optional(),
    level: z.string().max(30).optional(),
    minBalance: z
      .string()
      .refine((v) => {
        try {
          cents(v, true);
          return true;
        } catch {
          return false;
        }
      })
      .optional(),
    maxBalance: z
      .string()
      .refine((v) => {
        try {
          cents(v, true);
          return true;
        } catch {
          return false;
        }
      })
      .optional(),
    outstanding: z.enum(["true", "false"]).optional(),
  }),
);
export const entryInput = z
  .object({
    requestKey: z.uuid(),
    title: z.string().trim().min(3).max(200),
    amount: z
      .union([z.string(), z.number()])
      .transform((v) => String(v))
      .refine((v) => {
        try {
          cents(v);
          return true;
        } catch {
          return false;
        }
      }, "Enter a positive amount with at most two decimal places."),
    paymentMethod: z.enum([
      "CASH",
      "MANUAL_MPESA",
      "BANK_DEPOSIT",
      "CHEQUE",
      "OTHER",
    ]),
    entryDate: financeDate,
    academicYear: z.coerce.number().int().min(2000).max(2200),
    termNumber: z.coerce.number().int().min(1).max(3),
    party: z.string().trim().min(2).max(100),
    reference: z.string().trim().max(100).default(""),
    notes: z.string().trim().max(2000).default(""),
    categoryId: z.uuid().optional(),
  })
  .refine(
    (v) =>
      v.paymentMethod === "CASH" ||
      v.paymentMethod === "OTHER" ||
      Boolean(v.reference),
    "A reference is required for M-Pesa, bank and cheque entries.",
  );
export type Period = z.infer<typeof periodFilters>;
export type Entry = z.infer<typeof entryInput>;
export function validateAttachment(file?: {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}) {
  if (!file) return null;
  const bytes = file.buffer;
  const type =
    bytes.subarray(0, 5).toString() === "%PDF-"
      ? "application/pdf"
      : bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? "image/png"
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          ? "image/jpeg"
          : null;
  if (!type || type !== file.mimetype || bytes.length > 2 * 1024 * 1024)
    throw new FinanceValidationError(
      "Attach a PDF, PNG or JPEG of at most 2 MB.",
    );
  return {
    data: bytes.toString("base64"),
    type,
    name:
      file.originalname.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 150) ||
      "attachment",
  };
}
