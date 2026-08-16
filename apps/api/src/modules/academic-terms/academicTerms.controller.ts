import { Request, Response } from 'express';
import { AcademicTermsService } from './academicTerms.service.js';

export class AcademicTermsController {
  static async getAllTerms(req: Request, res: Response) {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : 2026;
      const termsList = await AcademicTermsService.getAllTerms(year);
      res.json({ success: true, data: termsList });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch academic terms' });
    }
  }

  static async getCurrentTerm(req: Request, res: Response) {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : 2026;
      const currentTerm = await AcademicTermsService.getCurrentTerm(year);
      res.json({ success: true, data: currentTerm });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch current term' });
    }
  }

  static async updateTerm(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { startDate, endDate, isCurrent } = req.body;

      const updated = await AcademicTermsService.updateTerm(id, { startDate, endDate, isCurrent });
      res.json({ success: true, message: 'Academic term updated successfully', data: updated });
    } catch (error: any) {
      res.status(400).json({ success: false, message: 'Failed to update academic term dates' });
    }
  }
}
