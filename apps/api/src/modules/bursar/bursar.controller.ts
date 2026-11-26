import type { Request, Response } from "express";
import { z } from "zod";
import { BursarService } from "./bursar.service.js";
import {
  balanceFilters,
  entryInput,
  pageFilters,
  periodFilters,
  validateAttachment,
} from "./bursar.rules.js";
import { FinanceValidationError } from "../finance/financeRules.js";
import { logServerError } from "../../utils/publicError.js";

type Action = (req: Request) => Promise<unknown>;
export function bursarRead(action: Action) {
  return async (req: Request, res: Response) => {
    try {
      res.json({ success: true, data: await action(req) });
    } catch (error) {
      failure(res, error, false);
    }
  };
}
function failure(res: Response, error: unknown, write: boolean) {
  const invalid =
    error instanceof z.ZodError || error instanceof FinanceValidationError;
  if (!invalid) logServerError("Bursar workspace request failed", error);
  res.status(invalid ? 400 : write ? 503 : 500).json({
    success: false,
    message: invalid
      ? error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid finance details."
        : error.message
      : write
        ? "Transaction outcome could not be confirmed. Check history or retry the same request before starting another."
        : "Could not load finance records. Please retry.",
  });
}
export class BursarController {
  static options = bursarRead(() => BursarService.options());
  static exportBalances = bursarRead((req) =>
    BursarService.exportBalances(balanceFilters.parse(req.query)),
  );
  static balances = bursarRead((req) =>
    BursarService.balances(balanceFilters.parse(req.query)),
  );
  static report = bursarRead((req) =>
    BursarService.report(periodFilters.parse(req.query)),
  );
  static dashboard = bursarRead((req) =>
    BursarService.dashboard(periodFilters.parse(req.query)),
  );
  static audit = bursarRead((req) =>
    BursarService.audit(periodFilters.and(pageFilters).parse(req.query)),
  );
  static entries(kind: "expense" | "income") {
    return bursarRead((req) =>
      BursarService.entries(
        kind,
        periodFilters.and(pageFilters).parse(req.query),
      ),
    );
  }
  static record(kind: "expense" | "income") {
    return async (req: Request, res: Response) => {
      try {
        const result = await BursarService.record(
          kind,
          entryInput.parse(req.body),
          req.user!.id,
          validateAttachment(req.file),
        );
        res
          .status(result.alreadyRecorded ? 200 : 201)
          .json({ success: true, data: result });
      } catch (error) {
        failure(res, error, true);
      }
    };
  }
  static voidEntry(kind: "expense" | "income") {
    return bursarRead((req) =>
      BursarService.voidEntry(
        kind,
        z.uuid().parse(req.params.id),
        z.string().trim().min(10).max(1000).parse(req.body.reason),
        req.user!.id,
      ),
    );
  }
  static category = bursarRead((req) => {
    const input = z
      .object({
        name: z.string().trim().min(2).max(100),
        description: z.string().trim().max(1000).default(""),
      })
      .parse(req.body);
    return BursarService.category(input.name, input.description, req.user!.id);
  });
  static updateCategory = bursarRead((req) =>
    BursarService.updateCategory(
      z.uuid().parse(req.params.id),
      z
        .object({
          name: z.string().trim().min(2).max(100).optional(),
          archived: z.boolean().optional(),
        })
        .refine((v) => v.name || v.archived, "Choose a category change.")
        .parse(req.body),
      req.user!.id,
    ),
  );
  static async attachment(req: Request, res: Response) {
    try {
      const file = await BursarService.attachment(
        z.uuid().parse(req.params.id),
      );
      res.setHeader("Content-Type", String(file.type));
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${String(file.name).replace(/[^a-zA-Z0-9._ -]/g, "_")}"`,
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.send(Buffer.from(String(file.data), "base64"));
    } catch (error) {
      failure(res, error, false);
    }
  }
}
