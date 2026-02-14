import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { useState, useEffect, useMemo } from 'react';

const roleLabels = {
  super_admin: 'Super Admin',
  school_admin: 'School Admin',
  teacher: 'Teacher',
  student: 'Student',
};

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ schools: 0, teachers: 0, students: 0, classes: 0 });
  const [reports, setReports] = useState([]);
  const [studentResources, setStudentResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [teacherStats, setTeacherStats] = useState({ resources: 0, classes: 0 });

  useEffect(() => {
    if (user?.role === 'super_admin') {
      api.get('/schools/reports').then((r) => setReports(r.data.reports || [])).catch(() => {});
    }
    if (user?.role === 'school_admin' && user?.school) {
      api.get('/users').then((r) => {
        const users = r.data.users || [];
        setStats({
          teachers: users.filter((u) => u.role === 'teacher').length,
          students: users.filter((u) => u.role === 'student').length,
        });
      }).catch(() => {});
      api.get('/classes').then((r) => setStats((s) => ({ ...s, classes: (r.data.classes || []).length }))).catch(() => {});
    }
    if (user?.role === 'teacher') {
      Promise.all([
        api.get('/resources').then((r) => (r.data.resources || []).length).catch(() => 0),
        api.get('/classes').then((r) => (r.data.classes || []).length).catch(() => 0),
      ]).then(([resources, classes]) => setTeacherStats({ resources, classes }));
    }
    if (user?.role === 'student') {
      setResourcesLoading(true);
      api.get('/resources').then((r) => setStudentResources(r.data.resources || [])).catch(() => setStudentResources([])).finally(() => setResourcesLoading(false));
    }
  }, [user]);

  const { quizzes, flashCards } = useMemo(() => {
    const list = studentResources || [];
    return {
      quizzes: list.filter((r) => r.type === 'quiz').slice(0, 6),
      flashCards: list.filter((r) => r.type === 'flash_cards').slice(0, 6),
    };
  }, [studentResources]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl"
    >
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-examia-dark">Welcome, {user?.name}</h1>
        <p className="text-examia-mid mt-1 text-sm font-medium">{roleLabels[user?.role]}</p>
      </div>

      {user?.role === 'super_admin' && reports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {reports.slice(0, 4).map((r, i) => (
            <motion.div
              key={r.school?._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/20 hover:shadow-md hover:border-examia-soft/25 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-examia-dark truncate">{r.school?.name}</h3>
                <span className="shrink-0 w-10 h-10 rounded-xl bg-examia-dark/10 flex items-center justify-center text-examia-dark text-sm font-semibold">
                  {(r.admins ?? 0) + r.teachers + r.students}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-examia-mid">
                <span>{r.admins ?? 0} admin{(r.admins ?? 0) !== 1 ? 's' : ''}</span>
                <span>{r.teachers} teachers</span>
                <span>{r.students} students</span>
                <span>{r.classes} classes</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {user?.role === 'super_admin' && reports.length === 0 && (
        <div className="mb-10 rounded-2xl border-2 border-dashed border-examia-soft/40 bg-examia-soft/5 p-8 text-center">
          <p className="font-semibold text-examia-dark">No schools yet</p>
          <p className="text-examia-mid text-sm mt-1">Add schools from the Schools page to see an overview here.</p>
          <Link to="/schools" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition shadow-sm">Go to Schools</Link>
        </div>
      )}

      {user?.role === 'teacher' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {[
            { label: 'My resources', value: teacherStats.resources },
            { label: 'Classes', value: teacherStats.classes },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/20 hover:shadow-md hover:border-examia-soft/25 transition-all duration-200"
            >
              <p className="text-examia-mid text-xs font-semibold uppercase tracking-wider">{item.label}</p>
              <p className="text-3xl font-bold text-examia-dark mt-2 tracking-tight">{item.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {user?.role === 'school_admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {[
            { label: 'Teachers', value: stats.teachers },
            { label: 'Students', value: stats.students },
            { label: 'Classes', value: stats.classes },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/20 hover:shadow-md hover:border-examia-soft/25 transition-all duration-200"
            >
              <p className="text-examia-mid text-xs font-semibold uppercase tracking-wider">{item.label}</p>
              <p className="text-3xl font-bold text-examia-dark mt-2 tracking-tight">{item.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Student: Quick actions + New quizzes + Flash cards */}
      {user?.role === 'student' && (
        <>
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-examia-soft/20 mb-8">
            <h2 className="text-lg font-semibold text-examia-dark mb-1">Quick actions</h2>
            <p className="text-examia-mid text-sm mb-6">Jump to your content and tools.</p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/content"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                My content
              </Link>
              <Link
                to="/ai/flash-cards"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-examia-soft/40 text-examia-dark font-medium hover:bg-examia-soft/15 hover:border-examia-soft/50 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                Flash cards
              </Link>
              <Link
                to="/ai/quizzes"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-examia-soft/40 text-examia-dark font-medium hover:bg-examia-soft/15 hover:border-examia-soft/50 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                Quizzes
              </Link>
            </div>
          </div>

          {resourcesLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-examia-mid border-t-transparent" />
              <p className="text-sm text-examia-mid font-medium">Loading your content…</p>
            </div>
          ) : (
            <div className="space-y-8">
              {quizzes.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-examia-soft/20"
                >
                  <h2 className="text-lg font-semibold text-examia-dark mb-1">Quizzes</h2>
                  <p className="text-examia-mid text-sm mb-5">Take a quiz to test your knowledge.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quizzes.map((q, i) => (
                      <Link
                        key={q._id}
                        to={`/content/${q._id}`}
                        className="flex items-center justify-between gap-3 p-4 rounded-xl border border-examia-soft/25 hover:border-examia-soft/50 hover:bg-examia-soft/5 transition-all duration-200 group"
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-examia-dark truncate group-hover:text-examia-mid transition-colors">{q.title}</h3>
                          {q.subject?.name && <p className="text-xs text-examia-mid mt-0.5">{q.subject.name}</p>}
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold ${q.hasAttempt ? 'bg-green-100 text-green-700' : 'bg-examia-dark/10 text-examia-dark'}`}>
                          {q.hasAttempt ? 'Done' : 'Start'}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <Link to="/content" className="inline-block mt-4 text-sm font-medium text-examia-mid hover:text-examia-dark transition">View all in My content →</Link>
                </motion.section>
              )}

              {flashCards.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-examia-soft/20"
                >
                  <h2 className="text-lg font-semibold text-examia-dark mb-1">Flash cards</h2>
                  <p className="text-examia-mid text-sm mb-5">Study and rate cards by difficulty.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {flashCards.map((fc) => (
                      <Link
                        key={fc._id}
                        to={`/content/${fc._id}`}
                        className="flex items-center justify-between gap-3 p-4 rounded-xl border border-examia-soft/25 hover:border-examia-soft/50 hover:bg-examia-soft/5 transition-all duration-200 group"
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-examia-dark truncate group-hover:text-examia-mid transition-colors">{fc.title}</h3>
                          {fc.subject?.name && <p className="text-xs text-examia-mid mt-0.5">{fc.subject.name}</p>}
                        </div>
                        <span className="shrink-0 text-examia-mid">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </span>
                      </Link>
                    ))}
                  </div>
                  <Link to="/content" className="inline-block mt-4 text-sm font-medium text-examia-mid hover:text-examia-dark transition">View all in My content →</Link>
                </motion.section>
              )}

              {!resourcesLoading && quizzes.length === 0 && flashCards.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-8 shadow-sm border border-examia-soft/20 text-center"
                >
                  <p className="font-semibold text-examia-dark">No quizzes or flash cards yet</p>
                  <p className="text-examia-mid text-sm mt-2">Your teachers will publish content here. Check <Link to="/content" className="font-medium text-examia-mid hover:text-examia-dark">My content</Link> for subjects and materials.</p>
                </motion.div>
              )}
            </div>
          )}
        </>
      )}

      {/* Non-student: Quick actions (role-specific) */}
      {user?.role !== 'student' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-examia-soft/20">
          <h2 className="text-lg font-semibold text-examia-dark mb-1">Quick actions</h2>
          <p className="text-examia-mid text-sm mb-6">
            {user?.role === 'teacher' ? 'Shortcuts to create and manage content.' : 'Shortcuts to common tasks.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/ai"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition shadow-sm"
            >
              <span className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-xs font-semibold">AI</span>
              AI Tools
            </Link>
            {(user?.role === 'super_admin' || user?.role === 'school_admin') && (
              <Link
                to="/users"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-examia-soft/40 text-examia-dark font-medium hover:bg-examia-soft/15 hover:border-examia-soft/50 transition"
              >
                Users
              </Link>
            )}
            {user?.role === 'teacher' && (
              <>
                <Link
                  to="/subjects"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-examia-soft/40 text-examia-dark font-medium hover:bg-examia-soft/15 hover:border-examia-soft/50 transition"
                >
                  Subjects
                </Link>
                <Link
                  to="/classes"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-examia-soft/40 text-examia-dark font-medium hover:bg-examia-soft/15 hover:border-examia-soft/50 transition"
                >
                  Classes
                </Link>
                <Link
                  to="/resources"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-examia-soft/40 text-examia-dark font-medium hover:bg-examia-soft/15 hover:border-examia-soft/50 transition"
                >
                  My resources
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
