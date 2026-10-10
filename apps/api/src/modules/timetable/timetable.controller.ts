import { Request, Response } from 'express';
import { TimetableService } from './timetable.service.js';

export class TimetableController {
  static async getConfig(req: Request, res: Response) {
    try {
      const year = req.query.academicYear ? parseInt(req.query.academicYear as string, 10) : undefined;
      const term = req.query.term ? parseInt(req.query.term as string, 10) : undefined;

      const config = await TimetableService.getConfig(year, term);
      return res.status(200).json({ success: true, data: config });
    } catch (error: any) {
      console.error('Error fetching timetable config:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch timetable config' });
    }
  }

  static async saveConfig(req: Request, res: Response) {
    try {
      const updated = await TimetableService.saveConfig(req.body);
      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Timetable configuration saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving timetable config:', error);
      return res.status(400).json({ success: false, message: error.message || 'Failed to save timetable config' });
    }
  }

  static async getTargetClasses(req: Request, res: Response) {
    try {
      const data = await TimetableService.getTargetClasses();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error fetching target classes:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch target classes' });
    }
  }

  static async getAllocationsStatus(req: Request, res: Response) {
    try {
      const year = req.query.academicYear ? parseInt(req.query.academicYear as string, 10) : undefined;
      const data = await TimetableService.checkAllocationsStatus(year);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error checking allocations status:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to check allocations status' });
    }
  }

  static async generate(req: Request, res: Response) {
    try {
      const { academicYear, term, password } = req.body;
      const userId = (req as any).user?.id;
      const result = await TimetableService.generate(academicYear, term, userId, password);
      return res.status(200).json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error: any) {
      console.error('Error generating timetable:', error);
      const status = error.statusCode || 400;
      return res.status(status).json({ success: false, message: error.message || 'Failed to generate timetable' });
    }
  }

  static async getMasterTimetable(req: Request, res: Response) {
    try {
      const year = req.query.academicYear ? parseInt(req.query.academicYear as string, 10) : undefined;
      const term = req.query.term ? parseInt(req.query.term as string, 10) : undefined;

      const data = await TimetableService.getMasterTimetable(year, term);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error fetching master timetable:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch master timetable' });
    }
  }

  static async getClassTimetable(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const year = req.query.academicYear ? parseInt(req.query.academicYear as string, 10) : undefined;
      const term = req.query.term ? parseInt(req.query.term as string, 10) : undefined;

      const data = await TimetableService.getClassTimetable(classId, year, term);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error fetching class timetable:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch class timetable' });
    }
  }

  static async getTeacherTimetable(req: Request, res: Response) {
    try {
      let { teacherId } = req.params;
      const userRole = (req as any).user?.roleName;

      // If user is HEAD_TEACHER or regular TEACHER, strictly scope to their personal timetable
      if (userRole === 'HEAD_TEACHER' || userRole === 'TEACHER') {
        teacherId = (req as any).user?.id || teacherId;
      }

      const year = req.query.academicYear ? parseInt(req.query.academicYear as string, 10) : undefined;
      const term = req.query.term ? parseInt(req.query.term as string, 10) : undefined;

      const data = await TimetableService.getTeacherTimetable(teacherId, year, term);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error fetching teacher timetable:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch teacher timetable' });
    }
  }

  static async validateMovement(req: Request, res: Response) {
    try {
      const { slotId, targetDay, targetPeriodIndex } = req.body;
      const validation = await TimetableService.validateMovement(slotId, targetDay, targetPeriodIndex);
      return res.status(200).json({ success: true, data: validation });
    } catch (error: any) {
      console.error('Error validating movement:', error);
      return res.status(400).json({ success: false, message: error.message || 'Failed to validate slot movement' });
    }
  }

  static async swapSlots(req: Request, res: Response) {
    try {
      const { slotAId, slotBId, force } = req.body;
      const result = await TimetableService.swapSlots(slotAId, slotBId, force);
      if (result.hasConflict) {
        return res.status(409).json({
          success: false,
          hasConflict: true,
          message: result.message,
        });
      }
      return res.status(200).json({ success: true, message: result.message });
    } catch (error: any) {
      console.error('Error swapping slots:', error);
      return res.status(400).json({ success: false, message: error.message || 'Failed to swap timetable slots' });
    }
  }
}
