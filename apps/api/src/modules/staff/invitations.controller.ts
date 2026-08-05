import { Request, Response } from 'express';
import { InvitationsService } from './invitations.service.js';

export class InvitationsController {
  static async createInvitation(req: Request, res: Response) {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      // For now we mock the invitedBy user ID, assuming the head teacher's ID is available in req.user
      const invitedById = (req as any).user?.id || '00000000-0000-0000-0000-000000000000'; // Fallback for dev without full auth middleware yet
      
      const result = await InvitationsService.createInvitation(req.body, invitedById, frontendUrl);
      res.status(201).json({ 
        success: true, 
        message: 'Invitation sent successfully', 
        data: result.invitation,
        emailSent: result.emailSent
      });
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to create invitation' });
    }
  }

  static async resendInvitation(req: Request, res: Response) {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const result = await InvitationsService.resendInvitation(req.params.id, frontendUrl);
      res.json({ success: true, message: 'Invitation resent successfully', data: result });
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to resend invitation' });
    }
  }

  static async cancelInvitation(req: Request, res: Response) {
    try {
      const result = await InvitationsService.cancelInvitation(req.params.id);
      res.json({ success: true, message: 'Invitation cancelled successfully', data: result });
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to cancel invitation' });
    }
  }

  static async validateInvitation(req: Request, res: Response) {
    try {
      const { email, token } = req.body;
      if (!email || !token) {
        return res.status(400).json({ success: false, message: 'Email and token are required' });
      }
      
      const staffDetails = await InvitationsService.validateInvitation(email, token);
      res.json({ success: true, data: staffDetails });
    } catch (error: any) {
      console.error('Error validating invitation:', error);
      res.status(400).json({ success: false, message: error.message || 'Invalid or expired invitation' });
    }
  }

  static async acceptInvitation(req: Request, res: Response) {
    try {
      const { email, token, password } = req.body;
      if (!email || !token || !password) {
        return res.status(400).json({ success: false, message: 'Email, token, and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
      }
      
      const user = await InvitationsService.acceptInvitation(email, token, password);
      res.json({ success: true, message: 'Account created successfully', data: { id: user.id, email: user.email } });
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to accept invitation' });
    }
  }
}
