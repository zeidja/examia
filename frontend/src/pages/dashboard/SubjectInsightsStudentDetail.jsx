import { useState, useEffect } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { stripDuplicateMcqLetterPrefix } from '../../utils/format';

/** Teacher-only: detailed view for one student in a subject — quiz attempts, flashcard breakdown, wrong answers, hard cards. */
export function SubjectInsightsStudentDetail() {
  const { subjectId, studentId } = useParams();
  const { subject } = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedWrong, setExpandedWrong] = useState(new Set());

  useEffect(() => {
    if (!subjectId || !studentId) return;
    setLoading(true);
    setError(null);
    api
      .get(`/insights/subject/${subjectId}/teacher/student/${studentId}`)
      .then((r) => setData(r.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [subjectId, studentId]);

  const toggleWrong = (i) => {
    setExpandedWrong((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  if (loading) {
    return (
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading student details…</p>
      </motion.section>
    );
  }
  if (error) {
    return (
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-6 text-center">
        <p className="font-medium text-red-800">Could not load student details</p>
        <p className="text-sm text-red-700 mt-1">{error}</p>
        <Link to={`/content/subject/${subjectId}/insights`} className="inline-block mt-4 text-examia-dark font-medium underline">Back to insights</Link>
      </motion.section>
    );
  }
  if (!data?.success || !data.student) {
    return (
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-examia-soft/40 p-6 text-center">
        <p className="text-examia-mid">Student not found.</p>
        <Link to={`/content/subject/${subjectId}/insights`} className="inline-block mt-4 text-examia-dark font-medium underline">Back to insights</Link>
      </motion.section>
    );
  }

  const { student, quizAttempts = [], wrongAnswerBank = [], flashcardSummary = {} } = data;
  const { easy: flashEasy = 0, medium: flashMedium = 0, hard: flashHard = 0, total: flashTotal = 0, byResource: flashByResource = [], hardRatedCards = [] } = flashcardSummary;
  const quizAvgPct = quizAttempts.length > 0 ? Math.round(quizAttempts.reduce((s, q) => s + (q.pct || 0), 0) / quizAttempts.length) : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link to={`/content/subject/${subjectId}/insights`} className="text-examia-mid hover:text-examia-dark text-sm font-medium flex items-center gap-1">
          ← Back to insights
        </Link>
        <h2 className="text-xl font-bold text-examia-dark">{student.name} — {subject?.name || 'Subject'}</h2>
      </div>

      {/* Quiz performance */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/30">
        <h3 className="text-lg font-semibold text-examia-dark mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-examia-dark/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-examia-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          </span>
          Quiz performance
        </h3>
        {quizAttempts.length === 0 ? (
          <p className="text-examia-mid text-sm">No quiz attempts in this subject yet.</p>
        ) : (
          <>
            <p className="text-examia-mid text-sm mb-4">Average: <strong className="text-examia-dark">{quizAvgPct}%</strong></p>
            <div className="space-y-3">
              {quizAttempts.map((q) => (
                <div key={q.resourceId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-examia-soft/40 px-4 py-3">
                  <span className="font-medium text-examia-dark">{q.title}</span>
                  <span className="text-sm text-examia-mid">
                    {q.score} / {q.maxScore} — <strong>{q.pct}%</strong>
                    {q.timeSpentSeconds != null && (
                      <span className="ml-2 text-examia-mid">({Math.floor(q.timeSpentSeconds / 60)}m {q.timeSpentSeconds % 60}s)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Flashcard ratings — chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/30">
        <h3 className="text-lg font-semibold text-examia-dark mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-examia-dark/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-examia-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </span>
          Flashcard ratings
        </h3>
        {flashTotal === 0 ? (
          <p className="text-examia-mid text-sm">No flashcard ratings yet.</p>
        ) : (
          <>
            <div className="flex h-10 rounded-lg overflow-hidden bg-examia-soft/20 mb-3">
              <div className="bg-emerald-500 transition-all" style={{ width: `${(flashEasy / flashTotal) * 100}%` }} title="Easy" />
              <div className="bg-amber-500 transition-all" style={{ width: `${(flashMedium / flashTotal) * 100}%` }} title="Medium" />
              <div className="bg-rose-500 transition-all" style={{ width: `${(flashHard / flashTotal) * 100}%` }} title="Hard" />
            </div>
            <div className="flex gap-4 text-sm text-examia-mid mb-4">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Easy {flashEasy}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Medium {flashMedium}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Hard {flashHard}</span>
            </div>
            {flashByResource.length > 0 && (
              <div className="border-t border-examia-soft/30 pt-4">
                <p className="text-sm font-medium text-examia-mid mb-2">By resource</p>
                <div className="space-y-2">
                  {flashByResource.map((r) => {
                    const t = (r.easy || 0) + (r.medium || 0) + (r.hard || 0);
                    if (t === 0) return null;
                    return (
                      <div key={r.resourceId} className="text-sm">
                        <span className="font-medium text-examia-dark">{r.title}</span>
                        <span className="text-examia-mid ml-2">E: {r.easy || 0} M: {r.medium || 0} H: {r.hard || 0}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hard-rated cards */}
      {hardRatedCards.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/30">
          <h3 className="text-lg font-semibold text-examia-dark mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </span>
            Cards marked Hard
          </h3>
          <ul className="space-y-2">
            {hardRatedCards.map((c, i) => (
              <li key={`${c.resourceId}-${c.cardIndex}-${i}`} className="flex flex-wrap items-center gap-2 text-sm py-2 px-3 rounded-lg bg-rose-50/50 border border-rose-100">
                <span className="font-medium text-examia-dark">{c.resourceTitle}</span>
                <span className="text-examia-mid">Card #{c.cardIndex + 1}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Wrong answers */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/30">
        <h3 className="text-lg font-semibold text-examia-dark mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </span>
          Wrong answers ({wrongAnswerBank.length})
        </h3>
        {wrongAnswerBank.length === 0 ? (
          <p className="text-examia-mid text-sm">No wrong answers recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {wrongAnswerBank.map((w, i) => (
              <div key={i} className="rounded-xl border border-examia-soft/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleWrong(i)}
                  className="w-full text-left px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-examia-soft/5 hover:bg-examia-soft/10"
                >
                  <span className="font-medium text-examia-dark line-clamp-1">{w.resourceTitle} — Q{w.questionIndex + 1}</span>
                  <span className="text-sm text-examia-mid">{expandedWrong.has(i) ? 'Hide' : 'Show'}</span>
                </button>
                {expandedWrong.has(i) && (
                  <div className="px-4 py-3 border-t border-examia-soft/30 space-y-2 text-sm">
                    <p className="font-medium text-examia-dark">{w.questionText}</p>
                    {w.options?.length > 0 && (
                      <div className="space-y-1">
                        {w.options.map((opt, j) => (
                          <p key={j} className={j === w.correctIndex ? 'text-emerald-700 font-medium' : j === w.selectedIndex ? 'text-rose-700' : 'text-examia-mid'}>
                            {j === w.correctIndex && '✓ '}{j === w.selectedIndex && '✗ '}{String.fromCharCode(65 + j)}. {stripDuplicateMcqLetterPrefix(opt, j)}
                          </p>
                        ))}
                      </div>
                    )}
                    {w.rationale && <p className="text-examia-mid italic mt-2">{w.rationale}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}
