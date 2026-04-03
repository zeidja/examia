import { useState, useEffect, useMemo, useCallback } from 'react';
import { showError, showSuccess } from '../../utils/swal';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios';

const CATEGORY_ORDER = [
  'generation',
  'utility',
  'ideas',
  'ideas_subject',
  'review',
  'revision_subject',
  'chat',
  'other',
];

const CATEGORY_LABELS = {
  generation: 'Content generation',
  utility: 'Teaching utilities',
  ideas: 'Ideas (generic)',
  ideas_subject: 'Ideas (by subject)',
  review: 'Review (generic)',
  revision_subject: 'Revision coaches',
  chat: 'Chat agents',
  other: 'Other',
};

const EDITOR_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'system', label: 'System prompt' },
  { id: 'user', label: 'User template' },
  { id: 'config', label: 'Config (JSON)' },
  { id: 'extra', label: 'Extra rules' },
];

const PLACEHOLDER_HINTS = [
  { token: '{{subject}}', use: 'Subject name' },
  { token: '{{topic}}', use: 'Topic or focus' },
  { token: '{{count}}', use: 'Item count (e.g. flashcards)' },
  { token: '{{prompt}}', use: 'Free-form TOK prompt' },
  { token: '{{content}}', use: 'Student draft (revision flows)' },
  { token: '{{summary}}', use: 'Quiz report summary' },
  { token: '{{subjectName}}', use: 'Feynman / contextual name' },
];

function categorySortKey(cat) {
  const i = CATEGORY_ORDER.indexOf(cat);
  return i === -1 ? 99 : i;
}

function validateConfigJson(str) {
  const t = (str || '').trim();
  if (!t) return { ok: true, message: '' };
  try {
    JSON.parse(t);
    return { ok: true, message: 'Valid JSON' };
  } catch (e) {
    return { ok: false, message: e.message || 'Invalid JSON' };
  }
}

