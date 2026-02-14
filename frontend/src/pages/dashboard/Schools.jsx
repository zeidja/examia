import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { showError, showConfirm } from '../../utils/swal';

export function Schools() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    country: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdLogin, setCreatedLogin] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '', country: '', isActive: true });
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchSchools = () => api.get('/schools').then((r) => setSchools(r.data.schools || []));
  useEffect(() => {
    fetchSchools().finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setCreatedLogin(null);
    try {
      const { data } = await api.post('/schools', form);
      await fetchSchools();
      setForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        country: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
      });
      setShowForm(false);
      if (data.adminEmail) {
        setCreatedLogin({ email: data.adminEmail, schoolName: data.school?.name });
      }
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed to create school');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutThenLogin = async () => {
    await logout();
    navigate('/login', { state: { message: 'Sign in with the school admin email and password you set.' } });
  };

  const startEdit = (s) => {
    setEditingId(s._id);
    setEditForm({
      name: s.name || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      country: s.country || '',
      isActive: s.isActive !== false,
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    setSavingEdit(true);
    try {
      await api.put(`/schools/${editingId}`, editForm);
      await fetchSchools();
      setEditingId(null);
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed to update');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async (s) => {
    setTogglingId(s._id);
    try {
      await api.put(`/schools/${s._id}`, { isActive: !s.isActive });
      await fetchSchools();
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (s) => {
    const ok = await showConfirm(`Delete school "${s.name}"? Associated users will be unlinked and classes removed.`, 'Delete school', 'Delete', 'Cancel');
    if (!ok) return;
    setDeletingId(s._id);
    try {
      await api.delete(`/schools/${s._id}`);
      await fetchSchools();
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-examia-soft/50 bg-white text-examia-dark placeholder:text-examia-mid/70 focus:border-examia-mid focus:ring-2 focus:ring-examia-mid/20 outline-none transition text-sm';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading schools…</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-6xl">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-examia-dark">Schools</h1>
          <p className="text-examia-mid mt-1 text-sm">Manage schools and their admin accounts.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition shadow-sm shrink-0"
        >
          {showForm ? 'Cancel' : 'Add school'}
        </button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-examia-soft/20 mb-8 space-y-6"
        >
          <h3 className="text-lg font-semibold text-examia-dark">School details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="School name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
            <input required type="email" placeholder="School email (contact)" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputClass} />
            <input placeholder="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={inputClass} />
            <input placeholder="Country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className={inputClass} />
          </div>
          <div className="pt-6 border-t border-examia-soft/30">
            <h3 className="text-lg font-semibold text-examia-dark mb-1">School admin login</h3>
            <p className="text-sm text-examia-mid mb-4">The school admin will use this email and password to sign in.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Admin name (optional)" value={form.adminName} onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))} className={inputClass} />
              <input type="email" placeholder="Admin email (optional)" value={form.adminEmail} onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))} className={inputClass} />
              <input required type="password" placeholder="Admin password (min 6)" value={form.adminPassword} onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))} minLength={6} className={inputClass} />
            </div>
          </div>
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid disabled:opacity-60 transition shadow-sm">
            {saving ? 'Creating…' : 'Create school'}
          </button>
        </motion.form>
      )}

      {createdLogin && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 rounded-2xl bg-examia-soft/15 border border-examia-soft/40">
          <p className="font-semibold text-examia-dark">School created.</p>
          <p className="text-sm text-examia-dark mt-2">School admin sign-in — use this <strong>exact email</strong>:</p>
          <p className="mt-2 px-4 py-2.5 rounded-xl bg-white border border-examia-soft/40 font-mono text-examia-dark select-all text-sm">{createdLogin.email}</p>
          <p className="text-sm text-examia-mid mt-3">Log out, then sign in with the school admin email and the password you set.</p>
          <button type="button" onClick={handleLogoutThenLogin} className="mt-4 px-5 py-2.5 rounded-xl bg-examia-dark text-white text-sm font-medium hover:bg-examia-mid transition shadow-sm">
            Log out and go to Login
          </button>
        </motion.div>
      )}

      {editingId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setEditingId(null)}>
          <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-examia-dark mb-5">Edit school</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <input required placeholder="Name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
              <input required type="email" placeholder="Email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
              <input placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} className={inputClass} />
              <input placeholder="Address" value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} className={inputClass} />
              <input placeholder="Country" value={editForm.country} onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))} className={inputClass} />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded border-examia-soft/50 text-examia-mid focus:ring-examia-mid" />
                <span className="text-sm font-medium text-examia-dark">Active</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingEdit} className="px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid disabled:opacity-60 transition shadow-sm">Save</button>
                <button type="button" onClick={() => setEditingId(null)} className="px-5 py-2.5 rounded-xl border border-examia-soft/40 text-examia-dark font-medium hover:bg-examia-soft/20 transition">Cancel</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-examia-soft/20 overflow-hidden">
        <table className="w-full">
          <thead className="bg-examia-bg/50 border-b border-examia-soft/30">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-examia-mid">Name</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-examia-mid">Email</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-examia-mid">Country</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-examia-mid">Status</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-examia-mid">Admin login</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-examia-mid">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((s) => (
              <tr key={s._id} className="border-b border-examia-soft/20 hover:bg-examia-soft/5 transition-colors">
                <td className="px-6 py-4 font-medium text-examia-dark">{s.name}</td>
                <td className="px-6 py-4 text-examia-mid text-sm">{s.email}</td>
                <td className="px-6 py-4 text-examia-mid text-sm">{s.country || '—'}</td>
                <td className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(s)}
                    disabled={togglingId === s._id}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${s.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-examia-soft/30 text-examia-mid'}`}
                  >
                    {togglingId === s._id ? '…' : s.isActive !== false ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 text-examia-mid text-sm">
                  {s.admin?.email ? <span title="School admin signs in with this email">{(s.admin.name && s.admin.name + ' · ') || ''}{s.admin.email}</span> : '—'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-3">
                    <button type="button" onClick={() => startEdit(s)} className="text-sm text-examia-mid hover:text-examia-dark font-medium">Edit</button>
                    <button type="button" onClick={() => handleDelete(s)} disabled={deletingId === s._id} className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-60">{deletingId === s._id ? '…' : 'Delete'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {schools.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-semibold text-examia-dark">No schools yet</p>
            <p className="text-examia-mid text-sm mt-1">Add a school using the button above.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
