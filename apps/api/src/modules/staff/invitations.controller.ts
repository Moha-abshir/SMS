import { Request, Response } from 'express';
import { InvitationsService, InvitationError } from './invitations.service.js';
import { resolveFrontendUrl } from '../../config/env.js';

export class InvitationsController {
  static async createInvitation(req: Request, res: Response) {
    try {
      const frontendUrl = resolveFrontendUrl(req);
      const invitedById = (req as any).user?.id || '00000000-0000-0000-0000-000000000000';
      
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
      const frontendUrl = resolveFrontendUrl(req);
      const result = await InvitationsService.resendInvitation(req.params.id, frontendUrl);
      res.json({ 
        success: true, 
        message: 'Invitation resent successfully (valid for 60 minutes)', 
        emailSent: result.emailSent 
      });
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

  static async deleteInvitation(req: Request, res: Response) {
    try {
      const result = await InvitationsService.deleteInvitation(req.params.id);
      res.json({ success: true, message: 'Staff invitation deleted successfully', data: result });
    } catch (error: any) {
      console.error('Error deleting invitation:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to delete invitation' });
    }
  }

  static async validateInvitation(req: Request, res: Response) {
    try {
      const { email, token } = req.body;
      if (!email || !token) {
        return res.status(400).json({ 
          success: false, 
          code: 'INVITATION_INVALID', 
          message: 'Email and token are required.' 
        });
      }
      
      const staffDetails = await InvitationsService.validateInvitation(email, token);
      res.json({ success: true, data: staffDetails });
    } catch (error: any) {
      console.error('Error validating invitation:', error);
      const code = error instanceof InvitationError ? error.code : (error.code || 'INVITATION_INVALID');
      res.status(400).json({ 
        success: false, 
        code, 
        message: error.message || 'Invalid or expired invitation',
        details: error.details || null 
      });
    }
  }

  static async acceptInvitation(req: Request, res: Response) {
    try {
      const { email, token, password } = req.body;
      if (!email || !token || !password) {
        return res.status(400).json({ 
          success: false, 
          code: 'INVITATION_INVALID', 
          message: 'Email, token, and password are required' 
        });
      }

      if (password.length < 8) {
        return res.status(400).json({ 
          success: false, 
          code: 'PASSWORD_TOO_SHORT', 
          message: 'Password must be at least 8 characters long' 
        });
      }
      
      const user = await InvitationsService.acceptInvitation(email, token, password);
      res.json({ success: true, message: 'Account created successfully', data: { id: user.id, email: user.email } });
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      const code = error instanceof InvitationError ? error.code : (error.code || 'INVITATION_INVALID');
      res.status(400).json({ 
        success: false, 
        code, 
        message: error.message || 'Failed to accept invitation',
        details: error.details || null 
      });
    }
  }
}
