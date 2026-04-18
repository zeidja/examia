import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function ActivityLogs() {
  const { user } = useAuth();
  const isSchoolAdmin = user?.role === 'school_admin';

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 320);
    return () => clearTimeout(t);
  }, [searchInput]);

  const buildParams = useCallback(
    (pageNum) => {
      const params = { page: pageNum, limit: 40 };
      if (search) params.search = search;
      if (from) params.from = from;
      if (to) params.to = to;
      if (isSchoolAdmin && actorRole) params.actorRole = actorRole;
      return params;
    },
    [search, from, to, actorRole, isSchoolAdmin]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPage(1);
    try {
      const { data } = await api.get('/activity-logs', { params: buildParams(1) });
      setLogs(data.logs || []);
      setTotal(data.total ?? 0);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load logs');
      setLogs([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    reload();
  }, [reload]);

  const loadMore = async () => {
    const next = page + 1;
    setLoadingMore(true);
    setError(null);
    try {
      const { data } = await api.get('/activity-logs', { params: buildParams(next) });
      const rows = data.logs || [];
      setLogs((prev) => [...prev, ...rows]);
      setPage(next);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="max-w-4xl"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-examia-dark">Activity logs</h1>
        <p className="text-examia-mid mt-2 text-sm">
          {isSchoolAdmin
            ? 'See what students and teachers did recently. Use search and filters to narrow results.'
            : 'Student activity only — for classes you are assigned to. Search by student name.'}
        </p>
      </div>

      <div className="rounded-2xl border border-examia-soft/40 bg-white p-4 sm:p-5 shadow-sm mb-6 space-y-4">
        <div>
          <label htmlFor="log-search" className="block text-xs font-semibold text-examia-mid uppercase tracking-wide mb-1.5">
            Search by name
          </label>
          <input
            id="log-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={isSchoolAdmin ? 'Name of student or teacher…' : 'Student name…'}
            className="w-full px-4 py-2.5 rounded-xl border border-examia-soft/50 bg-examia-bg/30 text-examia-dark placeholder:text-examia-mid focus:border-examia-mid focus:ring-2 focus:ring-examia-mid/20 outline-none transition text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          {isSchoolAdmin && (
            <div className="min-w-[160px]">
              <label htmlFor="log-role" className="block text-xs font-semibold text-examia-mid uppercase tracking-wide mb-1.5">
                Role
              </label>
              <select
                id="log-role"
                value={actorRole}
                onChange={(e) => setActorRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-examia-soft/50 bg-white text-examia-dark text-sm focus:border-examia-mid focus:ring-2 focus:ring-examia-mid/20 outline-none"
              >
                <option value="">All</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
                <option value="school_admin">School admins</option>
              </select>
            </div>
          )}
          <div className="min-w-[140px]">
            <label htmlFor="log-from" className="block text-xs font-semibold text-examia-mid uppercase tracking-wide mb-1.5">
              From
            </label>
            <input
              id="log-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-examia-soft/50 bg-white text-examia-dark text-sm focus:border-examia-mid focus:ring-2 focus:ring-examia-mid/20 outline-none"
            />
          </div>
          <div className="min-w-[140px]">
            <label htmlFor="log-to" className="block text-xs font-semibold text-examia-mid uppercase tracking-wide mb-1.5">
              To
            </label>
            <input
              id="log-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-examia-soft/50 bg-white text-examia-dark text-sm focus:border-examia-mid focus:ring-2 focus:ring-examia-mid/20 outline-none"
            />
          </div>
          {(searchInput || actorRole || from || to) && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setActorRole('');
                setFrom('');
                setTo('');
              }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-examia-mid border border-examia-soft/50 hover:bg-examia-soft/20 transition"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
          <p className="text-sm text-examia-mid font-medium">Loading…</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-6 text-center text-red-800 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <>
          <p className="text-sm text-examia-mid mb-3">
            {total === 0 ? 'No entries' : `Showing ${logs.length} of ${total}`}
          </p>
          <div className="rounded-2xl border border-examia-soft/40 bg-white shadow-sm overflow-hidden divide-y divide-examia-soft/30">
            {logs.length === 0 ? (
              <p className="px-5 py-12 text-center text-examia-mid text-sm">
                No activity matches your filters. Try another name or date range.
              </p>
            ) : (
              logs.map((row) => (
                <div key={row.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 hover:bg-examia-bg/40 transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-examia-dark">{row.name}</p>
                    <p className="text-sm text-examia-dark mt-0.5">{row.detail}</p>
                  </div>
                  <p className="text-xs text-examia-mid whitespace-nowrap sm:text-right shrink-0">{formatWhen(row.at)}</p>
                </div>
              ))
            )}
          </div>
          {hasMore && logs.length > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={loadMore}
                className="px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid disabled:opacity-50 transition text-sm"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
