import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { SettingsController } from './settings.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max upload limit before sharp compression
});

const router = Router();

// Unauthenticated public route for Login page & Set Password page
router.get('/public', SettingsController.getPublicSettings);

// Authenticated routes
router.get('/', authenticate, SettingsController.getSettings);
router.put('/', authenticate, authorizePermission('settings:manage'), SettingsController.updateSettings);
router.post(
  '/upload-logo',
  authenticate,
  authorizePermission('settings:manage'),
  upload.single('logo'),
  SettingsController.uploadLogo
);

export default router;
