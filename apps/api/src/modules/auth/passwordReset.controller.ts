import { Request, Response } from 'express';
import { PasswordResetService } from './passwordReset.service.js';

export class PasswordResetController {
  static async initiatePasswordReset(req: Request, res: Response) {
    try {
      const targetUserId = req.params.id;
      const adminUser = req.user;
      
      const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
      const frontendUrl = process.env.FRONTEND_URL || origin || 'https://eldoret-muslim-academy.vercel.app';

      const result = await PasswordResetService.initiatePasswordReset(targetUserId, adminUser, frontendUrl);
      res.status(200).json({
        success: true,
        message: 'Password reset link sent to staff email.',
        data: result,
      });
    } catch (error: any) {
      console.error('Error initiating password reset:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to initiate password reset' });
    }
  }

  static async verifyToken(req: Request, res: Response) {
    try {
      const { email, token } = req.body;
      if (!email || !token) {
        return res.status(400).json({ success: false, message: 'Email and token are required' });
      }

      const staffDetails = await PasswordResetService.validateToken(email, token);
      res.status(200).json({ success: true, data: staffDetails });
    } catch (error: any) {
      console.error('Error verifying password reset token:', error);
      res.status(400).json({ success: false, message: error.message || 'Invalid or expired reset link' });
    }
  }

  static async completePasswordReset(req: Request, res: Response) {
    try {
      const { email, token, password } = req.body;
      if (!email || !token || !password) {
        return res.status(400).json({ success: false, message: 'Email, token, and new password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
      }

      await PasswordResetService.completePasswordReset(email, token, password);
      res.status(200).json({
        success: true,
        message: 'Password reset successful. You may now log in with your new password.',
      });
    } catch (error: any) {
      console.error('Error completing password reset:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to reset password' });
    }
  }
}
