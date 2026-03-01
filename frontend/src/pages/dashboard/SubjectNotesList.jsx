import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

/** List of lesson notes for a subject + "Create new lesson" (student only). */
export function SubjectNotesList() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { subject } = useOutletContext() || {};
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const isStudent = user?.role === 'student';

  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    setError(null);
    api
      .get('/lesson-notes', { params: { subjectId } })
      .then((r) => setNotes(r.data.notes || []))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [subjectId]);

  const handleCreate = () => {
    if (!subjectId || !isStudent || creating) return;
    setCreating(true);
    api
      .post('/lesson-notes', { subjectId, lessonTitle: 'New lesson' })
      .then((r) => {
        const id = r.data.note?._id;
        if (id) navigate(`/content/subject/${subjectId}/lesson/${id}/study`);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setCreating(false));
  };

  if (loading) {
    return (
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading notes…</p>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-examia-dark">Lesson notes</h2>
          <p className="text-examia-mid text-sm mt-0.5">
            Create a lesson and take structured notes: summary, key terms, self-test, and confidence.
          </p>
        </div>
        {isStudent && (
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition shadow-sm disabled:opacity-60"
          >
            {creating ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Creating…
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create new lesson
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {!isStudent && (
        <div className="rounded-2xl border border-examia-soft/30 bg-examia-soft/5 p-6 text-center text-examia-mid text-sm">
          Only students can create and edit lesson notes. You can view notes if shared.
        </div>
      )}

      {notes.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-examia-soft/40 bg-white p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-examia-soft/20 flex items-center justify-center mx-auto mb-4 text-examia-mid">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <p className="font-semibold text-examia-dark">No lessons yet</p>
          <p className="text-examia-mid text-sm mt-1">
            {isStudent ? 'Create a new lesson to start taking notes.' : 'Students can create lesson notes here.'}
          </p>
          {isStudent && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-examia-dark text-white text-sm font-medium hover:bg-examia-mid transition disabled:opacity-60"
            >
              Create new lesson
            </button>
          )}
        </div>
      )}

      {notes.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Link
              key={note._id}
              to={`/content/subject/${subjectId}/lesson/${note._id}/study`}
              className="block rounded-2xl border border-examia-soft/30 bg-white p-5 shadow-sm hover:shadow-md hover:border-examia-soft/50 transition-all duration-200 text-left group"
            >
              <h3 className="font-semibold text-examia-dark truncate group-hover:text-examia-mid transition-colors">
                {note.lessonTitle || 'Untitled'}
              </h3>
              <p className="text-xs text-examia-mid mt-1">
                Updated {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : '—'}
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-examia-mid">
                <span>{Array.isArray(note.summary) ? note.summary.filter(Boolean).length : 0}/5 summary</span>
                <span>·</span>
                <span>{Array.isArray(note.key_terms) ? note.key_terms.length : 0} terms</span>
                <span>·</span>
                <span>{Array.isArray(note.self_test) ? note.self_test.length : 0} Q&amp;A</span>
              </div>
              <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-examia-dark group-hover:translate-x-0.5 transition-transform">
                Open
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      )}
    </motion.section>
  );
}
