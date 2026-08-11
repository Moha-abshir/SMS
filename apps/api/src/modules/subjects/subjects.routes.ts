import { Router } from 'express';
import { SubjectsController } from './subjects.controller.js';
import { authenticate, authorizePermission } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', SubjectsController.getAllSubjects);
router.post('/', authorizePermission('staff:manage'), SubjectsController.createSubject);
router.put('/:id', authorizePermission('staff:manage'), SubjectsController.updateSubject);
router.delete('/:id', authorizePermission('staff:manage'), SubjectsController.deleteSubject);

export default router;
