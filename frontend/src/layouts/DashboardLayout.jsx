import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

import logoImg from '../../assets/logo.png';

const roleLabels = {
  super_admin: 'Super Admin',
  school_admin: 'School Admin',
  teacher: 'Teacher',
  student: 'Student',
};

// Simple nav icons (outline, 20px)
const NavIcons = {
  home: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  folder: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  book: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  clipboard: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  cards: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  chat: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  feynman: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  fileCheck: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  arrowLeft: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
};

const flatNavIcons = {
  'Overview': 'home',
  'Schools': 'folder',
  'Reports': 'clipboard',
  'Subjects': 'book',
  'Materials': 'folder',
  'AI Prompts': 'lightbulb',
  'Users': 'folder',
  'Classes': 'clipboard',
  'Flash Cards': 'cards',
  'Quizzes': 'clipboard',
  'Resources': 'folder',
  'My resources': 'folder',
};

const superAdminNav = [
  { to: '/dashboard', label: 'Overview' },
  { to: '/schools', label: 'Schools' },
  { to: '/reports', label: 'Reports' },
  { to: '/subjects', label: 'Subjects' },
  { to: '/materials', label: 'Materials' },
  { to: '/ai-prompts', label: 'AI Prompts' },
  { to: '/users', label: 'Users' },
];

const schoolAdminNav = [
  { to: '/dashboard', label: 'Overview' },
  { to: '/subjects', label: 'Subjects' },
  { to: '/classes', label: 'Classes' },
  { to: '/users', label: 'Users' },
  { to: '/ai/flash-cards', label: 'Flash Cards' },
  { to: '/ai/quizzes', label: 'Quizzes' },
  { to: '/resources', label: 'Resources' },
];

const teacherNav = [
  { to: '/dashboard', label: 'Overview' },
  { to: '/subjects', label: 'Subjects' },
  { to: '/classes', label: 'Classes' },
  { to: '/ai/flash-cards', label: 'Flash Cards' },
  { to: '/ai/quizzes', label: 'Quizzes' },
  { to: '/resources', label: 'My resources' },
];

/** Student nav: main links + optional subject section with icons and grouping */
const studentNavMain = [
  { to: '/dashboard', label: 'Overview', end: true, icon: 'home' },
  { to: '/content', label: 'My content', end: true, icon: 'folder' },
];

const studentSubjectTabs = [
  { toPath: 'materials', label: 'Materials', icon: 'book' },
  { toPath: 'quizzes', label: 'Quizzes', icon: 'clipboard' },
  { toPath: 'flash-cards', label: 'Flash cards', icon: 'cards' },
  { toPath: 'ideas', label: 'Ideas', icon: 'lightbulb' },
  { toPath: 'study-and-learn', label: 'Study and Learn', icon: 'chat' },
  { toPath: 'feynman', label: 'Feynman', icon: 'feynman' },
  { toPath: 'feedback', label: 'Internal Assessment', icon: 'fileCheck' },
];

function getStudentSubjectNav(subjectId) {
  if (!subjectId) return { main: studentNavMain, subjectId: null };
  const base = `/content/subject/${subjectId}`;
  return {
    main: studentNavMain,
    subjectId,
    subjectBase: base,
    subjectTabs: studentSubjectTabs.map((t) => ({ ...t, to: `${base}/${t.toPath}`, end: false })),
  };
}

function getNav(role, location) {
  if (role === 'super_admin') return { type: 'flat', items: superAdminNav };
  if (role === 'school_admin') return { type: 'flat', items: schoolAdminNav };
  if (role === 'teacher') return { type: 'flat', items: teacherNav };
  if (role === 'student') {
    const match = location?.pathname?.match(/^\/content\/subject\/([^/]+)/);
    const subjectId = match ? match[1] : null;
    return { type: 'student', ...getStudentSubjectNav(subjectId) };
  }
  return { type: 'flat', items: studentNavMain };
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = useMemo(() => getNav(user?.role || 'student', location), [user?.role, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-examia-bg flex">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-examia-dark text-white transform transition-transform duration-200 ease-out flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between h-[72px] px-5 border-b border-white/10 shrink-0">
          <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
            <img src={logoImg} alt="Examia" className="h-9 w-auto" />
          </Link>
          <button
            type="button"
            className="lg:hidden p-2 rounded-xl hover:bg-white/10 text-examia-soft transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {nav.type === 'student' ? (
            <>
              <div className="space-y-0.5">
                <span className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-examia-soft/70">
                  Main
                </span>
                {nav.main.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end !== false}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] transition-all duration-200 ${
                        isActive ? 'bg-white/15 text-white font-medium' : 'text-examia-soft hover:bg-white/10 hover:text-white'
                      }`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon && NavIcons[item.icon]}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
              {nav.subjectId && (
                <div className="space-y-0.5 mt-6">
                  <span className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-examia-soft/70">
                    In this subject
                  </span>
                  <Link
                    to="/content"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-examia-soft hover:bg-white/10 hover:text-white transition-all duration-200"
                  >
                    {NavIcons.arrowLeft}
                    <span>Back to My content</span>
                  </Link>
                  {nav.subjectTabs.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={false}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] transition-all duration-200 ${
                          isActive ? 'bg-white/15 text-white font-medium' : 'text-examia-soft hover:bg-white/10 hover:text-white'
                        }`
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      {item.icon && NavIcons[item.icon]}
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-0.5">
              {nav.items?.map((item) => {
                const iconKey = flatNavIcons[item.label];
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/dashboard'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] transition-all duration-200 ${
                        isActive ? 'bg-white/15 text-white font-medium' : 'text-examia-soft hover:bg-white/10 hover:text-white'
                      }`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    {iconKey && NavIcons[iconKey]}
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-[260px]">
        <header className="sticky top-0 z-30 h-[72px] bg-white/80 backdrop-blur-md border-b border-examia-soft/30 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
          <button
            type="button"
            className="lg:hidden p-2.5 rounded-xl text-examia-mid hover:bg-examia-soft/20 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 min-w-0" />
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              className="flex items-center gap-2.5 pl-2 pr-3 py-2 rounded-xl hover:bg-examia-soft/15 transition-colors border border-transparent hover:border-examia-soft/30"
              onClick={() => setUserMenuOpen((o) => !o)}
            >
              <div className="w-9 h-9 rounded-xl bg-examia-dark flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {user?.name?.charAt(0) || '?'}
              </div>
              <div className="hidden sm:block text-left">
                <span className="block text-sm font-semibold text-examia-dark truncate max-w-[120px]">{user?.name}</span>
                <span className="block text-xs text-examia-mid">{roleLabels[user?.role]}</span>
              </div>
              <svg className={`w-4 h-4 text-examia-mid transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 py-1.5 bg-white rounded-xl shadow-lg border border-examia-soft/30 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-examia-soft/20 sm:hidden">
                    <p className="font-semibold text-examia-dark truncate">{user?.name}</p>
                    <p className="text-xs text-examia-mid">{roleLabels[user?.role]}</p>
                  </div>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-examia-dark hover:bg-examia-soft/15 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <svg className="w-4 h-4 text-examia-mid" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    Profile
                  </Link>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-examia-dark hover:bg-examia-soft/15 transition-colors text-left"
                    onClick={handleLogout}
                  >
                    <svg className="w-4 h-4 text-examia-mid" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-h-0">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
    </div>
  );
}
