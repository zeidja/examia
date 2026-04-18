import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as activityLogController from '../controllers/activityLogController.js';

const router = express.Router();
router.use(protect);
router.get('/', authorize('school_admin', 'teacher'), activityLogController.listActivityLogs);

export default router;
