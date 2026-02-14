import { useState, useEffect, useMemo } from 'react';
import { showError } from '../../utils/swal';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const tabs = [
  { id: 'flash_cards', label: 'Flash Cards', path: 'flash-cards' },
  { id: 'quizzes', label: 'Quizzes', path: 'quizzes' },
  { id: 'tok', label: 'Theory of Knowledge', path: 'tok' },
  { id: 'external_assessment', label: 'External Assessment', path: 'external-assessment' },
  { id: 'internal_assessment', label: 'Internal Assessment', path: 'internal-assessment' },
];

function tabIdFromPath(pathSegment) {
  const t = tabs.find((tab) => tab.path === pathSegment);
  return t ? t.id : 'flash_cards';
}

const canGenerate = (role) => ['super_admin', 'school_admin', 'teacher'].includes(role);

/** Try to parse AI result as JSON (strip markdown code blocks if present) */
function tryParseResult(raw, type) {
  if (!raw || typeof raw !== 'string' || raw.startsWith('Error:')) return { parsed: false, data: null };
  let str = raw.trim();
  const codeBlock = str.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (codeBlock) str = codeBlock[1].trim();
  try {
    const data = JSON.parse(str);
    if (type === 'flash_cards' && Array.isArray(data) && data.length > 0) {
      const valid = data.every((c) => c && typeof (c.front ?? c.question) !== 'undefined' && typeof (c.back ?? c.answer) !== 'undefined');
      if (valid) return { parsed: true, data: data.map((c) => ({ front: c.front ?? c.question, back: c.back ?? c.answer })) };
    }
    if (type === 'quizzes' && data && Array.isArray(data.questions)) {
      return { parsed: true, data: data.questions };
    }
    if (type === 'flash_cards' && Array.isArray(data)) return { parsed: true, data };
  } catch {
    // ignore
  }
  return { parsed: false, data: null };
}

