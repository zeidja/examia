import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const typeLabels = { material: 'Material', quiz: 'Quiz', flash_cards: 'Flash cards' };

export function MyContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  const isStudent = user?.role === 'student';

  useEffect(() => {
    if (isStudent) {
      api.get('/subjects').then((r) => setSubjects(r.data.subjects || [])).finally(() => setLoading(false));
    } else {
      api.get('/resources').then((r) => setResources(r.data.resources || [])).finally(() => setLoading(false));
    }
  }, [isStudent]);

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
          <h1 className="text-3xl font-bold tracking-tight text-examia-dark">My content</h1>
          <p className="text-examia-mid mt-2 text-sm">Choose a subject to view materials, quizzes, flash cards, get ideas, and submit work for AI feedback.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {subjects.map((s, i) => (
            <motion.button
              key={s._id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/content/subject/${s._id}/materials`)}
              className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/20 text-left hover:shadow-md hover:border-examia-soft/40 hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="w-11 h-11 rounded-xl bg-examia-soft/10 text-examia-mid font-bold text-sm flex items-center justify-center group-hover:bg-examia-soft/20 transition-colors">
                  {s.code || s.name?.slice(0, 3)}
                </span>
                <h3 className="font-semibold text-examia-dark truncate">{s.name}</h3>
              </div>
              <p className="text-examia-mid text-sm">Materials, quizzes, flashcards & more</p>
            </motion.button>
          ))}
        </div>
        {subjects.length === 0 && (
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
          <h1 className="text-3xl font-bold tracking-tight text-examia-dark">My content</h1>
          <p className="text-examia-mid mt-1 text-sm">
            {isTeacher && 'Published quizzes, flash cards, and materials you created.'}
            {(isSchoolAdmin || isSuperAdmin) && 'All published resources in your school or platform.'}
          </p>
        </div>
        {isTeacher && (
          <Link
            to="/resources"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition shadow-sm shrink-0"
          >
            Create & manage in Resources
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
            {isTeacher ? 'Create quizzes and flash cards in AI Tools, then publish them from Resources.' : 'Quizzes and materials will appear here when teachers publish them.'}
          </p>
          {isTeacher && (
            <Link to="/resources" className="inline-block mt-4 text-sm font-medium text-examia-mid hover:text-examia-dark transition">Go to Resources →</Link>
          )}
        </div>
      )}
    </motion.div>
  );
}
