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

  static async notifyParentOfAbsence(req: Request, res: Response) {
    try {
      const { studentId, guardianId, guardianPhone, studentName } = req.body;
      const log = await AttendanceService.notifyParentOfAbsence(studentId, guardianId, guardianPhone, studentName);
      return res.status(200).json({ success: true, data: log, message: 'Absentee SMS alert sent to parent' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to send SMS' });
    }
  }
}
