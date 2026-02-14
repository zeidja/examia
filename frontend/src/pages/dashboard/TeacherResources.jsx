import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { showError, showConfirm } from '../../utils/swal';

const typeLabels = { material: 'Material', quiz: 'Quiz', flash_cards: 'Flash cards' };

const typeFilters = [
  { id: '', label: 'All' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'flash_cards', label: 'Flash cards' },
  { id: 'material', label: 'Materials' },
];

export function TeacherResources() {
  const { user: me } = useAuth();
  const [resources, setResources] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', subject: '' });
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', class: '', subject: '', deadline: '' });

  const filteredResources = typeFilter
    ? resources.filter((r) => r.type === typeFilter)
    : resources;

  const countByType = (id) => (id ? resources.filter((r) => r.type === id).length : resources.length);

  const fetchResources = () => api.get('/resources').then((r) => setResources(r.data.resources || []));
  useEffect(() => {
    fetchResources().finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    api.get('/classes').then((r) => setClasses(r.data.classes || [])).catch(() => {});
  }, []);
  useEffect(() => {
    api.get('/subjects').then((r) => setSubjects(r.data.subjects || [])).catch(() => {});
  }, []);

  const handlePublish = async (r) => {
    try {
      await api.put(`/resources/${r._id}`, { published: !r.published });
      await fetchResources();
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed');
    }
  };

  const startEdit = (r) => {
    setEditingId(r._id);
    setEditForm({
      title: r.title || '',
      class: (r.class?._id || r.class) || '',
      subject: (r.subject?._id || r.subject) || '',
      deadline: r.deadline ? new Date(r.deadline).toISOString().slice(0, 16) : '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await api.put(`/resources/${editingId}`, {
        title: editForm.title,
        class: editForm.class || undefined,
        subject: editForm.subject || undefined,
        deadline: editForm.deadline || null,
      });
      await fetchResources();
      setEditingId(null);
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async (r) => {
    const ok = await showConfirm(`Delete "${r.title}"?`, 'Delete resource', 'Delete', 'Cancel');
    if (!ok) return;
    try {
      await api.delete(`/resources/${r._id}`);
      await fetchResources();
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFiles.length || !uploadForm.title || !uploadForm.subject) {
      await showError('Title, subject, and at least one file are required');
      return;
    }
    setUploading(true);
    let successCount = 0;
    let lastError = null;
    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', uploadFiles.length > 1 ? `${uploadForm.title.trim()} (${i + 1})` : uploadForm.title.trim());
        formData.append('description', uploadForm.description);
        formData.append('subject', uploadForm.subject);
        try {
          await api.post('/resources/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
          successCount++;
        } catch (err) {
          lastError = err;
        }
      }
      await fetchResources();
      if (successCount > 0) {
        setUploadForm({ title: '', description: '', subject: '' });
        setUploadFiles([]);
        if (successCount < uploadFiles.length && lastError) {
          await showError(`${successCount} uploaded. One failed: ${lastError.response?.data?.message || lastError.message}`);
        }
      } else if (lastError) {
        await showError(lastError.response?.data?.message || 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading resources…</p>
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-examia-dark">Resources</h1>
          <p className="text-examia-mid mt-1 text-sm">
            {me?.role === 'teacher' ? 'Create and publish quizzes, flash cards, and materials. Students see published items in My content.' : 'Manage and publish resources for your school.'}
          </p>
        </div>
        {me?.role === 'teacher' && (
          <button
            type="button"
            onClick={() => {
              if (!showUpload && me?.subject && !uploadForm.subject) {
                setUploadForm((f) => ({ ...f, subject: me.subject?._id || me.subject }));
              }
              setShowUpload(!showUpload);
            }}
            className="px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition shadow-sm"
          >
            {showUpload ? 'Cancel' : 'Upload material'}
          </button>
        )}
      </div>

      {showUpload && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleUpload}
          className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/30 mb-6"
        >
          <h3 className="text-lg font-semibold text-examia-dark mb-4">Upload material</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required
              placeholder="Title"
              value={uploadForm.title}
              onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
              className="px-4 py-2 rounded-lg border border-examia-soft/50"
            />
            <input
              placeholder="Description (optional)"
              value={uploadForm.description}
              onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
              className="px-4 py-2 rounded-lg border border-examia-soft/50"
            />
            <select
              required
              value={uploadForm.subject}
              onChange={(e) => setUploadForm((f) => ({ ...f, subject: e.target.value }))}
              className="px-4 py-2 rounded-lg border border-examia-soft/50"
            >
              <option value="">Assign to subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
            <div>
              <label className="block text-sm font-medium text-examia-dark mb-1">File(s) – you can select multiple</label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                className="text-sm w-full"
              />
              {uploadFiles.length > 0 && (
                <p className="text-examia-mid text-sm mt-1">{uploadFiles.length} file(s) selected</p>
              )}
            </div>
          </div>
          <button type="submit" disabled={uploading} className="mt-4 px-4 py-2 rounded-lg bg-examia-dark text-white font-medium disabled:opacity-60">
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </motion.form>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {typeFilters.map((tab) => (
          <button
            key={tab.id || 'all'}
            type="button"
            onClick={() => setTypeFilter(tab.id)}
            className={`px-4 py-2 rounded-xl font-medium transition ${
              typeFilter === tab.id ? 'bg-examia-dark text-white' : 'bg-examia-soft/20 text-examia-mid hover:bg-examia-soft/40'
            }`}
          >
            {tab.label} {countByType(tab.id) > 0 && `(${countByType(tab.id)})`}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredResources.map((r) => (
          <motion.div
            key={r._id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/30 flex flex-wrap items-center justify-between gap-4"
          >
            <div>
              <span className="text-xs font-medium text-examia-mid bg-examia-soft/20 px-2 py-1 rounded">{typeLabels[r.type] || r.type}</span>
              <h3 className="font-semibold text-examia-dark mt-2">{r.title}</h3>
              <p className="text-examia-mid text-sm">Subject: {r.subject?.name || '—'} · Class: {r.class?.name || '—'}</p>
              {r.deadline && (
                <p className="text-examia-mid text-sm">Deadline: {new Date(r.deadline).toLocaleString()}</p>
              )}
              <span className={`text-xs font-medium px-2 py-1 rounded mt-2 inline-block ${r.published ? 'bg-green-100 text-green-700' : 'bg-examia-soft/20 text-examia-mid'}`}>
                {r.published ? 'Published' : 'Draft'}
              </span>
            </div>
            <div className="flex gap-2">
              {editingId === r._id ? (
                <form onSubmit={handleSaveEdit} className="flex flex-wrap items-end gap-2">
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Title"
                    className="px-2 py-1.5 rounded-lg border border-examia-soft/50 text-sm w-40"
                  />
                  <select
                    value={editForm.subject}
                    onChange={(e) => setEditForm((f) => ({ ...f, subject: e.target.value }))}
                    className="px-2 py-1.5 rounded-lg border border-examia-soft/50 text-sm"
                  >
                    <option value="">Subject</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                  <select
                    value={editForm.class}
                    onChange={(e) => setEditForm((f) => ({ ...f, class: e.target.value }))}
                    className="px-2 py-1.5 rounded-lg border border-examia-soft/50 text-sm"
                  >
                    <option value="">Class</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    value={editForm.deadline}
                    onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="px-2 py-1.5 rounded-lg border border-examia-soft/50 text-sm"
                  />
                  <button type="submit" className="px-3 py-1.5 rounded-lg text-sm font-medium bg-examia-dark text-white">Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-sm text-examia-mid">Cancel</button>
                </form>
              ) : (
                <>
                  {r.type === 'quiz' && (
                    <Link
                      to={`/resources/${r._id}/report`}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-examia-mid text-white hover:bg-examia-dark transition"
                    >
                      View report
                    </Link>
                  )}
                  {r.type === 'flash_cards' && (
                    <Link
                      to={`/resources/${r._id}/flash-card-report`}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-examia-mid text-white hover:bg-examia-dark transition"
                    >
                      View stats
                    </Link>
                  )}
                  <button type="button" onClick={() => startEdit(r)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-examia-soft/40 text-examia-dark">Edit</button>
                  <button
                    type="button"
                    onClick={() => handlePublish(r)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${r.published ? 'bg-examia-soft/40 text-examia-dark' : 'bg-examia-dark text-white'}`}
                  >
                    {r.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button type="button" onClick={() => handleDelete(r)} className="px-3 py-1.5 rounded-lg text-sm text-red-600 font-medium hover:bg-red-50">
                    Delete
                  </button>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      {filteredResources.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-examia-soft/40 bg-examia-soft/5 p-12 text-center">
          <p className="font-semibold text-examia-dark">
            {resources.length === 0 ? 'No resources yet' : `No ${typeFilter || 'items'} match`}
          </p>
          <p className="text-examia-mid text-sm mt-1">
            {resources.length === 0
              ? 'Generate quizzes or flash cards from AI Tools and save them here, or upload a material.'
              : typeFilter === 'quiz'
                ? 'Switch to All or another type.'
                : typeFilter === 'flash_cards'
                  ? 'Switch to All or another type.'
                  : typeFilter === 'material'
                    ? 'Switch to All or upload a material.'
                    : 'Switch filter.'}
          </p>
        </div>
      )}
    </motion.div>
  );
}
