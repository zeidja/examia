import mongoose from 'mongoose';
import TeacherResource from '../models/TeacherResource.js';
import QuizAttempt from '../models/QuizAttempt.js';
import FlashCardRating from '../models/FlashCardRating.js';
import Class from '../models/Class.js';

function isValidObjectId(id) {
  return id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

/** GET /insights/subject/:subjectId — student only. Quiz scores, flash card ratings, wrong-answer bank for this subject. */
export const getSubjectInsights = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can view subject insights' });
    }
    const subjectId = req.params.subjectId;
    if (!isValidObjectId(subjectId)) {
      return res.status(400).json({ success: false, message: 'Invalid subject ID' });
    }

    const classId = req.user.class?._id || req.user.class;
    let schoolId = req.user.school?._id || req.user.school;
    if (!schoolId && classId) {
      const cls = await Class.findById(classId).select('school').lean();
      if (cls) schoolId = cls.school;
    }
    const resourceFilter = { published: true, subject: subjectId };
    if (schoolId) resourceFilter.school = schoolId;
    if (classId) {
      resourceFilter.$or = [{ class: classId }, { class: null }];
    } else {
      resourceFilter.class = null;
    }

    const resources = await TeacherResource.find(resourceFilter)
      .select('_id title type')
      .lean();

    const quizResources = resources.filter((r) => r.type === 'quiz');
    const flashCardResources = resources.filter((r) => r.type === 'flash_cards');
    const quizIds = quizResources.map((r) => r._id);
    const flashCardIds = flashCardResources.map((r) => r._id);

    const [attempts, allRatings] = await Promise.all([
      quizIds.length > 0
        ? QuizAttempt.find({ resource: { $in: quizIds }, student: req.user._id })
            .populate('resource', 'title type')
            .lean()
        : [],
      flashCardIds.length > 0
        ? FlashCardRating.find({ resource: { $in: flashCardIds }, student: req.user._id }).lean()
        : [],
    ]);

    const resourceTitleById = {};
    resources.forEach((r) => { resourceTitleById[r._id.toString()] = r.title; });

    const quizSummary = [];
    const wrongAnswerBank = [];
    let totalScore = 0;
    let totalMaxScore = 0;

    attempts.forEach((a) => {
      const rid = (a.resource && (a.resource._id || a.resource))?.toString?.() || a.resource?.toString?.();
      const title = (a.resource && a.resource.title) || resourceTitleById[rid] || 'Quiz';
      const results = a.results || [];
      const wrong = results.filter((r) => r.selectedIndex !== r.correctIndex && r.selectedIndex >= 0);
      totalScore += a.score ?? 0;
      totalMaxScore += a.maxScore ?? 0;
      quizSummary.push({
        resourceId: rid,
        title,
        score: a.score ?? 0,
        maxScore: a.maxScore ?? 0,
        wrongCount: wrong.length,
        totalQuestions: results.length,
      });
      wrong.forEach((r) => {
        wrongAnswerBank.push({
          resourceId: rid,
          resourceTitle: title,
          questionIndex: r.questionIndex,
          questionText: r.questionText || '',
          options: r.options || [],
          correctIndex: r.correctIndex,
          selectedIndex: r.selectedIndex,
          rationale: r.rationale || '',
        });
      });
    });

    const flashByResource = {};
    flashCardResources.forEach((r) => {
      flashByResource[r._id.toString()] = { resourceId: r._id.toString(), title: r.title, easy: 0, medium: 0, hard: 0 };
    });
    let totalEasy = 0;
    let totalMedium = 0;
    let totalHard = 0;
    allRatings.forEach((r) => {
      const rid = (r.resource && (r.resource._id || r.resource))?.toString?.() || r.resource?.toString?.();
      if (flashByResource[rid]) {
        flashByResource[rid][r.rating] += 1;
        if (r.rating === 'easy') totalEasy += 1;
        else if (r.rating === 'medium') totalMedium += 1;
        else totalHard += 1;
      }
    });

    const flashCardSummary = {
      byResource: Object.values(flashByResource),
      totalEasy,
      totalMedium,
      totalHard,
    };

    return res.json({
      success: true,
      quizSummary,
      totalQuizScore: totalScore,
      totalQuizMaxScore: totalMaxScore,
      flashCardSummary,
      wrongAnswerBank,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load insights' });
  }
};
