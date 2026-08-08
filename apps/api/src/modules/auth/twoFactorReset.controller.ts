import { Request, Response } from 'express';
import { TwoFactorResetService } from './twoFactorReset.service.js';

export class TwoFactorResetController {
  static async initiate2FaReset(req: Request, res: Response) {
    try {
      const targetUserId = req.params.id;
      const adminUserId = req.user?.id;
      const { adminPasswordConfirm } = req.body;

      if (!adminUserId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      if (!adminPasswordConfirm) {
        return res.status(400).json({
          success: false,
          message: 'Your Head Teacher password is required to authorize a 2FA reset.',
        });
      }

      const result = await TwoFactorResetService.initiate2FaReset(targetUserId, adminUserId, adminPasswordConfirm);
      res.status(200).json({
        success: true,
        message: '2FA configuration reset successfully. Staff member has been notified.',
        data: result,
      });
    } catch (error: any) {
      console.error('Error resetting 2FA:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to reset 2FA' });
    }
  }
}
