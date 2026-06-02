import express from 'express';
import { deployWebhook } from '../controllers/deployController.js';

const router = express.Router();

router.post('/webhook', deployWebhook);

export default router;
