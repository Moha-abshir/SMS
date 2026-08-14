import { Request, Response } from 'express';
import { AllocationsService } from './allocations.service.js';

export class AllocationsController {
  static async getAllocations(req: Request, res: Response) {
    try {
      const year = req.query.academicYear ? parseInt(req.query.academicYear as string) : undefined;
      const data = await AllocationsService.getAllocations(year);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch allocations' });
    }
  }

  static async assignClassTeacher(req: Request, res: Response) {
    try {
      const { classId, teacherId, academicYear } = req.body;
      const updated = await AllocationsService.assignClassTeacher(classId, teacherId, academicYear);
      return res.status(200).json({ success: true, data: updated, message: 'Class teacher assigned successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to assign class teacher' });
    }
  }

  static async assignSubjectTeacher(req: Request, res: Response) {
    try {
      const { classId, subjectId, teacherId, academicYear } = req.body;
      const created = await AllocationsService.assignSubjectTeacher(classId, subjectId, teacherId, academicYear);
      return res.status(200).json({ success: true, data: created, message: 'Subject teacher allocated successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to allocate subject teacher' });
    }
  }

  static async removeSubjectAllocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await AllocationsService.removeSubjectAllocation(id);
      return res.status(200).json({ success: true, message: 'Subject allocation removed' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to remove allocation' });
    }
  }
}
