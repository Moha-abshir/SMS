import { Request, Response } from 'express';
import { OfficialLettersService } from './officialLetters.service.js';

export class OfficialLettersController {
  static async getLetters(req: Request, res: Response) {
    try {
      const letters = await OfficialLettersService.getLetters();
      return res.status(200).json({ success: true, data: letters });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch official letters' });
    }
  }

  static async createLetter(req: Request, res: Response) {
    try {
      const created = await OfficialLettersService.createLetter(req.body, req.user!.id);
      return res.status(201).json({ success: true, data: created, message: 'Official letter generated successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to create official letter' });
    }
  }

  static async getLetterPrintData(req: Request, res: Response) {
    try {
      const data = await OfficialLettersService.getLetterPrintData(req.params.id);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message || 'Letter not found' });
    }
  }

  static async deleteLetter(req: Request, res: Response) {
    try {
      await OfficialLettersService.deleteLetter(req.params.id);
      return res.status(200).json({ success: true, message: 'Letter deleted' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to delete letter' });
    }
  }
}
