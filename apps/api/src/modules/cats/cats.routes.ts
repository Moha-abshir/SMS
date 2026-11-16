import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { CatsController } from './cats.controller.js';

const router = Router();

router.use(authenticate);

router.get('/teacher-allocations', CatsController.getTeacherAllocations);
router.get('/class/:classId', CatsController.getClassCatsDetail);
router.post('/', CatsController.createCat);
router.get('/:catId/marksheet', CatsController.getCatMarksheet);
router.put('/:catId/scores', CatsController.saveCatScores);
router.delete('/:catId', CatsController.deleteCat);

export default router;
