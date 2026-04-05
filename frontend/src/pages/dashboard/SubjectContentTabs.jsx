import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { fileNameWithoutExtension } from '../../utils/format';
import { MarkdownBlock } from '../../components/MarkdownBlock';
import { getSubjectCardStyle } from '../../utils/subjectColors';

/** Splits content by LaTeX blocks (\[ \], $$ $$, \( \), $ $) and returns array of { type: 'text'|'html', value } for rendering. */
function parseContentWithMath(content) {
  if (!content || typeof content !== 'string') return [{ type: 'text', value: content || '' }];
  const parts = [];
  const regex = /\\\[([\s\S]*?)\\\]|\\$\$([\s\S]*?)\$\$|\\\(([\s\S]*?)\\\)|\$([^$\n]+?)\$/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    const latex = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? '').trim();
    const displayMode = match[1] !== undefined || match[2] !== undefined;
    try {
      const html = katex.renderToString(latex, { throwOnError: false, displayMode });
      parts.push({ type: 'html', value: html });
    } catch {
      parts.push({ type: 'text', value: match[0] });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }
  if (parts.length === 0) parts.push({ type: 'text', value: content });
  return parts;
}

function MessageContent({ content, className = '' }) {
  const parts = parseContentWithMath(content);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.type === 'text' ? (
          <span key={i} className="whitespace-pre-wrap">
            {part.value}
          </span>
        ) : (
          <span key={i} dangerouslySetInnerHTML={{ __html: part.value }} className="inline-block" />
        )
      )}
    </span>
  );
}

const typeLabels = { material: 'Material', quiz: 'Quiz', flash_cards: 'Flashcards' };

/** Summary from student ratings: { easy, medium, hard } */
function FlashCardSummaryPills({ summary }) {
  if (!summary || (summary.easy + summary.medium + summary.hard) === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {summary.easy > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {summary.easy} Easy
        </span>
      )}
      {summary.medium > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {summary.medium} Medium
        </span>
      )}
      {summary.hard > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {summary.hard} Hard
        </span>
      )}
    </div>
  );
}

function ResourceCard({ r, openFile, flashCardSummary, cardStyle }) {
  const baseClass = 'rounded-xl p-4 shadow-sm border';
  const className = cardStyle ? `${baseClass} ${cardStyle.card}` : `${baseClass} bg-white border-examia-soft/30`;
  const badgeClass = cardStyle ? `text-xs font-medium px-2 py-1 rounded ${cardStyle.badge}` : 'text-xs font-medium text-examia-mid bg-examia-soft/20 px-2 py-1 rounded';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={badgeClass}>{typeLabels[r.type] || r.type}</span>
        {r.type === 'quiz' && r.hasAttempt && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
            Done
          </span>
        )}
      </div>
      <h4 className="font-semibold text-examia-dark mt-2">{r.title}</h4>
      {r.deadline && (
        <p className="text-examia-mid text-xs mt-1">Deadline: {new Date(r.deadline).toLocaleString()}</p>
      )}
      {r.type === 'flash_cards' && flashCardSummary && (
        <div className="mt-2 pt-2 border-t border-examia-soft/20">
          <p className="text-[11px] font-medium text-examia-mid uppercase tracking-wide">Your progress</p>
          <FlashCardSummaryPills summary={flashCardSummary} />
          {flashCardSummary.easy + flashCardSummary.medium + flashCardSummary.hard === 0 && (
            <p className="text-xs text-examia-mid mt-0.5">Not rated yet — open to study & rate</p>
          )}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        {r.type === 'material' && r.filePath && (
          <button type="button" onClick={() => openFile(r._id)} className="px-3 py-1.5 rounded-lg bg-examia-dark text-white text-sm font-medium hover:bg-examia-mid">
            Open file
          </button>
        )}
        {r.type === 'quiz' && (
          <Link
            to={r._subjectId ? `/content/subject/${r._subjectId}/resource/${r._id}` : `/content/${r._id}`}
            className="px-3 py-1.5 rounded-lg bg-examia-dark text-white text-sm font-medium hover:bg-examia-mid"
          >
            {r.hasAttempt ? 'See result' : 'Attempt now'}
          </Link>
        )}
        {r.type === 'flash_cards' && (
          <Link
            to={r._subjectId ? `/content/subject/${r._subjectId}/resource/${r._id}` : `/content/${r._id}`}
            className="px-3 py-1.5 rounded-lg bg-examia-dark text-white text-sm font-medium hover:bg-examia-mid"
          >
            Study
          </Link>
        )}
      </div>
    </motion.div>
  );
}

