import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { AcademicTermsController } from './academicTerms.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', AcademicTermsController.getAllTerms);
router.put('/:id', authorizePermission('settings:manage'), AcademicTermsController.updateTerm);

export default router;
