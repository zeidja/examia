import { useState, useEffect } from 'react';
import { Link, Outlet, useParams, Navigate } from 'react-router-dom';
import api from '../../api/axios';

export function SubjectContentLayout() {
  const { subjectId } = useParams();
  const [subject, setSubject] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId) return;
    Promise.all([
      api.get(`/subjects/${subjectId}`).then((r) => r.data.subject),
      api.get('/resources', { params: { subject: subjectId } }).then((r) => r.data.resources || []),
    ])
      .then(([sub, res]) => {
        setSubject(sub);
        setResources(res || []);
      })
      .catch(() => setSubject(null))
      .finally(() => setLoading(false));
  }, [subjectId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading subject…</p>
      </div>
    );
  }
  if (!subject) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-examia-soft/20 flex items-center justify-center mx-auto mb-4 text-examia-mid">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <p className="font-semibold text-examia-dark">Subject not found</p>
        <Link to="/content" className="mt-4 inline-flex items-center gap-2 text-examia-mid hover:text-examia-dark font-medium transition">← Back to My content</Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Link
          to="/content"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-examia-mid hover:text-examia-dark transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          My content
        </Link>
        <span className="text-examia-soft">/</span>
        <h1 className="text-2xl font-bold tracking-tight text-examia-dark">{subject.name}</h1>
      </div>
      <Outlet context={{ subject, resources }} />
    </>
  );
}
