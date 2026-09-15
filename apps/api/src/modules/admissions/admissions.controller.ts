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

  static async getImportTemplateCsv(req: Request, res: Response) {
    try {
      const csv = AdmissionsService.getImportTemplateCsv();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="student_admission_template.csv"');
      return res.status(200).send(csv);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to generate template' });
    }
  }

  static async bulkImportStudents(req: Request, res: Response) {
    try {
      const userRole = req.user?.roleName || 'HEAD_TEACHER';
      const isDirectActive = userRole === 'HEAD_TEACHER';
      const result = await AdmissionsService.bulkImportStudents(
        req.body,
        req.user!.id,
        isDirectActive
      );
      return res.status(200).json({
        success: true,
        data: result,
        message: `Successfully imported ${result.insertedCount} student(s)${result.errors.length ? ` with ${result.errors.length} skipped row(s)` : ''}`,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Bulk import failed' });
    }
  }

  static async getPendingAdmissions(req: Request, res: Response) {
    try {
      const pending = await AdmissionsService.getPendingAdmissions();
      return res.status(200).json({ success: true, data: pending });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch pending admissions' });
    }
  }

  static async approveAdmission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await AdmissionsService.approveAdmission(id, req.user!.id);
      return res.status(200).json({ success: true, data: updated, message: 'Student admission approved' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to approve admission' });
    }
  }

  static async rejectAdmission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const updated = await AdmissionsService.rejectAdmission(id, reason || 'Admission rejected by administrator', req.user!.id);
      return res.status(200).json({ success: true, data: updated, message: 'Student admission rejected' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to reject admission' });
    }
  }

  static async expelStudent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ success: false, message: 'Expulsion reason is required' });
      }
      const updated = await AdmissionsService.expelStudent(id, reason, req.user!.id);
      return res.status(200).json({ success: true, data: updated, message: 'Student expelled successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to expel student' });
    }
  }

  static async transferStudent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const updated = await AdmissionsService.transferStudent(id, reason || 'Transferred to another institution', req.user!.id);
      return res.status(200).json({ success: true, data: updated, message: 'Student transfer approved and finalized' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to process student transfer' });
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
