import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { DosController } from './dos.controller.js';

const router = Router();

router.use(authenticate);

router.get('/subject-analytics', DosController.getSubjectAnalytics);

export default router;
