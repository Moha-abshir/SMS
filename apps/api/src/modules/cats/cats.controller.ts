import { publicErrorMessage, logServerError } from '../../utils/publicError.js';
import { Request, Response } from 'express';
import { CatsService } from './cats.service.js';

export class CatsController {
  /**
   * GET /api/cats/teacher-allocations
   */
  static async getTeacherAllocations(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const data = await CatsService.getTeacherCatAllocations(userId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      logServerError('[CatsController] getTeacherAllocations error:', error);
      return res.status(error.status || 500).json({
        success: false,
        message: publicErrorMessage(error, 'Failed to load CAT teacher allocations'),
      });
    }
  }

  /**
   * POST /api/cats
   */
  static async createCat(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { classId, subjectId, catNumber, maxMarks, termId } = req.body;
      if (!classId || !subjectId || catNumber === undefined || catNumber === null) {
        return res.status(400).json({
          success: false,
          message: 'classId, subjectId, and catNumber are required to create a CAT.',
        });
      }

      const created = await CatsService.createCat(userId, {
        classId,
        subjectId,
        catNumber: Number(catNumber),
        maxMarks: maxMarks ? Number(maxMarks) : 100,
        termId,
      }, req.user!);

      return res.status(201).json({
        success: true,
        message: `CAT ${created.catNumber} created successfully.`,
        data: created,
      });
    } catch (error: any) {
      logServerError('[CatsController] createCat error:', error);
      let status = 500;
      if (
        error.message?.includes('restricted') ||
        error.message?.includes('not found') ||
        error.message?.includes('required') ||
        error.message?.includes('invalid')
      ) {
        status = 400;
      } else if (error.message?.includes('already exists')) {
        status = 409;
      }
      return res.status(error.status || status).json({
        success: false,
        message: publicErrorMessage(error, 'Failed to create CAT assessment'),
      });
    }
  }

  /**
   * GET /api/cats/:catId/marksheet
   */
  static async getCatMarksheet(req: Request, res: Response) {
    try {
      const { catId } = req.params;
      if (!catId) {
        return res.status(400).json({ success: false, message: 'catId is required.' });
      }

      const data = await CatsService.getCatMarksheet(catId, req.user!);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      logServerError('[CatsController] getCatMarksheet error:', error);
      return res.status(error.status || 404).json({
        success: false,
        message: publicErrorMessage(error, 'Failed to fetch CAT marksheet'),
      });
    }
  }

  /**
   * PUT /api/cats/:catId/scores
   */
  static async saveCatScores(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { catId } = req.params;
      const { scores } = req.body;

      if (!catId || !Array.isArray(scores)) {
        return res.status(400).json({
          success: false,
          message: 'catId and scores array are required.',
        });
      }

      const result = await CatsService.saveCatScores(catId, userId, { scores }, req.user!);
      return res.status(200).json({ success: true, message: result.message });
    } catch (error: any) {
      logServerError('[CatsController] saveCatScores error:', error);
      return res.status(error.status || 400).json({
        success: false,
        message: publicErrorMessage(error, 'Failed to save CAT scores'),
      });
    }
  }

  /**
   * DELETE /api/cats/:catId
   */
  static async deleteCat(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { catId } = req.params;
      if (!catId) {
        return res.status(400).json({ success: false, message: 'catId is required.' });
      }

      const result = await CatsService.deleteCat(catId, userId, req.user!);
      return res.status(200).json({ success: true, message: result.message, data: result });
    } catch (error: any) {
      logServerError('[CatsController] deleteCat error:', error);
      return res.status(error.status || 400).json({
        success: false,
        message: publicErrorMessage(error, 'Failed to delete CAT assessment'),
      });
    }
  }

  /**
   * GET /api/cats/class/:classId
   */
  static async getClassCatsDetail(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const termId = req.query.termId as string | undefined;

      if (!classId) {
        return res.status(400).json({ success: false, message: 'classId is required.' });
      }

      const data = await CatsService.getClassCatsDetail(classId, req.user!, termId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      logServerError('[CatsController] getClassCatsDetail error:', error);
      return res.status(error.status || 500).json({
        success: false,
        message: publicErrorMessage(error, 'Failed to fetch class CAT details'),
      });
    }
  }
}
