import mongoose from 'mongoose';

const keyTermSchema = new mongoose.Schema(
  { term: { type: String, required: true, trim: true }, definition: { type: String, required: true, trim: true } },
  { _id: false }
);

const selfTestItemSchema = new mongoose.Schema(
  { question: { type: String, required: true, trim: true }, answer: { type: String, required: true, trim: true } },
  { _id: false }
);

const lessonNoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    lessonTitle: { type: String, default: 'New lesson', trim: true },
    summary: {
      type: [String],
      default: () => ['', '', '', '', ''],
      validate: {
        validator: (v) => Array.isArray(v) && v.length <= 5,
        message: 'Summary must have at most 5 items',
      },
    },
    key_terms: { type: [keyTermSchema], default: [] },
    self_test: { type: [selfTestItemSchema], default: [] },
    confidence_score: { type: Number, default: 0, min: 0, max: 100 },
    /** Free-form text: student can type whatever they want. */
    free_notes: { type: String, default: '', trim: true },
    recall_scores: {
      type: [Number],
      default: [],
      validate: {
        validator: (v) => !v.some((n) => n < 1 || n > 4),
        message: 'Recall scores must be 1–4',
      },
    },
  },
  { timestamps: true }
);

lessonNoteSchema.index({ user: 1, subject: 1 });
lessonNoteSchema.index({ subject: 1 });

export default mongoose.model('LessonNote', lessonNoteSchema);
