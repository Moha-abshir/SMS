import { Request, Response } from 'express';
import { EmailChangeService } from './emailChange.service.js';
import { resolveFrontendUrl } from '../../config/env.js';

export class EmailChangeController {
  static async initiateEmailChange(req: Request, res: Response) {
    try {
      const targetUserId = req.params.id;
      const adminUserId = req.user?.id;
      const { newEmail, adminPasswordConfirm } = req.body;

      if (!adminUserId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      if (!newEmail || !adminPasswordConfirm) {
        return res.status(400).json({
          success: false,
          message: 'New email address and Head Teacher password confirmation are required.',
        });
      }

      const frontendUrl = resolveFrontendUrl(req);

      const result = await EmailChangeService.initiateEmailChange(
        targetUserId,
        adminUserId,
        newEmail,
        adminPasswordConfirm,
        frontendUrl
      );

      res.status(200).json({
        success: true,
        message: `Email recovery verification link sent to '${newEmail}'.`,
        data: result,
      });
    } catch (error: any) {
      console.error('Error initiating email change:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to initiate email change' });
    }
  }

  static async verifyToken(req: Request, res: Response) {
    try {
      const { email, token } = req.body;
      if (!email || !token) {
        return res.status(400).json({ success: false, message: 'Email and token are required' });
      }

      const details = await EmailChangeService.validateToken(email, token);
      res.status(200).json({ success: true, data: details });
    } catch (error: any) {
      console.error('Error verifying email change token:', error);
      res.status(400).json({ success: false, message: error.message || 'Invalid or expired link' });
    }
  }

  static async completeEmailChange(req: Request, res: Response) {
    try {
      const { email, token } = req.body;
      if (!email || !token) {
        return res.status(400).json({ success: false, message: 'Email and token are required' });
      }

      const result = await EmailChangeService.completeEmailChange(email, token);
      res.status(200).json({
        success: true,
        message: `Account email address updated successfully to '${result.newEmail}'.`,
        data: result,
      });
    } catch (error: any) {
      console.error('Error completing email change:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to update email address' });
    }
  }
}
