import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

/** Parse stored content as flash cards (JSON array with front/back or question/answer) */
function parseFlashCards(content) {
  if (!content || typeof content !== 'string') return null;
  let str = content.trim();
  const codeBlock = str.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (codeBlock) str = codeBlock[1].trim();
  try {
    const data = JSON.parse(str);
    if (!Array.isArray(data) || data.length === 0) return null;
    const cards = data.map((c) => {
      if (!c) return null;
      const front = c.front ?? c.question ?? '';
      const back = c.back ?? c.answer ?? '';
      return { front: String(front), back: String(back) };
    }).filter(Boolean);
    return cards.length ? cards : null;
  } catch {
    return null;
  }
}

/** Parse stored content as quiz (JSON with questions array: question, options[], correct index) */
function parseQuiz(content) {
  if (!content || typeof content !== 'string') return null;
  let str = content.trim();
  const codeBlock = str.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (codeBlock) str = codeBlock[1].trim();
  try {
    const data = JSON.parse(str);
    const questions = Array.isArray(data) ? data : (data?.questions ?? null);
    if (!questions || !questions.length) return null;
    const normalized = questions.map((q, i) => {
      if (!q || !q.question) return null;
      const opts = Array.isArray(q.options) ? q.options : [];
      const correct = typeof q.correct === 'number' ? q.correct : 0;
      return { question: String(q.question), options: opts.map((o) => String(o)), correct };
    }).filter(Boolean);
    return normalized.length ? normalized : null;
  } catch {
    return null;
  }
}

const RATING_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const RATING_COLORS = {
  easy: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600',
  medium: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600',
  hard: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600',
};
const RATING_BADGE_COLORS = {
  easy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  hard: 'bg-rose-100 text-rose-800 border-rose-200',
};

/** Spaced repetition: Hard → 1 min, Medium → 1 day, Easy → 3 days. Build session = due + new cards. */
function buildSessionDeck(cardsLength, ratingsByIndex) {
  const now = new Date();
  const due = [];
  const newCards = [];
  for (let i = 0; i < cardsLength; i++) {
    const info = ratingsByIndex[i];
    if (!info) {
      newCards.push(i);
      continue;
    }
    const next = info.nextReviewAt ? new Date(info.nextReviewAt) : null;
    if (!next || next <= now) due.push(i);
  }
  return [...due, ...newCards];
}

