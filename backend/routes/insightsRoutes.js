import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as insightsController from '../controllers/insightsController.js';

const router = Router();
router.use(protect);

router.get('/subject/:subjectId', authorize('student'), insightsController.getSubjectInsights);
router.get('/subject/:subjectId/teacher', authorize('teacher', 'school_admin', 'super_admin'), insightsController.getTeacherSubjectInsights);
router.get('/subject/:subjectId/teacher/student/:studentId', authorize('teacher', 'school_admin', 'super_admin'), insightsController.getTeacherStudentDetail);

export default router;
