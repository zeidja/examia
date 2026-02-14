import express from 'express';
import * as aiPromptController from '../controllers/aiPromptController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/', aiPromptController.getPrompts);
router.get('/:key', aiPromptController.getPromptByKey);
router.post('/', authorize('super_admin'), aiPromptController.createPrompt);
router.put('/:key', authorize('super_admin'), aiPromptController.updatePrompt);

export default router;
