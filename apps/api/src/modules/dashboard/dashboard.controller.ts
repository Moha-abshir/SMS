import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service.js';

export class DashboardController {
  static async getHeadTeacherOverview(req: Request, res: Response) {
    try {
      const data = await DashboardService.getHeadTeacherOverview();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch dashboard overview' });
    }
  }
}
