import { publicErrorMessage } from '../../utils/publicError.js';
import { Request, Response } from 'express';
import { SchoolwideOverviewService } from './schoolwide-overview.service.js';

export class SchoolwideOverviewController {
  static async getSchoolwideOverview(req: Request, res: Response) {
    try {
      const examId = req.query.examId as string | undefined;
      const compareExamId = req.query.compareExamId as string | undefined;

      const data = await SchoolwideOverviewService.getSchoolwideOverview(examId, compareExamId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: publicErrorMessage(error, 'Failed to fetch schoolwide performance overview'),
      });
    }
  }

  static async getGradeOverview(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const examId = req.query.examId as string | undefined;
      const compareExamId = req.query.compareExamId as string | undefined;

      if (!classId) {
        return res.status(400).json({ success: false, message: 'Class ID is required' });
      }

      const data = await SchoolwideOverviewService.getGradeOverview(classId, examId, compareExamId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: publicErrorMessage(error, 'Failed to fetch grade overview'),
      });
    }
  }
}
