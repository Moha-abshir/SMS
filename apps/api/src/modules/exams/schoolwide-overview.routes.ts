import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { SchoolwideOverviewController } from './schoolwide-overview.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', SchoolwideOverviewController.getSchoolwideOverview);
router.get('/classes/:classId', SchoolwideOverviewController.getGradeOverview);

export default router;
