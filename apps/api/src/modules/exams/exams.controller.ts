import { Request, Response } from 'express';
import { ExamsService } from './exams.service.js';

export class ExamsController {
  static async getExams(req: Request, res: Response) {
    try {
      const exams = await ExamsService.getExams();
      return res.status(200).json({ success: true, data: exams });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch exams' });
    }
  }

  static async createExam(req: Request, res: Response) {
    try {
      const exam = await ExamsService.createExam(req.body);
      return res.status(201).json({ success: true, data: exam, message: 'Examination created successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to create exam' });
    }
  }

  static async getExamSessions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessions = await ExamsService.getExamSessions(id);
      return res.status(200).json({ success: true, data: sessions });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch exam sessions' });
    }
  }

  static async createExamSession(req: Request, res: Response) {
    try {
      const session = await ExamsService.createExamSession(req.body);
      return res.status(201).json({ success: true, data: session, message: 'Exam timetable session scheduled' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to schedule session' });
    }
  }

  static async deleteExamSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await ExamsService.deleteExamSession(id);
      return res.status(200).json({ success: true, message: 'Exam session removed' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to delete session' });
    }
  }
}
