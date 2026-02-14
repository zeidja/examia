import { useState, useEffect } from 'react';
import { showError } from '../../utils/swal';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export function Classes() {
  const { user: me } = useAuth();
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', grade: '', school: '' });
  const [expandedId, setExpandedId] = useState(null);

  const fetchClasses = () => api.get('/classes').then((r) => setClasses(r.data.classes || []));
  useEffect(() => {
    fetchClasses().finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (me?.role === 'super_admin') {
      api.get('/schools').then((r) => setSchools(r.data.schools || [])).catch(() => {});
    }
  }, [me?.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { name: form.name.trim(), grade: form.grade.trim() };
      if (me?.role === 'super_admin' && form.school) body.school = form.school;
      await api.post('/classes', body);
      await fetchClasses();
      setForm({ name: '', grade: '', school: '' });
      setShowForm(false);
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed to create class');
    } finally {
      setSaving(false);
    }
  };

  const canAdd = me?.role === 'super_admin' || me?.role === 'school_admin';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading classes…</p>
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
      <div className="flex flex-wrap items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-examia-dark">Classes</h1>
          <p className="text-examia-mid mt-1 text-sm">
            {canAdd ? 'Manage classes and view students.' : 'View classes and students in your school.'}
          </p>
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition shadow-sm"
          >
            {showForm ? 'Cancel' : 'Add class'}
          </button>
        )}
      </div>

      {canAdd && showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-examia-soft/20 mb-6"
        >
          <h3 className="text-lg font-semibold text-examia-dark mb-1">New class</h3>
          <p className="text-examia-mid text-sm mb-6">Create a new class for your school.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required
              placeholder="Class name (e.g. Grade 10A)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="px-4 py-2.5 rounded-xl border border-examia-soft/50 bg-white focus:border-examia-mid focus:ring-2 focus:ring-examia-mid/20 outline-none transition"
            />
            <input
              placeholder="Grade (optional)"
              value={form.grade}
              onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
              className="px-4 py-2.5 rounded-xl border border-examia-soft/50 bg-white focus:border-examia-mid focus:ring-2 focus:ring-examia-mid/20 outline-none transition"
            />
            {me?.role === 'super_admin' && (
              <select
                required
                value={form.school}
                onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))}
                className="px-4 py-2.5 rounded-xl border border-examia-soft/50 bg-white focus:border-examia-mid focus:ring-2 focus:ring-examia-mid/20 outline-none transition"
              >
                <option value="">Select school</option>
                {schools.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
          <button type="submit" disabled={saving} className="mt-6 px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid disabled:opacity-60 transition shadow-sm">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </motion.form>
      )}

      <div className="grid gap-4">
        {classes.map((c) => {
          const students = c.students || [];
          const isExpanded = expandedId === c._id;
          return (
            <motion.div
              key={c._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-examia-soft/20 overflow-hidden hover:shadow-md hover:border-examia-soft/30 transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : c._id)}
                className="w-full text-left px-6 py-4 flex flex-wrap items-center justify-between gap-2 hover:bg-examia-bg/50 transition-colors"
              >
                <div>
                  <h3 className="font-semibold text-examia-dark">{c.name}</h3>
                  <p className="text-examia-mid text-sm mt-1">{c.school?.name ?? '—'} · Grade: {c.grade || '—'}</p>
                  <p className="text-examia-mid text-sm mt-1">{students.length} student{students.length !== 1 ? 's' : ''}</p>
                </div>
                <span className="text-examia-mid text-sm font-medium">{isExpanded ? 'Hide details' : 'View details'}</span>
              </button>
              {isExpanded && (
                <div className="border-t border-examia-soft/30 bg-examia-bg/30 px-6 py-4">
                  <h4 className="font-medium text-examia-dark mb-3">Class details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-medium text-examia-mid uppercase tracking-wide">School</p>
                      <p className="text-examia-dark">{c.school?.name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-examia-mid uppercase tracking-wide">Grade</p>
                      <p className="text-examia-dark">{c.grade || '—'}</p>
                    </div>
                  </div>
                  <h4 className="font-medium text-examia-dark mb-2">Students ({students.length})</h4>
                  {students.length === 0 ? (
                    <p className="text-examia-mid text-sm">No students assigned to this class yet.</p>
                  ) : (
                    <ul className="rounded-xl border border-examia-soft/40 bg-white divide-y divide-examia-soft/30 overflow-hidden">
                      {students.map((s) => (
                        <li key={s._id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-examia-dark">{s.name}</span>
                          <span className="text-examia-mid text-sm">{s.email}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      {classes.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-examia-soft/40 bg-examia-soft/5 p-12 text-center">
          <p className="font-semibold text-examia-dark">No classes yet</p>
          <p className="text-examia-mid text-sm mt-1">{canAdd ? 'Add a class using the button above.' : 'Your admin can add classes.'}</p>
        </div>
      )}
    </motion.div>
  );
}
