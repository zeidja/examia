import express from 'express';
import * as classController from '../controllers/classController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.post('/', authorize('super_admin', 'school_admin'), classController.createClass);
router.get('/', classController.getClasses);
router.get('/:id', classController.getClassById);
router.put('/:id', authorize('super_admin', 'school_admin'), classController.updateClass);
router.post('/:id/students', authorize('super_admin', 'school_admin'), classController.addStudentToClass);
router.delete('/:id/students/:studentId', authorize('super_admin', 'school_admin'), classController.removeStudentFromClass);

export default router;
