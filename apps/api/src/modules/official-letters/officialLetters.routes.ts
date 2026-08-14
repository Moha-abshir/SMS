import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { OfficialLettersController } from './officialLetters.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', OfficialLettersController.getLetters);
router.get('/:id/print', OfficialLettersController.getLetterPrintData);
router.post('/', authorizePermission('letters:manage'), OfficialLettersController.createLetter);
router.delete('/:id', authorizePermission('letters:manage'), OfficialLettersController.deleteLetter);

export default router;
