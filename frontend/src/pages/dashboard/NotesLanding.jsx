import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

/** Subject icon keys — same as Materials page. Local: /subject-icons/{key}.png; fallback: Flaticon CDN. */
const SUBJECT_ICON_KEYS = {
  biology: { key: 'biology', flaticonId: 1548234 },
  chemistry: { key: 'chemistry', flaticonId: 3214063 },
  'math-aa': { key: 'math-aa', flaticonId: 1024138 },
  'mathematics - analysis & approaches': { key: 'math-aa', flaticonId: 1024138 },
  'math-ai': { key: 'math-ai', flaticonId: 15311691 },
  'mathematics - application & interpretation': { key: 'math-ai', flaticonId: 15311691 },
  economics: { key: 'economics', flaticonId: 9235182 },
  business: { key: 'business', flaticonId: 1283342 },
  physics: { key: 'physics', flaticonId: 2933803 },
  psychology: { key: 'psychology', flaticonId: 1491171 },
  'global politics': { key: 'global-politics', flaticonId: 4742256 },
  globalpolitics: { key: 'global-politics', flaticonId: 4742256 },
};
const FLATICON_CDN = 'https://cdn-icons-png.flaticon.com/512';

function getSubjectIconUrl(subject) {
  if (!subject) return null;
  const name = (subject.name || subject.materialsPath || '').toLowerCase().trim();
  if (!name) return null;
  const entry =
    SUBJECT_ICON_KEYS[name] ??
    SUBJECT_ICON_KEYS[name.replace(/\s+/g, ' ')] ??
    SUBJECT_ICON_KEYS[name.replace(/\s+/g, '')];
  if (!entry) return null;
  const idStr = String(entry.flaticonId);
  const sub = idStr.length > 4 ? idStr.slice(0, -3) : idStr;
  return { local: `/subject-icons/${entry.key}.png`, cdn: `${FLATICON_CDN}/${sub}/${entry.flaticonId}.png` };
}

/** Card colors + shadows — same as Materials page. */
const SUBJECT_CARD_STYLES = [
  { className: 'bg-amber-50 border-amber-200/60 shadow-[0_4px_14px_rgba(245,158,11,0.2)] hover:shadow-[0_8px_24px_rgba(245,158,11,0.28)]', badge: 'bg-amber-100 text-amber-800 group-hover:bg-amber-200/80' },
  { className: 'bg-emerald-50 border-emerald-200/60 shadow-[0_4px_14px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.28)]', badge: 'bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200/80' },
  { className: 'bg-blue-50 border-blue-200/60 shadow-[0_4px_14px_rgba(59,130,246,0.2)] hover:shadow-[0_8px_24px_rgba(59,130,246,0.28)]', badge: 'bg-blue-100 text-blue-800 group-hover:bg-blue-200/80' },
  { className: 'bg-violet-50 border-violet-200/60 shadow-[0_4px_14px_rgba(139,92,246,0.2)] hover:shadow-[0_8px_24px_rgba(139,92,246,0.28)]', badge: 'bg-violet-100 text-violet-800 group-hover:bg-violet-200/80' },
  { className: 'bg-rose-50 border-rose-200/60 shadow-[0_4px_14px_rgba(244,63,94,0.2)] hover:shadow-[0_8px_24px_rgba(244,63,94,0.28)]', badge: 'bg-rose-100 text-rose-800 group-hover:bg-rose-200/80' },
  { className: 'bg-cyan-50 border-cyan-200/60 shadow-[0_4px_14px_rgba(6,182,212,0.2)] hover:shadow-[0_8px_24px_rgba(6,182,212,0.28)]', badge: 'bg-cyan-100 text-cyan-800 group-hover:bg-cyan-200/80' },
  { className: 'bg-orange-50 border-orange-200/60 shadow-[0_4px_14px_rgba(249,115,22,0.2)] hover:shadow-[0_8px_24px_rgba(249,115,22,0.28)]', badge: 'bg-orange-100 text-orange-800 group-hover:bg-orange-200/80' },
  { className: 'bg-teal-50 border-teal-200/60 shadow-[0_4px_14px_rgba(20,184,166,0.2)] hover:shadow-[0_8px_24px_rgba(20,184,166,0.28)]', badge: 'bg-teal-100 text-teal-800 group-hover:bg-teal-200/80' },
];

/** Landing page for Note taking: list subjects with same design as Materials. */
export function NotesLanding() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [iconErrors, setIconErrors] = useState(new Set());

  useEffect(() => {
    if (user?.role === 'student') {
      api.get('/subjects').then((r) => setSubjects(r.data.subjects || [])).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user?.role]);

  const handleIconError = (subjectId) => {
    setIconErrors((prev) => new Set(prev).add(subjectId));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading…</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl"
    >
      <div className="mb-8 flex items-center gap-3">
        <Link
          to="/content"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-examia-mid hover:text-examia-dark transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Modules
        </Link>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-examia-dark">Lesson notes</h1>
      <p className="text-examia-mid mt-2 text-sm">
        Choose a subject to create or open lesson notes: summary, key terms, self-test, and recall mode.
      </p>
      {user?.role !== 'student' ? (
        <div className="mt-8 rounded-2xl border border-examia-soft/30 bg-examia-soft/5 p-6 text-center text-examia-mid text-sm">
          Only students can create and edit lesson notes.
        </div>
      ) : subjects.length === 0 ? (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-examia-soft/40 bg-examia-soft/5 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-examia-soft/20 flex items-center justify-center mx-auto mb-4 text-examia-mid">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <p className="font-semibold text-examia-dark">No subjects available</p>
          <p className="text-examia-mid text-sm mt-1 max-w-sm mx-auto">Your school will assign subjects to your class.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((s, i) => {
            const cardStyle = SUBJECT_CARD_STYLES[i % SUBJECT_CARD_STYLES.length];
            const iconUrls = getSubjectIconUrl(s);
            const showIcon = iconUrls && !iconErrors.has(s._id);
            return (
              <motion.div
                key={s._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  to={`/content/subject/${s._id}/notes`}
                  className={`block rounded-2xl p-8 text-left hover:-translate-y-0.5 transition-all duration-200 group border ${cardStyle.className}`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`w-14 h-14 rounded-xl font-bold text-base flex items-center justify-center shrink-0 overflow-hidden ${cardStyle.badge}`}>
                      {showIcon ? (
                        <img
                          src={iconUrls.local}
                          alt=""
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            const img = e.target;
                            if (img.dataset.triedCdn) {
                              handleIconError(s._id);
                              return;
                            }
                            img.dataset.triedCdn = '1';
                            img.src = iconUrls.cdn;
                          }}
                        />
                      ) : (
                        s.code || s.name?.slice(0, 3)
                      )}
                    </span>
                    <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-examia-dark truncate text-lg group-hover:text-examia-mid transition-colors">{s.name}</h3>
                      <svg className="w-5 h-5 text-examia-mid shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
