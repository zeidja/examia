import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true },
    code: { type: String, required: true },
    purpose: { type: String, enum: ['reset_password', 'verify_email'], default: 'reset_password' },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

otpSchema.index({ email: 1, purpose: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('OTP', otpSchema);
