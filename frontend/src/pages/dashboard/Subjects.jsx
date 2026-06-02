import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { showError } from '../../utils/swal';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

/** Subject icon keys — same as student Modules (MyContent). Local: /subject-icons/{key}.png; fallback: Flaticon CDN. */
const SUBJECT_ICON_KEYS = {
  biology: { key: 'biology', flaticonId: 1548234 },
  chemistry: { key: 'chemistry', flaticonId: 3214063 },
  'math-aa': { key: 'math-aa', flaticonId: 1024138 },
  'mathematics - analysis & approaches': { key: 'math-aa', flaticonId: 1024138 },
  'math-ai': { key: 'math-ai', flaticonId: 15311691 },
  'mathematics - application & interpretation': { key: 'math-ai', flaticonId: 15311691 },
  economics: { key: 'economics', flaticonId: 9235182 },
  business: { key: 'business', flaticonId: 1283342 },
  physics: { key: 'physics', flaticonId: 2933803 },
  psychology: { key: 'psychology', flaticonId: 1491171 },
  'global politics': { key: 'global-politics', flaticonId: 4742256 },
  globalpolitics: { key: 'global-politics', flaticonId: 4742256 },
};
const FLATICON_CDN = 'https://cdn-icons-png.flaticon.com/512';

function getSubjectIconUrl(subject) {
  if (!subject) return null;
  const name = (subject.name || subject.materialsPath || '').toLowerCase().trim();
  if (!name) return null;
  const entry =
    SUBJECT_ICON_KEYS[name] ??
    SUBJECT_ICON_KEYS[name.replace(/\s+/g, ' ')] ??
    SUBJECT_ICON_KEYS[name.replace(/\s+/g, '')];
  if (!entry) return null;
  const idStr = String(entry.flaticonId);
  const sub = idStr.length > 4 ? idStr.slice(0, -3) : idStr;
  return { local: `/subject-icons/${entry.key}.png`, cdn: `${FLATICON_CDN}/${sub}/${entry.flaticonId}.png` };
}

import { getSubjectCardStyle } from '../../utils/subjectColors';

export function Subjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [iconErrors, setIconErrors] = useState(new Set());

  const fetchSubjects = () => {
    api.get('/subjects').then((r) => setSubjects(r.data.subjects || [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSyncFromMaterials = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/subjects/sync');
      setSubjects(data.subjects || []);
    } catch (err) {
      await showError(err.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleIconError = (subjectId) => {
    setIconErrors((prev) => new Set(prev).add(subjectId));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading subjects…</p>
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
          <h1 className="text-3xl font-bold tracking-tight text-examia-dark">Subjects</h1>
          <p className="text-examia-mid mt-1 text-sm max-w-xl">
            {user?.role === 'teacher'
              ? 'Your school assigned you to one subject. Use it to open insights and related tools.'
              : 'Subjects are synced from the materials folder. Each subject name matches a folder under Materials.'}
          </p>
        </div>
        {user?.role === 'super_admin' && (
          <button
            type="button"
            onClick={handleSyncFromMaterials}
            disabled={syncing}
            className="px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid disabled:opacity-60 transition shadow-sm flex items-center gap-2"
          >
            {syncing ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Syncing…
              </>
            ) : (
              'Sync from materials'
            )}
          </button>
        )}
      </div>

      {user?.role !== 'teacher' && (
        <p className="text-examia-mid text-sm mb-6">
          The list below is synced from the <strong>materials</strong> folder. Use &quot;Sync from materials&quot; to refresh after adding new folders.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((s) => {
          const cardStyle = getSubjectCardStyle(s);
          const iconUrls = getSubjectIconUrl(s);
          const showIcon = iconUrls && !iconErrors.has(s._id);
          return (
            <motion.div
              key={s._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl p-8 border transition-all duration-200 group ${cardStyle.className}`}
            >
              <div className="flex items-center gap-4">
                <span className={`w-14 h-14 rounded-xl font-bold text-base flex items-center justify-center shrink-0 overflow-hidden ${cardStyle.badge}`}>
                  {showIcon ? (
                    <img
                      src={iconUrls.local}
                      alt=""
                      className="w-8 h-8 object-contain brightness-0 invert"
                      onError={(e) => {
                        const img = e.target;
                        if (img.dataset.triedCdn) {
                          handleIconError(s._id);
                          return;
                        }
                        img.dataset.triedCdn = '1';
                        img.src = iconUrls.cdn;
                      }}
                    />
                  ) : (
                    s.code || s.name?.slice(0, 3)
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-examia-dark truncate text-lg">{s.name}</p>
                  <p className="text-xs text-examia-mid truncate mt-0.5">Folder: {s.materialsPath || s.name}</p>
                  {(user?.role === 'teacher' || user?.role === 'school_admin' || user?.role === 'super_admin') && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      <Link
                        to={`/content/subject/${s._id}/insights`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-examia-mid hover:text-examia-dark transition-colors"
                      >
                        View insights
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      </Link>
                      {user?.role === 'teacher' && String(user?.subject?._id || user?.subject) === String(s._id) && (
                        <Link
                          to={`/content/subject/${s._id}/ia-samples`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-examia-mid hover:text-examia-dark transition-colors"
                        >
                          IA samples
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      {subjects.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-examia-soft/40 bg-examia-soft/5 p-12 text-center">
          <p className="font-semibold text-examia-dark">No subjects yet</p>
          <p className="text-examia-mid text-sm mt-1">
            {user?.role === 'super_admin' ? 'Click &quot;Sync from materials&quot; to load subjects from the materials folder.' : 'Ask Super Admin to sync from materials.'}
          </p>
        </div>
      )}
    </motion.div>
  );
}
