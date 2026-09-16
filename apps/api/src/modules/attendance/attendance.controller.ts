import { Request, Response } from 'express';
import { AttendanceService } from './attendance.service.js';

export class AttendanceController {
  static async getSchoolWideAttendance(req: Request, res: Response) {
    try {
      const dateStr = req.query.date as string;
      const data = await AttendanceService.getSchoolWideAttendance(dateStr);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch attendance oversight' });
    }
  }

  static async getClassRegister(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const dateStr = req.query.date as string;
      const data = await AttendanceService.getClassRegister(classId, dateStr);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to fetch class register' });
    }
  }

  static async saveClassRegister(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const { date, records } = req.body;
      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ success: false, message: 'Student records array is required' });
      }
      const data = await AttendanceService.saveClassRegister(classId, date, records, req.user!.id);
      return res.status(200).json({ success: true, data, message: 'Class register saved successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to save class register' });
    }
  }

  static async notifyParentOfAbsence(req: Request, res: Response) {
    try {
      const { studentId, guardianId, guardianPhone, studentName } = req.body;
      const log = await AttendanceService.notifyParentOfAbsence(studentId, guardianId, guardianPhone, studentName);
      return res.status(200).json({ success: true, data: log, message: 'Absentee SMS alert sent to parent' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to send SMS' });
    }
  }

  static async notifyAllUnnotifiedAbsent(req: Request, res: Response) {
    try {
      const targetDate = req.query.date as string;
      const result = await AttendanceService.notifyAllUnnotifiedAbsent(targetDate);
      return res.status(200).json({
        success: true,
        data: result,
        message: `Dispatched SMS to ${result.notifiedCount} absent learner parent(s)${result.errors.length ? ` with ${result.errors.length} error(s)` : ''}`,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to notify absent parents' });
    }
  }
}
