import { Request, Response } from 'express';
import { z } from 'zod';
import { publicErrorMessage } from '../../utils/publicError.js';
import { FeeStructuresService } from './feeStructures.service.js';
const update = z
  .object({
    id: z.uuid().optional(),
    termId: z.uuid().optional(),
    levelCategory: z
      .enum(['PPE', 'LOWER_PRIMARY', 'UPPER_PRIMARY', 'JUNIOR'])
      .optional(),
    totalAmount: z.union([z.string(), z.number()]),
  })
  .strict();
export class FeeStructuresController {
  static async getFeeStructures(req: Request, res: Response) {
    try {
      return res.json({
        success: true,
        data: await FeeStructuresService.getFeeMatrix(
          z.coerce.number().int().min(2000).max(2200).parse(req.query.year),
        ),
      });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,
          message: publicErrorMessage(error, 'Could not load fee structures.'),
        });
    }
  }
  static async batchUpdateFeeStructures(req: Request, res: Response) {
    try {
      const { updates } = z
        .object({ updates: z.array(update).min(1).max(100) })
        .parse(req.body);
      return res.json({
        success: true,
        data: await FeeStructuresService.batchUpdate(updates, req.user!.id),
      });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            error instanceof z.ZodError
              ? 'Invalid fee changes.'
              : publicErrorMessage(error, 'Could not save fee structures.'),
        });
    }
  }
  static async updateFeeStructure(req: Request, res: Response) {
    try {
      const row = update.parse({ ...req.body, id: req.params.id });
      return res.json({
        success: true,
        data: await FeeStructuresService.updateFeeStructure(
          row.id!,
          row.totalAmount,
          req.user!.id,
        ),
      });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,
          message: publicErrorMessage(error, 'Could not save fee structure.'),
        });
    }
  }
  static async approveTerm(req: Request, res: Response) {
    if (req.user?.roleName !== 'HEAD_TEACHER')
      return res
        .status(403)
        .json({
          success: false,
          message: 'Only the Head Teacher can approve fees.',
        });
    try {
      return res.json({
        success: true,
        data: await FeeStructuresService.approveTerm(
          z.uuid().parse(req.params.termId),
          req.user.id,
          z
            .array(
              z.object({
                id: z.uuid(),
                totalAmount: z.union([z.string(), z.number()]),
              }),
            )
            .min(1)
            .max(1000)
            .parse(req.body.expected),
        ),
      });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,
          message: publicErrorMessage(error, 'Could not approve fees.'),
        });
    }
  }
}
