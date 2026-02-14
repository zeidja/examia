import express from 'express';
import * as schoolController from '../controllers/schoolController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.post('/', authorize('super_admin'), schoolController.createSchool);
router.get('/', authorize('super_admin', 'school_admin'), schoolController.getSchools);
router.get('/reports', authorize('super_admin'), schoolController.getSchoolReports);
router.get('/:id', schoolController.getSchoolById);
router.put('/:id', authorize('super_admin'), schoolController.updateSchool);
router.delete('/:id', authorize('super_admin'), schoolController.deleteSchool);

export default router;