/** Fundamentals: path, title, description, icon; live = true means feature is available (no “Coming soon”). */
const FUNDAMENTALS_COMING_SOON = [
  {
    path: 'definitions',
    title: 'Definitions',
    description: 'Key terms and definitions for this subject',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    live: true,
  },
  {
    path: 'command-terms',
    title: 'Command Terms',
    description: 'IB command terms and what they ask for',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  },
  {
    path: 'checklists',
    title: 'Checklists',
    description: 'Structured checklists for your work',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    live: true,
  },
];

export function SubjectMaterials() {
  const { subjectId } = useParams();
  const { resources } = useOutletContext() || {};
  const materials = (resources || []).filter((r) => r.type === 'material');
  const openFile = (id) => window.open(`/api/resources/${id}/file`, '_blank');
  const base = `/content/subject/${subjectId}`;

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <h2 className="text-lg font-semibold text-examia-dark mb-3">Fundamentals</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {FUNDAMENTALS_COMING_SOON.map((item) => (
          <Link
            key={item.path}
            to={`${base}/${item.path}`}
            className="group block rounded-2xl border-2 border-examia-soft/30 bg-gradient-to-br from-white to-examia-soft/5 p-5 shadow-sm hover:shadow-md hover:border-examia-soft/50 transition-all duration-200 text-left"
          >
            <div className="flex items-start gap-4">
              <span className="flex shrink-0 w-12 h-12 rounded-xl bg-examia-dark/10 text-examia-dark flex items-center justify-center group-hover:bg-examia-dark/15 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-examia-dark group-hover:text-examia-mid transition-colors">{item.title}</h3>
                <p className="text-sm text-examia-mid mt-0.5">{item.description}</p>
                {!item.live && (
                  <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-examia-mid">
                    Coming soon
                    <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {materials.length > 0 && (
        <>
          <h3 className="text-base font-semibold text-examia-dark mb-3">Materials</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {materials.map((r) => <ResourceCard key={r._id} r={r} openFile={openFile} />)}
          </div>
        </>
      )}
      {materials.length === 0 && <p className="text-examia-mid text-sm">No fundamentals for this subject yet.</p>}
    </motion.section>
  );
}

export function SubjectQuizzes() {
  const { subjectId, resources, subject } = useOutletContext() || {};
  const quizzes = (resources || []).filter((r) => r.type === 'quiz').map((r) => ({ ...r, _subjectId: subjectId }));
  const openFile = () => {};
  const cardStyle = getSubjectCardStyle(subject);

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <h2 className="text-lg font-semibold text-examia-dark mb-3">Quizzes</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((r) => <ResourceCard key={r._id} r={r} openFile={openFile} cardStyle={cardStyle} />)}
      </div>
      {quizzes.length === 0 && <p className="text-examia-mid text-sm">No quizzes for this subject yet.</p>}
    </motion.section>
  );
}

export function SubjectFlashCards() {
  const { subjectId, resources, subject } = useOutletContext() || {};
  const { user } = useAuth();
  const flashcards = (resources || []).filter((r) => r.type === 'flash_cards').map((r) => ({ ...r, _subjectId: subjectId }));
  const [flashCardSummaries, setFlashCardSummaries] = useState({});
  const openFile = () => {};
  const cardStyle = getSubjectCardStyle(subject);

  const flashCardIds = useMemo(() => flashcards.map((f) => f._id), [flashcards]);
  useEffect(() => {
    if (user?.role !== 'student' || flashCardIds.length === 0) return;
    let cancelled = false;
    flashCardIds.forEach((id) => {
      api.get(`/resources/${id}/flash-card-ratings`).then((res) => {
        if (cancelled) return;
        const ratings = res.data.ratings || {};
        const summary = { easy: 0, medium: 0, hard: 0 };
        Object.values(ratings).forEach((v) => {
          const rating = typeof v === 'string' ? v : v?.rating;
          if (summary[rating] !== undefined) summary[rating]++;
        });
        setFlashCardSummaries((prev) => ({ ...prev, [id]: summary }));
      }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [user?.role, flashCardIds]);

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <h2 className="text-lg font-semibold text-examia-dark mb-3">Flashcards</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {flashcards.map((r) => (
          <ResourceCard
            key={r._id}
            r={r}
            openFile={openFile}
            flashCardSummary={user?.role === 'student' ? flashCardSummaries[r._id] : undefined}
            cardStyle={cardStyle}
          />
        ))}
      </div>
      {flashcards.length === 0 && <p className="text-examia-mid text-sm">No flashcards for this subject yet.</p>}
    </motion.section>
  );
}

/** Typing indicator shown while waiting for AI response in chats */
function ChatLoadingBubble() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-examia-soft/20 text-examia-dark border border-examia-soft/40 flex items-center gap-2">
        <span className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-examia-mid animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-examia-mid animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-examia-mid animate-bounce [animation-delay:300ms]" />
        </span>
        <span className="text-sm text-examia-mid">Thinking…</span>
      </div>
    </div>
  );
}

export function SubjectIdeas() {
  const { subject } = useOutletContext() || {};
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !subject?._id || loading) return;
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const conversation = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const { data } = await api.post('/ai/ideas-chat', { subjectId: subject._id, messages: conversation });
      if (data.reply != null) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. ' + (err.response?.data?.message || err.message) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-examia-soft/30 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-examia-soft/30">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-examia-dark/10 text-examia-dark">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </span>
            <div>
              <h2 className="text-xl font-bold text-examia-dark">Idea Generation</h2>
              <p className="text-examia-mid text-sm">Chat to get IA and assessment ideas. The tutor may ask a few questions first, then suggest ideas.</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-[360px] max-h-[60vh]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 text-examia-mid text-sm">
                <p>Start the conversation to get ideas for {subject?.name || 'this subject'}.</p>
                <p className="mt-1">You can describe your interest or constraints; the tutor may ask a few questions before suggesting ideas.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    m.role === 'user'
                      ? 'bg-examia-dark text-white'
                      : 'bg-examia-bg border border-examia-soft/50 text-examia-dark'
                  }`}
                >
                  {m.role === 'user' ? (
                    <MessageContent content={m.content} />
                  ) : (
                    <div className="text-sm font-sans prose prose-sm max-w-none">
                      <MarkdownBlock content={m.content} className="text-examia-dark" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {loading && <ChatLoadingBubble />}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} className="p-4 border-t border-examia-soft/30 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              className="flex-1 rounded-xl border border-examia-soft/60 px-4 py-2.5 text-examia-dark text-sm placeholder:text-examia-mid focus:outline-none focus:ring-2 focus:ring-examia-mid/50"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid disabled:opacity-60 text-sm"
            >
              {loading ? 'Sending…' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </motion.section>
  );
}

export function SubjectStudyLearn() {
  const { subject } = useOutletContext() || {};
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [materialMode, setMaterialMode] = useState('all'); // 'all' | 'selected'
  const [selectedMaterialPaths, setSelectedMaterialPaths] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!subject?._id) return;
    let cancelled = false;
    setFilesLoading(true);
    api
      .get('/materials/subject-files', { params: { subjectId: subject._id } })
      .then((res) => {
        if (!cancelled && res.data?.success && Array.isArray(res.data.files)) setFiles(res.data.files);
      })
      .catch(() => {
        if (!cancelled) setFiles([]);
      })
      .finally(() => {
        if (!cancelled) setFilesLoading(false);
      });
    return () => { cancelled = true; };
  }, [subject?._id]);

  const toggleFile = (relativePath) => {
    setSelectedMaterialPaths((prev) =>
      prev.includes(relativePath) ? prev.filter((p) => p !== relativePath) : [...prev, relativePath]
    );
  };

  const selectAllFiles = () => setSelectedMaterialPaths(files.map((f) => f.relativePath));
  const clearSelection = () => setSelectedMaterialPaths([]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !subject?._id || loading) return;
    if (materialMode === 'selected' && selectedMaterialPaths.length === 0) return;
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const conversation = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const body = { subjectId: subject._id, messages: conversation };
      if (materialMode === 'selected' && selectedMaterialPaths.length > 0) {
        body.selectedMaterialPaths = selectedMaterialPaths;
      }
      const { data } = await api.post('/ai/study-learn/chat', body);
      if (data.reply != null) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. ' + (err.response?.data?.message || err.message) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl shadow-sm border border-examia-soft/30 overflow-hidden flex flex-col"
    >
      <div className="p-6 border-b border-examia-soft/30">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-examia-dark/10 text-examia-dark">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </span>
          <div>
            <h2 className="text-xl font-bold text-examia-dark">Study Lab</h2>
            <p className="text-examia-mid text-sm">Chat with your IB tutor. Choose which materials to use below.</p>
          </div>
        </div>
        {/* Material file selector — segmented control + file cards */}
        <div className="mt-4 pt-4 border-t border-examia-soft/30">
          <p className="text-xs font-medium text-examia-mid uppercase tracking-wide mb-3">Materials scope</p>
          <div className="inline-flex p-1 rounded-xl bg-examia-soft/20 border border-examia-soft/40">
            <button
              type="button"
              onClick={() => setMaterialMode('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                materialMode === 'all'
                  ? 'bg-white text-examia-dark shadow-sm border border-examia-soft/40'
                  : 'text-examia-mid hover:text-examia-dark'
              }`}
            >
              All materials
            </button>
            <button
              type="button"
              onClick={() => setMaterialMode('selected')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                materialMode === 'selected'
                  ? 'bg-white text-examia-dark shadow-sm border border-examia-soft/40'
                  : 'text-examia-mid hover:text-examia-dark'
              }`}
            >
              Selected files
              {materialMode === 'selected' && selectedMaterialPaths.length > 0 && (
                <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-examia-dark text-white text-xs font-semibold flex items-center justify-center">
                  {selectedMaterialPaths.length}
                </span>
              )}
            </button>
          </div>

          {materialMode === 'selected' && (
            <div className="mt-4">
              {filesLoading ? (
                <div className="flex items-center gap-3 py-8 text-examia-mid">
                  <span className="animate-spin rounded-full h-6 w-6 border-2 border-examia-mid border-t-transparent" />
                  <span className="text-sm">Loading materials…</span>
                </div>
              ) : files.length === 0 ? (
                <div className="rounded-xl border border-dashed border-examia-soft/50 bg-examia-soft/10 py-10 px-4 text-center">
                  <svg className="w-10 h-10 mx-auto text-examia-soft mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium text-examia-dark">No materials yet</p>
                  <p className="text-xs text-examia-mid mt-0.5">PDF, DOC, or TXT files for this subject will appear here.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-examia-mid">
                      {selectedMaterialPaths.length} of {files.length} selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllFiles}
                        className="text-xs font-medium text-examia-dark px-3 py-1.5 rounded-lg border border-examia-soft/50 hover:bg-examia-soft/20 transition"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="text-xs font-medium text-examia-mid px-3 py-1.5 rounded-lg hover:bg-examia-soft/20 transition"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-examia-soft/40 bg-examia-bg/50 p-2 space-y-1.5 scrollbar-thin">
                    {files.map((f) => {
                      const isSelected = selectedMaterialPaths.includes(f.relativePath);
                      const ext = (f.name || '').split('.').pop()?.toLowerCase() || '';
                      return (
                        <button
                          key={f.relativePath}
                          type="button"
                          onClick={() => toggleFile(f.relativePath)}
                          className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-examia-dark/5 border-examia-dark/30 shadow-sm'
                              : 'bg-white border-examia-soft/30 hover:border-examia-soft/50 hover:bg-examia-soft/10'
                          }`}
                        >
                          <span
                            className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-examia-dark text-white' : 'bg-examia-soft/30 text-examia-mid'
                            }`}
                          >
                            {ext === 'pdf' ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            )}
                          </span>
                          <span className="flex-1 min-w-0 text-sm font-medium text-examia-dark truncate" title={f.relativePath}>
                            {fileNameWithoutExtension(f.name)}
                          </span>
                          {isSelected && (
                            <span className="shrink-0 w-5 h-5 rounded-full bg-examia-dark text-white flex items-center justify-center">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedMaterialPaths.length === 0 && (
                    <p className="flex items-center gap-2 text-amber-600 text-xs mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200/60">
                      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      Select at least one file to chat.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col min-h-[420px] max-h-[70vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-examia-mid text-sm">
              <p>Ask a question about {subject?.name || 'this subject'}.</p>
              <p className="mt-1">The tutor will use only the uploaded materials and follow DIAGNOSE → HINT → CHECK → REVEAL.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  m.role === 'user'
                    ? 'bg-examia-dark text-white'
                    : 'bg-examia-soft/20 text-examia-dark border border-examia-soft/40'
                }`}
              >
                {m.role === 'user' ? (
                  <MessageContent content={m.content} className="text-sm font-sans m-0 block" />
                ) : (
                  <MarkdownBlock content={m.content} className="text-sm font-sans m-0 block" />
                )}
              </div>
            </motion.div>
          ))}
          {loading && <ChatLoadingBubble />}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} className="p-4 border-t border-examia-soft/30">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(e))}
              placeholder="Ask about this subject…"
              rows={2}
              className="flex-1 rounded-xl border border-examia-soft/50 bg-white text-examia-dark px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-examia-mid focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-3 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid disabled:opacity-50 shrink-0"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </motion.section>
  );
}

