import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../api/axios';

export function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/schools/reports').then((r) => setReports(r.data.reports || [])).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading reports…</p>
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
        <h1 className="text-3xl font-bold tracking-tight text-examia-dark">School reports</h1>
        <p className="text-examia-mid mt-1 text-sm">Overview of schools, teachers, students, and classes.</p>
      </div>
      <div className="grid gap-4">
        {reports.map((r, i) => (
          <motion.div
            key={r.school?._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/20 flex flex-wrap items-center justify-between gap-4 hover:border-examia-soft/30 transition-colors"
          >
            <div>
              <h3 className="font-semibold text-examia-dark">{r.school?.name}</h3>
              <p className="text-examia-mid text-sm mt-0.5">{r.school?.email}</p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <span className="text-examia-mid"><strong className="text-examia-dark">{r.admins ?? 0}</strong> admin{(r.admins ?? 0) !== 1 ? 's' : ''}</span>
              <span className="text-examia-mid"><strong className="text-examia-dark">{r.teachers}</strong> teachers</span>
              <span className="text-examia-mid"><strong className="text-examia-dark">{r.students}</strong> students</span>
              <span className="text-examia-mid"><strong className="text-examia-dark">{r.classes}</strong> classes</span>
            </div>
          </motion.div>
        ))}
      </div>
      {reports.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-examia-soft/40 bg-examia-soft/5 p-12 text-center">
          <p className="font-semibold text-examia-dark">No schools to report on yet</p>
          <p className="text-examia-mid text-sm mt-1">Add schools from the Schools page first.</p>
        </div>
      )}
    </motion.div>
  );
}