/** Anki-style flash card viewer with spaced repetition for students. */
function FlashCardViewer({ cards, resourceId }) {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const [ratingDetails, setRatingDetails] = useState({}); // { [cardIndex]: { rating, nextReviewAt } }
  const [sessionDeck, setSessionDeck] = useState([]); // indices to review this session
  const [sessionPosition, setSessionPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const hardRevisitRef = useRef(null);

  const totalCards = cards?.length ?? 0;
  const index = isStudent && sessionDeck.length > 0
    ? sessionDeck[Math.min(sessionPosition, sessionDeck.length - 1)]
    : sessionPosition;
  const card = cards?.[index];
  const currentRating = ratingDetails[index]?.rating;
  const sessionSize = isStudent ? sessionDeck.length : totalCards;
  const positionInSession = isStudent ? sessionPosition + 1 : index + 1;
  const revisionComplete = isStudent && sessionDeck.length === 0 && totalCards > 0;

  useEffect(() => {
    if (!resourceId || !isStudent) return;
    api.get(`/resources/${resourceId}/flash-card-ratings`).then((r) => {
      const raw = r.data.ratings || {};
      const byIndex = {};
      Object.keys(raw).forEach((k) => {
        const v = raw[k];
        byIndex[Number(k)] = typeof v === 'string' ? { rating: v, nextReviewAt: null } : v;
      });
      setRatingDetails(byIndex);
      setSessionDeck(buildSessionDeck(totalCards, byIndex));
      setSessionPosition(0);
    }).catch(() => {});
  }, [resourceId, isStudent, totalCards]);

  useEffect(() => {
    return () => {
      if (hardRevisitRef.current) clearTimeout(hardRevisitRef.current);
    };
  }, []);

  const goPrev = () => {
    setFlipped(false);
    if (isStudent && sessionDeck.length > 0) {
      setSessionPosition((p) => (p <= 0 ? sessionDeck.length - 1 : p - 1));
    } else {
      setSessionPosition((p) => (p <= 0 ? totalCards - 1 : p - 1));
    }
  };

  const goNext = () => {
    setFlipped(false);
    if (isStudent && sessionDeck.length > 0) {
      setSessionPosition((p) => (p >= sessionDeck.length - 1 ? 0 : p + 1));
    } else {
      setSessionPosition((p) => (p >= totalCards - 1 ? 0 : p + 1));
    }
  };

  const handleRate = async (rating) => {
    if (!resourceId || !isStudent || savingRating || card == null) return;
    const cardIndex = index;
    setSavingRating(true);
    try {
      const { data } = await api.post(`/resources/${resourceId}/flash-card-ratings`, { cardIndex, rating });
      setRatingDetails((prev) => ({
        ...prev,
        [cardIndex]: {
          rating: data.rating,
          nextReviewAt: data.nextReviewAt || null,
        },
      }));

      if (isStudent && sessionDeck.length > 0) {
        const newDeck = sessionDeck.filter((_, i) => i !== sessionPosition);
        const newPos = sessionPosition >= newDeck.length ? Math.max(0, newDeck.length - 1) : sessionPosition;
        setSessionDeck(newDeck);
        setSessionPosition(newPos);

        if (rating === 'hard') {
          hardRevisitRef.current = setTimeout(() => {
            setSessionDeck((prev) => [...prev, cardIndex]);
            hardRevisitRef.current = null;
          }, 60 * 1000);
        }
      } else {
        goNext();
      }
    } catch (err) {
      // keep current card on error
    } finally {
      setSavingRating(false);
    }
  };

  if (revisionComplete) {
    const nextReviews = [];
    const now = new Date();
    Object.entries(ratingDetails).forEach(([idx, info]) => {
      if (!info.nextReviewAt) return;
      const at = new Date(info.nextReviewAt);
      if (at > now) nextReviews.push({ index: Number(idx), at });
    });
    nextReviews.sort((a, b) => a.at - b.at);

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="bg-white rounded-2xl border-2 border-examia-soft/30 shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 className="text-xl font-bold text-examia-dark mb-2">Revision complete</h3>
          <p className="text-examia-mid text-sm mb-6">
            You’ve gone through all cards due for now. Rate cards as Hard / Medium / Easy to see them again in 1 min, 1 day, or 3 days.
          </p>
          {nextReviews.length > 0 && (
            <div className="text-left rounded-xl bg-examia-bg/80 border border-examia-soft/30 p-4 mb-6">
              <p className="text-xs font-semibold text-examia-mid uppercase tracking-wider mb-3">Next review</p>
              <ul className="space-y-2 text-sm">
                {nextReviews.slice(0, 5).map(({ index: idx, at }) => (
                  <li key={idx} className="flex justify-between gap-2">
                    <span className="text-examia-dark">Card {idx + 1}</span>
                    <span className="text-examia-mid">{at.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
                {nextReviews.length > 5 && <li className="text-examia-mid">+{nextReviews.length - 5} more</li>}
              </ul>
            </div>
          )}
          <p className="text-examia-mid text-xs">Come back later to revise. New and due cards will appear automatically.</p>
        </div>
      </motion.div>
    );
  }

  if (!card) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <span className="text-sm text-examia-mid">
          Card {positionInSession} of {sessionSize}
          {isStudent && sessionSize < totalCards && (
            <span className="ml-2 text-examia-soft">({totalCards - sessionSize} later)</span>
          )}
        </span>
        {isStudent && (
          <span className="text-xs text-examia-mid">
            Hard → 1 min · Medium → 1 day · Easy → 3 days
          </span>
        )}
      </div>
      <motion.div
        key={index}
        className="cursor-pointer min-h-[260px] relative"
        style={{ perspective: '1000px' }}
        onClick={() => setFlipped((f) => !f)}
      >
        {isStudent && currentRating && (
          <span
            className={`absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg text-xs font-semibold border ${RATING_BADGE_COLORS[currentRating]}`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            {RATING_LABELS[currentRating]}
          </span>
        )}
        <motion.div
          className="relative w-full min-h-[260px]"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          <div
            className="absolute inset-0 rounded-2xl bg-white border-2 border-examia-soft/50 shadow-xl flex flex-col items-center justify-center p-8"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <p className="text-xs font-semibold text-examia-mid uppercase tracking-wider mb-3">Question</p>
            <p className="text-examia-dark text-lg font-medium text-center whitespace-pre-wrap leading-relaxed">{card.front || '—'}</p>
          </div>
          <div
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-8"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(145deg, #27374D 0%, #526D82 100%)',
              color: '#fff',
              boxShadow: '0 25px 50px -12px rgba(39, 55, 77, 0.35)',
            }}
          >
            <p className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3">Answer</p>
            <p className="text-white text-lg font-medium text-center whitespace-pre-wrap leading-relaxed">{card.back || '—'}</p>
          </div>
        </motion.div>
      </motion.div>
      <p className="text-center text-examia-mid text-sm mt-3">Click the card to flip</p>

      {isStudent && flipped && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex flex-wrap items-center justify-center gap-3"
        >
          <span className="text-xs font-medium text-examia-mid w-full text-center mb-1">How well did you know this?</span>
          {['hard', 'medium', 'easy'].map((r) => (
            <button
              key={r}
              type="button"
              disabled={savingRating}
              onClick={(e) => { e.stopPropagation(); handleRate(r); }}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm border transition-all disabled:opacity-50 ${RATING_COLORS[r]}`}
            >
              {RATING_LABELS[r]}
            </button>
          ))}
        </motion.div>
      )}

      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="px-5 py-2.5 rounded-xl bg-examia-soft/30 text-examia-dark font-medium hover:bg-examia-soft/50 transition-colors"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

/** Results view from attempt.results (API shape: questionText, options, correctIndex, selectedIndex, rationale) */
function QuizResultsView({ score, maxScore, results, alreadyAttempted }) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border-2 border-examia-soft/50 shadow-xl p-8 text-center">
        {alreadyAttempted && (
          <p className="text-examia-mid text-sm mb-2">You have already attempted this quiz. One attempt per student.</p>
        )}
        <h3 className="text-xl font-bold text-examia-dark mb-2">Quiz complete</h3>
        <p className="text-4xl font-bold text-examia-dark mb-1">{score} / {maxScore}</p>
        <p className="text-examia-mid mb-6">{pct}% correct</p>
        <div className="space-y-4 text-left max-h-[50vh] overflow-y-auto">
          {(results || []).map((r, i) => {
            const answeredThis = r.selectedIndex >= 0;
            const isCorrect = answeredThis && r.selectedIndex === r.correctIndex;
            const opts = r.options || [];
            return (
              <div
                key={i}
                className={`p-4 rounded-xl border-2 ${
                  !answeredThis ? 'bg-examia-soft/20 border-examia-soft/50' : isCorrect ? 'bg-green-50/80 border-green-200' : 'bg-red-50/80 border-red-200'
                }`}
              >
                <p className="font-medium text-examia-dark mb-2">Q{r.questionIndex + 1}: {r.questionText}</p>
                <p className="text-sm">
                  {!answeredThis ? (
                    <span className="text-examia-mid">Skipped</span>
                  ) : isCorrect ? (
                    <span className="text-green-700">Your answer (correct): {opts[r.selectedIndex] ?? '—'}</span>
                  ) : (
                    <>
                      <span className="text-red-700">Your answer: {opts[r.selectedIndex] ?? '—'}</span>
                      <br />
                      <span className="text-green-700">Correct: {opts[r.correctIndex] ?? '—'}</span>
                      {r.rationale && (
                        <>
                          <br />
                          <span className="text-examia-mid italic">Tip: {r.rationale}</span>
                        </>
                      )}
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/** Student quiz UI: one question at a time, select answer, submit once to API */
function QuizViewer({ questions, resourceId }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedResult, setSubmittedResult] = useState(null); // { score, maxScore, results } from API

  const current = questions[index];
  const total = questions.length;
  const selectedForCurrent = selected[index];
  const isLast = index === total - 1;

  const goPrev = () => setIndex((i) => (i <= 0 ? total - 1 : i - 1));
  const goNext = () => setIndex((i) => (i >= total - 1 ? 0 : i + 1));
  const selectOption = (optionIndex) => setSelected((s) => ({ ...s, [index]: optionIndex }));

  const handleSeeResults = async () => {
    if (!resourceId || selectedForCurrent === undefined) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const answers = questions.map((_, i) => selected[i] ?? -1);
      const { data } = await api.post(`/resources/${resourceId}/quiz-attempt`, { answers });
      setSubmittedResult({ score: data.score, maxScore: data.maxScore, results: data.results || [] });
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedResult) {
    return <QuizResultsView score={submittedResult.score} maxScore={submittedResult.maxScore} results={submittedResult.results} alreadyAttempted={false} />;
  }

  if (!current) return null;

  const options = current.options || [];
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center text-sm text-examia-mid mb-4">
        Question {index + 1} of {total}
      </div>
      <motion.div
        key={index}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl border-2 border-examia-soft/50 shadow-xl overflow-hidden"
      >
        <div className="p-6 sm:p-8 border-b border-examia-soft/30 bg-examia-bg/50">
          <p className="text-examia-dark text-lg font-medium leading-relaxed">{current.question}</p>
        </div>
        <div className="p-6 sm:p-8 space-y-3">
          {options.map((opt, j) => {
            const isSelected = selectedForCurrent === j;
            return (
              <button
                key={j}
                type="button"
                onClick={() => selectOption(j)}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                  isSelected
                    ? 'border-examia-dark bg-examia-dark text-white'
                    : 'border-examia-soft/50 bg-white text-examia-dark hover:border-examia-mid hover:bg-examia-soft/20'
                }`}
              >
                <span className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 border-current">
                  {letters[j] ?? j + 1}
                </span>
                <span className="font-medium">{opt}</span>
              </button>
            );
          })}
        </div>
      </motion.div>
      {submitError && (
        <p className="text-center text-red-600 text-sm mt-2">{submitError}</p>
      )}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={goPrev}
          className="px-5 py-2.5 rounded-xl bg-examia-soft/30 text-examia-dark font-medium hover:bg-examia-soft/50 transition-colors"
        >
          ← Previous
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={handleSeeResults}
            disabled={selectedForCurrent === undefined || submitting}
            className="px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : selectedForCurrent !== undefined ? 'Submit & see results' : 'Select an answer to finish'}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition-colors"
          >
            Next →
          </button>
        )}
      </div>
      {selectedForCurrent !== undefined && !isLast && (
        <p className="text-center text-examia-mid text-sm mt-3">You can change your answer and use Next to continue. You can only attempt this quiz once.</p>
      )}
    </div>
  );
}

