import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

/** Card colors — same order as Materials/Notes for consistent subject colors. */
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

export function FlashcardsLanding() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'student') {
      api.get('/subjects').then((r) => setSubjects(r.data.subjects || [])).finally(() => setLoading(false));
    } else setLoading(false);
  }, [user?.role]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading…</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-6xl">
      <div className="mb-8">
        <Link to="/content" className="inline-flex items-center gap-1.5 text-sm font-medium text-examia-mid hover:text-examia-dark transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Modules
        </Link>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-examia-dark">Flashcards</h1>
      <p className="text-examia-mid mt-2 text-sm">Choose a subject to study flashcards.</p>
      {user?.role !== 'student' ? (
        <div className="mt-8 rounded-2xl border border-examia-soft/30 bg-examia-soft/5 p-6 text-center text-examia-mid text-sm">Students see flashcards per subject here.</div>
      ) : subjects.length === 0 ? (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-examia-soft/40 bg-examia-soft/5 p-12 text-center">
          <p className="font-semibold text-examia-dark">No subjects available</p>
          <p className="text-examia-mid text-sm mt-1">Your school will assign subjects to your class.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((s, i) => {
            const cardStyle = SUBJECT_CARD_STYLES[i % SUBJECT_CARD_STYLES.length];
            return (
              <motion.div key={s._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Link
                  to={`/content/subject/${s._id}/flash-cards`}
                  className={`block rounded-2xl p-8 text-left hover:-translate-y-0.5 transition-all duration-200 border ${cardStyle.className}`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`w-14 h-14 rounded-xl font-bold text-base flex items-center justify-center shrink-0 ${cardStyle.badge}`}>
                      {s.code || s.name?.slice(0, 3)}
                    </span>
                    <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-examia-dark truncate text-lg group-hover:text-examia-mid transition-colors">{s.name}</h3>
                      <svg className="w-5 h-5 text-examia-mid shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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
