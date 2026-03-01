import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const SUMMARY_MAX = 5;
const SUMMARY_CHAR_MAX = 120;

const sectionTransition = { duration: 0.25 };

/** Flip card for a key term: click toggles term / definition. */
function KeyTermCard({ term, definition, onRemove, canEdit }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={sectionTransition}
      className="relative"
    >
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="w-full rounded-xl border border-examia-soft/40 bg-white p-4 text-left shadow-sm hover:border-examia-soft/60 hover:shadow transition-all duration-200 min-h-[80px] flex items-center justify-center"
      >
        <span className="text-sm font-medium text-examia-dark">
          {flipped ? definition : term}
          {!term && !definition && '—'}
        </span>
      </button>
      {canEdit && onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-200 transition text-xs font-bold"
          aria-label="Remove term"
        >
          ×
        </button>
      )}
    </motion.div>
  );
}

/** Self-test item: question with "Show Answer" toggle. */
function SelfTestItem({ question, answer, onRemove, canEdit }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={sectionTransition}
      className="rounded-xl border border-examia-soft/40 bg-white p-4"
    >
      <p className="font-medium text-examia-dark">Q: {question || '—'}</p>
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="text-sm font-medium text-examia-dark/80 hover:text-examia-dark border-b border-dotted border-examia-mid"
        >
          {revealed ? 'Hide answer' : 'Show answer'}
        </button>
        {revealed && <p className="mt-2 text-sm text-examia-dark pl-0">{answer || '—'}</p>}
      </div>
      {canEdit && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-2 text-xs text-rose-600 hover:underline"
        >
          Remove
        </button>
      )}
    </motion.div>
  );
}

