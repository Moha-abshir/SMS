import { Request, Response } from 'express';
import { SettingsService } from './settings.service.js';

export class SettingsController {
  static async getSettings(req: Request, res: Response) {
    try {
      const settings = await SettingsService.getSettings();
      return res.status(200).json({ success: true, data: settings });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch settings' });
    }
  }

  static async updateSettings(req: Request, res: Response) {
    try {
      const updated = await SettingsService.updateSettings(req.body);
      return res.status(200).json({ success: true, data: updated, message: 'School settings updated successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to update settings' });
    }
  }
}
