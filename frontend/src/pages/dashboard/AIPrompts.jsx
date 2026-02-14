import { useState, useEffect } from 'react';
import { showError } from '../../utils/swal';
import { motion } from 'framer-motion';
import api from '../../api/axios';

const keyLabels = {
  flash_cards: 'Flash Cards',
  quizzes: 'Quizzes',
  tok: 'Theory of Knowledge',
  external_assessment: 'External Assessment',
  internal_assessment: 'Internal Assessment',
};

export function AIPrompts() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ systemPrompt: '', userPromptTemplate: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/ai-prompts').then((r) => setPrompts(r.data.prompts || [])).finally(() => setLoading(false));
  }, []);

  const startEdit = (p) => {
    setEditing(p.key);
    setForm({ systemPrompt: p.systemPrompt || '', userPromptTemplate: p.userPromptTemplate || '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/ai-prompts/${editing}`, form);
      const { data } = await api.get('/ai-prompts');
      setPrompts(data.prompts || []);
      setEditing(null);
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading AI prompts…</p>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-examia-dark">AI Prompts</h1>
        <p className="text-examia-mid mt-1 text-sm">Configure system and user prompt templates for each AI feature. Use placeholders like {"{{subject}}"}, {"{{topic}}"}, {"{{count}}"}, {"{{prompt}}"}.</p>
      </div>
      <div className="space-y-4">
        {prompts.map((p) => (
          <motion.div
            key={p.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-examia-dark">{keyLabels[p.key] || p.name}</h3>
              {editing !== p.key ? (
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="text-sm text-examia-mid hover:text-examia-dark font-medium"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="text-sm text-examia-mid hover:text-examia-dark"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="text-sm text-examia-mid hover:text-examia-dark font-medium disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            {editing === p.key ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-examia-dark mb-1">System prompt</label>
                  <textarea
                    value={form.systemPrompt}
                    onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border border-examia-soft/50 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-examia-dark mb-1">User prompt template</label>
                  <textarea
                    value={form.userPromptTemplate}
                    onChange={(e) => setForm((f) => ({ ...f, userPromptTemplate: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-examia-soft/50 font-mono text-sm"
                  />
                </div>
              </form>
            ) : (
              <div className="text-sm text-examia-mid space-y-2">
                <p><strong>System:</strong> {(p.systemPrompt || '').slice(0, 120)}…</p>
                <p><strong>User template:</strong> {(p.userPromptTemplate || '').slice(0, 120)}…</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
      {prompts.length === 0 && !loading && (
        <div className="rounded-2xl border-2 border-dashed border-examia-soft/40 bg-examia-soft/5 p-12 text-center">
          <p className="font-semibold text-examia-dark">No AI prompts configured</p>
          <p className="text-examia-mid text-sm mt-1">Prompts are usually set up during deployment. Contact support if you need to add them.</p>
        </div>
      )}
    </motion.div>
  );
}
