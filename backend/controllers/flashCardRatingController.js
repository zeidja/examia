import mongoose from 'mongoose';
import FlashCardRating from '../models/FlashCardRating.js';
import TeacherResource from '../models/TeacherResource.js';

function isValidObjectId(id) {
  return id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

/** POST /resources/:id/flash-card-ratings — student submits rating for one card (easy | medium | hard) */
export const submitRating = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can rate flash cards' });
    }
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    const resource = await TeacherResource.findById(req.params.id).lean();
    if (!resource || resource.type !== 'flash_cards') {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    const { cardIndex, rating } = req.body;
    const index = typeof cardIndex === 'number' ? cardIndex : parseInt(cardIndex, 10);
    if (Number.isNaN(index) || index < 0) {
      return res.status(400).json({ success: false, message: 'Valid cardIndex (≥ 0) is required' });
    }
    const validRating = ['easy', 'medium', 'hard'].includes(rating) ? rating : null;
    if (!validRating) {
      return res.status(400).json({ success: false, message: 'rating must be one of: easy, medium, hard' });
    }
    const nextReviewAt = FlashCardRating.getNextReviewAt(validRating);
    const doc = await FlashCardRating.findOneAndUpdate(
      { resource: req.params.id, student: req.user._id, cardIndex: index },
      { $set: { rating: validRating, nextReviewAt: nextReviewAt || undefined } },
      { new: true, upsert: true }
    );
    return res.json({
      success: true,
      rating: doc.rating,
      cardIndex: doc.cardIndex,
      nextReviewAt: doc.nextReviewAt ? doc.nextReviewAt.toISOString() : null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to save rating' });
  }
};

/** GET /resources/:id/flash-card-ratings — student: my ratings by cardIndex; teacher: aggregate stats per card */
export const getRatings = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    const resource = await TeacherResource.findById(req.params.id).lean();
    if (!resource || resource.type !== 'flash_cards') {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    if (req.user.role === 'student') {
      const ratings = await FlashCardRating.find({
        resource: req.params.id,
        student: req.user._id,
      }).lean();
      const byIndex = {};
      const now = new Date();
      ratings.forEach((r) => {
        byIndex[r.cardIndex] = {
          rating: r.rating,
          nextReviewAt: r.nextReviewAt ? r.nextReviewAt.toISOString() : null,
          ratedAt: r.updatedAt || r.createdAt,
        };
        // Backward compatibility: if no nextReviewAt, treat as due now
        if (!r.nextReviewAt) {
          byIndex[r.cardIndex].nextReviewAt = new Date(0).toISOString();
        }
      });
      return res.json({ success: true, ratings: byIndex });
    }

    if (['teacher', 'school_admin', 'super_admin'].includes(req.user.role)) {
      if (req.user.role === 'teacher' && resource.createdBy?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only view stats for your own resources' });
      }
      const ratings = await FlashCardRating.find({ resource: req.params.id })
        .populate('student', 'name email')
        .lean();
      const statsByIndex = {};
      const studentsMap = {};
      ratings.forEach((r) => {
        if (statsByIndex[r.cardIndex] == null) {
          statsByIndex[r.cardIndex] = { cardIndex: r.cardIndex, easy: 0, medium: 0, hard: 0 };
        }
        statsByIndex[r.cardIndex][r.rating] += 1;
        const sid = (r.student && (r.student._id || r.student))?.toString?.() || '';
        if (sid) {
          if (!studentsMap[sid]) {
            studentsMap[sid] = {
              studentId: sid,
              studentName: r.student?.name || r.student?.email || 'Student',
              studentEmail: r.student?.email || '',
              easy: 0,
              medium: 0,
              hard: 0,
              total: 0,
              ratingsByCard: [],
            };
          }
          studentsMap[sid][r.rating] += 1;
          studentsMap[sid].total += 1;
          studentsMap[sid].ratingsByCard.push({ cardIndex: r.cardIndex, rating: r.rating });
        }
      });
      const stats = Object.keys(statsByIndex)
        .map((k) => statsByIndex[Number(k)])
        .sort((a, b) => a.cardIndex - b.cardIndex);
      Object.values(studentsMap).forEach((stu) => {
        stu.ratingsByCard.sort((a, b) => a.cardIndex - b.cardIndex);
      });
      const students = Object.values(studentsMap).sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
      return res.json({
        success: true,
        stats,
        students,
        resourceTitle: resource.title || 'Flash cards',
      });
    }

    return res.status(403).json({ success: false, message: 'Forbidden' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to load ratings' });
  }
};
