import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/swal';

const roleLabels = {
  super_admin: 'Super Admin',
  school_admin: 'School Admin',
  teacher: 'Teacher',
  student: 'Student',
};

function InfoRow({ label, value }) {
  if (value == null || value === '') return null;
  const display = typeof value === 'object' && value?.name != null ? value.name : value;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3 border-b border-examia-soft/30 last:border-0">
      <span className="text-sm font-medium text-examia-mid shrink-0 sm:w-28">{label}</span>
      <span className="text-examia-dark">{display}</span>
    </div>
  );
}

export function Profile() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameForm, setNameForm] = useState({ name: user?.name ?? '' });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!nameForm.name?.trim()) {
      await showError('Name is required');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/me', { name: nameForm.name.trim() });
      if (data.user) await refreshUser();
      await showSuccess('Profile updated successfully');
      setEditing(false);
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword?.trim()) {
      await showError('Enter your current password');
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      await showError('New passwords do not match');
      return;
    }
    if (passwordForm.password.length < 6) {
      await showError('New password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch('/auth/me', {
        currentPassword: passwordForm.currentPassword,
        password: passwordForm.password,
      });
      await showSuccess('Password updated successfully');
      setPasswordForm({ currentPassword: '', password: '', confirmPassword: '' });
    } catch (err) {
      await showError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const startEdit = () => {
    setNameForm({ name: user?.name ?? '' });
    setEditing(true);
  };

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg border border-examia-soft/50 bg-white text-examia-dark placeholder:text-examia-soft focus:outline-none focus:ring-2 focus:ring-examia-mid/50 focus:border-examia-mid';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto"
    >
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-examia-dark tracking-tight">Account</h1>
        <p className="mt-2 text-sm text-examia-mid">Manage your profile and security settings.</p>
      </div>

      {/* Profile header card */}
      <div className="bg-white rounded-2xl border border-examia-soft/20 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
            <div className="shrink-0 flex justify-center sm:justify-start">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-examia-dark flex items-center justify-center text-white text-2xl sm:text-3xl font-semibold ring-4 ring-examia-soft/50"
                aria-hidden
              >
                {(user?.name || '?').charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h2 className="text-xl font-semibold text-examia-dark tracking-tight">{user?.name}</h2>
              <p className="mt-0.5 text-examia-mid text-sm">{user?.email}</p>
              <span className="inline-block mt-3 px-3 py-1 rounded-md text-xs font-medium uppercase tracking-wider bg-examia-soft/30 text-examia-dark">
                {roleLabels[user?.role]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account details */}
      <div className="bg-white rounded-2xl border border-examia-soft/20 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-examia-soft/30 bg-examia-bg/50">
          <h3 className="text-sm font-semibold text-examia-dark uppercase tracking-wider">Account information</h3>
        </div>
        <div className="px-6 py-2 divide-y-0">
          <InfoRow label="Email" value={user?.email} />
          {user?.school && <InfoRow label="School" value={user.school?.name ?? user.school} />}
          {user?.subject && <InfoRow label="Subject" value={user.subject?.name ?? user.subject} />}
          {user?.class && <InfoRow label="Class" value={user.class?.name ?? user.class} />}
        </div>
      </div>

      {/* Personal details */}
      <div className="bg-white rounded-2xl border border-examia-soft/20 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-examia-soft/30 bg-examia-bg/50 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-examia-dark uppercase tracking-wider">
            {editing ? 'Update profile' : 'Personal details'}
          </h3>
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              className="text-sm font-medium text-examia-dark hover:text-examia-mid transition-colors px-3 py-1.5 rounded-lg hover:bg-examia-soft/20"
            >
              Edit profile
            </button>
          )}
        </div>
        <div className="p-6 sm:p-8">
          {!editing ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm">
              <div className="sm:w-28 shrink-0">
                <span className="text-examia-mid">Display name</span>
              </div>
              <p className="text-examia-dark font-medium">{user?.name}</p>
            </div>
          ) : (
            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label htmlFor="profile-name" className="block text-sm font-medium text-examia-dark mb-2">
                  Display name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={nameForm.name}
                  onChange={(e) => setNameForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputClass}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-examia-dark text-white text-sm font-medium hover:bg-examia-mid transition-colors disabled:opacity-60 disabled:pointer-events-none"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg border border-examia-soft/60 text-examia-dark text-sm font-medium hover:bg-examia-soft/20 transition-colors disabled:opacity-60 disabled:pointer-events-none"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-examia-soft/20 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-examia-soft/30 bg-examia-bg/50">
          <h3 className="text-sm font-semibold text-examia-dark uppercase tracking-wider">Security</h3>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-sm text-examia-mid mb-4">
            Change your password. You must enter your current password to set a new one.
          </p>
          <form onSubmit={handleSavePassword} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="security-current-password" className="block text-sm font-medium text-examia-dark mb-1.5">
                Current password
              </label>
              <input
                id="security-current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
                className={inputClass}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label htmlFor="security-new-password" className="block text-sm font-medium text-examia-dark mb-1.5">
                New password
              </label>
              <input
                id="security-new-password"
                type="password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))}
                className={inputClass}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="security-confirm-password" className="block text-sm font-medium text-examia-dark mb-1.5">
                Confirm new password
              </label>
              <input
                id="security-confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                className={inputClass}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2.5 rounded-lg bg-examia-dark text-white text-sm font-medium hover:bg-examia-mid transition-colors disabled:opacity-60 disabled:pointer-events-none"
            >
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
