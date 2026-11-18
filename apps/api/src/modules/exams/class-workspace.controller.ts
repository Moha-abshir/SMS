import { publicErrorMessage } from '../../utils/publicError.js';
import { Request, Response } from 'express';
import { ClassWorkspaceService } from './class-workspace.service.js';

export class ClassWorkspaceController {
  static async getClassWorkspace(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const examId = req.query.examId as string | undefined;
      const compareExamId = req.query.compareExamId as string | undefined;

      if (!classId) {
        return res.status(400).json({ success: false, message: 'Class ID is required.' });
      }

      const data = await ClassWorkspaceService.getClassWorkspace(
        classId,
        examId,
        compareExamId,
        req.user
      );

      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: publicErrorMessage(error, 'Failed to fetch class workspace data'),
      });
    }
  }

  static async getLearnerDiagnostic(req: Request, res: Response) {
    try {
      const { classId, studentId } = req.params;
      const examId = req.query.examId as string | undefined;

      if (!classId || !studentId) {
        return res.status(400).json({ success: false, message: 'Class ID and Student ID are required.' });
      }

      const data = await ClassWorkspaceService.getLearnerDiagnostic(
        classId,
        studentId,
        examId,
        req.user
      );

      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: publicErrorMessage(error, 'Failed to fetch learner diagnostic profile'),
      });
    }
  }

  static async saveLearnerRemark(req: Request, res: Response) {
    try {
      const { classId, studentId } = req.params;
      const body = req.body;

      if (!classId || !studentId) {
        return res.status(400).json({ success: false, message: 'Class ID and Student ID are required.' });
      }

      const result = await ClassWorkspaceService.saveLearnerRemark(
        classId,
        studentId,
        body,
        req.user
      );

      return res.status(200).json(result);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: publicErrorMessage(error, 'Failed to save report card remark'),
      });
    }
  }

  static async setTargetMean(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const body = req.body;

      if (!classId) {
        return res.status(400).json({ success: false, message: 'Class ID is required.' });
      }

      const result = await ClassWorkspaceService.setTargetMean(
        classId,
        body,
        req.user
      );

      return res.status(200).json(result);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: publicErrorMessage(error, 'Failed to save class target expectation'),
      });
    }
  }
}
