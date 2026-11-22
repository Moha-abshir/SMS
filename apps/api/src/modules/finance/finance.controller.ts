import { FinanceValidationError } from './financeRules.js';
import { z } from 'zod';
import { publicErrorMessage, logServerError } from '../../utils/publicError.js';
import { Request, Response } from 'express';
import { FinanceService } from './finance.service.js';

export class FinanceController {
  static async recordPayment(req: Request, res: Response) {
    try {
      const payment = await FinanceService.recordPayment(
        {
          ...req.body,
          requestKey: z.uuid().parse(req.body.requestKey),
          studentId: z.uuid().parse(req.body.studentId),
        },
        req.user!.id,
      );
      return res.status(payment.alreadyRecorded ? 200 : 201).json({
        success: true,
        data: payment,
        message: `${payment.alreadyRecorded ? 'Payment already recorded. Original receipt' : 'Payment recorded successfully. Receipt'} #${payment.receiptNumber}`,
      });
    } catch (error: any) {
      const validation =
        error instanceof FinanceValidationError || error instanceof z.ZodError;
      if (!validation) logServerError('Payment outcome unconfirmed', error);
      return res
        .status(validation ? 400 : 503)
        .json({
          success: false,
          message: validation
            ? error instanceof z.ZodError
              ? 'Invalid payment details. Reload the payment form and try again.'
              : publicErrorMessage(error, 'Invalid payment details.')
            : 'Payment could not be confirmed. Check the ledger or retry the same payment request; do not create a new attempt.',
        });
    }
  }

  static async getPayments(req: Request, res: Response) {
    try {
      const filters = z
        .object({
          studentId: z.uuid().optional(),
          academicYear: z.coerce.number().int().min(2000).max(2200),
          termNumber: z.coerce.number().int().min(1).max(3).optional(),
          limit: z.coerce.number().int().min(1).max(100).optional(),
          offset: z.coerce.number().int().min(0).max(1000000).optional(),
          search: z.string().max(100).optional(),
        })
        .parse(req.query);
      const payments = await FinanceService.paymentPage(filters);
      return res.status(200).json({ success: true, data: payments });
    } catch (error: any) {
      return res.status(error instanceof z.ZodError ? 400 : 500).json({
        success: false,
        message:
          error instanceof z.ZodError
            ? 'Invalid payment filters.'
            : publicErrorMessage(error, 'Failed to fetch payments'),
      });
    }
  }

  static async getFinancialSummary(req: Request, res: Response) {
    try {
      const academicYear = req.query.academicYear
        ? Number(req.query.academicYear)
        : 2026;
      const termNumber = req.query.termNumber
        ? Number(req.query.termNumber)
        : undefined;

      const summary = await FinanceService.getFinancialSummary(
        academicYear,
        termNumber,
      );
      return res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      return res
        .status(500)
        .json({
          success: false,
          message: publicErrorMessage(
            error,
            'Failed to fetch financial summary',
          ),
        });
    }
  }

  static async requestReversal(req: Request, res: Response) {
    try {
      const { paymentId, reason } = req.body;
      if (!paymentId || !reason) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Payment ID and reason are required',
          });
      }

      const reversal = await FinanceService.requestReversal(
        paymentId,
        reason,
        req.user!.id,
      );
      return res.status(201).json({
        success: true,
        data: reversal,
        message: 'Reversal request submitted for Head Teacher approval',
      });
    } catch (error: any) {
      return res
        .status(400)
        .json({
          success: false,
          message: publicErrorMessage(
            error,
            'Failed to request payment reversal',
          ),
        });
    }
  }

  static async getPendingReversals(req: Request, res: Response) {
    try {
      const pending = await FinanceService.getPendingReversals();
      return res.status(200).json({ success: true, data: pending });
    } catch (error: any) {
      return res
        .status(500)
        .json({
          success: false,
          message: publicErrorMessage(
            error,
            'Failed to fetch pending reversals',
          ),
        });
    }
  }

  static async approveReversal(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const approved = await FinanceService.approveReversal(id, req.user!.id);
      return res.status(200).json({
        success: true,
        data: approved,
        message: 'Payment reversal approved and student balance updated',
      });
    } catch (error: any) {
      return res
        .status(400)
        .json({
          success: false,
          message: publicErrorMessage(
            error,
            'Failed to approve payment reversal',
          ),
        });
    }
  }

  static async rejectReversal(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await FinanceService.rejectReversal(id, req.user!.id);
      return res.status(200).json(result);
    } catch (error: any) {
      return res
        .status(400)
        .json({
          success: false,
          message: publicErrorMessage(
            error,
            'Failed to dismiss payment reversal',
          ),
        });
    }
  }
  static async previewBilling(req: Request, res: Response) {
    try {
      return res.json({
        success: true,
        data: await FinanceService.previewBilling(
          Number(req.query.academicYear),
          Number(req.query.termNumber),
        ),
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: publicErrorMessage(error, 'Could not preview term bills.'),
      });
    }
  }
  static async generateBills(req: Request, res: Response) {
    try {
      return res.json({
        success: true,
        data: await FinanceService.generateBills(
          req.body.academicYear,
          req.body.termNumber,
          req.user!.id,
        ),
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: publicErrorMessage(error, 'Could not generate term bills.'),
      });
    }
  }

  static async getStudentStatement(req: Request, res: Response) {
    try {
      const { studentId } = req.params;
      const statement = await FinanceService.getStudentStatement(studentId);
      return res.status(200).json({ success: true, data: statement });
    } catch (error: any) {
      return res
        .status(500)
        .json({
          success: false,
          message: publicErrorMessage(
            error,
            'Failed to fetch student statement',
          ),
        });
    }
  }
}
