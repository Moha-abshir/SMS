import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { DashboardController } from './dashboard.controller.js';

const router = Router();

router.use(authenticate);

router.get('/head-teacher', DashboardController.getHeadTeacherOverview);

export default router;
