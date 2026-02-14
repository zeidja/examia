import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/auth/Login';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Schools } from './pages/dashboard/Schools';
import { Reports } from './pages/dashboard/Reports';
import { Subjects } from './pages/dashboard/Subjects';
import { Materials } from './pages/dashboard/Materials';
import { AIPrompts } from './pages/dashboard/AIPrompts';
import { Users } from './pages/dashboard/Users';
import { Classes } from './pages/dashboard/Classes';
import { AITools } from './pages/ai/AITools';
import { MyContent } from './pages/dashboard/MyContent';
import { SubjectContentLayout } from './pages/dashboard/SubjectContentLayout';
import {
  SubjectMaterials,
  SubjectQuizzes,
  SubjectFlashCards,
  SubjectIdeas,
  SubjectStudyLearn,
  SubjectFeynman,
  SubjectFeedback,
} from './pages/dashboard/SubjectContentTabs';
import { ContentView } from './pages/dashboard/ContentView';
import { TeacherResources } from './pages/dashboard/TeacherResources';
import { QuizReport } from './pages/dashboard/QuizReport';
import { FlashCardReport } from './pages/dashboard/FlashCardReport';
import { Profile } from './pages/dashboard/Profile';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-examia-bg">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm font-medium text-examia-mid">Loading…</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route element={<AuthLayout />}>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
        <Route path="/reset-password" element={user ? <Navigate to="/dashboard" replace /> : <ResetPassword />} />
      </Route>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="ai" element={<Navigate to="/ai/flash-cards" replace />} />
        <Route path="ai/:tabId" element={<AITools />} />
        <Route path="content" element={<MyContent />} />
        <Route path="content/subject/:subjectId" element={<SubjectContentLayout />}>
          <Route index element={<Navigate to="materials" replace />} />
          <Route path="materials" element={<SubjectMaterials />} />
          <Route path="quizzes" element={<SubjectQuizzes />} />
          <Route path="flash-cards" element={<SubjectFlashCards />} />
          <Route path="ideas" element={<SubjectIdeas />} />
          <Route path="study-and-learn" element={<SubjectStudyLearn />} />
          <Route path="feynman" element={<SubjectFeynman />} />
          <Route path="feedback" element={<SubjectFeedback />} />
        </Route>
        <Route path="content/:id" element={<ContentView />} />
        <Route path="resources" element={<TeacherResources />} />
        <Route
          path="resources/:resourceId/report"
          element={
            <ProtectedRoute roles={['teacher', 'school_admin', 'super_admin']}>
              <QuizReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="resources/:resourceId/flash-card-report"
          element={
            <ProtectedRoute roles={['teacher', 'school_admin', 'super_admin']}>
              <FlashCardReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="schools"
          element={
            <ProtectedRoute roles={['super_admin']}>
              <Schools />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute roles={['super_admin']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route path="subjects" element={<Subjects />} />
        <Route
          path="materials"
          element={
            <ProtectedRoute roles={['super_admin']}>
              <Materials />
            </ProtectedRoute>
          }
        />
        <Route
          path="ai-prompts"
          element={
            <ProtectedRoute roles={['super_admin']}>
              <AIPrompts />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['super_admin', 'school_admin']}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="classes"
          element={
            <ProtectedRoute roles={['super_admin', 'school_admin', 'teacher']}>
              <Classes />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