/** Preview component for parsed flash cards */
function FlashCardsPreview({ data }) {
  if (!data || !data.length) return null;
  return (
    <div className="rounded-xl border border-examia-soft/50 bg-examia-bg overflow-hidden">
      <div className="px-4 py-2 border-b border-examia-soft/30 bg-examia-soft/20 text-sm font-medium text-examia-dark">
        {data.length} card{data.length !== 1 ? 's' : ''}
      </div>
      <div className="p-4 max-h-[420px] overflow-y-auto grid gap-4 sm:grid-cols-2">
        {data.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-white rounded-xl border border-examia-soft/40 shadow-sm overflow-hidden"
          >
            <div className="p-4 border-b border-examia-soft/30 bg-examia-soft/10">
              <span className="text-xs font-medium text-examia-mid">Card {i + 1}</span>
              <p className="mt-1 text-examia-dark font-medium">{card.front}</p>
            </div>
            <div className="p-4">
              <p className="text-sm text-examia-mid">Answer</p>
              <p className="mt-0.5 text-examia-dark">{card.back}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** Preview component for parsed quiz (questions with options; correct index shown for teacher) */
function QuizPreview({ data }) {
  if (!data || !data.length) return null;
  return (
    <div className="rounded-xl border border-examia-soft/50 bg-examia-bg overflow-hidden">
      <div className="px-4 py-2 border-b border-examia-soft/30 bg-examia-soft/20 text-sm font-medium text-examia-dark">
        {data.length} question{data.length !== 1 ? 's' : ''}
      </div>
      <div className="p-4 max-h-[420px] overflow-y-auto space-y-6">
        {data.map((q, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-white rounded-xl border border-examia-soft/40 shadow-sm p-4"
          >
            <p className="text-sm font-medium text-examia-mid mb-1">Question {i + 1}</p>
            <p className="text-examia-dark font-medium mb-3">{q.question}</p>
            <ul className="space-y-2">
              {(q.options || []).map((opt, j) => (
                <li
                  key={j}
                  className={`flex items-center gap-2 text-sm py-1.5 px-3 rounded-lg ${
                    Number(q.correct) === j ? 'bg-examia-soft/30 text-examia-dark font-medium' : 'text-examia-mid'
                  }`}
                >
                  <span className="shrink-0 w-6 h-6 rounded-full bg-examia-soft/40 flex items-center justify-center text-xs font-medium">
                    {String.fromCharCode(65 + j)}
                  </span>
                  {opt}
                  {Number(q.correct) === j && (
                    <span className="text-xs text-examia-mid ml-1">(correct)</span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** Normalize quiz item to { question, options, correct, rationale } (accept rationale or explanation from AI). */
function normalizeQuizItem(q) {
  return {
    question: String(q?.question ?? ''),
    options: Array.isArray(q?.options) ? q.options.map((o) => String(o ?? '')) : ['', ''],
    correct: typeof q?.correct === 'number' && q.correct >= 0 ? q.correct : 0,
    rationale: String(q?.rationale ?? q?.explanation ?? ''),
  };
}

/** Editable quiz editor: form-based UI to edit questions, options, and correct answer. */
function QuizEditor({ data, onChange }) {
  const items = (data || []).map(normalizeQuizItem);
  if (!items.length) return null;

  const updateItem = (index, patch) => {
    const next = items.map((q, i) => (i === index ? { ...q, ...patch } : q));
    onChange(next);
  };

  const updateOption = (qIndex, optIndex, value) => {
    const q = items[qIndex];
    const options = [...(q.options || [])];
    options[optIndex] = value;
    updateItem(qIndex, { options });
  };

  const addOption = (qIndex) => {
    const q = items[qIndex];
    updateItem(qIndex, { options: [...(q.options || []), ''] });
  };

  const removeOption = (qIndex, optIndex) => {
    const q = items[qIndex];
    const options = (q.options || []).filter((_, j) => j !== optIndex);
    const correct = options.length <= q.correct ? Math.max(0, options.length - 1) : q.correct;
    updateItem(qIndex, { options, correct });
  };

  const addQuestion = () => {
    onChange([...items, { question: '', options: ['', ''], correct: 0, rationale: '' }]);
  };

  const removeQuestion = (index) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length ? next : [{ question: '', options: ['', ''], correct: 0, rationale: '' }]);
  };

  return (
    <div className="rounded-xl border border-examia-soft/50 bg-examia-bg overflow-hidden">
      <div className="px-4 py-3 border-b border-examia-soft/30 bg-examia-soft/20 flex items-center justify-between">
        <span className="text-sm font-medium text-examia-dark">
          {items.length} question{items.length !== 1 ? 's' : ''} — edit below, then save
        </span>
        <button
          type="button"
          onClick={addQuestion}
          className="text-sm font-medium text-examia-dark hover:text-examia-mid px-3 py-1.5 rounded-lg border border-examia-soft/50 hover:bg-examia-soft/20 transition"
        >
          + Add question
        </button>
      </div>
      <div className="p-4 max-h-[60vh] overflow-y-auto space-y-6">
        {items.map((q, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-examia-soft/40 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-examia-soft/30 bg-examia-soft/10">
              <span className="text-sm font-semibold text-examia-dark">Question {i + 1}</span>
              <button
                type="button"
                onClick={() => removeQuestion(i)}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
                title="Remove question"
              >
                Remove
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-examia-mid mb-1">Question text</label>
                <textarea
                  value={q.question}
                  onChange={(e) => updateItem(i, { question: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-examia-soft/50 bg-white text-examia-dark text-sm placeholder:text-examia-mid focus:ring-2 focus:ring-examia-mid/30 focus:border-examia-mid"
                  placeholder="Enter the question…"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-examia-mid mb-2">Answer options</label>
                <div className="space-y-2">
                  {(q.options || []).map((opt, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-examia-soft/40 flex items-center justify-center text-xs font-medium text-examia-dark">
                        {String.fromCharCode(65 + j)}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(i, j, e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-examia-soft/50 bg-white text-examia-dark text-sm placeholder:text-examia-mid focus:ring-2 focus:ring-examia-mid/30 focus:border-examia-mid"
                        placeholder={`Option ${String.fromCharCode(65 + j)}`}
                      />
                      <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
                        <input
                          type="radio"
                          name={`correct-${i}`}
                          checked={Number(q.correct) === j}
                          onChange={() => updateItem(i, { correct: j })}
                          className="text-examia-dark focus:ring-examia-mid"
                        />
                        <span className="text-xs text-examia-mid">Correct</span>
                      </label>
                      {(q.options || []).length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i, j)}
                          className="text-xs text-red-600 hover:text-red-700 p-1"
                          title="Remove option"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addOption(i)}
                  className="mt-2 text-xs font-medium text-examia-mid hover:text-examia-dark"
                >
                  + Add option
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-examia-mid mb-1">Rationale (optional)</label>
                <textarea
                  value={q.rationale}
                  onChange={(e) => updateItem(i, { rationale: e.target.value })}
                  rows={1}
                  className="w-full px-3 py-2 rounded-lg border border-examia-soft/50 bg-white text-examia-dark text-sm placeholder:text-examia-mid focus:ring-2 focus:ring-examia-mid/30 focus:border-examia-mid"
                  placeholder="Why this answer is correct (shown after attempt)"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** Flatten materials tree to list of files { title, relativePath } */
function flattenMaterialFiles(node) {
  if (!node) return [];
  if (node.type === 'file' && node.relativePath) {
    return [{ title: node.name, relativePath: node.relativePath }];
  }
  if (node.children && node.children.length) {
    return node.children.flatMap((c) => flattenMaterialFiles(c));
  }
  return [];
}

export function AITools() {
  const { user } = useAuth();
  const { tabId: tabParam } = useParams();
  const navigate = useNavigate();
  const activeTab = tabIdFromPath(tabParam);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [myResources, setMyResources] = useState([]);
  const [materialsTree, setMaterialsTree] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultByTab, setResultByTab] = useState({}); // one result per tab: { flash_cards: '...', quizzes: '...', ... }
  const [showRawEdit, setShowRawEdit] = useState(false);
  const [saveForm, setSaveForm] = useState({ title: '', class: '', deadline: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    topic: '',
    count: 10,
    prompt: '',
    sourceType: '', // '' | 'my_materials' | 'platform_materials'
    selectedFile: '', // resourceId (when my_materials) or relativePath (when platform_materials)
  });

  const validPaths = useMemo(() => tabs.map((t) => t.path), []);
  const teacherOnlyPaths = useMemo(() => ['flash-cards', 'quizzes'], []); // IA, EA, TOK are for students (upload & get feedback)
  useEffect(() => {
    if (tabParam && !validPaths.includes(tabParam)) {
      navigate('/ai/flash-cards', { replace: true });
      return;
    }
    if ((user?.role === 'teacher' || user?.role === 'school_admin') && tabParam && !teacherOnlyPaths.includes(tabParam)) {
      navigate('/ai/flash-cards', { replace: true });
    }
  }, [tabParam, validPaths, teacherOnlyPaths, user?.role, navigate]);

  const isFlashOrQuiz = activeTab === 'flash_cards' || activeTab === 'quizzes';

  const materialFiles = useMemo(() => {
    if (!materialsTree?.tree?.children) return [];
    return flattenMaterialFiles({ children: materialsTree.tree.children });
  }, [materialsTree]);

  const myMaterialResources = useMemo(() => {
    return (myResources || []).filter((r) => r.type === 'material');
  }, [myResources]);

  /** My uploads filtered by selected subject (by subject name) */
  const myMaterialResourcesBySubject = useMemo(() => {
    if (!form.subject) return [];
    return myMaterialResources.filter(
      (r) => (r.subject?.name || r.subject) === form.subject
    );
  }, [myMaterialResources, form.subject]);

  /** Platform materials filtered by selected subject (first path segment = subject folder name) */
  const materialFilesBySubject = useMemo(() => {
    if (!form.subject) return [];
    return materialFiles.filter(
      (f) => f.relativePath === form.subject || f.relativePath.startsWith(form.subject + '/')
    );
  }, [materialFiles, form.subject]);

  /** Teachers can only use their assigned subject; admins see all subjects */
  const subjectsForSelect = useMemo(() => {
    if (user?.role !== 'teacher' || !user?.subject) return subjects;
    const subId = (user.subject?._id || user.subject)?.toString();
    const match = (subjects || []).filter((s) => (s._id || s.id)?.toString() === subId);
    if (match.length) return match;
    return [{ _id: user.subject?._id || user.subject, name: user.subject?.name || 'My subject' }];
  }, [subjects, user?.role, user?.subject]);

  useEffect(() => {
    api.get('/subjects').then((r) => setSubjects(r.data.subjects || [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (user?.role === 'teacher' && user?.subject && subjects.length > 0) {
      const subName = user.subject?.name ?? (subjects.find((s) => (s._id || s.id)?.toString() === (user.subject?._id || user.subject)?.toString())?.name);
      if (subName) setForm((f) => (f.subject ? f : { ...f, subject: subName }));
    }
  }, [user?.role, user?.subject, subjects]);
  useEffect(() => {
    if (canGenerate(user?.role)) api.get('/classes').then((r) => setClasses(r.data.classes || [])).catch(() => {});
  }, [user?.role]);
  useEffect(() => {
    if (canGenerate(user?.role) && isFlashOrQuiz) {
      api.get('/resources').then((r) => setMyResources(r.data.resources || [])).catch(() => setMyResources([]));
      api.get('/materials/tree').then((r) => setMaterialsTree(r.data)).catch(() => setMaterialsTree(null));
    }
  }, [user?.role, activeTab]);

  const hasMaterialSelected =
    (form.sourceType === 'my_materials' && form.selectedFile) || (form.sourceType === 'platform_materials' && form.selectedFile);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFlashOrQuiz && !hasMaterialSelected) {
      await showError('You must select a material (My uploads or Platform materials) to generate from.');
      return;
    }
    setResultByTab((prev) => ({ ...prev, [activeTab]: '' }));
    setSaved(false);
    setLoading(true);
    try {
      if (activeTab === 'flash_cards') {
        const body = { subject: form.subject, topic: form.topic, count: form.count };
        if (form.sourceType === 'my_materials' && form.selectedFile) {
          body.sourceType = 'my_materials';
          body.resourceId = form.selectedFile;
        } else if (form.sourceType === 'platform_materials' && form.selectedFile) {
          body.sourceType = 'platform_materials';
          body.materialPath = form.selectedFile;
        }
        const { data } = await api.post('/ai/flash-cards', body);
        setResultByTab((prev) => ({ ...prev, [activeTab]: data.content || '' }));
      } else if (activeTab === 'quizzes') {
        const body = { subject: form.subject, topic: form.topic, count: form.count };
        if (form.sourceType === 'my_materials' && form.selectedFile) {
          body.sourceType = 'my_materials';
          body.resourceId = form.selectedFile;
        } else if (form.sourceType === 'platform_materials' && form.selectedFile) {
          body.sourceType = 'platform_materials';
          body.materialPath = form.selectedFile;
        }
        const { data } = await api.post('/ai/quizzes', body);
        setResultByTab((prev) => ({ ...prev, [activeTab]: data.content || '' }));
      } else if (activeTab === 'tok') {
        const { data } = await api.post('/ai/tok', { prompt: form.prompt });
        setResultByTab((prev) => ({ ...prev, [activeTab]: data.content || '' }));
      } else if (activeTab === 'external_assessment') {
        const { data } = await api.post('/ai/external-assessment', { subject: form.subject, topic: form.topic });
        setResultByTab((prev) => ({ ...prev, [activeTab]: data.content || '' }));
      } else if (activeTab === 'internal_assessment') {
        const { data } = await api.post('/ai/internal-assessment', { subject: form.subject, topic: form.topic });
        setResultByTab((prev) => ({ ...prev, [activeTab]: data.content || '' }));
      }
    } catch (err) {
      setResultByTab((prev) => ({ ...prev, [activeTab]: 'Error: ' + (err.response?.data?.message || err.message) }));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResource = async (e) => {
    e.preventDefault();
    const currentResult = resultByTab[activeTab];
    if (!saveForm.title || !saveForm.class || !currentResult) return;
    setSaving(true);
    try {
      const type = activeTab === 'flash_cards' ? 'flash_cards' : activeTab === 'quizzes' ? 'quiz' : null;
      if (!type) return;
      const subjectId = form.subject ? (subjects.find((s) => s.name === form.subject)?._id || null) : null;
      await api.post('/resources', {
        type,
        title: saveForm.title.trim(),
        content: currentResult,
        class: saveForm.class,
        subject: subjectId || undefined,
        deadline: saveForm.deadline || undefined,
      });
      setSaved(true);
      setSaveForm({ title: '', class: '', deadline: '' });
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role === 'student') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold text-examia-dark mb-2">Generate Quiz & Flash cards</h1>
        <p className="text-examia-mid mb-6">Only teachers can generate quizzes and flash cards. You can view and use content that your teacher has assigned to your class.</p>
        <Link to="/content" className="inline-flex px-4 py-2 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid">
          Go to My content
        </Link>
      </motion.div>
    );
  }

  const result = resultByTab[activeTab] ?? '';
  const showSaveOption = canGenerate(user?.role) && result && (activeTab === 'flash_cards' || activeTab === 'quizzes');
  const currentTabLabel = tabs.find((t) => t.id === activeTab)?.label || 'Generate';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <h1 className="text-2xl font-bold text-examia-dark mb-2">{currentTabLabel}</h1>
      <p className="text-examia-mid mb-8">Select a subject, topic, and a material (My uploads or Platform materials) — material is required. Generate with AI, edit the result if needed, then save and publish for students.</p>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/30">
        <form onSubmit={handleSubmit} className="space-y-4">
          {(activeTab === 'flash_cards' || activeTab === 'quizzes' || activeTab === 'external_assessment' || activeTab === 'internal_assessment') && (
            <>
              <div>
                <label className="block text-sm font-medium text-examia-dark mb-1">Subject</label>
                <select
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      subject: e.target.value,
                      selectedFile: '',
                    }))
                  }
                  className="w-full px-4 py-2 rounded-lg border border-examia-soft/50 bg-white text-examia-dark"
                  disabled={user?.role === 'teacher' && user?.subject}
                >
                  <option value="">Select subject</option>
                  {subjectsForSelect.map((s) => (
                    <option key={s._id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                {user?.role === 'teacher' && user?.subject && (
                  <p className="text-xs text-examia-mid mt-1">You can only generate content for your assigned subject.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-examia-dark mb-1">Topic</label>
                <input
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  placeholder="e.g. Cell division, Microeconomics"
                  className="w-full px-4 py-2 rounded-lg border border-examia-soft/50 bg-white text-examia-dark"
                />
              </div>
              {(activeTab === 'flash_cards' || activeTab === 'quizzes') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-examia-dark mb-1">Content source (required)</label>
                    <p className="text-xs text-examia-mid mb-2">You must select a material to generate from. Topic is used as additional context.</p>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sourceType"
                          checked={form.sourceType === 'my_materials'}
                          onChange={() => setForm((f) => ({ ...f, sourceType: 'my_materials', selectedFile: '' }))}
                          className="text-examia-dark"
                        />
                        <span className="text-examia-dark">My uploads</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sourceType"
                          checked={form.sourceType === 'platform_materials'}
                          onChange={() => setForm((f) => ({ ...f, sourceType: 'platform_materials', selectedFile: '' }))}
                          className="text-examia-dark"
                        />
                        <span className="text-examia-dark">Platform materials</span>
                      </label>
                    </div>
                  </div>
                  {form.subject && (form.sourceType === 'my_materials' || form.sourceType === 'platform_materials') && (
                    <div>
                      <label className="block text-sm font-medium text-examia-dark mb-1">Select material (required)</label>
                      <select
                        value={form.selectedFile}
                        onChange={(e) => setForm((f) => ({ ...f, selectedFile: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-examia-soft/50 bg-white text-examia-dark"
                        required
                      >
                        <option value="">Select a file</option>
                        {form.sourceType === 'my_materials' &&
                          myMaterialResourcesBySubject.map((r) => (
                            <option key={r._id} value={r._id}>{r.title}</option>
                          ))}
                        {form.sourceType === 'platform_materials' &&
                          materialFilesBySubject.map((f) => (
                            <option key={f.relativePath} value={f.relativePath}>{f.title}</option>
                          ))}
                      </select>
                      {form.sourceType === 'my_materials' && myMaterialResourcesBySubject.length === 0 && (
                        <p className="text-sm text-examia-mid mt-1">No uploads for this subject. Upload in <Link to="/resources" className="underline">My resources</Link> first.</p>
                      )}
                      {form.sourceType === 'platform_materials' && materialFilesBySubject.length === 0 && (
                        <p className="text-sm text-examia-mid mt-1">No platform materials for this subject. Ask Super Admin to add files to the materials folder.</p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-examia-dark mb-1">Count</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={form.count}
                      onChange={(e) => setForm((f) => ({ ...f, count: Number(e.target.value) || 10 }))}
                      className="w-full px-4 py-2 rounded-lg border border-examia-soft/50 bg-white text-examia-dark"
                    />
                  </div>
                </>
              )}
            </>
          )}
          {activeTab === 'tok' && (
            <div>
              <label className="block text-sm font-medium text-examia-dark mb-1">Your question or prompt</label>
              <textarea
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                rows={4}
                placeholder="e.g. How does emotion influence reason in the pursuit of knowledge?"
                className="w-full px-4 py-2 rounded-lg border border-examia-soft/50 bg-white text-examia-dark"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading || (isFlashOrQuiz && !hasMaterialSelected)}
            className="px-6 py-2 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid disabled:opacity-60 transition"
          >
            {loading ? 'Generating…' : isFlashOrQuiz && !hasMaterialSelected ? 'Select a material to generate' : 'Generate'}
          </button>
        </form>

        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-examia-dark">
                {activeTab === 'flash_cards' ? 'Flash cards' : activeTab === 'quizzes' ? 'Quiz' : 'Result'} — edit if needed, then save and publish
              </h3>
              <button
                type="button"
                onClick={() => setShowRawEdit((v) => !v)}
                className="text-sm font-medium text-examia-mid hover:text-examia-dark"
              >
                {showRawEdit
                  ? (activeTab === 'quizzes' && tryParseResult(result, 'quizzes').parsed ? 'Back to form' : 'Back to preview')
                  : activeTab === 'quizzes' ? 'Edit as JSON' : 'Edit content (raw)'}
              </button>
            </div>

            {showRawEdit ? (
              <textarea
                value={result}
                onChange={(e) => setResultByTab((prev) => ({ ...prev, [activeTab]: e.target.value }))}
                className="w-full whitespace-pre-wrap text-sm text-examia-dark font-sans overflow-x-auto min-h-[200px] max-h-[420px] p-4 rounded-xl bg-examia-bg border border-examia-soft/50 resize-y"
                placeholder="Generated content…"
                spellCheck={false}
              />
            ) : activeTab === 'flash_cards' && tryParseResult(result, 'flash_cards').parsed ? (
              <FlashCardsPreview data={tryParseResult(result, 'flash_cards').data} />
            ) : activeTab === 'quizzes' && tryParseResult(result, 'quizzes').parsed ? (
              <QuizEditor
                data={tryParseResult(result, 'quizzes').data}
                onChange={(newQuestions) =>
                  setResultByTab((prev) => ({
                    ...prev,
                    [activeTab]: JSON.stringify({ questions: newQuestions }, null, 2),
                  }))
                }
              />
            ) : (
              <div className="rounded-xl bg-examia-bg border border-examia-soft/50 p-4 max-h-[420px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-examia-dark font-sans">{result}</pre>
                <p className="text-xs text-examia-mid mt-2">
                  {activeTab === 'quizzes'
                    ? 'Could not parse as quiz. Use &quot;Edit as JSON&quot; to fix the format, or regenerate.'
                    : 'Could not parse as cards/quiz. Use &quot;Edit content (raw)&quot; to modify.'}
                </p>
              </div>
            )}

            {showSaveOption && (
              <form onSubmit={handleSaveResource} className="p-4 rounded-xl bg-examia-soft/20 border border-examia-soft/50 space-y-3">
                <h4 className="font-medium text-examia-dark">Assign to class & save</h4>
                <p className="text-sm text-examia-dark">Save this (with any edits) so you can assign it to a class and publish it for students.</p>
                <div className="flex flex-wrap gap-3">
                  <input
                    required
                    placeholder="Title (e.g. Cell division quiz)"
                    value={saveForm.title}
                    onChange={(e) => setSaveForm((f) => ({ ...f, title: e.target.value }))}
                    className="px-4 py-2 rounded-lg border border-examia-soft/50 bg-white text-examia-dark flex-1 min-w-[200px]"
                  />
                  <select
                    required
                    value={saveForm.class}
                    onChange={(e) => setSaveForm((f) => ({ ...f, class: e.target.value }))}
                    className="px-4 py-2 rounded-lg border border-examia-soft/50 bg-white text-examia-dark"
                  >
                    <option value="">Select class</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    placeholder="Deadline (optional)"
                    value={saveForm.deadline}
                    onChange={(e) => setSaveForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="px-4 py-2 rounded-lg border border-examia-soft/50 bg-white text-examia-dark"
                  />
                  <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-examia-dark text-white font-medium disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
                {saved && <p className="text-sm text-examia-dark">Saved. Go to <Link to="/resources" className="font-medium underline">My resources</Link> to publish it for students.</p>}
              </form>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
