import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { showError } from '../../utils/swal';

const roleLabels = { super_admin: 'Super Admin', school_admin: 'School Admin', teacher: 'Teacher', student: 'Student' };

const ROLE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'school_admin', label: 'School Admin' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'student', label: 'Students' },
];

export function Users() {
  const { user: me } = useAuth();
  const [reports, setReports] = useState([]);
  const [schools, setSchools] = useState([]);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importSchool, setImportSchool] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const isSuperAdmin = me?.role === 'super_admin';
  const isSchoolAdmin = me?.role === 'school_admin';
  const effectiveSchool = useMemo(() => {
    if (selectedSchool) return selectedSchool;
    if (isSchoolAdmin && (me?.school?._id || me?.school)) {
      return { _id: me.school?._id || me.school, name: me.school?.name || 'My School' };
    }
    return null;
  }, [selectedSchool, isSchoolAdmin, me?.school]);

  const formInitial = {
    name: '',
    email: '',
    password: 'ChangeMe123',
    role: 'teacher',
    school: effectiveSchool?._id || me?.school?._id || me?.school || '',
    subject: '',
    class: '',
  };
  const [form, setForm] = useState(formInitial);

  useEffect(() => {
    if (effectiveSchool?._id) setForm((f) => ({ ...f, school: effectiveSchool._id }));
  }, [effectiveSchool?._id]);

  useEffect(() => {
    if (isSuperAdmin) {
      setLoading(true);
      api.get('/schools/reports').then((r) => setReports(r.data.reports || [])).catch(() => setReports([])).finally(() => setLoading(false));
      api.get('/schools').then((r) => setSchools(r.data.schools || [])).catch(() => setSchools([]));
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!effectiveSchool?._id) {
      setUsers([]);
      return;
    }
    setUsersLoading(true);
    const params = { school: effectiveSchool._id };
    if (roleFilter !== 'all') params.role = roleFilter;
    api.get('/users', { params }).then((r) => setUsers(r.data.users || [])).catch(() => setUsers([])).finally(() => setUsersLoading(false));
  }, [effectiveSchool?._id, roleFilter]);

  useEffect(() => {
    const schoolId = effectiveSchool?._id || (me?.school?._id || me?.school);
    api.get('/classes', { params: schoolId ? { school: schoolId } : {} }).then((r) => setClasses(r.data.classes || [])).catch(() => {});
    api.get('/subjects').then((r) => setSubjects(r.data.subjects || [])).catch(() => {});
  }, [effectiveSchool?._id, me?.school]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form };
      if (!body.school) delete body.school;
      if (body.role !== 'teacher') delete body.subject;
      if (!body.class) delete body.class;
      if (isSchoolAdmin) body.school = me.school?._id || me.school;
      await api.post('/users', body);
      const params = { school: effectiveSchool._id };
      if (roleFilter !== 'all') params.role = roleFilter;
      const { data } = await api.get('/users', { params });
      setUsers(data.users || []);
      setForm({ ...formInitial, school: effectiveSchool._id });
      setShowForm(false);
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      await showError('Select an Excel file');
      return;
    }
    const schoolForImport = effectiveSchool?._id || importSchool;
    if (isSuperAdmin && !schoolForImport) {
      await showError('Select a school for the import');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      if (schoolForImport) formData.append('school', schoolForImport);
      const { data } = await api.post('/users/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(data);
      setImportFile(null);
      const params = { school: effectiveSchool?._id };
      if (roleFilter !== 'all') params.role = roleFilter;
      const res = await api.get('/users', { params });
      setUsers(res.data.users || []);
    } catch (err) {
      setImportResult({ created: 0, errors: 1, errorList: [{ message: err.response?.data?.message || err.message }] });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const { data } = await api.get('/users/import/template', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users_import_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed to download template');
    }
  };

  const canAdd = isSuperAdmin || isSchoolAdmin;
  const showSchoolList = isSuperAdmin && !effectiveSchool;

  if (loading && isSuperAdmin && showSchoolList) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading schools…</p>
      </div>
    );
  }

  if (showSchoolList) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-6xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-examia-dark">Users</h1>
          <p className="text-examia-mid mt-2 text-sm">Select a school to view and manage its users.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reports.map((r, i) => (
            <motion.button
              key={r.school?._id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedSchool(r.school ? { _id: r.school._id, name: r.school.name } : null)}
              className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/20 text-left hover:shadow-md hover:border-examia-soft/40 hover:-translate-y-0.5 transition-all duration-200"
            >
              <h3 className="font-semibold text-examia-dark truncate">{r.school?.name}</h3>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-examia-mid">
                <span>{r.admins ?? 0} admin{(r.admins ?? 0) !== 1 ? 's' : ''}</span>
                <span>{r.teachers} teacher{r.teachers !== 1 ? 's' : ''}</span>
                <span>{r.students} student{r.students !== 1 ? 's' : ''}</span>
                <span>{r.classes} class{r.classes !== 1 ? 'es' : ''}</span>
              </div>
              <p className="mt-3 text-xs font-medium text-examia-mid">Click to view users →</p>
            </motion.button>
          ))}
        </div>
        {reports.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-examia-soft/40 bg-examia-soft/5 p-12 text-center">
            <p className="font-semibold text-examia-dark">No schools yet</p>
            <p className="text-examia-mid text-sm mt-1">Create schools from the Schools page first.</p>
          </div>
        )}
      </motion.div>
    );
  }

  const schoolName = effectiveSchool?.name || 'School';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setSelectedSchool(null)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-examia-mid hover:text-examia-dark transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            All schools
          </button>
        )}
        {isSuperAdmin && <span className="text-examia-soft">/</span>}
        <h1 className="text-2xl font-bold tracking-tight text-examia-dark">Users at {schoolName}</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setRoleFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              roleFilter === f.value
                ? 'bg-examia-dark text-white shadow-sm'
                : 'bg-examia-soft/20 text-examia-dark hover:bg-examia-soft/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {canAdd && (
        <div className="mb-8 space-y-6">
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleCreateUser}
              className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-examia-soft/20"
            >
              <h3 className="text-lg font-semibold text-examia-dark mb-1">Add teacher or student</h3>
              <p className="text-examia-mid text-sm mb-6">Create a new account for {schoolName}.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-examia-soft/50 bg-white focus:border-examia-mid focus:ring-2 focus:ring-examia-mid/20 outline-none transition" />
                <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-examia-soft/50 bg-white focus:border-examia-mid focus:ring-2 focus:ring-examia-mid/20 outline-none transition" />
                <input required type="password" minLength={6} placeholder="Password (min 6)" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-examia-soft/50 bg-white focus:border-examia-mid focus:ring-2 focus:ring-examia-mid/20 outline-none transition" />
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-examia-soft/50 bg-white focus:border-examia-mid focus:ring-2 focus:ring-examia-mid/20 outline-none transition">
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
                {form.role === 'teacher' && (
                  <select required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-examia-soft/50 bg-white focus:border-examia-mid focus:ring-2 focus:ring-examia-mid/20 outline-none transition">
                    <option value="">Subject (required)</option>
                    {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                )}
                {form.role === 'student' && (
                  <select value={form.class} onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))} className="px-4 py-2.5 rounded-xl border border-examia-soft/50 bg-white focus:border-examia-mid focus:ring-2 focus:ring-examia-mid/20 outline-none transition">
                    <option value="">Class (optional)</option>
                    {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <button type="submit" disabled={saving} className="mt-6 px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid disabled:opacity-60 transition shadow-sm">
                {saving ? 'Creating…' : 'Create'}
              </button>
            </motion.form>
          )}

          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-examia-soft/20">
            <h3 className="text-lg font-semibold text-examia-dark mb-2">Import from Excel</h3>
            <p className="text-sm text-examia-mid mb-4">
              Upload an Excel (.xlsx) or CSV with columns: <strong>Name</strong>, <strong>Email</strong>, <strong>Role</strong> (Teacher or Student). Optional: Class, Subject, Password (default: ChangeMe123).
            </p>
            <button type="button" onClick={downloadTemplate} className="text-sm text-examia-mid hover:text-examia-dark font-medium mb-4 block">
              Download template (Excel)
            </button>
            <form onSubmit={handleImport} className="flex flex-wrap items-end gap-3">
              {isSuperAdmin && !effectiveSchool?._id && (
                <select value={importSchool} onChange={(e) => setImportSchool(e.target.value)} className="px-4 py-2 rounded-lg border border-examia-soft/50">
                  <option value="">Select school</option>
                  {schools.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              )}
              <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="text-sm" />
              <button type="submit" disabled={importing || !importFile} className="px-4 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid disabled:opacity-60 transition shadow-sm">
                {importing ? 'Importing…' : 'Import'}
              </button>
            </form>
            {importResult && (
              <div className="mt-4 p-4 rounded-xl bg-examia-bg text-sm border border-examia-soft/30">
                <p className="font-medium text-examia-dark">Created: {importResult.created}. Errors: {importResult.errors ?? importResult.errorList?.length ?? 0}</p>
                {importResult.errorList?.length > 0 && (
                  <ul className="mt-2 text-red-600 list-disc list-inside text-xs">
                    {importResult.errorList.slice(0, 10).map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
                    {importResult.errorList.length > 10 && <li>… and {importResult.errorList.length - 10} more</li>}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-4">
        {canAdd && (
          <button type="button" onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition shadow-sm">
            {showForm ? 'Cancel' : 'Add user'}
          </button>
        )}
        <span className="text-sm text-examia-mid">{users.length} user{users.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-examia-soft/20 overflow-hidden">
        {usersLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
            <p className="text-sm text-examia-mid font-medium">Loading users…</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-examia-bg/50 border-b border-examia-soft/30">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-examia-mid">Name</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-examia-mid">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-examia-mid">Role</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-examia-mid">Subject</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-examia-mid">Class</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b border-examia-soft/20 hover:bg-examia-soft/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-examia-dark">{u.name}</td>
                    <td className="px-6 py-4 text-examia-mid text-sm">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-examia-soft/20 text-examia-dark">{roleLabels[u.role]}</span>
                    </td>
                    <td className="px-6 py-4 text-examia-mid text-sm">{u.subject?.name || '—'}</td>
                    <td className="px-6 py-4 text-examia-mid text-sm">{u.class?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && !usersLoading && (
              <div className="py-16 text-center">
                <p className="font-semibold text-examia-dark">No users in this school</p>
                <p className="text-examia-mid text-sm mt-1">Add users or import from Excel.</p>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
