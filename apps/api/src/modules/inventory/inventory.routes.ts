import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { InventoryController } from './inventory.controller.js';

const router = Router();

router.use(authenticate);

router.get('/items', InventoryController.getItems);
router.post('/items', authorizePermission(['inventory:manage', 'staff:manage']), InventoryController.createItem);
router.put('/items/:id', authorizePermission(['inventory:manage', 'staff:manage']), InventoryController.updateItem);
router.get('/checkouts', InventoryController.getCheckouts);
router.post('/checkouts', authorizePermission(['inventory:manage', 'staff:manage']), InventoryController.checkoutItem);
router.put('/checkouts/:id/return', authorizePermission(['inventory:manage', 'staff:manage']), InventoryController.returnItem);

export default router;
