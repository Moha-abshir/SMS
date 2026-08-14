import { Request, Response } from 'express';
import { DosService } from './dos.service.js';

export class DosController {
  static async getSubjectAnalytics(req: Request, res: Response) {
    try {
      const data = await DosService.getSubjectAnalytics();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch subject analytics' });
    }
  }
}
