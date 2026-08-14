import { Request, Response } from 'express';
import { AcademicTermsService } from './academicTerms.service.js';

export class AcademicTermsController {
  static async getAllTerms(req: Request, res: Response) {
    try {
      const terms = await AcademicTermsService.getAllTerms();
      return res.status(200).json({ success: true, data: terms });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch academic terms' });
    }
  }

  static async createTerm(req: Request, res: Response) {
    try {
      const created = await AcademicTermsService.createTerm(req.body);
      return res.status(201).json({ success: true, data: created, message: 'Academic term created successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to create term' });
    }
  }

  static async updateTerm(req: Request, res: Response) {
    try {
      const updated = await AcademicTermsService.updateTerm(req.params.id, req.body);
      return res.status(200).json({ success: true, data: updated, message: 'Academic term updated successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to update term' });
    }
  }

  static async deleteTerm(req: Request, res: Response) {
    try {
      await AcademicTermsService.deleteTerm(req.params.id);
      return res.status(200).json({ success: true, message: 'Academic term deleted successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to delete term' });
    }
  }
}
