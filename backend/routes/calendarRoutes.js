import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as calendarController from '../controllers/calendarController.js';

const router = express.Router();
router.use(protect);

router.get('/', authorize('student', 'school_admin', 'teacher'), calendarController.getCalendar);
router.post('/events', authorize('school_admin'), calendarController.createSchoolEvent);
router.patch('/events/:id', authorize('school_admin'), calendarController.updateSchoolEvent);
router.delete('/events/:id', authorize('school_admin'), calendarController.deleteSchoolEvent);

export default router;
