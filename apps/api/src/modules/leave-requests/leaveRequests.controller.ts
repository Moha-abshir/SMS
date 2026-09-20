import { Request, Response } from 'express';
import { LeaveRequestsService } from './leaveRequests.service.js';

export class LeaveRequestsController {
  static async getFormData(req: Request, res: Response) {
    try {
      const data = await LeaveRequestsService.getFormData();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch form data' });
    }
  }

  static async getLeaveRequests(req: Request, res: Response) {
    try {
      const data = await LeaveRequestsService.getLeaveRequests();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch leave requests' });
    }
  }

  static async createLeaveRequest(req: Request, res: Response) {
    try {
      const created = await LeaveRequestsService.createLeaveRequest(req.body, req.user!.id);
      return res.status(201).json({ success: true, data: created, message: 'Teacher leave-out recorded successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to record leave-out' });
    }
  }

  static async updateLeaveStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const updated = await LeaveRequestsService.updateLeaveStatus(id, status, req.user!.id, notes);
      return res.status(200).json({ success: true, data: updated, message: `Leave request ${status.toLowerCase()}` });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to update leave status' });
    }
  }

  static async getLeaveSlipPrintData(req: Request, res: Response) {
    try {
      const data = await LeaveRequestsService.getLeaveSlipPrintData(req.params.id);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message || 'Leave request not found' });
    }
  }

  static async markReportedBack(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await LeaveRequestsService.markReportedBack(id, req.user!.id);
      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Teacher marked as reported back. Class teacher roles restored.',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to mark as reported back' });
    }
  }
}
