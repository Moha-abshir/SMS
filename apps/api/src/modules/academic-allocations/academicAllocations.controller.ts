import { Request, Response } from 'express';
import { AcademicAllocationsService } from './academicAllocations.service.js';

export class AcademicAllocationsController {
  // --- Invigilators ---
  static async getInvigilators(req: Request, res: Response) {
    try {
      const data = await AcademicAllocationsService.getInvigilators();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch invigilators' });
    }
  }

  static async getAvailableInvigilators(req: Request, res: Response) {
    try {
      const sessionId = req.query.sessionId as string;
      if (!sessionId) {
        return res.status(400).json({ success: false, message: 'sessionId query parameter is required' });
      }
      const data = await AcademicAllocationsService.getAvailableInvigilators(sessionId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch available invigilators' });
    }
  }

  static async assignInvigilator(req: Request, res: Response) {
    try {
      const created = await AcademicAllocationsService.assignInvigilator(req.body);
      return res.status(201).json({ success: true, data: created, message: 'Invigilator assigned successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to assign invigilator' });
    }
  }

  static async removeInvigilator(req: Request, res: Response) {
    try {
      await AcademicAllocationsService.removeInvigilator(req.params.id);
      return res.status(200).json({ success: true, message: 'Invigilator assignment removed' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to remove invigilator' });
    }
  }

  // --- Marking Allocations ---
  static async getMarkingAllocations(req: Request, res: Response) {
    try {
      const data = await AcademicAllocationsService.getMarkingAllocations();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch marking allocations' });
    }
  }

  static async getSelfContainedRoster(req: Request, res: Response) {
    try {
      const data = await AcademicAllocationsService.getSelfContainedRoster();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch self-contained roster' });
    }
  }

  static async getEligibleMarkingTeachers(req: Request, res: Response) {
    try {
      const subjectId = req.query.subjectId as string | undefined;
      const classId = req.query.classId as string | undefined;

      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validSubjectId = subjectId && UUID_REGEX.test(subjectId) ? subjectId : undefined;
      const validClassId = classId && UUID_REGEX.test(classId) ? classId : undefined;

      if (!validSubjectId && !validClassId) {
        return res.status(400).json({ success: false, message: 'Valid subjectId or classId query parameter is required' });
      }

      const data = await AcademicAllocationsService.getEligibleMarkingTeachers(validSubjectId, validClassId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('getEligibleMarkingTeachers error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch eligible marking teachers' });
    }
  }

  static async assignMarking(req: Request, res: Response) {
    try {
      const created = await AcademicAllocationsService.assignMarking(req.body);
      return res.status(201).json({ success: true, data: created, message: 'Paper examiner assigned successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to assign examiner' });
    }
  }

  static async removeMarking(req: Request, res: Response) {
    try {
      await AcademicAllocationsService.removeMarking(req.params.id);
      return res.status(200).json({ success: true, message: 'Marking allocation removed' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to remove marking allocation' });
    }
  }
}

