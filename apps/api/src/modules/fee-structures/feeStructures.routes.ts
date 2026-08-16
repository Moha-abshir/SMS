import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { FeeStructuresController } from './feeStructures.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', FeeStructuresController.getFeeStructures);
router.put('/batch', authorizePermission('fees:structure-edit'), FeeStructuresController.batchUpdateFeeStructures);
router.put('/:id', authorizePermission('fees:structure-edit'), FeeStructuresController.updateFeeStructure);

export default router;
