import express from 'express';
import * as ideaController from '../controllers/ideaController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/', ideaController.getMyIdeas);
router.post('/', ideaController.createIdea);

export default router;
