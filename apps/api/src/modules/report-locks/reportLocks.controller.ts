import { Request, Response } from 'express';
import { ReportLocksService } from './reportLocks.service.js';

export class ReportLocksController {
  static async getReportLocks(req: Request, res: Response) {
    try {
      const termId = req.query.termId as string;
      const data = await ReportLocksService.getReportLocks(termId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch report card locks' });
    }
  }

  static async toggleReportLock(req: Request, res: Response) {
    try {
      const updated = await ReportLocksService.toggleReportLock(req.body, req.user!.id);
      return res.status(200).json({
        success: true,
        data: updated,
        message: updated.isLocked ? 'Report cards locked for class' : 'Report cards published & released for class',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to toggle report lock' });
    }
  }
}
