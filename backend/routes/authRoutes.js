import express from 'express';
import { body } from 'express-validator';
import { login, logout, getMe, updateMe, requestOTP, verifyOTPAndResetPassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// No public signup — Super Admin creates school admins; School Admin creates teachers and students.

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate,
  login
);

router.post('/logout', logout);
router.get('/me', protect, getMe);
router.patch(
  '/me',
  protect,
  [body('name').optional().trim().notEmpty(), body('password').optional().isLength({ min: 6 })],
  validate,
  updateMe
);

router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate,
  requestOTP
);

router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail(),
    body('code').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
  ],
  validate,
  verifyOTPAndResetPassword
);

export default router;
