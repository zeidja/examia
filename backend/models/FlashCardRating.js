import mongoose from 'mongoose';

/** Spaced repetition: when to show the card again (student view). */
const REVIEW_INTERVALS_MS = {
  hard: 1 * 60 * 1000,       // 1 minute
  medium: 24 * 60 * 60 * 1000, // 1 day
  easy: 3 * 24 * 60 * 60 * 1000, // 3 days
};

const flashCardRatingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resource: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherResource', required: true },
    cardIndex: { type: Number, required: true, min: 0 },
    rating: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
    },
    /** When this card should be shown again (spaced repetition). */
    nextReviewAt: { type: Date },
  },
  { timestamps: true }
);

flashCardRatingSchema.statics.getNextReviewAt = function (rating) {
  const ms = REVIEW_INTERVALS_MS[rating];
  return ms != null ? new Date(Date.now() + ms) : null;
};

flashCardRatingSchema.index({ resource: 1, student: 1, cardIndex: 1 }, { unique: true });
flashCardRatingSchema.index({ resource: 1 });
flashCardRatingSchema.index({ student: 1 });

export default mongoose.model('FlashCardRating', flashCardRatingSchema);
