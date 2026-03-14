import mongoose from 'mongoose';
import LessonNote from '../models/LessonNote.js';

const SUMMARY_MAX = 5;
const SUMMARY_ITEM_MAX_LEN = 120;
const RECALL_VALUES = [1, 2, 3, 4];

function isValidId(id) {
  return id && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

/** POST /lesson-notes — create new lesson note (student only). Body: { subjectId, lessonTitle? } */
export const create = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can create lesson notes' });
    }
    const { subjectId, lessonTitle } = req.body || {};
    if (!isValidId(subjectId)) {
      return res.status(400).json({ success: false, message: 'Valid subjectId required' });
    }
    const note = await LessonNote.create({
      user: req.user._id,
      subject: subjectId,
      lessonTitle: (lessonTitle && String(lessonTitle).trim()) || 'New lesson',
      summary: ['', '', '', '', ''],
      key_terms: [],
      self_test: [],
      confidence_score: 0,
      recall_scores: [],
    });
    const populated = await LessonNote.findById(note._id).populate('subject', 'name').lean();
    res.status(201).json({ success: true, note: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create lesson note' });
  }
};

/** GET /lesson-notes?subjectId= — list current user's notes for subject */
export const list = async (req, res) => {
  try {
    const { subjectId } = req.query;
    if (!isValidId(subjectId)) {
      return res.status(400).json({ success: false, message: 'Valid subjectId required' });
    }
    const filter = { subject: subjectId, user: req.user._id };
    const notes = await LessonNote.find(filter)
      .populate('subject', 'name')
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ success: true, notes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to list lesson notes' });
  }
};

/** GET /lesson-notes/:id — get one (owner or teacher view) */
export const getOne = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ success: false, message: 'Invalid note id' });
    const note = await LessonNote.findById(id).populate('subject', 'name').lean();
    if (!note) return res.status(404).json({ success: false, message: 'Lesson note not found' });
    const isOwner = note.user && String(note.user) === String(req.user._id);
    const canView = isOwner || req.user.role === 'teacher' || req.user.role === 'school_admin' || req.user.role === 'super_admin';
    if (!canView) return res.status(403).json({ success: false, message: 'Not authorized to view this note' });
    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load lesson note' });
  }
};

/** PUT /lesson-notes/:id — update (student owner only). Body: full note payload. */
export const update = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can edit lesson notes' });
    }
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ success: false, message: 'Invalid note id' });
    const doc = await LessonNote.findOne({ _id: id, user: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: 'Lesson note not found' });

    const { lessonTitle, summary, key_terms, self_test, confidence_score, free_notes, recall_scores } = req.body || {};

    if (lessonTitle !== undefined) doc.lessonTitle = String(lessonTitle).trim() || 'New lesson';

    if (summary !== undefined) {
      if (!Array.isArray(summary) || summary.length > SUMMARY_MAX) {
        return res.status(400).json({ success: false, message: `Summary must be an array of at most ${SUMMARY_MAX} strings` });
      }
      doc.summary = summary.slice(0, SUMMARY_MAX).map((s) => String(s ?? '').slice(0, SUMMARY_ITEM_MAX_LEN));
    }

    if (key_terms !== undefined) {
      if (!Array.isArray(key_terms)) {
        return res.status(400).json({ success: false, message: 'key_terms must be an array of { term, definition }' });
      }
      doc.key_terms = key_terms
        .filter((k) => k && (k.term || k.definition))
        .map((k) => ({ term: String(k.term ?? '').trim(), definition: String(k.definition ?? '').trim() }));
    }

    if (self_test !== undefined) {
      if (!Array.isArray(self_test)) {
        return res.status(400).json({ success: false, message: 'self_test must be an array of { question, answer }' });
      }
      doc.self_test = self_test
        .filter((s) => s && (s.question || s.answer))
        .map((s) => ({ question: String(s.question ?? '').trim(), answer: String(s.answer ?? '').trim() }));
    }

    if (confidence_score !== undefined) {
      const n = Number(confidence_score);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        return res.status(400).json({ success: false, message: 'confidence_score must be 0–100' });
      }
      doc.confidence_score = Math.round(n);
    }

    if (free_notes !== undefined) doc.free_notes = String(free_notes ?? '').trim();

    if (recall_scores !== undefined) {
      if (!Array.isArray(recall_scores) || recall_scores.some((r) => !RECALL_VALUES.includes(Number(r)))) {
        return res.status(400).json({ success: false, message: 'recall_scores must be an array of 1, 2, 3, or 4' });
      }
      doc.recall_scores = recall_scores.map((r) => Number(r));
    }

    await doc.save();
    const populated = await LessonNote.findById(doc._id).populate('subject', 'name').lean();
    res.json({ success: true, note: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update lesson note' });
  }
};

/** DELETE /lesson-notes/:id — delete (student owner only). */
export const remove = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can delete their own lesson notes' });
    }
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ success: false, message: 'Invalid note id' });
    const doc = await LessonNote.findOne({ _id: id, user: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: 'Lesson note not found' });
    await LessonNote.deleteOne({ _id: id });
    res.json({ success: true, message: 'Lesson note deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete lesson note' });
  }
};
