import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    description: { type: String, default: '' },
    materialsPath: { type: String, default: '' },
    /** When true, subject shows only Internal Assessment (Feedback, Ideas); no materials, quizzes, flashcards, notes, insights. */
    iaOnly: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subjectSchema.index({ name: 'text' });
export default mongoose.model('Subject', subjectSchema);
