import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as insightsController from '../controllers/insightsController.js';

const router = Router();
router.use(protect);

router.get('/subject/:subjectId', authorize('student'), insightsController.getSubjectInsights);

export default router;
