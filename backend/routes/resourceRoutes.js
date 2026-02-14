import express from 'express';
import * as resourceController from '../controllers/resourceController.js';
import * as quizAttemptController from '../controllers/quizAttemptController.js';
import * as flashCardRatingController from '../controllers/flashCardRatingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadMaterial } from '../middleware/upload.js';

const router = express.Router();
router.use(protect);

router.get('/', resourceController.list);
router.get('/:id/file', resourceController.downloadFile);
router.get('/:id/quiz-attempt', quizAttemptController.getMyQuizAttempt);
router.post('/:id/quiz-attempt', quizAttemptController.submitQuizAttempt);
router.get('/:id/quiz-attempts', authorize('teacher', 'super_admin', 'school_admin'), quizAttemptController.getQuizAttemptsForResource);
router.get('/:id/quiz-report-tips', authorize('teacher', 'super_admin', 'school_admin'), quizAttemptController.getQuizReportTips);
router.get('/:id/flash-card-ratings', flashCardRatingController.getRatings);
router.post('/:id/flash-card-ratings', flashCardRatingController.submitRating);
router.get('/:id', resourceController.getOne);
router.post('/', authorize('teacher', 'super_admin', 'school_admin'), resourceController.create);
router.post('/upload', authorize('teacher'), uploadMaterial, resourceController.uploadMaterial);
router.put('/:id', authorize('teacher', 'super_admin', 'school_admin'), resourceController.update);
router.delete('/:id', authorize('teacher', 'super_admin', 'school_admin'), resourceController.remove);

export default router;
