import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as lessonNoteController from '../controllers/lessonNoteController.js';

const router = Router();
router.use(protect);

router.post('/', authorize('student'), lessonNoteController.create);
router.get('/', lessonNoteController.list);
router.get('/:id', lessonNoteController.getOne);
router.put('/:id', authorize('student'), lessonNoteController.update);
router.delete('/:id', authorize('student'), lessonNoteController.remove);

export default router;
