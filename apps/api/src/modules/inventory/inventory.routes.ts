import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { InventoryController } from './inventory.controller.js';

const router = Router();

router.use(authenticate);

router.get('/items', InventoryController.getItems);
router.post('/items', authorizePermission('staff:manage'), InventoryController.createItem);
router.get('/checkouts', InventoryController.getCheckouts);
router.post('/checkouts', authorizePermission('staff:manage'), InventoryController.checkoutItem);
router.put('/checkouts/:id/return', authorizePermission('staff:manage'), InventoryController.returnItem);

export default router;