export function AIPrompts() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editorTab, setEditorTab] = useState('overview');
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [saving, setSaving] = useState(false);
  const [configJsonStatus, setConfigJsonStatus] = useState({ ok: true, message: '' });

  const fetchPrompts = useCallback(() => {
    return api.get('/ai-prompts').then((r) => {
      const list = r.data.prompts || [];
      setPrompts(list);
      return list;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPrompts()
      .then((list) => {
        if (cancelled || !list.length) return;
        setSelectedKey((k) => k || list[0].key);
      })
      .catch(async (err) => {
        if (!cancelled) await showError(err.response?.data?.message || 'Failed to load prompts');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPrompts]);

  const categoriesInUse = useMemo(() => {
    const s = new Set(prompts.map((p) => p.category || 'other'));
    return CATEGORY_ORDER.filter((c) => s.has(c)).concat([...s].filter((c) => !CATEGORY_ORDER.includes(c)).sort());
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prompts
      .filter((p) => categoryFilter === 'all' || (p.category || 'other') === categoryFilter)
      .filter(
        (p) =>
          !q ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.key || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const ca = categorySortKey(a.category || 'other');
        const cb = categorySortKey(b.category || 'other');
        if (ca !== cb) return ca - cb;
        const oa = a.sortOrder ?? 999;
        const ob = b.sortOrder ?? 999;
        if (oa !== ob) return oa - ob;
        return (a.key || '').localeCompare(b.key || '');
      });
  }, [prompts, categoryFilter, search]);

  const selected = useMemo(
    () => prompts.find((p) => p.key === selectedKey) || null,
    [prompts, selectedKey]
  );

  useEffect(() => {
    if (!selected) {
      setForm(null);
      setBaseline(null);
      return;
    }
    const next = {
      name: selected.name || '',
      description: selected.description || '',
      systemPrompt: selected.systemPrompt || '',
      userPromptTemplate: selected.userPromptTemplate || '',
      configJson: selected.configJson || '',
      systemSuffix: selected.systemSuffix || '',
      isActive: selected.isActive !== false,
      category: selected.category || 'other',
      sortOrder: selected.sortOrder ?? 999,
    };
    setForm(next);
    setBaseline(JSON.stringify(next));
    setEditorTab('overview');
    setConfigJsonStatus(validateConfigJson(next.configJson));
  }, [selected]);

  const isDirty = form && baseline && JSON.stringify(form) !== baseline;

  const updateField = (field, value) => {
    setForm((f) => (f ? { ...f, [field]: value } : f));
    if (field === 'configJson') setConfigJsonStatus(validateConfigJson(value));
  };

  const handleSave = async () => {
    if (!selectedKey || !form) return;
    if (!configJsonStatus.ok) {
      await showError('Fix Config (JSON) errors before saving.');
      setEditorTab('config');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/ai-prompts/${selectedKey}`, {
        name: form.name,
        description: form.description,
        systemPrompt: form.systemPrompt,
        userPromptTemplate: form.userPromptTemplate,
        configJson: form.configJson,
        systemSuffix: form.systemSuffix,
        isActive: form.isActive,
        category: form.category,
        sortOrder: Number(form.sortOrder) || 0,
      });
      const list = await fetchPrompts();
      const updated = list.find((p) => p.key === selectedKey);
      if (updated) {
        const b = {
          name: updated.name || '',
          description: updated.description || '',
          systemPrompt: updated.systemPrompt || '',
          userPromptTemplate: updated.userPromptTemplate || '',
          configJson: updated.configJson || '',
          systemSuffix: updated.systemSuffix || '',
          isActive: updated.isActive !== false,
          category: updated.category || 'other',
          sortOrder: updated.sortOrder ?? 999,
        };
        setForm(b);
        setBaseline(JSON.stringify(b));
      }
      await showSuccess('Saved. Changes apply to new AI requests immediately.');
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!baseline) return;
    try {
      const b = JSON.parse(baseline);
      setForm(b);
      setConfigJsonStatus(validateConfigJson(b.configJson));
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading AI configuration…</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-8rem)] max-w-[1600px]"
    >
      {/* Sidebar */}
      <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
        <div className="rounded-2xl border border-examia-soft/25 bg-linear-to-br from-white to-examia-soft/10 p-5 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-examia-dark">AI configuration</h1>
          <p className="text-examia-mid text-sm mt-1 leading-relaxed">
            Edit system prompts, JSON configs, and templates used across Examia. Only Super Admins can access this page.
          </p>
        </div>

        <div className="rounded-2xl border border-examia-soft/20 bg-white p-4 shadow-sm space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-examia-mid">Search</label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, key, description…"
            className="w-full px-3 py-2 rounded-xl border border-examia-soft/40 text-sm focus:ring-2 focus:ring-examia-mid/30 focus:border-examia-mid outline-none"
          />
          <label className="block text-xs font-semibold uppercase tracking-wide text-examia-mid pt-1">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-examia-soft/40 text-sm bg-white focus:ring-2 focus:ring-examia-mid/30 outline-none"
          >
            <option value="all">All categories</option>
            {categoriesInUse.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] || c}
              </option>
            ))}
          </select>
        </div>

        <nav className="rounded-2xl border border-examia-soft/20 bg-white shadow-sm overflow-hidden flex-1 min-h-[200px] max-h-[50vh] lg:max-h-none lg:flex-1 flex flex-col">
          <div className="px-3 py-2 border-b border-examia-soft/15 text-xs font-semibold text-examia-mid uppercase tracking-wide">
            {filteredPrompts.length} prompt{filteredPrompts.length === 1 ? '' : 's'}
          </div>
          <ul className="overflow-y-auto flex-1 p-2 space-y-0.5">
            {filteredPrompts.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={() => setSelectedKey(p.key)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    selectedKey === p.key
                      ? 'bg-examia-dark text-white shadow-md'
                      : 'hover:bg-examia-soft/15 text-examia-dark'
                  }`}
                >
                  <span className="font-medium line-clamp-2">{p.name}</span>
                  <span className={`block text-xs mt-0.5 font-mono truncate ${selectedKey === p.key ? 'text-white/80' : 'text-examia-mid'}`}>
                    {p.key}
                  </span>
                  {p.isActive === false && (
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                      Inactive
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main editor */}
      <main className="flex-1 min-w-0 flex flex-col gap-4">
        {!selected || !form ? (
          <div className="rounded-2xl border-2 border-dashed border-examia-soft/40 bg-examia-soft/5 p-16 text-center">
            <p className="font-semibold text-examia-dark">Select a prompt</p>
            <p className="text-examia-mid text-sm mt-2">Choose an item from the list to edit.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-examia-soft/20 bg-white shadow-sm p-5 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-mono text-examia-mid mb-1">{selected.key}</p>
                  <input
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="text-2xl font-bold text-examia-dark bg-transparent border-b border-transparent hover:border-examia-soft/40 focus:border-examia-mid outline-none w-full max-w-xl"
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-xs px-2 py-1 rounded-lg bg-examia-soft/20 text-examia-dark">
                      {CATEGORY_LABELS[form.category] || form.category}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-lg ${form.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
                      {form.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={!isDirty}
                    className="px-4 py-2 rounded-xl text-sm font-medium border border-examia-soft/40 text-examia-dark hover:bg-examia-soft/10 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-examia-dark text-white hover:opacity-95 disabled:opacity-50 disabled:pointer-events-none shadow-md"
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-6 border-b border-examia-soft/20 pb-px">
                {EDITOR_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEditorTab(t.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-t-xl transition-colors ${
                      editorTab === t.id
                        ? 'bg-examia-soft/25 text-examia-dark border border-b-0 border-examia-soft/25 -mb-px'
                        : 'text-examia-mid hover:text-examia-dark hover:bg-examia-soft/10'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={editorTab + selectedKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-examia-soft/20 bg-white shadow-sm p-5 lg:p-6 flex-1"
              >
                {editorTab === 'overview' && (
                  <div className="space-y-6 max-w-3xl">
                    <div>
                      <label className="block text-sm font-medium text-examia-dark mb-2">Description</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-examia-soft/40 text-sm leading-relaxed focus:ring-2 focus:ring-examia-mid/25 outline-none"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-examia-dark mb-2">Category (UI)</label>
                        <select
                          value={form.category}
                          onChange={(e) => updateField('category', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-examia-soft/40 text-sm"
                        >
                          {CATEGORY_ORDER.map((c) => (
                            <option key={c} value={c}>
                              {CATEGORY_LABELS[c] || c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-examia-dark mb-2">Sort order</label>
                        <input
                          type="number"
                          value={form.sortOrder}
                          onChange={(e) => updateField('sortOrder', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-examia-soft/40 text-sm font-mono"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => updateField('isActive', e.target.checked)}
                        className="rounded border-examia-soft/50 text-examia-dark focus:ring-examia-mid w-4 h-4"
                      />
                      <span className="text-sm text-examia-dark">
                        <strong className="font-semibold">Active</strong>
                        <span className="text-examia-mid"> — inactive prompts are not used by the platform.</span>
                      </span>
                    </label>

                    <div className="rounded-xl bg-examia-soft/10 border border-examia-soft/25 p-4">
                      <p className="text-sm font-semibold text-examia-dark mb-2">Template placeholders</p>
                      <p className="text-xs text-examia-mid mb-3">Use in the user template (and sometimes system text) as exact tokens:</p>
                      <ul className="grid sm:grid-cols-2 gap-2 text-xs">
                        {PLACEHOLDER_HINTS.map((h) => (
                          <li key={h.token} className="font-mono bg-white/80 px-2 py-1.5 rounded-lg border border-examia-soft/20">
                            <span className="text-examia-dark">{h.token}</span>
                            <span className="text-examia-mid"> — {h.use}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {editorTab === 'system' && (
                  <div>
                    <p className="text-sm text-examia-mid mb-3">
                      Main model instructions. Large subject configs are often split into the Config tab.
                    </p>
                    <textarea
                      value={form.systemPrompt}
                      onChange={(e) => updateField('systemPrompt', e.target.value)}
                      spellCheck={false}
                      className="w-full min-h-[min(70vh,520px)] px-4 py-3 rounded-xl border border-examia-soft/40 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-examia-mid/25 outline-none resize-y"
                    />
                    <p className="text-xs text-examia-mid mt-2">{form.systemPrompt.length.toLocaleString()} characters</p>
                  </div>
                )}

                {editorTab === 'user' && (
                  <div>
                    <p className="text-sm text-examia-mid mb-3">
                      User message template. Leave empty for flows that build the user message in code (some IA idea generators).
                    </p>
                    <textarea
                      value={form.userPromptTemplate}
                      onChange={(e) => updateField('userPromptTemplate', e.target.value)}
                      spellCheck={false}
                      className="w-full min-h-[min(50vh,360px)] px-4 py-3 rounded-xl border border-examia-soft/40 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-examia-mid/25 outline-none resize-y"
                    />
                    <p className="text-xs text-examia-mid mt-2">{form.userPromptTemplate.length.toLocaleString()} characters</p>
                  </div>
                )}

                {editorTab === 'config' && (
                  <div>
                    <p className="text-sm text-examia-mid mb-3">
                      Structured configuration appended after the system prompt (IB IA generators, revision coaches). Must be valid JSON when non-empty.
                    </p>
                    <textarea
                      value={form.configJson}
                      onChange={(e) => updateField('configJson', e.target.value)}
                      spellCheck={false}
                      className={`w-full min-h-[min(70vh,520px)] px-4 py-3 rounded-xl border font-mono text-sm leading-relaxed focus:ring-2 outline-none resize-y ${
                        configJsonStatus.ok ? 'border-examia-soft/40 focus:ring-examia-mid/25' : 'border-red-300 focus:ring-red-200'
                      }`}
                    />
                    <p className={`text-xs mt-2 ${configJsonStatus.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                      {configJsonStatus.message || (form.configJson.trim() ? 'Valid JSON' : 'Empty — OK')}
                    </p>
                  </div>
                )}

                {editorTab === 'extra' && (
                  <div>
                    <p className="text-sm text-examia-mid mb-3">
                      Additional system text appended after the config block (e.g. quiz rationale reminder).
                    </p>
                    <textarea
                      value={form.systemSuffix}
                      onChange={(e) => updateField('systemSuffix', e.target.value)}
                      spellCheck={false}
                      className="w-full min-h-[200px] px-4 py-3 rounded-xl border border-examia-soft/40 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-examia-mid/25 outline-none resize-y"
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </main>
    </motion.div>
  );
}
