import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, set: (v) => (v && typeof v === 'string' ? v.trim().toLowerCase() : v) },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ['super_admin', 'school_admin', 'teacher', 'student'],
      required: true,
    },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    isActive: { type: Boolean, default: true },
    avatar: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
