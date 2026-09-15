import { Request, Response } from 'express';
import { FinanceService } from './finance.service.js';

export class FinanceController {
  static async recordPayment(req: Request, res: Response) {
    try {
      const payment = await FinanceService.recordPayment(req.body, req.user!.id);
      return res.status(201).json({
        success: true,
        data: payment,
        message: `Payment recorded successfully. Receipt #${payment.receiptNumber}`,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to record payment' });
    }
  }

  static async getPayments(req: Request, res: Response) {
    try {
      const studentId = req.query.studentId as string;
      const academicYear = req.query.academicYear ? Number(req.query.academicYear) : undefined;
      const termNumber = req.query.termNumber ? Number(req.query.termNumber) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const offset = req.query.offset ? Number(req.query.offset) : undefined;

      const payments = await FinanceService.getPayments({
        studentId,
        academicYear,
        termNumber,
        limit,
        offset,
      });

      return res.status(200).json({ success: true, data: payments });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch payments' });
    }
  }

  static async getFinancialSummary(req: Request, res: Response) {
    try {
      const academicYear = req.query.academicYear ? Number(req.query.academicYear) : 2026;
      const termNumber = req.query.termNumber ? Number(req.query.termNumber) : undefined;

      const summary = await FinanceService.getFinancialSummary(academicYear, termNumber);
      return res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch financial summary' });
    }
  }

  static async requestReversal(req: Request, res: Response) {
    try {
      const { paymentId, reason } = req.body;
      if (!paymentId || !reason) {
        return res.status(400).json({ success: false, message: 'Payment ID and reason are required' });
      }

      const reversal = await FinanceService.requestReversal(paymentId, reason, req.user!.id);
      return res.status(201).json({
        success: true,
        data: reversal,
        message: 'Reversal request submitted for Head Teacher approval',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to request payment reversal' });
    }
  }

  static async getPendingReversals(req: Request, res: Response) {
    try {
      const pending = await FinanceService.getPendingReversals();
      return res.status(200).json({ success: true, data: pending });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch pending reversals' });
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
      return res.status(400).json({ success: false, message: error.message || 'Failed to approve payment reversal' });
    }
  }

  static async rejectReversal(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await FinanceService.rejectReversal(id, req.user!.id);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to dismiss payment reversal' });
    }
  }

  static async getStudentStatement(req: Request, res: Response) {
    try {
      const { studentId } = req.params;
      const statement = await FinanceService.getStudentStatement(studentId);
      return res.status(200).json({ success: true, data: statement });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch student statement' });
    }
  }
}
