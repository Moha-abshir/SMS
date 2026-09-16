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

  static async getSubmissionScores(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await MarkSubmissionsService.getSubmissionScores(id);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to fetch marksheet scores' });
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
      const updated = await MarkSubmissionsService.lockSubmission(id, req.user!.id);
      return res.status(200).json({ success: true, data: updated, message: 'Marksheet locked permanently' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to lock submission' });
    }
  }
}
