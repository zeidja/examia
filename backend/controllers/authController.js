import User from '../models/User.js';
import OTP from '../models/OTP.js';
import { generateToken } from '../utils/jwt.js';
import { sendOTPEmail, sendPasswordResetConfirmation } from '../services/emailService.js';
import crypto from 'crypto';

// Only set Secure when served over HTTPS (browsers won't send cookie over HTTP otherwise)
const isHttps = (process.env.CLIENT_URL || '').startsWith('https');
const cookieOptions = {
  httpOnly: true,
  secure: isHttps,
  sameSite: 'lax',
  maxAge: (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000,
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role, school, subject, class: classId } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      school: school || undefined,
      subject: subject || undefined,
      class: classId || undefined,
    });
    const token = generateToken(user._id);
    res.cookie('token', token, cookieOptions);
    res.status(201).json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, school: user.school, subject: user.subject, class: user.class },
      token,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailNorm = (email || '').trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm }).select('+password').populate('school', 'name').populate('subject', 'name').populate('class', 'name');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is inactive' });
    }
    const token = generateToken(user._id);
    res.cookie('token', token, cookieOptions);
    const u = user.toObject();
    delete u.password;
    res.json({ success: true, user: u, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Login failed' });
  }
};

export const logout = async (req, res) => {
  res.cookie('token', '', { ...cookieOptions, maxAge: 0 });
  res.json({ success: true });
};

export const getMe = async (req, res) => {
  const user = await User.findById(req.user.id).populate('school', 'name').populate('subject', 'name').populate('class', 'name').select('-password');
  res.json({ success: true, user });
};

export const updateMe = async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
    const newPassword = req.body.password && String(req.body.password).length >= 6 ? req.body.password : null;
    const currentPassword = req.body.currentPassword;

    if (Object.keys(updates).length === 0 && !newPassword) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to set a new password' });
      }
      const u = await User.findById(req.user.id).select('+password');
      if (!u || !(await u.matchPassword(currentPassword))) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }
      u.password = newPassword;
      await u.save();
    }

    if (Object.keys(updates).length > 0) {
      await User.findByIdAndUpdate(req.user.id, updates);
    }
    const user = await User.findById(req.user.id)
      .populate('school', 'name')
      .populate('subject', 'name')
      .populate('class', 'name')
      .select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account with this email' });
    }
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await OTP.deleteMany({ email, purpose: 'reset_password' });
    await OTP.create({ email, code, purpose: 'reset_password', expiresAt });
    await sendOTPEmail(email, code);
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to send OTP' });
  }
};

export const verifyOTPAndResetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const otp = await OTP.findOne({ email, purpose: 'reset_password', used: false }).sort({ createdAt: -1 });
    if (!otp || otp.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    if (new Date() > otp.expiresAt) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.password = newPassword;
    await user.save();
    otp.used = true;
    await otp.save();
    await sendPasswordResetConfirmation(email);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Reset failed' });
  }
};
