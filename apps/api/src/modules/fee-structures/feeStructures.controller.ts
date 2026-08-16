import { Request, Response } from 'express';
import { FeeStructuresService } from './feeStructures.service.js';

export class FeeStructuresController {
  static async getFeeStructures(req: Request, res: Response) {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : 2026;
      const data = await FeeStructuresService.getFeeMatrix(year);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch fee structure matrix' });
    }
  }

  static async updateFeeStructure(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { totalAmount } = req.body;

      if (totalAmount === undefined || isNaN(parseFloat(totalAmount))) {
        return res.status(400).json({ success: false, message: 'Valid totalAmount is required' });
      }

      const updated = await FeeStructuresService.updateFeeStructure(id, parseFloat(totalAmount));
      res.json({ success: true, message: 'Fee structure updated successfully', data: updated });
    } catch (error: any) {
      res.status(400).json({ success: false, message: 'Failed to update fee structure' });
    }
  }

  static async batchUpdateFeeStructures(req: Request, res: Response) {
    try {
      const { updates } = req.body;
      if (!Array.isArray(updates)) {
        return res.status(400).json({ success: false, message: 'Updates must be an array of objects' });
      }

      const updated = await FeeStructuresService.batchUpdate(updates);
      res.json({ success: true, message: 'All fee structures updated successfully', data: updated });
    } catch (error: any) {
      res.status(400).json({ success: false, message: 'Failed to batch update fee structures' });
    }
  }
}