export function ContentView() {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizAttempt, setQuizAttempt] = useState(null);
  const [attemptLoading, setAttemptLoading] = useState(false);

  useEffect(() => {
    api.get(`/resources/${id}`).then((r) => setResource(r.data.resource)).catch(() => setResource(null)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !resource || resource.type !== 'quiz') return;
    setAttemptLoading(true);
    api.get(`/resources/${id}/quiz-attempt`).then((r) => setQuizAttempt(r.data.attempt || null)).catch(() => setQuizAttempt(null)).finally(() => setAttemptLoading(false));
  }, [id, resource?.type]);

  const flashCards = useMemo(() => resource?.type === 'flash_cards' ? parseFlashCards(resource?.content) : null, [resource]);
  const quizQuestions = useMemo(() => resource?.type === 'quiz' ? parseQuiz(resource?.content) : null, [resource]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
      </div>
    );
  }
  if (!resource) {
    return (
      <div className="text-center py-12">
        <p className="text-examia-mid">Content not found.</p>
        <Link to="/content" className="text-examia-mid font-medium mt-2 inline-block">Back to My content</Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link to="/content" className="text-sm text-examia-mid hover:text-examia-dark font-medium mb-4 inline-block">← Back to My content</Link>
      <h1 className="text-2xl font-bold text-examia-dark mb-2">{resource.title}</h1>
      {resource.description && <p className="text-examia-mid mb-6">{resource.description}</p>}

      {resource.type === 'flash_cards' && flashCards && flashCards.length > 0 ? (
        <FlashCardViewer cards={flashCards} resourceId={resource._id} />
      ) : resource.type === 'quiz' && quizQuestions && quizQuestions.length > 0 ? (
        attemptLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-2 border-examia-mid border-t-transparent" /></div>
        ) : quizAttempt ? (
          <QuizResultsView score={quizAttempt.score} maxScore={quizAttempt.maxScore} results={quizAttempt.results || []} alreadyAttempted />
        ) : (
          <QuizViewer questions={quizQuestions} resourceId={id} />
        )
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/30">
          <pre className="whitespace-pre-wrap text-sm text-examia-dark font-sans overflow-x-auto max-h-[70vh] overflow-y-auto">
            {resource.content || 'No content.'}
          </pre>
        </div>
      )}
    </motion.div>
  );
}
