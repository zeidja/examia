import mongoose from 'mongoose';
import QuizAttempt from '../models/QuizAttempt.js';
import TeacherResource from '../models/TeacherResource.js';
import { generateQuizReportTips } from '../services/openaiService.js';

function isValidObjectId(id) {
  return id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

/** Parse quiz content (JSON with questions array). Returns array of { question, options, correct, rationale? }. */
function parseQuizContent(content) {
  if (!content || typeof content !== 'string') return null;
  let str = content.trim();
  const codeBlock = str.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (codeBlock) str = codeBlock[1].trim();
  try {
    const data = JSON.parse(str);
    const questions = Array.isArray(data) ? data : (data?.questions ?? null);
    if (!questions || !questions.length) return null;
    return questions.map((q) => ({
      question: String(q.question ?? ''),
      options: Array.isArray(q.options) ? q.options.map((o) => String(o)) : [],
      correct: typeof q.correct === 'number' ? q.correct : 0,
      rationale: typeof q.rationale === 'string' ? q.rationale : '',
    }));
  } catch {
    return null;
  }
}

/** GET /resources/:id/quiz-attempt — current user's attempt for this quiz (student sees if already attempted) */
export const getMyQuizAttempt = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Resource not found' });
    const resource = await TeacherResource.findById(req.params.id).lean();
    if (!resource || resource.type !== 'quiz') return res.status(404).json({ success: false, message: 'Resource not found' });
    if (req.user.role === 'student') {
      const resourceClassId = (resource.class && (resource.class._id || resource.class))?.toString?.() ?? null;
      const userClassId = (req.user.class && (req.user.class._id || req.user.class))?.toString?.() ?? null;
      if (!resource.published) return res.status(404).json({ success: false, message: 'Resource not found' });
      if (resourceClassId != null && resourceClassId !== userClassId) return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    const attempt = await QuizAttempt.findOne({ resource: req.params.id, student: req.user._id })
      .populate('resource', 'title type')
      .lean();
    return res.json({ success: true, attempt: attempt || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /resources/:id/quiz-attempt — submit quiz (one attempt per student) */
export const submitQuizAttempt = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Only students can submit quiz attempts' });
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Resource not found' });
    const resource = await TeacherResource.findById(req.params.id).lean();
    if (!resource || resource.type !== 'quiz') return res.status(404).json({ success: false, message: 'Resource not found' });
    if (!resource.published) return res.status(403).json({ success: false, message: 'Quiz is not published' });
    const resourceClassId = (resource.class && (resource.class._id || resource.class))?.toString?.() ?? null;
    const userClassId = (req.user.class && (req.user.class._id || req.user.class))?.toString?.() ?? null;
    if (resourceClassId != null && resourceClassId !== userClassId) return res.status(403).json({ success: false, message: 'Not assigned to your class' });

    const existing = await QuizAttempt.findOne({ resource: req.params.id, student: req.user._id });
    if (existing) return res.status(403).json({ success: false, message: 'You have already attempted this quiz once.' });

    const questions = parseQuizContent(resource.content);
    if (!questions || !questions.length) return res.status(400).json({ success: false, message: 'Quiz has no valid questions' });

    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const maxScore = questions.length;
    let score = 0;
    const results = questions.map((q, i) => {
      const selectedIndex = typeof answers[i] === 'number' && answers[i] >= 0 ? answers[i] : -1;
      const correct = selectedIndex >= 0 && selectedIndex === q.correct;
      if (correct) score++;
      return {
        questionIndex: i,
        questionText: q.question,
        options: q.options,
        correctIndex: q.correct,
        selectedIndex: selectedIndex >= 0 ? selectedIndex : -1,
        rationale: q.rationale || '',
      };
    });

    const attempt = await QuizAttempt.create({
      student: req.user._id,
      resource: req.params.id,
      answers: questions.map((_, i) => (typeof answers[i] === 'number' ? answers[i] : -1)),
      score,
      maxScore,
      results,
    });

    const populated = await QuizAttempt.findById(attempt._id)
      .populate('resource', 'title type')
      .lean();

    return res.json({
      success: true,
      attempt: populated,
      score,
      maxScore,
      results: populated.results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /resources/:id/quiz-attempts — list attempts for this quiz (teacher report) */
export const getQuizAttemptsForResource = async (req, res) => {
  try {
    if (!['teacher', 'school_admin', 'super_admin'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Not authorized' });
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Resource not found' });
    const resource = await TeacherResource.findById(req.params.id).lean();
    if (!resource || resource.type !== 'quiz') return res.status(404).json({ success: false, message: 'Resource not found' });
    if (req.user.role === 'teacher' && (resource.createdBy?.toString?.() || resource.createdBy)?.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your resource' });

    const attempts = await QuizAttempt.find({ resource: req.params.id })
      .populate('student', 'name email')
      .sort({ submittedAt: -1 })
      .lean();

    return res.json({ success: true, attempts, resourceTitle: resource.title });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Build a text summary of quiz attempts for AI (what to focus on, how to improve). */
function buildAttemptSummary(resourceTitle, attempts) {
  if (!attempts || !attempts.length) return `Quiz: ${resourceTitle || 'Quiz'}. No attempts yet.`;
  const maxScore = attempts[0]?.maxScore ?? 0;
  const totalAttempts = attempts.length;
  const avgScore = attempts.reduce((s, a) => s + a.score, 0) / totalAttempts;
  const avgPct = maxScore > 0 ? Math.round((avgScore / maxScore) * 100) : 0;
  let summary = `Quiz: ${resourceTitle || 'Quiz'}\nTotal attempts: ${totalAttempts}\nAverage score: ${avgScore.toFixed(1)}/${maxScore} (${avgPct}%)\n\n`;

  const numQuestions = maxScore;
  for (let qIdx = 0; qIdx < numQuestions; qIdx++) {
    let correctCount = 0;
    const wrongAnswers = {};
    let questionText = '';
    attempts.forEach((a) => {
      const r = (a.results || []).find((r) => r.questionIndex === qIdx);
      if (!r) return;
      questionText = questionText || r.questionText || '';
      if (r.selectedIndex >= 0 && r.selectedIndex === r.correctIndex) correctCount++;
      else if (r.selectedIndex >= 0) {
        const opt = (r.options || [])[r.selectedIndex] ?? '—';
        wrongAnswers[opt] = (wrongAnswers[opt] || 0) + 1;
      }
    });
    const missedBy = totalAttempts - correctCount;
    summary += `Question ${qIdx + 1}: "${(questionText || '').slice(0, 120)}..."\n`;
    summary += `  Correct: ${correctCount}/${totalAttempts} students.`;
    if (missedBy > 0 && Object.keys(wrongAnswers).length > 0) {
      const common = Object.entries(wrongAnswers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([opt, n]) => `"${opt}" (${n})`)
        .join(', ');
      summary += ` Missed by ${missedBy}. Common wrong answers: ${common}.`;
    }
    summary += '\n\n';
  }
  return summary;
}

/** GET /resources/:id/quiz-report-tips — AI-generated tips for teacher (focus areas + how to improve) */
export const getQuizReportTips = async (req, res) => {
  try {
    if (!['teacher', 'school_admin', 'super_admin'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Not authorized' });
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Resource not found' });
    const resource = await TeacherResource.findById(req.params.id).lean();
    if (!resource || resource.type !== 'quiz') return res.status(404).json({ success: false, message: 'Resource not found' });
    if (req.user.role === 'teacher' && (resource.createdBy?.toString?.() || resource.createdBy)?.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not your resource' });

    const attempts = await QuizAttempt.find({ resource: req.params.id })
      .populate('student', 'name email')
      .lean();

    const summary = buildAttemptSummary(resource.title, attempts);
    const tips = await generateQuizReportTips(summary);
    return res.json({ success: true, tips: tips || '' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
