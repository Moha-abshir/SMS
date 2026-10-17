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

  static async updateExam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await ExamsService.updateExam(id, req.body);
      return res.status(200).json({ success: true, data: updated, message: 'Examination updated successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to update exam' });
    }
  }

  static async deleteExam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await ExamsService.deleteExam(id);
      return res.status(200).json({ success: true, message: 'Examination series removed successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to delete exam' });
    }
  }

  static async updateExamStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await ExamsService.updateExamStatus(id, status);
      return res.status(200).json({ success: true, data: updated, message: `Exam status updated to ${status}` });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to update exam status' });
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

  static async updateExamSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const session = await ExamsService.updateExamSession(id, req.body);
      return res.status(200).json({ success: true, data: session, message: 'Exam session updated successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to update exam session' });
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

  static async getExamProgress(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const progress = await ExamsService.getExamProgress(id);
      return res.status(200).json({ success: true, data: progress });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to load exam progress' });
    }
  }
}
