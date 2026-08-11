import { Request, Response } from 'express';
import { SubjectsService } from './subjects.service.js';

export class SubjectsController {
  static async getAllSubjects(req: Request, res: Response) {
    try {
      const subjectsList = await SubjectsService.getAllSubjects();
      res.json({ success: true, data: subjectsList });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch subjects' });
    }
  }

  static async createSubject(req: Request, res: Response) {
    try {
      const { name, code, levelCategory } = req.body;
      if (!name || !code || !levelCategory) {
        return res.status(400).json({ success: false, message: 'Name, code, and levelCategory are required' });
      }

      const newSubject = await SubjectsService.createSubject({ name, code, levelCategory });
      res.status(201).json({ success: true, message: 'Subject created successfully', data: newSubject });
    } catch (error: any) {
      if (error.code === '23505') { // Postgres unique constraint violation
        return res.status(409).json({ success: false, message: 'A subject with this code already exists' });
      }
      res.status(500).json({ success: false, message: error.message || 'Failed to create subject' });
    }
  }

  static async updateSubject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, code, levelCategory } = req.body;

      const updated = await SubjectsService.updateSubject(id, { name, code, levelCategory });
      res.json({ success: true, message: 'Subject updated successfully', data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to update subject' });
    }
  }

  static async deleteSubject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await SubjectsService.deleteSubject(id);
      res.json({ success: true, message: 'Subject deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to delete subject' });
    }
  }
}
