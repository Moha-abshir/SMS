import { publicErrorMessage, logServerError } from '../../utils/publicError.js';
import { Request, Response } from 'express';
import { ROLE_DEFAULT_PERMISSIONS } from '../../middleware/auth.js';
import { StaffService } from './staff.service.js';

export class StaffController {
  static async getRoles(req: Request, res: Response) {
    try {
      const roles = await StaffService.getAllRoles();
      res.json({ success: true, data: roles });
    } catch (error) {
      logServerError('Error fetching roles:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch roles' });
    }
  }

  static async getAllStaff(req: Request, res: Response) {
    try {
      const staff = await StaffService.getAllStaff();
      const canManage = req.user?.roleName === 'HEAD_TEACHER' || [...(req.user?.permissions || []), ...(ROLE_DEFAULT_PERMISSIONS[req.user?.roleName || ''] || [])].includes('staff:manage');
      const data = canManage ? staff : staff.filter((person: any) => !person.isInvitation).map((person: any) => ({
        id: person.id, firstName: person.firstName, lastName: person.lastName, email: person.email,
        roleName: person.roleName, roleId: person.roleId, isActive: person.isActive,
        qualifiedSubjects: person.qualifiedSubjects, assignedSubjects: person.assignedSubjects,
      }));
      res.json({ success: true, data });
    } catch (error) {
      logServerError('Error fetching staff:', error);
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
      logServerError('Error updating staff:', error);
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
      logServerError('Error toggling staff status:', error);
      if (error.code === 'CANNOT_DEACTIVATE_CLASS_TEACHER') {
        return res.status(400).json({
          success: false,
          code: error.code,
          message: error.message,
          assignedClasses: error.assignedClasses,
        });
      }
      res.status(500).json({ success: false, message: publicErrorMessage(error, 'Failed to toggle staff status') });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const defaultPassword = await StaffService.resetPassword(req.params.id);
      res.json({ success: true, message: 'Password reset successfully', defaultPassword });
    } catch (error) {
      logServerError('Error resetting password:', error);
      res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
  }
}
