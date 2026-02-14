import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios';

const RATING_STYLES = {
  easy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  hard: 'bg-rose-100 text-rose-800 border-rose-200',
};
const RATING_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

/** Simple horizontal bar for one segment (width % of total) */
function BarSegment({ value, total, color, label }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className="flex-1 min-w-0 h-6 bg-examia-soft/20 rounded overflow-hidden flex">
        <div
          className={`h-full ${color} transition-all duration-500 rounded-l last:rounded-r`}
          style={{ width: `${Math.max(pct, 0)}%`, minWidth: value > 0 ? '4px' : 0 }}
        />
      </div>
      <span className="text-sm font-semibold text-examia-dark shrink-0 w-12 text-right">{value}</span>
      <span className="text-xs text-examia-mid shrink-0 w-10">{label}</span>
    </div>
  );
}

export function FlashCardReport() {
  const { resourceId } = useParams();
  const [stats, setStats] = useState([]);
  const [students, setStudents] = useState([]);
  const [resourceTitle, setResourceTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    if (!resourceId) return;
    setLoading(true);
    setError(null);
    api
      .get(`/resources/${resourceId}/flash-card-ratings`)
      .then((r) => {
        setStats(r.data.stats || []);
        setStudents(r.data.students || []);
        setResourceTitle(r.data.resourceTitle || 'Flash cards');
      })
      .catch((err) => setError(err.response?.data?.message || err.message || 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, [resourceId]);

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

  const totalResponses = stats.reduce((sum, s) => sum + s.easy + s.medium + s.hard, 0);
  const totalEasy = stats.reduce((sum, s) => sum + s.easy, 0);
  const totalMedium = stats.reduce((sum, s) => sum + s.medium, 0);
  const totalHard = stats.reduce((sum, s) => sum + s.hard, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Link to="/resources" className="text-sm text-examia-mid hover:text-examia-dark font-medium mb-4 inline-block">← Back to My resources</Link>
      <h1 className="text-2xl font-bold text-examia-dark mb-2">Flash card report: {resourceTitle}</h1>
      <p className="text-examia-mid mb-8">
        How students rated each card (Easy / Medium / Hard). View totals, per-card breakdown, and per-student progress.
      </p>

      {stats.length === 0 && students.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-examia-soft/30 text-center text-examia-mid">
          No ratings yet. When students study these cards and rate them (Easy, Medium, Hard), stats will appear here.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Overview + chart */}
          <section className="bg-white rounded-2xl border border-examia-soft/30 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-examia-soft/30 bg-examia-soft/10">
              <h2 className="text-lg font-bold text-examia-dark">Overview</h2>
              <p className="text-sm text-examia-mid mt-0.5">Total ratings across all cards</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <p className="text-2xl font-bold text-emerald-700">{totalEasy}</p>
                  <p className="text-sm font-medium text-emerald-800">Easy</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                  <p className="text-2xl font-bold text-amber-700">{totalMedium}</p>
                  <p className="text-sm font-medium text-amber-800">Medium</p>
                </div>
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
                  <p className="text-2xl font-bold text-rose-700">{totalHard}</p>
                  <p className="text-sm font-medium text-rose-800">Hard</p>
                </div>
              </div>
              <div className="mb-2 text-sm font-medium text-examia-dark">Distribution</div>
              <div className="flex flex-col sm:flex-row gap-3">
                <BarSegment value={totalEasy} total={totalResponses} color="bg-emerald-500" label="Easy" />
                <BarSegment value={totalMedium} total={totalResponses} color="bg-amber-500" label="Medium" />
                <BarSegment value={totalHard} total={totalResponses} color="bg-rose-500" label="Hard" />
              </div>
              <p className="text-xs text-examia-mid mt-3">
                Total: <span className="font-semibold text-examia-dark">{totalResponses}</span> ratings
                {stats.length > 0 && ` · ${stats.length} card${stats.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </section>

          {/* Per-card table */}
          {stats.length > 0 && (
            <section className="bg-white rounded-2xl border border-examia-soft/30 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-examia-soft/30 bg-examia-soft/10">
                <h2 className="text-lg font-bold text-examia-dark">By card</h2>
                <p className="text-sm text-examia-mid mt-0.5">Rating counts per flash card</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-examia-soft/40 bg-examia-soft/5">
                      <th className="px-6 py-4 text-sm font-semibold text-examia-dark">Card</th>
                      <th className="px-6 py-4 text-sm font-semibold text-emerald-700">Easy</th>
                      <th className="px-6 py-4 text-sm font-semibold text-amber-700">Medium</th>
                      <th className="px-6 py-4 text-sm font-semibold text-rose-700">Hard</th>
                      <th className="px-6 py-4 text-sm font-semibold text-examia-dark">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s) => {
                      const total = s.easy + s.medium + s.hard;
                      return (
                        <motion.tr
                          key={s.cardIndex}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-examia-soft/20 hover:bg-examia-soft/5 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-examia-dark">Card {s.cardIndex + 1}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="font-semibold text-emerald-700">{s.easy}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <span className="font-semibold text-amber-700">{s.medium}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              <span className="font-semibold text-rose-700">{s.hard}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-examia-dark font-medium">{total}</td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Per-student */}
          {students.length > 0 && (
            <section className="bg-white rounded-2xl border border-examia-soft/30 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-examia-soft/30 bg-examia-soft/10">
                <h2 className="text-lg font-bold text-examia-dark">By student</h2>
                <p className="text-sm text-examia-mid mt-0.5">Each student’s rating summary</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-examia-soft/40 bg-examia-soft/5">
                      <th className="px-6 py-4 text-sm font-semibold text-examia-dark">Student</th>
                      <th className="px-6 py-4 text-sm font-semibold text-emerald-700">Easy</th>
                      <th className="px-6 py-4 text-sm font-semibold text-amber-700">Medium</th>
                      <th className="px-6 py-4 text-sm font-semibold text-rose-700">Hard</th>
                      <th className="px-6 py-4 text-sm font-semibold text-examia-dark">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((stu, idx) => (
                      <motion.tr
                        key={stu.studentId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-examia-soft/20 hover:bg-examia-soft/5 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(stu)}
                            className="text-left hover:opacity-80 transition-opacity group"
                          >
                            <p className="font-medium text-examia-dark group-hover:underline group-hover:text-examia-mid">
                              {stu.studentName}
                            </p>
                            {stu.studentEmail && (
                              <p className="text-xs text-examia-mid">{stu.studentEmail}</p>
                            )}
                            <span className="text-xs text-examia-mid mt-0.5 inline-block">View card details →</span>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-semibold text-emerald-700">{stu.easy}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="font-semibold text-amber-700">{stu.medium}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span className="font-semibold text-rose-700">{stu.hard}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-examia-dark font-medium">{stu.total}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Modal: student card details */}
          <AnimatePresence>
            {selectedStudent && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-40"
                  onClick={() => setSelectedStudent(null)}
                  aria-hidden
                />
                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ type: 'tween', duration: 0.2 }}
                  className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-examia-soft/30"
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-examia-soft/30 bg-examia-soft/10">
                    <div>
                      <h3 className="text-lg font-bold text-examia-dark">{selectedStudent.studentName}</h3>
                      {selectedStudent.studentEmail && (
                        <p className="text-sm text-examia-mid">{selectedStudent.studentEmail}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="p-2 rounded-lg hover:bg-examia-soft/30 text-examia-mid hover:text-examia-dark transition"
                      aria-label="Close"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <p className="text-sm font-medium text-examia-mid uppercase tracking-wide mb-3">Ratings by card</p>
                    {selectedStudent.ratingsByCard && selectedStudent.ratingsByCard.length > 0 ? (
                      <ul className="space-y-2">
                        {selectedStudent.ratingsByCard.map((item) => (
                          <li
                            key={item.cardIndex}
                            className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-examia-soft/10 border border-examia-soft/20"
                          >
                            <span className="font-medium text-examia-dark">Card {item.cardIndex + 1}</span>
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${RATING_STYLES[item.rating] || 'bg-examia-soft/20 text-examia-dark'}`}
                            >
                              {RATING_LABEL[item.rating] || item.rating}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-examia-mid text-sm">No per-card data.</p>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
