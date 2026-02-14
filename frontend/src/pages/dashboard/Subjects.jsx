import { useState, useEffect } from 'react';
import { showError } from '../../utils/swal';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export function Subjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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
            Subjects are synced from the materials folder. Each subject name matches a folder under Materials.
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

      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-examia-soft/20">
        <p className="text-examia-mid text-sm mb-6">
          The list below is synced from the <strong>materials</strong> folder. Use &quot;Sync from materials&quot; to refresh after adding new folders.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {subjects.map((s, i) => (
            <motion.div
              key={s._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-xl border border-examia-soft/20 bg-examia-bg/30 hover:bg-examia-soft/10 hover:border-examia-soft/40 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-examia-soft/20 flex items-center justify-center text-examia-mid font-bold text-sm shrink-0">
                {s.code || s.name?.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-examia-dark truncate">{s.name}</p>
                <p className="text-xs text-examia-mid truncate">Folder: {s.materialsPath || s.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
        {subjects.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-examia-soft/40 bg-examia-soft/5 p-12 text-center mt-4">
            <p className="font-semibold text-examia-dark">No subjects yet</p>
            <p className="text-examia-mid text-sm mt-1">
              {user?.role === 'super_admin' ? 'Click &quot;Sync from materials&quot; to load subjects from the materials folder.' : 'Ask Super Admin to sync from materials.'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
