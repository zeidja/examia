import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';

export function QuizReport() {
  const { resourceId } = useParams();
  const [attempts, setAttempts] = useState([]);
  const [resourceTitle, setResourceTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [tips, setTips] = useState('');
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState(null);

  useEffect(() => {
    if (!resourceId) return;
    setLoading(true);
    setError(null);
    api
      .get(`/resources/${resourceId}/quiz-attempts`)
      .then((r) => {
        setAttempts(r.data.attempts || []);
        setResourceTitle(r.data.resourceTitle || 'Quiz');
      })
      .catch((err) => setError(err.response?.data?.message || err.message || 'Failed to load report'))
      .finally(() => setLoading(false));
  }, [resourceId]);

  useEffect(() => {
    if (!resourceId || attempts.length === 0) return;
    setTipsLoading(true);
    setTipsError(null);
    setTips('');
    api
      .get(`/resources/${resourceId}/quiz-report-tips`)
      .then((r) => setTips(r.data.tips || ''))
      .catch((err) => setTipsError(err.response?.data?.message || err.message || 'Could not generate tips'))
      .finally(() => setTipsLoading(false));
  }, [resourceId, attempts.length]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-2">{error}</p>
        <Link to="/resources" className="text-examia-mid font-medium hover:text-examia-dark">← Back to My resources</Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Link to="/resources" className="text-sm text-examia-mid hover:text-examia-dark font-medium mb-4 inline-block">← Back to My resources</Link>
      <h1 className="text-2xl font-bold text-examia-dark mb-2">Quiz report: {resourceTitle}</h1>
      <p className="text-examia-mid mb-6">Student marks and improvement tips for wrong answers.</p>

      {attempts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl border-2 border-examia-mid/40 bg-gradient-to-br from-examia-dark/5 to-examia-mid/10 p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold text-examia-dark mb-2">AI tips — what to focus on & how to improve students</h2>
          {tipsLoading && (
            <p className="text-examia-mid text-sm flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-examia-mid border-t-transparent inline-block" />
              Generating tips…
            </p>
          )}
          {tipsError && <p className="text-amber-700 text-sm">{tipsError}</p>}
          {!tipsLoading && tips && (
            <div className="text-examia-dark text-sm leading-relaxed whitespace-pre-wrap">{tips}</div>
          )}
        </motion.div>
      )}

      {attempts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-examia-soft/30 text-center text-examia-mid">
          No attempts yet. Students can attempt this quiz once; their results will appear here.
        </div>
      ) : (
        <div className="space-y-4">
          {attempts.map((a) => {
            const studentName = a.student?.name || a.student?.email || 'Student';
            const pct = a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0;
            const wrongResults = (a.results || []).filter((r) => r.selectedIndex >= 0 && r.selectedIndex !== r.correctIndex);
            const isExpanded = expandedId === a._id;
            return (
              <motion.div
                key={a._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border-2 border-examia-soft/40 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : a._id)}
                  className="w-full px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-examia-bg/50 transition-colors"
                >
                  <div>
                    <span className="font-semibold text-examia-dark">{studentName}</span>
                    {a.student?.email && (
                      <span className="text-examia-mid text-sm ml-2">{a.student.email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-examia-dark">{a.score} / {a.maxScore}</span>
                    <span className={`font-medium ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>
                    {wrongResults.length > 0 && (
                      <span className="text-examia-mid text-sm">{wrongResults.length} wrong — click for tips</span>
                    )}
                  </div>
                </button>
                {isExpanded && wrongResults.length > 0 && (
                  <div className="border-t border-examia-soft/30 bg-examia-bg/30 px-6 py-4">
                    <h4 className="font-medium text-examia-dark mb-3">What they got wrong & how to improve</h4>
                    <ul className="space-y-4">
                      {wrongResults.map((r, i) => (
                        <li key={i} className="p-4 rounded-xl bg-white border border-examia-soft/40">
                          <p className="font-medium text-examia-dark mb-1">Q{r.questionIndex + 1}: {r.questionText}</p>
                          <p className="text-sm text-red-700">Their answer: {(r.options || [])[r.selectedIndex] ?? '—'}</p>
                          <p className="text-sm text-green-700">Correct: {(r.options || [])[r.correctIndex] ?? '—'}</p>
                          {r.rationale && (
                            <p className="text-sm text-examia-mid mt-2 pt-2 border-t border-examia-soft/30">
                              <span className="font-medium text-examia-dark">Tip: </span>{r.rationale}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
