import mongoose from 'mongoose';
import TeacherResource from '../models/TeacherResource.js';
import QuizAttempt from '../models/QuizAttempt.js';
import FlashCardRating from '../models/FlashCardRating.js';
import Class from '../models/Class.js';
import User from '../models/User.js';

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

const TEACHER_ROLES = ['teacher', 'school_admin', 'super_admin'];

/** GET /insights/subject/:subjectId/teacher — teacher/school_admin/super_admin. Charts for all quizzes & flashcards in subject, plus per-student summary. */
export const getTeacherSubjectInsights = async (req, res) => {
  try {
    if (!TEACHER_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only teachers and admins can view teacher insights' });
    }
    const subjectId = req.params.subjectId;
    if (!isValidObjectId(subjectId)) {
      return res.status(400).json({ success: false, message: 'Invalid subject ID' });
    }

    const schoolId = req.user.school?._id || req.user.school;
    const resourceFilter = { published: true, subject: subjectId, type: { $in: ['quiz', 'flash_cards'] } };
    if (schoolId) resourceFilter.school = schoolId;
    const resources = await TeacherResource.find(resourceFilter).select('_id title type').lean();
    const quizResources = resources.filter((r) => r.type === 'quiz');
    const flashCardResources = resources.filter((r) => r.type === 'flash_cards');
    const quizIds = quizResources.map((r) => r._id);
    const flashCardIds = flashCardResources.map((r) => r._id);

    const resourceTitleById = {};
    resources.forEach((r) => { resourceTitleById[r._id.toString()] = r.title; });

    const [attempts, allRatings] = await Promise.all([
      quizIds.length > 0 ? QuizAttempt.find({ resource: { $in: quizIds } }).populate('student', 'name').lean() : [],
      flashCardIds.length > 0 ? FlashCardRating.find({ resource: { $in: flashCardIds } }).lean() : [],
    ]);

    const quizCharts = quizResources.map((r) => {
      const rid = r._id.toString();
      const resourceAttempts = attempts.filter((a) => (a.resource && (a.resource._id || a.resource).toString()) === rid || (a.resource && a.resource.toString()) === rid);
      const totalScore = resourceAttempts.reduce((sum, a) => sum + (a.score ?? 0), 0);
      const totalMax = resourceAttempts.reduce((sum, a) => sum + (a.maxScore ?? 0), 0);
      const students = resourceAttempts.map((a) => ({
        studentId: a.student?._id || a.student,
        studentName: a.student?.name || 'Student',
        score: a.score ?? 0,
        maxScore: a.maxScore ?? 0,
        pct: a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0,
      }));
      return {
        resourceId: rid,
        title: r.title,
        attemptCount: resourceAttempts.length,
        averageScore: resourceAttempts.length > 0 ? Math.round((totalScore / resourceAttempts.length) * 10) / 10 : 0,
        maxScorePerAttempt: resourceAttempts.length > 0 ? Math.max(...resourceAttempts.map((a) => a.maxScore ?? 0)) : 0,
        totalMaxScore: totalMax,
        students,
      };
    });

    const flashCardCharts = flashCardResources.map((r) => {
      const rid = r._id.toString();
      const ratings = allRatings.filter((rr) => (rr.resource && (rr.resource._id || rr.resource).toString()) === rid || rr.resource?.toString() === rid);
      const easy = ratings.filter((rr) => rr.rating === 'easy').length;
      const medium = ratings.filter((rr) => rr.rating === 'medium').length;
      const hard = ratings.filter((rr) => rr.rating === 'hard').length;
      const uniqueStudents = new Set(ratings.map((rr) => (rr.student && rr.student.toString()) || rr.student)).size;
      return {
        resourceId: rid,
        title: r.title,
        totalRatings: ratings.length,
        easy,
        medium,
        hard,
        uniqueStudents,
      };
    });

    const studentMap = new Map();
    attempts.forEach((a) => {
      const sid = (a.student?._id || a.student)?.toString?.();
      if (!sid) return;
      const rid = (a.resource && (a.resource._id || a.resource))?.toString?.() || a.resource?.toString?.();
      if (!studentMap.has(sid)) {
        studentMap.set(sid, { studentId: sid, name: a.student?.name || 'Student', quizzes: [], flashCards: [], flashEasy: 0, flashMedium: 0, flashHard: 0 });
      }
      const rec = studentMap.get(sid);
      rec.quizzes.push({
        resourceId: rid,
        title: resourceTitleById[rid] || 'Quiz',
        score: a.score ?? 0,
        maxScore: a.maxScore ?? 0,
        pct: a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0,
      });
    });
    allRatings.forEach((r) => {
      const sid = (r.student && r.student.toString()) || r.student;
      if (!sid) return;
      const rid = (r.resource && (r.resource._id || r.resource))?.toString?.() || r.resource?.toString?.();
      if (!studentMap.has(sid)) {
        studentMap.set(sid, { studentId: sid, name: 'Student', quizzes: [], flashCards: [], flashEasy: 0, flashMedium: 0, flashHard: 0 });
      }
      const rec = studentMap.get(sid);
      if (r.rating === 'easy') rec.flashEasy += 1;
      else if (r.rating === 'medium') rec.flashMedium += 1;
      else if (r.rating === 'hard') rec.flashHard += 1;
      const existing = rec.flashCards.find((f) => f.resourceId === rid);
      if (existing) existing.ratingsCount += 1;
      else rec.flashCards.push({ resourceId: rid, title: resourceTitleById[rid] || 'Flashcards', ratingsCount: 1 });
    });
    const studentIds = Array.from(studentMap.keys());
    if (studentIds.length > 0) {
      const users = await User.find({ _id: { $in: studentIds } }).select('name').lean();
      users.forEach((u) => {
        const rec = studentMap.get(u._id.toString());
        if (rec) rec.name = u.name || rec.name;
      });
    }
    const studentSummary = Array.from(studentMap.values()).map((s) => {
      const quizPctSum = s.quizzes.reduce((sum, q) => sum + q.pct, 0);
      const quizAveragePct = s.quizzes.length > 0 ? Math.round(quizPctSum / s.quizzes.length) : null;
      const totalFlashRatings = (s.flashEasy || 0) + (s.flashMedium || 0) + (s.flashHard || 0);
      return { ...s, quizAveragePct, totalFlashRatings };
    });

    return res.json({
      success: true,
      quizCharts,
      flashCardCharts,
      studentSummary,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load teacher insights' });
  }
};

/** GET /insights/subject/:subjectId/teacher/student/:studentId — detailed view for one student in this subject. */
export const getTeacherStudentDetail = async (req, res) => {
  try {
    if (!TEACHER_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const { subjectId, studentId } = req.params;
    if (!isValidObjectId(subjectId) || !isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid subject or student ID' });
    }

    const schoolId = req.user.school?._id || req.user.school;
    const resourceFilter = { published: true, subject: subjectId, type: { $in: ['quiz', 'flash_cards'] } };
    if (schoolId) resourceFilter.school = schoolId;
    const resources = await TeacherResource.find(resourceFilter).select('_id title type').lean();
    const quizResources = resources.filter((r) => r.type === 'quiz');
    const flashCardResources = resources.filter((r) => r.type === 'flash_cards');
    const quizIds = quizResources.map((r) => r._id);
    const flashCardIds = flashCardResources.map((r) => r._id);
    const resourceTitleById = {};
    resources.forEach((r) => { resourceTitleById[r._id.toString()] = r.title; });

    const [student, attempts, allRatings] = await Promise.all([
      User.findById(studentId).select('name').lean(),
      quizIds.length > 0 ? QuizAttempt.find({ resource: { $in: quizIds }, student: studentId }).populate('resource', 'title').lean() : [],
      flashCardIds.length > 0 ? FlashCardRating.find({ resource: { $in: flashCardIds }, student: studentId }).lean() : [],
    ]);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const wrongAnswerBank = [];
    const quizAttempts = attempts.map((a) => {
      const rid = (a.resource && (a.resource._id || a.resource))?.toString?.() || a.resource?.toString?.();
      const title = (a.resource && a.resource.title) || resourceTitleById[rid] || 'Quiz';
      const results = a.results || [];
      results.forEach((r) => {
        if (r.selectedIndex >= 0 && r.selectedIndex !== r.correctIndex) {
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
        }
      });
      return {
        resourceId: rid,
        title,
        score: a.score ?? 0,
        maxScore: a.maxScore ?? 0,
        pct: a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0,
        timeSpentSeconds: a.timeSpentSeconds ?? null,
      };
    });

    let flashEasy = 0;
    let flashMedium = 0;
    let flashHard = 0;
    const flashByResource = {};
    const hardRatedCards = [];
    flashCardResources.forEach((r) => {
      flashByResource[r._id.toString()] = { resourceId: r._id.toString(), title: r.title, easy: 0, medium: 0, hard: 0 };
    });
    allRatings.forEach((r) => {
      const rid = (r.resource && (r.resource._id || r.resource))?.toString?.() || r.resource?.toString?.();
      if (r.rating === 'easy') { flashEasy += 1; if (flashByResource[rid]) flashByResource[rid].easy += 1; }
      else if (r.rating === 'medium') { flashMedium += 1; if (flashByResource[rid]) flashByResource[rid].medium += 1; }
      else if (r.rating === 'hard') {
        flashHard += 1;
        if (flashByResource[rid]) flashByResource[rid].hard += 1;
        hardRatedCards.push({
          resourceId: rid,
          resourceTitle: resourceTitleById[rid] || 'Flashcards',
          cardIndex: r.cardIndex ?? 0,
        });
      }
    });

    return res.json({
      success: true,
      student: { _id: student._id, name: student.name },
      quizAttempts,
      wrongAnswerBank,
      flashcardSummary: {
        easy: flashEasy,
        medium: flashMedium,
        hard: flashHard,
        total: flashEasy + flashMedium + flashHard,
        byResource: Object.values(flashByResource),
        hardRatedCards,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load student detail' });
  }
};
