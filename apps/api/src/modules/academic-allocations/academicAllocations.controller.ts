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
