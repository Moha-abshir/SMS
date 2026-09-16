import { Request, Response } from 'express';
import { TeacherService } from './teacher.service.js';

export class TeacherController {
  static async getWorkstation(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const data = await TeacherService.getTeacherWorkstation(userId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch teacher workstation overview',
      });
    }
  }

  static async getClassLearners(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const classId = req.query.classId as string | undefined;
      const data = await TeacherService.getClassLearners(userId, classId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch class learners roster',
      });
    }
  }

  static async getLearnerPerformance(req: Request, res: Response) {
    try {
      const { studentId } = req.params;
      const data = await TeacherService.getLearnerPerformance(studentId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch learner academic performance',
      });
    }
  }

  static async sendLearnerControlledSms(req: Request, res: Response) {
    try {
      const { studentId, templateType, customNote } = req.body;
      if (!studentId || !templateType) {
        return res.status(400).json({
          success: false,
          message: 'studentId and templateType are required',
        });
      }
      const data = await TeacherService.sendLearnerControlledSms(
        studentId,
        templateType,
        customNote
      );
      return res.status(200).json({
        success: true,
        data,
        message: 'Guardian SMS notification dispatched successfully',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to send controlled SMS to guardian',
      });
    }
  }
}