/** Guided Feynman Class: student teaches the AI; AI asks clarification questions, then gives diagnostic evaluation (no grades). */
export function SubjectFeynman() {
  const { subject } = useOutletContext() || {};
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !subject?._id || loading) return;
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const conversation = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const { data } = await api.post('/ai/feynman-chat', { subjectId: subject._id, messages: conversation });
      if (data.reply != null) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. ' + (err.response?.data?.message || err.message) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl shadow-sm border border-examia-soft/30 overflow-hidden flex flex-col"
    >
      <div className="p-6 border-b border-examia-soft/30">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-examia-dark/10 text-examia-dark">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </span>
          <div>
            <h2 className="text-xl font-bold text-examia-dark">Teach & Learn</h2>
            <p className="text-examia-mid text-sm">Teach a topic; the agent will ask questions as a curious learner, then evaluate your understanding when you say you&apos;re done.</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col min-h-[420px] max-h-[70vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-examia-mid text-sm">
              <p>Choose a topic and teach it to the Teach & Learn agent.</p>
              <p className="mt-1">After each concept, it will ask clarification questions. When you&apos;re finished, say &quot;I&apos;m done&quot; or &quot;That&apos;s everything&quot; to get a diagnostic evaluation (no grades).</p>
            </div>
          )}
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  m.role === 'user'
                    ? 'bg-examia-dark text-white'
                    : 'bg-examia-soft/20 text-examia-dark border border-examia-soft/40'
                }`}
              >
                {m.role === 'assistant' ? (
                  <MarkdownBlock content={m.content} className="text-sm font-sans m-0 block" />
                ) : (
                  <MessageContent content={m.content} className="text-sm font-sans m-0 block" />
                )}
              </div>
            </motion.div>
          ))}
          {loading && <ChatLoadingBubble />}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} className="p-4 border-t border-examia-soft/30">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(e))}
              placeholder="Explain a concept or say you're done…"
              rows={2}
              className="flex-1 rounded-xl border border-examia-soft/50 bg-white text-examia-dark px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-examia-mid focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-3 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid disabled:opacity-50 shrink-0"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </motion.section>
  );
}

export function SubjectFeedback() {
  const { subject } = useOutletContext() || {};
  const [reviewFile, setReviewFile] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState('');

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewFile) return;
    setReviewLoading(true);
    setReviewFeedback('');
    try {
      const formData = new FormData();
      formData.append('file', reviewFile);
      formData.append('type', subject?.name === 'TOK Essay' ? 'external_assessment' : 'internal_assessment');
      formData.append('subject', subject?.name || '');
      const { data } = await api.post('/ai/review-submission/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReviewFeedback(data.feedback || '');
      setReviewFile(null);
    } catch (err) {
      setReviewFeedback('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/30">
      <h2 className="text-lg font-semibold text-examia-dark mb-2">Feedback Generator</h2>
      <p className="text-examia-mid text-sm mb-4">Upload your Internal Assessment draft (PDF, Word, or TXT) to get AI notes and suggestions.</p>
      <form onSubmit={handleReviewSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-examia-dark mb-1">Upload file (PDF, Word .doc/.docx, or TXT)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(e) => setReviewFile(e.target.files?.[0] || null)}
            className="w-full px-4 py-2 rounded-lg border border-examia-soft/50 bg-white text-examia-dark text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-examia-soft/30 file:text-examia-dark file:font-medium"
          />
          {reviewFile && <p className="text-examia-mid text-sm mt-1">Selected: {fileNameWithoutExtension(reviewFile.name)}</p>}
        </div>
        <button
          type="submit"
          disabled={reviewLoading || !reviewFile}
          className="px-4 py-2 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid disabled:opacity-60"
        >
          {reviewLoading ? 'Getting feedback…' : 'Get feedback'}
        </button>
      </form>
      {reviewFeedback && (
        <div className="mt-4 p-4 rounded-xl bg-examia-soft/20 border border-examia-soft/50">
          <h3 className="font-medium text-examia-dark mb-2">AI feedback</h3>
          <MarkdownBlock content={reviewFeedback} className="text-sm font-sans" />
        </div>
      )}
    </motion.section>
  );
}

/** Split definitions text into sections by letter (A, B, C, ...). Sections start with a line that is a single letter. */
function getDefinitionsSections(fullText) {
  if (!fullText || !fullText.trim()) return { all: '', sections: {}, letters: [] };
  const all = fullText.trim();
  const sections = {};
  const letters = [];
  const lines = fullText.split(/\r?\n/);
  let currentLetter = null;
  let currentLines = [];

  const flush = (letter) => {
    const content = currentLines.join('\n').trim();
    if (content && letter) {
      sections[letter] = content;
      if (!letters.includes(letter)) letters.push(letter);
    }
    currentLines = [];
  };

  for (const line of lines) {
    const singleLetter = /^([A-Z])\s*$/.exec(line);
    if (singleLetter) {
      flush(currentLetter);
      currentLetter = singleLetter[1];
    } else {
      currentLines.push(line);
    }
  }
  flush(currentLetter);
  letters.sort();
  return { all, sections, letters: letters.length ? letters : null };
}

/** Highlight search phrase in text; return array of { text, highlight }. */
function highlightMatches(text, search) {
  if (!search || !search.trim()) return [{ text, highlight: false }];
  const q = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${q})`, 'gi');
  const parts = [];
  let lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push({ text: text.slice(lastIndex, m.index), highlight: false });
    parts.push({ text: m[1], highlight: true });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), highlight: false });
  return parts.length ? parts : [{ text, highlight: false }];
}

