import { Request, Response } from 'express';
import { AdmissionsService } from './admissions.service.js';

export class AdmissionsController {
  static async searchGuardians(req: Request, res: Response) {
    try {
      const q = req.query.q as string;
      const results = await AdmissionsService.searchGuardians(q || '');
      return res.status(200).json({ success: true, data: results });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to search guardians' });
    }
  }

  static async getClasses(req: Request, res: Response) {
    try {
      const classList = await AdmissionsService.seedClassesIfEmpty();
      return res.status(200).json({ success: true, data: classList });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch classes' });
    }
  }

  static async admitStudent(req: Request, res: Response) {
    try {
      const { student, guardian } = req.body;
      const userRole = req.user?.roleName || 'HEAD_TEACHER';
      const isDirectActive = userRole === 'HEAD_TEACHER';

      const created = await AdmissionsService.admitStudent(student, guardian, req.user!.id, isDirectActive);
      return res.status(201).json({
        success: true,
        data: created,
        message: isDirectActive ? 'Student admitted successfully' : 'Student admission submitted for Head Teacher approval',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to admit student' });
    }
  }

  static async getStudents(req: Request, res: Response) {
    try {
      const studentsList = await AdmissionsService.getStudents();
      return res.status(200).json({ success: true, data: studentsList });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch students' });
    }
  }
}
