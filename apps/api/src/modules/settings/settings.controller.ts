import { Request, Response } from 'express';
import { SettingsService } from './settings.service.js';
import { R2Service } from '../../services/r2.service.js';

export class SettingsController {
  static async getSettings(req: Request, res: Response) {
    try {
      const settings = await SettingsService.getSettings();
      return res.status(200).json({ success: true, data: settings });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch settings' });
    }
  }

  static async getPublicSettings(req: Request, res: Response) {
    try {
      const settings = await SettingsService.getSettings();
      return res.status(200).json({
        success: true,
        data: {
          schoolName: settings.schoolName,
          schoolMotto: settings.schoolMotto,
          logoUrl: settings.logoUrl,
          contactPhone: settings.contactPhone,
          contactEmail: settings.contactEmail,
          address: settings.address,
          poBox: settings.poBox,
          county: settings.county,
          currentAcademicYear: settings.currentAcademicYear,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch public settings' });
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

  static async uploadLogo(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No logo image file provided' });
      }

      // Upload image to Cloudflare R2 bucket (or fallback to base64 Data URL)
      const logoUrl = await R2Service.uploadImage(req.file.buffer, req.file.originalname, 'logos');

      // Update systemSettings table with new logoUrl
      const updated = await SettingsService.updateSettings({ logoUrl });

      return res.status(200).json({
        success: true,
        data: updated,
        logoUrl,
        message: 'School logo uploaded, compressed, and saved successfully',
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to upload school logo' });
    }
  }
}
