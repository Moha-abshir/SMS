import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { SettingsController } from './settings.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', SettingsController.getSettings);
router.put('/', authorizePermission('settings:manage'), SettingsController.updateSettings);

export default router;
