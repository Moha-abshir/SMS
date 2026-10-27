import { Request, Response } from 'express';
import { MarkSubmissionsService } from './markSubmissions.service.js';

export class MarkSubmissionsController {
  static async getSubmissions(req: Request, res: Response) {
    try {
      const status = req.query.status as string;
      const data = await MarkSubmissionsService.getSubmissions(status);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch mark submissions' });
    }
  }

  static async getClassesReviewOverview(req: Request, res: Response) {
    try {
      const examId = req.query.examId as string;
      const data = await MarkSubmissionsService.getClassesReviewOverview(examId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch classes review overview' });
    }
  }

  static async submitClassToDeputy(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const { examId } = req.body;
      const userId = req.user!.id;
      const userRole = req.user?.roleName;

      if (!examId) {
        return res.status(400).json({ success: false, message: 'examId is required in request body' });
      }

      const result = await MarkSubmissionsService.submitClassToDeputy(classId, examId, userId, userRole);
      return res.status(200).json({
        success: true,
        data: result,
        message: `Successfully submitted class marksheet (${result.length} subject papers) to Deputy Head for final review and locking.`,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to submit class marksheet to Deputy Head' });
    }
  }

  static async lockClassSubmissions(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const { examId } = req.body;
      const reviewedById = req.user!.id;
      const userRole = req.user?.roleName;

      if (!examId) {
        return res.status(400).json({ success: false, message: 'examId is required in request body' });
      }

      const result = await MarkSubmissionsService.lockClassSubmissions(classId, examId, reviewedById, userRole);
      return res.status(200).json({
        success: true,
        data: result,
        message: `Successfully permanently locked ${result.length} marksheet(s) for this class.`,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to lock class submissions' });
    }
  }

  static async approveClassSubmissions(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const { examId } = req.body;
      const reviewedById = req.user!.id;
      if (!examId) {
        return res.status(400).json({ success: false, message: 'examId is required in request body' });
      }
      const data = await MarkSubmissionsService.approveClassSubmissions(classId, examId, reviewedById);
      return res.status(200).json({ success: true, data, message: `Approved ${data.length} submitted paper(s) for this class` });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to approve class submissions' });
    }
  }

  static async getSubmissionScores(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await MarkSubmissionsService.getSubmissionScores(id);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to fetch marksheet scores' });
    }
  }

  static async getMarksheetEntry(req: Request, res: Response) {
    try {
      const examId = req.query.examId as string;
      const classId = req.query.classId as string;
      const subjectId = req.query.subjectId as string;
      const userId = req.user!.id;
      const userRole = req.user?.roleName;

      if (!examId || !classId || !subjectId) {
        return res.status(400).json({
          success: false,
          message: 'examId, classId, and subjectId query parameters are required',
        });
      }

      const data = await MarkSubmissionsService.getMarksheetEntry(
        examId,
        classId,
        subjectId,
        userId,
        userRole
      );
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to load marksheet entry',
      });
    }
  }

  static async saveMarksheetDraft(req: Request, res: Response) {
    try {
      const { examId, classId, subjectId, scores } = req.body;
      const userId = req.user!.id;
      const userRole = req.user?.roleName;

      if (!examId || !classId || !subjectId || !Array.isArray(scores)) {
        return res.status(400).json({
          success: false,
          message: 'examId, classId, subjectId, and scores array are required',
        });
      }

      const result = await MarkSubmissionsService.saveMarksheetDraft(
        examId,
        classId,
        subjectId,
        scores,
        userId,
        userRole
      );
      return res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to save marksheet draft',
      });
    }
  }

  static async submitMarksheet(req: Request, res: Response) {
    try {
      const { examId, classId, subjectId, scores } = req.body;
      const userId = req.user!.id;
      const userRole = req.user?.roleName;

      if (!examId || !classId || !subjectId || !Array.isArray(scores)) {
        return res.status(400).json({
          success: false,
          message: 'examId, classId, subjectId, and scores array are required',
        });
      }

      const result = await MarkSubmissionsService.submitMarksheet(
        examId,
        classId,
        subjectId,
        scores,
        userId,
        userRole
      );
      return res.status(200).json({ success: true, data: result, message: result.message });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to submit marksheet',
      });
    }
  }

  static async requestCorrectionByTeacher(req: Request, res: Response) {
    try {
      const { examId, classId, subjectId, reason } = req.body;
      const userId = req.user!.id;

      if (!examId || !classId || !subjectId) {
        return res.status(400).json({
          success: false,
          message: 'examId, classId, and subjectId are required',
        });
      }

      const result = await MarkSubmissionsService.requestCorrectionByTeacher(
        examId,
        classId,
        subjectId,
        reason,
        userId
      );
      return res.status(200).json({
        success: true,
        data: result,
        message: 'Correction requested. The Class Teacher has been notified.',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to submit correction request',
      });
    }
  }

  static async approveSubmission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await MarkSubmissionsService.approveSubmission(id, req.user!.id);
      return res.status(200).json({ success: true, data: updated, message: 'Marksheet approved successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to approve submission' });
    }
  }

  static async requestCorrection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const updated = await MarkSubmissionsService.requestCorrection(id, reason);
      return res.status(200).json({ success: true, data: updated, message: 'Correction request returned to subject teacher' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to request correction' });
    }
  }

  static async lockSubmission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await MarkSubmissionsService.lockSubmission(id, req.user!.id, req.user?.roleName);
      return res.status(200).json({ success: true, data: updated, message: 'Marksheet locked successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to lock submission' });
    }
  }

  static async unlockSubmission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await MarkSubmissionsService.unlockSubmission(id, req.user!.id, req.user?.roleName);
      return res.status(200).json({ success: true, data: updated, message: 'Marksheet unlocked for subject teacher editing' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to unlock submission' });
    }
  }
}
