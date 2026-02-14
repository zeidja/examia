import express from 'express';
import * as materialsController from '../controllers/materialsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Tree is allowed for teachers/school_admin for AI source selection; file and subject-paths stay super_admin only.
router.get('/tree', authorize('super_admin', 'school_admin', 'teacher'), materialsController.getTree);

// Subject files list for Study & Learn file picker — all authenticated users (students, teachers, etc.)
router.get('/subject-files', authorize('student', 'super_admin', 'school_admin', 'teacher'), materialsController.getSubjectFiles);

router.use(authorize('super_admin'));
router.get('/file', materialsController.getFile);
router.get('/subject-paths', materialsController.getSubjectPathsMap);

export default router;
