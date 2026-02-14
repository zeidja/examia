import mongoose from 'mongoose';

const resultItemSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    questionText: { type: String, default: '' },
    options: { type: [String], default: [] },
    correctIndex: { type: Number, required: true },
    selectedIndex: { type: Number, required: true },
    rationale: { type: String, default: '' },
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resource: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherResource', required: true },
    answers: { type: [Number], required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    results: [resultItemSchema],
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

quizAttemptSchema.index({ resource: 1, student: 1 }, { unique: true });
quizAttemptSchema.index({ student: 1 });
quizAttemptSchema.index({ resource: 1 });

export default mongoose.model('QuizAttempt', quizAttemptSchema);
