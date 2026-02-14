import express from 'express';
import * as subjectController from '../controllers/subjectController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.post('/sync', authorize('super_admin'), subjectController.syncFromMaterials);
router.post('/', authorize('super_admin'), subjectController.createSubject);
router.get('/', subjectController.getSubjects);
router.get('/:id', subjectController.getSubjectById);
router.put('/:id', authorize('super_admin'), subjectController.updateSubject);

export default router;
