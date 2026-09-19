import { Request, Response } from 'express';
import { InventoryService } from './inventory.service.js';

export class InventoryController {
  static async getItems(req: Request, res: Response) {
    try {
      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const all = req.query.all === 'true';

      const result = await InventoryService.getItems({ search, limit, offset, all });
      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch inventory items' });
    }
  }

  static async createItem(req: Request, res: Response) {
    try {
      const item = await InventoryService.createItem(req.body);
      return res.status(201).json({ success: true, data: item, message: 'Inventory item added successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to add inventory item' });
    }
  }

  static async getCheckouts(req: Request, res: Response) {
    try {
      const checkouts = await InventoryService.getCheckouts();
      return res.status(200).json({ success: true, data: checkouts });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch checkouts' });
    }
  }

  static async checkoutItem(req: Request, res: Response) {
    try {
      const checkout = await InventoryService.checkoutItem(req.body, req.user!.id);
      return res.status(201).json({ success: true, data: checkout, message: 'Item checked out successfully' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to checkout item' });
    }
  }

  static async returnItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await InventoryService.returnItem(id);
      return res.status(200).json({ success: true, data: updated, message: 'Item returned to inventory' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Failed to return item' });
    }
  }
}
