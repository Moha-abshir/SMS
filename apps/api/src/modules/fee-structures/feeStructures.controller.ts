import { Request, Response } from 'express';
import { FeeStructuresService } from './feeStructures.service.js';

export class FeeStructuresController {
  static async getFeeStructures(req: Request, res: Response) {
    try {
      const termId = req.query.termId as string | undefined;
      const data = await FeeStructuresService.getFeeStructures(termId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch fee structures' });
    }
  }

  static async updateFeeStructure(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { totalAmount } = req.body;
      const updated = await FeeStructuresService.updateFeeStructure(id, parseFloat(totalAmount));
      return res.status(200).json({ success: true, data: updated, message: 'Fee structure updated successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to update fee structure' });
    }
  }
}