/** Collapsible section wrapper. */
function SectionCard({ title, icon, open, onToggle, children }) {
  return (
    <div className="rounded-2xl border border-examia-soft/30 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-examia-soft/5 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-lg bg-examia-dark/10 flex items-center justify-center text-examia-dark">
            {icon}
          </span>
          <span className="font-semibold text-examia-dark">{title}</span>
        </span>
        <svg
          className={`w-5 h-5 text-examia-mid transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={sectionTransition}
            className="border-t border-examia-soft/30"
          >
            <div className="p-6 pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LessonStudyPage() {
  const { subjectId, noteId } = useParams();
  const navigate = useNavigate();
  const { subject } = useOutletContext() || {};
  const { user } = useAuth();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [recallMode, setRecallMode] = useState(false);
  const [recallStartedAt, setRecallStartedAt] = useState(null);
  const [recallRevealed, setRecallRevealed] = useState(false);
  const [recallRating, setRecallRating] = useState(null);
  const [recallDraft, setRecallDraft] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [sectionOpen, setSectionOpen] = useState({ summary: true, terms: true, selfTest: true, confidence: true });
  const lastSaveRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const noteRef = useRef(note);
  noteRef.current = note;

  const isStudent = user?.role === 'student';
  const canEdit = isStudent;

  const loadNote = useCallback(() => {
    if (!noteId) return;
    setLoading(true);
    api
      .get(`/lesson-notes/${noteId}`)
      .then((r) => setNote(r.data.note))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [noteId]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  const saveNote = useCallback(
    (payload) => {
      if (!noteId || !canEdit || !payload) return;
      setSaving(true);
      api
        .put(`/lesson-notes/${noteId}`, payload)
        .then((r) => {
          setNote(r.data.note);
          lastSaveRef.current = Date.now();
        })
        .catch((err) => setError(err.response?.data?.message || err.message))
        .finally(() => setSaving(false));
    },
    [noteId, canEdit]
  );

  const scheduleSave = useCallback(
    (payload) => {
      if (!canEdit) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveNote(payload), 2000);
    },
    [canEdit, saveNote]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!canEdit) return;
    const interval = setInterval(() => {
      const current = noteRef.current;
      if (current) saveNote(current);
    }, 10000);
    return () => clearInterval(interval);
  }, [canEdit, saveNote]);

  const updateLocal = useCallback(
    (updates) => {
      setNote((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...updates };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const summaryUsed = note?.summary?.filter(Boolean).length ?? 0;

  const handleRecallReveal = () => {
    setRecallRevealed(true);
  };

  const handleRecallRating = (value) => {
    setRecallRating(value);
    const newScores = [...(note?.recall_scores || []), value];
    updateLocal({ recall_scores: newScores });
    setRecallMode(false);
    setRecallStartedAt(null);
    setRecallRevealed(false);
    setRecallRating(null);
    setRecallDraft('');
  };

  if (loading) {
    return (
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading lesson…</p>
      </motion.section>
    );
  }
  if (error || !note) {
    return (
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-6 text-center">
        <p className="font-medium text-red-800">{error || 'Lesson not found'}</p>
        <Link to={`/content/subject/${subjectId}/notes`} className="mt-4 inline-block text-sm font-medium text-examia-dark hover:underline">
          ← Back to notes
        </Link>
      </motion.section>
    );
  }

  const summary = Array.isArray(note.summary) ? note.summary : ['', '', '', '', ''];
  const keyTerms = Array.isArray(note.key_terms) ? note.key_terms : [];
  const selfTest = Array.isArray(note.self_test) ? note.self_test : [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={sectionTransition}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/content/subject/${subjectId}/notes`}
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-examia-mid hover:text-examia-dark transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Notes
          </Link>
          {recallMode && !recallRevealed ? (
            <h1 className="text-xl font-bold text-examia-dark">Recall mode</h1>
          ) : editingTitle && canEdit ? (
            <input
              type="text"
              defaultValue={note.lessonTitle || ''}
              onBlur={(e) => {
                const title = e.target.value.trim() || 'New lesson';
                setEditingTitle(false);
                updateLocal({ lessonTitle: title });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.target.blur();
                }
              }}
              className="text-xl font-bold text-examia-dark bg-transparent border-b-2 border-examia-dark/30 focus:outline-none focus:border-examia-dark min-w-[200px]"
              autoFocus
            />
          ) : (
            <h1
              className={`text-xl font-bold text-examia-dark truncate ${canEdit ? 'cursor-pointer hover:text-examia-mid' : ''}`}
              title={canEdit ? 'Click to edit title' : ''}
              onClick={() => canEdit && setEditingTitle(true)}
            >
              {note.lessonTitle || 'Untitled'}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-examia-mid font-medium">Saving…</span>
          )}
          {canEdit && !recallMode && (
            <button
              type="button"
              onClick={() => {
                setRecallMode(true);
                setRecallStartedAt(Date.now());
                setRecallRevealed(false);
                setRecallRating(null);
                setRecallDraft('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-examia-dark/20 text-examia-dark font-medium hover:bg-examia-dark/5 transition"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-examia-dark" />
              Recall mode
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {recallMode && (
        <div className="rounded-2xl border-2 border-examia-dark/20 bg-examia-soft/10 p-6 space-y-4">
          {!recallRevealed ? (
            <>
              <p className="text-sm text-examia-dark font-medium">
                Try to recall your notes from memory. Optionally write what you remember below, then reveal and rate yourself.
              </p>
              {recallStartedAt && (
                <p className="text-2xl font-mono font-semibold text-examia-dark">
                  {Math.floor((Date.now() - recallStartedAt) / 1000)}s
                </p>
              )}
              <textarea
                value={recallDraft}
                onChange={(e) => setRecallDraft(e.target.value)}
                placeholder="Write what you recall (optional)..."
                rows={4}
                className="w-full rounded-xl border border-examia-soft/40 px-4 py-3 text-sm text-examia-dark placeholder:text-examia-mid focus:outline-none focus:ring-2 focus:ring-examia-dark/20 resize-y"
              />
              <button
                type="button"
                onClick={handleRecallReveal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition"
              >
                Reveal original
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-examia-dark">How well did you recall?</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 1, label: 'Perfect' },
                  { value: 2, label: 'Minor Gaps' },
                  { value: 3, label: 'Major Gaps' },
                  { value: 4, label: 'Blank' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleRecallRating(value)}
                    className="px-4 py-2 rounded-xl border border-examia-soft/50 bg-white font-medium text-examia-dark hover:bg-examia-soft/20 transition"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <SectionCard
        title="Summary (max 5 bullets)"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        }
        open={sectionOpen.summary}
        onToggle={() => setSectionOpen((s) => ({ ...s, summary: !s.summary }))}
      >
        <p className="text-xs font-semibold text-examia-mid uppercase tracking-wider mb-3">
          {summaryUsed} / {SUMMARY_MAX} used
        </p>
        <div className="space-y-2">
          {summary.slice(0, SUMMARY_MAX).map((val, i) => (
            <input
              key={i}
              type="text"
              value={val}
              onChange={(e) => {
                const next = [...summary];
                next[i] = e.target.value.slice(0, SUMMARY_CHAR_MAX);
                updateLocal({ summary: next });
              }}
              onBlur={() => saveNote({ ...note, summary })}
              placeholder={`Bullet ${i + 1} (max ${SUMMARY_CHAR_MAX} chars)`}
              maxLength={SUMMARY_CHAR_MAX}
              disabled={!canEdit}
              className="w-full rounded-lg border border-examia-soft/40 px-4 py-2.5 text-sm text-examia-dark placeholder:text-examia-mid focus:outline-none focus:ring-2 focus:ring-examia-dark/20 focus:border-examia-dark/30 disabled:bg-examia-soft/10 disabled:cursor-not-allowed"
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Key terms"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
        open={sectionOpen.terms}
        onToggle={() => setSectionOpen((s) => ({ ...s, terms: !s.terms }))}
      >
        {canEdit && (
          <div className="flex flex-wrap gap-3 mb-4 p-4 rounded-xl bg-examia-soft/10 border border-examia-soft/30">
            <input
              type="text"
              id="new-term"
              placeholder="Term"
              className="flex-1 min-w-[120px] rounded-lg border border-examia-soft/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-examia-dark/20"
            />
            <input
              type="text"
              id="new-def"
              placeholder="Definition"
              className="flex-1 min-w-[120px] rounded-lg border border-examia-soft/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-examia-dark/20"
            />
            <button
              type="button"
              onClick={() => {
                const termEl = document.getElementById('new-term');
                const defEl = document.getElementById('new-def');
                const term = termEl?.value?.trim();
                const def = defEl?.value?.trim();
                if (!term && !def) return;
                const next = [...keyTerms, { term: term || '', definition: def || '' }];
                updateLocal({ key_terms: next });
                if (termEl) termEl.value = '';
                if (defEl) defEl.value = '';
              }}
              className="px-4 py-2 rounded-lg bg-examia-dark text-white text-sm font-medium hover:bg-examia-mid transition"
            >
              Add term
            </button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {keyTerms.map((kt, i) => (
            <KeyTermCard
              key={i}
              term={kt.term}
              definition={kt.definition}
              canEdit={canEdit}
              onRemove={
                canEdit
                  ? () => {
                      const next = keyTerms.filter((_, j) => j !== i);
                      updateLocal({ key_terms: next });
                    }
                  : undefined
              }
            />
          ))}
        </div>
        {keyTerms.length === 0 && (
          <p className="text-sm text-examia-mid">No key terms yet. Add term and definition above.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Self-test questions"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        open={sectionOpen.selfTest}
        onToggle={() => setSectionOpen((s) => ({ ...s, selfTest: !s.selfTest }))}
      >
        {canEdit && (
          <div className="flex flex-wrap gap-3 mb-4 p-4 rounded-xl bg-examia-soft/10 border border-examia-soft/30">
            <input
              type="text"
              id="new-q"
              placeholder="Question"
              className="w-full rounded-lg border border-examia-soft/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-examia-dark/20"
            />
            <input
              type="text"
              id="new-a"
              placeholder="Expected answer"
              className="w-full rounded-lg border border-examia-soft/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-examia-dark/20"
            />
            <button
              type="button"
              onClick={() => {
                const qEl = document.getElementById('new-q');
                const aEl = document.getElementById('new-a');
                const q = qEl?.value?.trim();
                const a = aEl?.value?.trim();
                if (!q && !a) return;
                const next = [...selfTest, { question: q || '', answer: a || '' }];
                updateLocal({ self_test: next });
                if (qEl) qEl.value = '';
                if (aEl) aEl.value = '';
              }}
              className="px-4 py-2 rounded-lg bg-examia-dark text-white text-sm font-medium hover:bg-examia-mid transition"
            >
              Add question
            </button>
          </div>
        )}
        <div className="space-y-3">
          {selfTest.map((st, i) => (
            <SelfTestItem
              key={i}
              question={st.question}
              answer={st.answer}
              canEdit={canEdit}
              onRemove={
                canEdit
                  ? () => {
                      const next = selfTest.filter((_, j) => j !== i);
                      updateLocal({ self_test: next });
                    }
                  : undefined
              }
            />
          ))}
        </div>
        {selfTest.length === 0 && (
          <p className="text-sm text-examia-mid">No self-test questions yet. Add question and expected answer above.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Confidence (0–100)"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
        open={sectionOpen.confidence}
        onToggle={() => setSectionOpen((s) => ({ ...s, confidence: !s.confidence }))}
      >
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={100}
            value={note.confidence_score ?? 0}
            onChange={(e) => updateLocal({ confidence_score: Number(e.target.value) })}
            onMouseUp={() => saveNote({ ...note, confidence_score: note.confidence_score })}
            onTouchEnd={() => saveNote({ ...note, confidence_score: note.confidence_score })}
            disabled={!canEdit}
            className="flex-1 h-3 rounded-full appearance-none bg-examia-soft/30 accent-examia-dark disabled:opacity-60"
          />
          <span className="text-lg font-semibold text-examia-dark w-12 text-right">{note.confidence_score ?? 0}</span>
        </div>
      </SectionCard>
    </motion.section>
  );
}
