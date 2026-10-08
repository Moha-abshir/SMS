import { Request, Response } from 'express';
import { StaffService } from './staff.service.js';

export class StaffController {
  static async getRoles(req: Request, res: Response) {
    try {
      const roles = await StaffService.getAllRoles();
      res.json({ success: true, data: roles });
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch roles' });
    }
  }

  static async getAllStaff(req: Request, res: Response) {
    try {
      const staff = await StaffService.getAllStaff();
      res.json({ success: true, data: staff });
    } catch (error) {
      console.error('Error fetching staff:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch staff' });
    }
  }



  static async updateStaff(req: Request, res: Response) {
    try {
      const staff = await StaffService.updateStaff(req.params.id, req.body);
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Staff not found' });
      }
      res.json({ success: true, message: 'Staff updated successfully', data: staff });
    } catch (error) {
      console.error('Error updating staff:', error);
      res.status(500).json({ success: false, message: 'Failed to update staff' });
    }
  }

  static async toggleStatus(req: Request, res: Response) {
    try {
      const { isActive } = req.body;
      const staff = await StaffService.toggleStatus(req.params.id, isActive);
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Staff not found' });
      }
      res.json({ success: true, message: `Staff account ${isActive ? 'activated' : 'deactivated'}`, data: staff });
    } catch (error: any) {
      console.error('Error toggling staff status:', error);
      if (error.code === 'CANNOT_DEACTIVATE_CLASS_TEACHER') {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
          assignedClasses: error.assignedClasses,
        });
      }
      res.status(500).json({ success: false, message: error.message || 'Failed to toggle staff status' });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const defaultPassword = await StaffService.resetPassword(req.params.id);
      res.json({ success: true, message: 'Password reset successfully', defaultPassword });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
  }
}
