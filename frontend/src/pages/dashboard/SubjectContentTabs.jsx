import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

/** Renders markdown (headings, bold, lists) for Ideas and other AI text. */
function MarkdownContent({ content, className = '' }) {
  if (!content || typeof content !== 'string') return null;
  return (
    <div className={className}>
      <ReactMarkdown
      components={{
        h1: ({ node, ...p }) => <h1 className="text-xl font-bold text-examia-dark mt-4 mb-2 first:mt-0" {...p} />,
        h2: ({ node, ...p }) => <h2 className="text-lg font-bold text-examia-dark mt-4 mb-2 first:mt-0" {...p} />,
        h3: ({ node, ...p }) => <h3 className="text-base font-semibold text-examia-dark mt-3 mb-1.5 first:mt-0" {...p} />,
        h4: ({ node, ...p }) => <h4 className="text-sm font-semibold text-examia-dark mt-2 mb-1 first:mt-0" {...p} />,
        h5: ({ node, ...p }) => <h5 className="text-sm font-medium text-examia-dark mt-2 mb-1" {...p} />,
        h6: ({ node, ...p }) => <h6 className="text-sm font-medium text-examia-dark mt-2 mb-1" {...p} />,
        p: ({ node, ...p }) => <p className="text-examia-dark text-sm my-1.5 leading-relaxed" {...p} />,
        strong: ({ node, ...p }) => <strong className="font-semibold text-examia-dark" {...p} />,
        ul: ({ node, ...p }) => <ul className="list-disc list-inside my-2 space-y-0.5 text-examia-dark text-sm" {...p} />,
        ol: ({ node, ...p }) => <ol className="list-decimal list-inside my-2 space-y-0.5 text-examia-dark text-sm" {...p} />,
        li: ({ node, ...p }) => <li className="leading-relaxed" {...p} />,
        hr: ({ node, ...p }) => <hr className="border-examia-soft/50 my-3" {...p} />,
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}

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

const typeLabels = { material: 'Material', quiz: 'Quiz', flash_cards: 'Flash cards' };

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

function ResourceCard({ r, openFile, flashCardSummary }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-4 shadow-sm border border-examia-soft/30"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-examia-mid bg-examia-soft/20 px-2 py-1 rounded">{typeLabels[r.type] || r.type}</span>
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
            to={`/content/${r._id}`}
            className="px-3 py-1.5 rounded-lg bg-examia-dark text-white text-sm font-medium hover:bg-examia-mid"
          >
            {r.hasAttempt ? 'See result' : 'Attempt now'}
          </Link>
        )}
        {r.type === 'flash_cards' && (
          <Link
            to={`/content/${r._id}`}
            className="px-3 py-1.5 rounded-lg bg-examia-dark text-white text-sm font-medium hover:bg-examia-mid"
          >
            Study
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export function SubjectMaterials() {
  const { resources } = useOutletContext() || {};
  const materials = (resources || []).filter((r) => r.type === 'material');
  const openFile = (id) => window.open(`/api/resources/${id}/file`, '_blank');

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <h2 className="text-lg font-semibold text-examia-dark mb-3">Materials</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {materials.map((r) => <ResourceCard key={r._id} r={r} openFile={openFile} />)}
      </div>
      {materials.length === 0 && <p className="text-examia-mid text-sm">No materials for this subject yet.</p>}
    </motion.section>
  );
}

export function SubjectQuizzes() {
  const { resources } = useOutletContext() || {};
  const quizzes = (resources || []).filter((r) => r.type === 'quiz');
  const openFile = () => {};

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <h2 className="text-lg font-semibold text-examia-dark mb-3">Quizzes</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((r) => <ResourceCard key={r._id} r={r} openFile={openFile} />)}
      </div>
      {quizzes.length === 0 && <p className="text-examia-mid text-sm">No quizzes for this subject yet.</p>}
    </motion.section>
  );
}

export function SubjectFlashCards() {
  const { resources } = useOutletContext() || {};
  const { user } = useAuth();
  const flashcards = (resources || []).filter((r) => r.type === 'flash_cards');
  const [flashCardSummaries, setFlashCardSummaries] = useState({});
  const openFile = () => {};

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
      <h2 className="text-lg font-semibold text-examia-dark mb-3">Flash cards</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {flashcards.map((r) => (
          <ResourceCard
            key={r._id}
            r={r}
            openFile={openFile}
            flashCardSummary={user?.role === 'student' ? flashCardSummaries[r._id] : undefined}
          />
        ))}
      </div>
      {flashcards.length === 0 && <p className="text-examia-mid text-sm">No flash cards for this subject yet.</p>}
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
              <h2 className="text-xl font-bold text-examia-dark">Ideas chat</h2>
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
                      <MarkdownContent content={m.content} className="text-examia-dark" />
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
            <h2 className="text-xl font-bold text-examia-dark">Study and Learn</h2>
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
                            {f.name}
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
                <MessageContent content={m.content} className="text-sm font-sans m-0 block" />
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
            <h2 className="text-xl font-bold text-examia-dark">Feynman</h2>
            <p className="text-examia-mid text-sm">Teach a topic; the agent will ask questions as a curious learner, then evaluate your understanding when you say you&apos;re done.</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col min-h-[420px] max-h-[70vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-examia-mid text-sm">
              <p>Choose a topic and teach it to the Feynman agent.</p>
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
                  <MarkdownContent content={m.content} className="text-sm font-sans m-0 block" />
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
      formData.append('type', 'internal_assessment');
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
      <h2 className="text-lg font-semibold text-examia-dark mb-2">Internal Assessment — AI feedback</h2>
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
          {reviewFile && <p className="text-examia-mid text-sm mt-1">Selected: {reviewFile.name}</p>}
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
          <pre className="whitespace-pre-wrap text-sm text-examia-dark font-sans">{reviewFeedback}</pre>
        </div>
      )}
    </motion.section>
  );
}
