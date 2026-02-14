import mongoose from 'mongoose';

const studentIdeaSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

studentIdeaSchema.index({ student: 1, subject: 1 });
studentIdeaSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model('StudentIdea', studentIdeaSchema);
