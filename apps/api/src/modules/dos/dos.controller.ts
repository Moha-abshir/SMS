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

  static async getExamAnalysis(req: Request, res: Response) {
    try {
      const examId = req.query.examId as string | undefined;
      const classId = req.query.classId as string | undefined;
      const data = await DosService.getExamAnalysis(examId, classId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch exam analysis' });
    }
  }

  static async getAcademicInsights(req: Request, res: Response) {
    try {
      const examId = req.query.examId as string | undefined;
      const data = await DosService.getAcademicInsights(examId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch academic insights' });
    }
  }
}

