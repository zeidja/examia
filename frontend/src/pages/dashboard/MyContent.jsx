import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { getSubjectCardStyle } from '../../utils/subjectColors';

const typeLabels = { material: 'Material', quiz: 'Quiz', flash_cards: 'Flashcards' };

/** Subject icon keys for mapping name/materialsPath → icon. Local: /subject-icons/{key}.png; fallback: Flaticon CDN. */
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

export function MyContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  const isStudent = user?.role === 'student';
  const [iconErrors, setIconErrors] = useState(new Set());

  useEffect(() => {
    if (isStudent) {
      api.get('/subjects').then((r) => setSubjects(r.data.subjects || [])).finally(() => setLoading(false));
    } else {
      api.get('/resources').then((r) => setResources(r.data.resources || [])).finally(() => setLoading(false));
    }
  }, [isStudent]);

  /** One Modules card for TOK (essay + exhibition are still separate subjects in the API). */
  const studentDisplaySubjects = useMemo(() => {
    const list = subjects || [];
    const essay = list.find((s) => s.name === 'TOK Essay');
    const exhibition = list.find((s) => s.name === 'TOK Exhibition');
    const rest = list.filter((s) => s.name !== 'TOK Essay' && s.name !== 'TOK Exhibition');
    const merged = [];
    if (essay || exhibition) {
      const primary = essay || exhibition;
      merged.push({
        ...primary,
        name: 'TOK',
        code: 'TOK',
      });
    }
    const combined = [...rest, ...merged];
    combined.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    return combined;
  }, [subjects]);

  const handleIconError = (subjectId) => {
    setIconErrors((prev) => new Set(prev).add(subjectId));
  };

  const openFile = (id) => {
    window.open(`/api/resources/${id}/file`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading content…</p>
      </div>
    );
  }

  if (isStudent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-6xl"
      >
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-examia-dark">Modules</h1>
          <p className="text-examia-mid mt-2 text-sm">Choose a subject to view fundamentals, quizzes, flashcards, get ideas, and submit work for AI feedback.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {studentDisplaySubjects.map((s) => {
            const cardStyle = getSubjectCardStyle(s);
            const iconUrls = getSubjectIconUrl(s);
            const showIcon = iconUrls && !iconErrors.has(s._id);
            return (
              <motion.button
                key={s._id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(s.iaOnly ? `/content/subject/${s._id}/feedback` : `/content/subject/${s._id}/materials`)}
                className={`rounded-2xl p-8 text-left hover:-translate-y-0.5 transition-all duration-200 group border ${cardStyle.className}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`w-14 h-14 rounded-xl font-bold text-base flex items-center justify-center shrink-0 overflow-hidden ${cardStyle.badge}`}>
                    {showIcon ? (
                      <img
                        src={iconUrls.local}
                        alt=""
                        className="w-8 h-8 object-contain brightness-0 invert"
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
                  <h3 className="font-semibold text-examia-dark truncate text-lg">{s.name}</h3>
                </div>
              </motion.button>
            );
          })}
        </div>
        {studentDisplaySubjects.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-examia-soft/40 bg-examia-soft/5 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-examia-soft/20 flex items-center justify-center mx-auto mb-4 text-examia-mid">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            </div>
            <p className="font-semibold text-examia-dark">No subjects available yet</p>
            <p className="text-examia-mid text-sm mt-1 max-w-sm mx-auto">Your school will add subjects here. Check back later or ask your teacher.</p>
          </div>
        )}
      </motion.div>
    );
  }

  const isTeacher = user?.role === 'teacher';
  const isSchoolAdmin = user?.role === 'school_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl"
    >
      <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-examia-dark">Modules</h1>
          <p className="text-examia-mid mt-1 text-sm">
            {isTeacher && 'Published quizzes, flashcards, and fundamentals you created.'}
            {(isSchoolAdmin || isSuperAdmin) && 'All published resources in your school or platform.'}
          </p>
        </div>
        {isTeacher && (
          <Link
            to="/resources"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition shadow-sm shrink-0"
          >
            Create & manage in Library
          </Link>
        )}
      </div>
      <div className="grid gap-4">
        {resources.map((r, i) => (
          <motion.div
            key={r._id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/20 hover:shadow-md hover:border-examia-soft/30 transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-block text-xs font-semibold text-examia-mid bg-examia-soft/20 px-2.5 py-1 rounded-lg uppercase tracking-wide">{typeLabels[r.type] || r.type}</span>
                <h3 className="font-semibold text-examia-dark mt-2">{r.title}</h3>
                {r.description && <p className="text-examia-mid text-sm mt-1">{r.description}</p>}
                {r.createdBy?.name && <p className="text-examia-mid text-xs mt-2">By {r.createdBy.name}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                {r.type === 'material' && r.filePath && (
                  <button
                    type="button"
                    onClick={() => openFile(r._id)}
                    className="px-4 py-2 rounded-xl bg-examia-dark text-white text-sm font-medium hover:bg-examia-mid transition shadow-sm"
                  >
                    Open file
                  </button>
                )}
                {(r.type === 'quiz' || r.type === 'flash_cards') && (
                  <Link
                    to={`/content/${r._id}`}
                    className="px-4 py-2 rounded-xl bg-examia-dark text-white text-sm font-medium hover:bg-examia-mid transition shadow-sm inline-block"
                  >
                    View
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {resources.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-examia-soft/40 bg-examia-soft/5 p-12 text-center">
          <p className="font-semibold text-examia-dark">No content yet</p>
          <p className="text-examia-mid text-sm mt-1">
            {isTeacher ? 'Create quizzes and flashcards in AI Tools, then publish them from Library.' : 'Quizzes and materials will appear here when teachers publish them.'}
          </p>
          {isTeacher && (
            <Link to="/resources" className="inline-block mt-4 text-sm font-medium text-examia-mid hover:text-examia-dark transition">Go to Library →</Link>
          )}
        </div>
      )}
    </motion.div>
  );
}
