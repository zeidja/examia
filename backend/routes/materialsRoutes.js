import express from 'express';
import * as materialsController from '../controllers/materialsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Tree is allowed for teachers/school_admin for AI source selection; file and subject-paths stay super_admin only.
router.get('/tree', authorize('super_admin', 'school_admin', 'teacher'), materialsController.getTree);

// Subject files list for Study & Learn file picker — all authenticated users (students, teachers, etc.)
router.get('/subject-files', authorize('student', 'super_admin', 'school_admin', 'teacher'), materialsController.getSubjectFiles);

// Definitions: list and view content by subject — all authenticated users
router.get('/definitions', authorize('student', 'super_admin', 'school_admin', 'teacher'), materialsController.getDefinitions);
router.get('/definitions/file', authorize('student', 'super_admin', 'school_admin', 'teacher'), materialsController.getDefinitionsFile);
router.get('/definitions/file/content', authorize('student', 'super_admin', 'school_admin', 'teacher'), materialsController.getDefinitionsFileContent);

router.get('/command-terms', authorize('student', 'super_admin', 'school_admin', 'teacher'), materialsController.getCommandTerms);
router.get('/command-terms/file', authorize('student', 'super_admin', 'school_admin', 'teacher'), materialsController.getCommandTermsFile);
router.get('/command-terms/file/content', authorize('student', 'super_admin', 'school_admin', 'teacher'), materialsController.getCommandTermsFileContent);

// Checklists: list and view content by subject
router.get('/checklists', authorize('student', 'super_admin', 'school_admin', 'teacher'), materialsController.getChecklists);
router.get('/checklists/file', authorize('student', 'super_admin', 'school_admin', 'teacher'), materialsController.getChecklistsFile);
router.get('/checklists/file/content', authorize('student', 'super_admin', 'school_admin', 'teacher'), materialsController.getChecklistsFileContent);

router.get('/ia-guide', authorize('student', 'super_admin', 'school_admin', 'teacher'), materialsController.getIaGuide);
router.get('/ia-guide/file', authorize('student', 'super_admin', 'school_admin', 'teacher'), materialsController.getIaGuideFile);

router.use(authorize('super_admin'));
router.get('/file', materialsController.getFile);
router.get('/subject-paths', materialsController.getSubjectPathsMap);

export default router;
