import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { AcademicTermsController } from './academicTerms.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', AcademicTermsController.getAllTerms);
router.post('/', authorizePermission('settings:manage'), AcademicTermsController.createTerm);
router.put('/:id', authorizePermission('settings:manage'), AcademicTermsController.updateTerm);
router.delete('/:id', authorizePermission('settings:manage'), AcademicTermsController.deleteTerm);

export default router;
