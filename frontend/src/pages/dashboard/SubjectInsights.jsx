import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';

/** Student insights for a subject: quiz scores, flash card ratings, wrong-answer bank. */
export function SubjectInsights() {
  const { subjectId } = useParams();
  const { subject } = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedWrong, setExpandedWrong] = useState(new Set());

  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    setError(null);
    api
      .get(`/insights/subject/${subjectId}`)
      .then((r) => setData(r.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [subjectId]);

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
        <p className="text-sm text-examia-mid font-medium">Loading insights…</p>
      </motion.section>
    );
  }
  if (error) {
    return (
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-6 text-center">
        <p className="font-medium text-red-800">Could not load insights</p>
        <p className="text-sm text-red-700 mt-1">{error}</p>
      </motion.section>
    );
  }

  const { quizSummary = [], totalQuizScore = 0, totalQuizMaxScore = 0, flashCardSummary = {}, wrongAnswerBank = [] } = data || {};
  const { byResource: flashByResource = [], totalEasy = 0, totalMedium = 0, totalHard = 0 } = flashCardSummary;
  const totalFlash = totalEasy + totalMedium + totalHard;
  const quizPct = totalQuizMaxScore > 0 ? Math.round((totalQuizScore / totalQuizMaxScore) * 100) : 0;
  const totalWrong = wrongAnswerBank.length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-xl font-bold text-examia-dark mb-1">Insights</h2>
        <p className="text-examia-mid text-sm">Your performance and weak points in {subject?.name || 'this subject'}.</p>
      </div>

      {/* Quiz performance */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/30">
        <h3 className="text-lg font-semibold text-examia-dark mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-examia-dark/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-examia-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          </span>
          Quiz performance
        </h3>
        {quizSummary.length === 0 ? (
          <p className="text-examia-mid text-sm">No quiz attempts yet. Attempt quizzes in this subject to see your scores here.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 mb-4 p-4 rounded-xl bg-examia-soft/10 border border-examia-soft/30">
              <div>
                <p className="text-xs font-semibold text-examia-mid uppercase tracking-wider">Overall score</p>
                <p className="text-2xl font-bold text-examia-dark">{totalQuizScore} / {totalQuizMaxScore} <span className="text-lg font-semibold text-examia-mid">({quizPct}%)</span></p>
              </div>
              {totalWrong > 0 && (
                <div>
                  <p className="text-xs font-semibold text-examia-mid uppercase tracking-wider">Wrong answers</p>
                  <p className="text-2xl font-bold text-rose-600">{totalWrong}</p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {quizSummary.map((q) => {
                const pct = q.maxScore > 0 ? Math.round((q.score / q.maxScore) * 100) : 0;
                return (
                  <div key={q.resourceId} className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-examia-dark truncate">{q.title}</p>
                      <p className="text-xs text-examia-mid">{q.score} / {q.maxScore} {q.wrongCount > 0 && ` · ${q.wrongCount} wrong`}</p>
                    </div>
                    <div className="w-24 h-3 rounded-full bg-examia-soft/30 overflow-hidden flex shrink-0">
                      <div
                        className="h-full rounded-full bg-examia-dark transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-examia-dark w-10 text-right shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Flash card ratings */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/30">
        <h3 className="text-lg font-semibold text-examia-dark mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-examia-dark/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-examia-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </span>
          Flash cards — how you rated them
        </h3>
        {totalFlash === 0 ? (
          <p className="text-examia-mid text-sm">No flash card ratings yet. Study flash cards and rate them (Easy / Medium / Hard) to see your distribution here.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-emerald-800">Easy: {totalEasy}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-sm font-semibold text-amber-800">Medium: {totalMedium}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 border border-rose-200">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-sm font-semibold text-rose-800">Hard: {totalHard}</span>
              </div>
            </div>
            <div className="w-full h-4 rounded-full overflow-hidden flex bg-examia-soft/20">
              {totalFlash > 0 && (
                <>
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(totalEasy / totalFlash) * 100}%` }} title="Easy" />
                  <div className="h-full bg-amber-500 transition-all" style={{ width: `${(totalMedium / totalFlash) * 100}%` }} title="Medium" />
                  <div className="h-full bg-rose-500 transition-all" style={{ width: `${(totalHard / totalFlash) * 100}%` }} title="Hard" />
                </>
              )}
            </div>
            {flashByResource.length > 0 && (
              <div className="mt-4 pt-4 border-t border-examia-soft/30 space-y-2">
                <p className="text-xs font-semibold text-examia-mid uppercase tracking-wider mb-2">Per deck</p>
                {flashByResource.map((f) => {
                  const tot = f.easy + f.medium + f.hard;
                  if (tot === 0) return null;
                  return (
                    <div key={f.resourceId} className="flex items-center gap-3 text-sm">
                      <span className="font-medium text-examia-dark truncate min-w-0 flex-1">{f.title}</span>
                      <span className="text-emerald-700 shrink-0">{f.easy}E</span>
                      <span className="text-amber-700 shrink-0">{f.medium}M</span>
                      <span className="text-rose-700 shrink-0">{f.hard}H</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Wrong answer bank */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/30">
        <h3 className="text-lg font-semibold text-examia-dark mb-2 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </span>
          Wrong answer bank
        </h3>
        <p className="text-examia-mid text-sm mb-4">All questions you got wrong in this subject. Review them to strengthen weak points.</p>
        {wrongAnswerBank.length === 0 ? (
          <p className="text-examia-mid text-sm py-4 rounded-xl bg-examia-soft/10 border border-examia-soft/30 text-center">No wrong answers yet. Attempt quizzes to build your bank.</p>
        ) : (
          <div className="space-y-3">
            {wrongAnswerBank.map((item, i) => {
              const open = expandedWrong.has(i);
              const correctOption = item.options && item.options[item.correctIndex];
              const selectedOption = item.selectedIndex >= 0 && item.options ? item.options[item.selectedIndex] : '(not answered)';
              return (
                <div
                  key={`${item.resourceId}-${item.questionIndex}-${i}`}
                  className="rounded-xl border border-examia-soft/40 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleWrong(i)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-examia-soft/5 hover:bg-examia-soft/15 transition-colors"
                  >
                    <span className="font-medium text-examia-dark line-clamp-2 flex-1 min-w-0">Q: {item.questionText || 'Question'}</span>
                    <span className="text-xs text-examia-mid shrink-0">{item.resourceTitle}</span>
                    <svg className={`w-5 h-5 text-examia-mid shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 pt-1 border-t border-examia-soft/30 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-examia-mid uppercase tracking-wider mb-1">Your answer</p>
                        <p className="text-sm text-rose-700 font-medium">{selectedOption || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-examia-mid uppercase tracking-wider mb-1">Correct answer</p>
                        <p className="text-sm text-emerald-700 font-medium">{correctOption || '—'}</p>
                      </div>
                      {item.rationale && (
                        <div>
                          <p className="text-xs font-semibold text-examia-mid uppercase tracking-wider mb-1">Explanation</p>
                          <p className="text-sm text-examia-dark">{item.rationale}</p>
                        </div>
                      )}
                      {item.options?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-examia-mid uppercase tracking-wider mb-1">All options</p>
                          <ul className="text-sm text-examia-dark list-disc list-inside space-y-0.5">
                            {item.options.map((opt, j) => (
                              <li key={j} className={j === item.correctIndex ? 'text-emerald-700 font-medium' : j === item.selectedIndex ? 'text-rose-600' : ''}>
                                {opt}
                                {j === item.correctIndex && ' ✓'}
                                {j === item.selectedIndex && j !== item.correctIndex && ' (your choice)'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.section>
  );
}
