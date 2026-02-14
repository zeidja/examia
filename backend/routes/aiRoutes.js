import express from 'express';
import * as aiController from '../controllers/aiController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadReviewSubmission } from '../middleware/upload.js';

const router = express.Router();
router.use(protect);

// Only teachers (and admins) can generate quizzes and flash cards; students only access published content.
router.post('/flash-cards', authorize('super_admin', 'school_admin', 'teacher'), aiController.generateFlashCardsHandler);
router.post('/quizzes', authorize('super_admin', 'school_admin', 'teacher'), aiController.generateQuizzesHandler);
router.post('/tok', authorize('super_admin', 'school_admin', 'teacher'), aiController.generateTOKHandler);
router.post('/external-assessment', authorize('super_admin', 'school_admin', 'teacher'), aiController.generateExternalAssessmentHandler);
router.post('/internal-assessment', authorize('super_admin', 'school_admin', 'teacher'), aiController.generateInternalAssessmentHandler);
router.post('/idea-generation', aiController.ideaGenerationHandler);
router.post('/ideas-chat', aiController.ideasChatHandler);
router.post('/review-submission', aiController.reviewSubmissionHandler);
router.post('/review-submission/upload', uploadReviewSubmission, aiController.reviewSubmissionUploadHandler);
router.post('/study-learn/chat', authorize('student'), aiController.studyLearnChatHandler);
router.post('/feynman-chat', authorize('student'), aiController.feynmanChatHandler);

export default router;