/** Definitions tab: list definition files and view content in-app (full-screen with search and A–Z filter). */
export function SubjectDefinitions() {
  const { subjectId } = useParams();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [viewContent, setViewContent] = useState('');
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [letterFilter, setLetterFilter] = useState('all');
  const contentRef = useRef(null);

  const { all, sections, letters } = useMemo(
    () => getDefinitionsSections(viewContent),
    [viewContent]
  );

  const displayedText = useMemo(() => {
    if (letterFilter === 'all' || !letters || !sections[letterFilter]) return all;
    return sections[letterFilter] || all;
  }, [letterFilter, all, sections, letters]);

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return displayedText;
    const q = searchQuery.trim().toLowerCase();
    const lines = displayedText.split('\n');
    const matched = lines.filter((line) => line.toLowerCase().includes(q));
    return matched.join('\n') || displayedText;
  }, [displayedText, searchQuery]);

  useEffect(() => {
    if (!subjectId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get('/materials/definitions', { params: { subjectId } })
      .then((res) => {
        if (!cancelled && res.data?.success) setFiles(res.data.files || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [subjectId]);

  const openView = (relativePath, fileName) => {
    setViewingFile(fileName || relativePath);
    setViewContent('');
    setViewError(null);
    setSearchQuery('');
    setLetterFilter('all');
    setViewLoading(true);
    api
      .get('/materials/definitions/file/content', { params: { path: relativePath || fileName } })
      .then((res) => {
        if (res.data?.success) setViewContent(res.data.content || '');
        else setViewError(res.data?.message || 'Could not load content.');
      })
      .catch((err) => setViewError(err.response?.data?.message || err.message || 'Could not load content.'))
      .finally(() => setViewLoading(false));
  };

  const closeView = () => {
    setViewingFile(null);
    setViewContent('');
    setViewError(null);
    setSearchQuery('');
    setLetterFilter('all');
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <h2 className="text-lg font-semibold text-examia-dark mb-3">Definitions</h2>
      {loading && <p className="text-examia-mid text-sm">Loading…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!loading && !error && files.length === 0 && (
        <div className="rounded-2xl border-2 border-examia-soft/30 bg-examia-soft/5 p-6 text-center">
          <p className="text-examia-dark font-medium">This subject does not have definitions yet.</p>
          <p className="text-examia-mid text-sm mt-1">Check back later or use other resources for this subject.</p>
        </div>
      )}
      {!loading && !error && files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <button
              key={f.relativePath || f.name}
              type="button"
              onClick={() => openView(f.relativePath || f.name, f.name)}
              className="w-full sm:max-w-md flex items-center gap-3 rounded-xl border-2 border-examia-soft/30 bg-white hover:bg-examia-soft/10 hover:border-examia-soft/50 p-4 text-left transition-colors"
            >
              <span className="flex shrink-0 w-10 h-10 rounded-lg bg-examia-dark/10 text-examia-dark flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
              <span className="font-medium text-examia-dark truncate">{fileNameWithoutExtension(f.name || f.relativePath)}</span>
              <span className="ml-auto shrink-0 text-examia-mid">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Full-screen viewer with search and letter filter */}
      {viewingFile && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="definitions-viewer-title"
        >
          <div className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-3 border-b border-examia-soft/30 bg-examia-soft/5">
            <button
              type="button"
              onClick={closeView}
              className="p-2 rounded-lg text-examia-mid hover:bg-examia-soft/20 hover:text-examia-dark transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 id="definitions-viewer-title" className="font-semibold text-examia-dark truncate max-w-[200px] sm:max-w-none">
              {fileNameWithoutExtension(viewingFile)}
            </h3>
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2 sm:gap-3">
              <label className="sr-only" htmlFor="definitions-search">Search definitions</label>
              <input
                id="definitions-search"
                type="search"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[120px] max-w-xs rounded-lg border border-examia-soft/50 bg-white px-3 py-2 text-sm text-examia-dark placeholder:text-examia-mid focus:ring-2 focus:ring-examia-mid focus:border-transparent"
              />
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs font-medium text-examia-mid mr-1">Letter:</span>
                <button
                  type="button"
                  onClick={() => setLetterFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${letterFilter === 'all' ? 'bg-examia-dark text-white' : 'bg-examia-soft/30 text-examia-dark hover:bg-examia-soft/50'}`}
                >
                  All
                </button>
                {letters && letters.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setLetterFilter(letter)}
                    className={`px-2 py-1 rounded-md text-sm font-medium min-w-[2rem] transition-colors ${letterFilter === letter ? 'bg-examia-dark text-white' : 'bg-examia-soft/30 text-examia-dark hover:bg-examia-soft/50'}`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div ref={contentRef} className="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
            {viewLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
              </div>
            )}
            {viewError && !viewLoading && (
              <p className="text-red-600 text-sm py-4">{viewError}</p>
            )}
            {!viewLoading && !viewError && (
              <div className="max-w-4xl mx-auto">
                <pre className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-examia-dark bg-transparent p-0 border-0">
                  {filteredBySearch.split('\n').map((line, i) => {
                    const parts = highlightMatches(line, searchQuery);
                    return (
                      <span key={i} className="block py-0.5">
                        {parts.map((p, j) =>
                          p.highlight ? (
                            <mark key={j} className="bg-amber-200/80 text-examia-dark rounded px-0.5">
                              {p.text}
                            </mark>
                          ) : (
                            <span key={j}>{p.text}</span>
                          )
                        )}
                        {'\n'}
                      </span>
                    );
                  })}
                </pre>
                {searchQuery.trim() && filteredBySearch === displayedText && displayedText.length > 0 && (
                  <p className="text-examia-mid text-xs mt-2">Highlighting matches for “{searchQuery}”</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.section>
  );
}

/** Static “Coming Soon” page for features like Definitions, Command Terms, Checklists. */
export function SubjectChecklists() {
  const { subjectId } = useParams();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [viewContent, setViewContent] = useState('');
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const contentRef = useRef(null);

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return viewContent;
    const q = searchQuery.trim().toLowerCase();
    const lines = viewContent.split('\n');
    const matched = lines.filter((line) => line.toLowerCase().includes(q));
    return matched.join('\n') || viewContent;
  }, [viewContent, searchQuery]);

  /** Group checklist files by first letter of display name (A, B, C, …). */
  const filesByLetter = useMemo(() => {
    const map = {};
    for (const f of files) {
      const displayName = fileNameWithoutExtension(f.name || f.relativePath).trim();
      const first = (displayName[0] || '').toUpperCase();
      const letter = /[A-Z]/.test(first) ? first : /[0-9]/.test(displayName[0]) ? '0-9' : '#';
      if (!map[letter]) map[letter] = [];
      map[letter].push(f);
    }
    const letters = Object.keys(map).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      if (a === '0-9') return 1;
      if (b === '0-9') return -1;
      return a.localeCompare(b);
    });
    return { letters, map };
  }, [files]);

  useEffect(() => {
    if (!subjectId) { setLoading(false); return; }
    let cancelled = false;
    api.get('/materials/checklists', { params: { subjectId } })
      .then((res) => { if (!cancelled && res.data?.success) setFiles(res.data.files || []); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [subjectId]);

  const openView = (relativePath, fileName) => {
    setViewingFile(fileName || relativePath);
    setViewContent('');
    setViewError(null);
    setSearchQuery('');
    setViewLoading(true);
    api.get('/materials/checklists/file/content', { params: { path: relativePath } })
      .then((res) => {
        if (res.data?.success) setViewContent(res.data.content || '');
        else setViewError(res.data?.message || 'Could not load content.');
      })
      .catch((err) => setViewError(err.response?.data?.message || err.message || 'Could not load content.'))
      .finally(() => setViewLoading(false));
  };

  const closeView = () => { setViewingFile(null); setViewContent(''); setViewError(null); setSearchQuery(''); };

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <h2 className="text-lg font-semibold text-examia-dark mb-3">Checklists</h2>
      {loading && <p className="text-examia-mid text-sm">Loading…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!loading && !error && files.length === 0 && (
        <div className="rounded-2xl border-2 border-examia-soft/30 bg-examia-soft/5 p-6 text-center">
          <p className="text-examia-dark font-medium">This subject does not have checklists yet.</p>
          <p className="text-examia-mid text-sm mt-1">Check back later or use other resources for this subject.</p>
        </div>
      )}
      {!loading && !error && files.length > 0 && (
        <div className="space-y-6">
          {filesByLetter.letters.map((letter) => (
            <section key={letter}>
              <h3 className="text-base font-semibold text-examia-dark mb-2 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-examia-dark text-white flex items-center justify-center text-sm font-bold">
                  {letter}
                </span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filesByLetter.map[letter].map((f) => (
                  <button
                    key={f.relativePath || f.name}
                    type="button"
                    onClick={() => openView(f.relativePath, f.name)}
                    className="flex items-center gap-3 rounded-xl border-2 border-examia-soft/30 bg-white hover:bg-examia-soft/10 hover:border-examia-soft/50 p-4 text-left transition-colors min-w-0"
                  >
                    <span className="flex shrink-0 w-10 h-10 rounded-lg bg-examia-dark/10 text-examia-dark flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <span className="font-medium text-examia-dark truncate min-w-0 flex-1">{fileNameWithoutExtension(f.name || f.relativePath)}</span>
                    <span className="shrink-0 text-examia-mid">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {viewingFile && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-modal="true" aria-labelledby="checklists-viewer-title">
          <div className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-3 border-b border-examia-soft/30 bg-examia-soft/5">
            <button type="button" onClick={closeView} className="p-2 rounded-lg text-examia-mid hover:bg-examia-soft/20 hover:text-examia-dark transition-colors" aria-label="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 id="checklists-viewer-title" className="font-semibold text-examia-dark truncate max-w-[200px] sm:max-w-none">{fileNameWithoutExtension(viewingFile)}</h3>
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="checklists-search">Search checklists</label>
              <input
                id="checklists-search"
                type="search"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[120px] max-w-xs rounded-lg border border-examia-soft/50 bg-white px-3 py-2 text-sm text-examia-dark placeholder:text-examia-mid focus:ring-2 focus:ring-examia-mid focus:border-transparent"
              />
            </div>
          </div>
          <div ref={contentRef} className="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
            {viewLoading && <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" /></div>}
            {viewError && !viewLoading && <p className="text-red-600 text-sm py-4">{viewError}</p>}
            {!viewLoading && !viewError && (
              <div className="max-w-4xl mx-auto">
                <pre className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-examia-dark bg-transparent p-0 border-0">
                  {filteredBySearch.split('\n').map((line, i) => {
                    const parts = highlightMatches(line, searchQuery);
                    return (
                      <span key={i} className="block py-0.5">
                        {parts.map((p, j) => p.highlight ? <mark key={j} className="bg-amber-200/80 text-examia-dark rounded px-0.5">{p.text}</mark> : <span key={j}>{p.text}</span>)}
                        {'\n'}
                      </span>
                    );
                  })}
                </pre>
                {searchQuery.trim() && <p className="text-examia-mid text-xs mt-2">Highlighting matches for &quot;{searchQuery}&quot;</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.section>
  );
}

export function ComingSoonPage({ title }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-xl mx-auto"
    >
      <div className="rounded-3xl border-2 border-examia-soft/30 bg-gradient-to-b from-white to-examia-soft/10 shadow-lg overflow-hidden">
        <div className="px-8 pt-12 pb-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-examia-dark/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-examia-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-examia-dark tracking-tight">{title}</h1>
          <p className="mt-3 text-examia-mid text-base">This section is under development. We’ll add it soon so you can use it in your studies.</p>
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200/80">
            <span className="text-amber-700 font-medium text-sm">Coming soon</span>
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div className="px-8 py-4 bg-examia-soft/10 border-t border-examia-soft/30 text-center">
          <p className="text-xs text-examia-mid">Check back later or continue with other Fundamentals.</p>
        </div>
      </div>
    </motion.section>
  );
}
