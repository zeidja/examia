import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { uploadIaSample } from '../middleware/upload.js';
import * as iaSamplesController from '../controllers/iaSamplesController.js';

const router = express.Router();
router.use(protect);
router.use(authorize('student', 'teacher', 'school_admin'));

router.get('/', iaSamplesController.list);
router.get('/:id/file', iaSamplesController.downloadFile);
router.post('/', authorize('teacher'), uploadIaSample, iaSamplesController.upload);
router.delete('/:id', authorize('teacher'), iaSamplesController.remove);

export default router;
