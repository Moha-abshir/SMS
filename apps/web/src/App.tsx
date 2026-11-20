import { WorkspaceErrorBoundary } from './components/WorkspaceErrorBoundary';
import { getPublicSettings } from './lib/publicSettings';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from './context/ThemeContext';
import { PullToRefresh } from './components/PullToRefresh';
const LoginPage = lazy(() => import('./modules/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const AcceptInvitationPage = lazy(() => import('./modules/auth/AcceptInvitationPage').then(module => ({ default: module.AcceptInvitationPage })));
const ResetPasswordPage = lazy(() => import('./modules/auth/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const VerifyEmailChangePage = lazy(() => import('./modules/auth/VerifyEmailChangePage').then(module => ({ default: module.VerifyEmailChangePage })));
import { AppLayout } from './components/AppLayout';
import { RoleGuard } from './components/RoleGuard';
const OverviewView = lazy(() => import('./modules/dashboard/OverviewView').then(module => ({ default: module.OverviewView })));
const DeputyDashboardView = lazy(() => import('./modules/dashboard/DeputyDashboardView').then(module => ({ default: module.DeputyDashboardView })));
const DosDashboardView = lazy(() => import('./modules/dashboard/DosDashboardView').then(module => ({ default: module.DosDashboardView })));
const TeacherDashboardView = lazy(() => import('./modules/dashboard/TeacherDashboardView').then(module => ({ default: module.TeacherDashboardView })));
const ClassLearnersView = lazy(() => import('./modules/learners/ClassLearnersView').then(module => ({ default: module.ClassLearnersView })));
const SettingsView = lazy(() => import('./modules/settings/SettingsView').then(module => ({ default: module.SettingsView })));
const StaffManagementView = lazy(() => import('./modules/staff/StaffManagementView').then(module => ({ default: module.StaffManagementView })));
const StudentAdmissionView = lazy(() => import('./modules/admissions/StudentAdmissionView').then(module => ({ default: module.StudentAdmissionView })));
const OfficialLetterView = lazy(() => import('./modules/letters/OfficialLetterView').then(module => ({ default: module.OfficialLetterView })));
const FeeStructureView = lazy(() => import('./modules/finance/FeeStructureView').then(module => ({ default: module.FeeStructureView })));
const FinancialManagementView = lazy(() => import('./modules/finance/FinancialManagementView').then(module => ({ default: module.FinancialManagementView })));
const AllocationView = lazy(() => import('./modules/allocations/AllocationView').then(module => ({ default: module.AllocationView })));
const InventoryView = lazy(() => import('./modules/inventory/InventoryView').then(module => ({ default: module.InventoryView })));
const LeaveManagementView = lazy(() => import('./modules/leave/LeaveManagementView').then(module => ({ default: module.LeaveManagementView })));
const AttendanceOversightView = lazy(() => import('./modules/attendance/AttendanceOversightView').then(module => ({ default: module.AttendanceOversightView })));
const ClassRegisterView = lazy(() => import('./modules/attendance/ClassRegisterView').then(module => ({ default: module.ClassRegisterView })));
const MarkReviewView = lazy(() => import('./modules/marks/MarkReviewView').then(module => ({ default: module.MarkReviewView })));
const MarksheetEntryView = lazy(() => import('./modules/marks/MarksheetEntryView').then(module => ({ default: module.MarksheetEntryView })));
const ClassExamProgressView = lazy(() => import('./modules/marks/ClassExamProgressView').then(module => ({ default: module.ClassExamProgressView })));
const SubjectPerformanceView = lazy(() => import('./modules/dos/SubjectPerformanceView').then(module => ({ default: module.SubjectPerformanceView })));
const SchoolResultsView = lazy(() => import('./modules/dos/SchoolResultsView').then(module => ({ default: module.SchoolResultsView })));
const ClassPerformanceView = lazy(() => import('./modules/class-performance/ClassPerformanceView').then(module => ({ default: module.ClassPerformanceView })));
const ExamTimetableView = lazy(() => import('./modules/exams/ExamTimetableView').then(module => ({ default: module.ExamTimetableView })));
const MarkingAllocationView = lazy(() => import('./modules/exams/MarkingAllocationView').then(module => ({ default: module.MarkingAllocationView })));
const TimetableManagementView = lazy(() => import('./modules/timetable/TimetableManagementView').then(module => ({ default: module.TimetableManagementView })));
import { apiClient } from './lib/apiClient';

// Helper component that selects the appropriate Dashboard Overview based on logged-in role
const OverviewDispatcher: React.FC<{ user: any }> = ({ user }) => {
  const userRole = user?.roleName || user?.role || 'HEAD_TEACHER';
  if (userRole === 'DEPUTY_HEAD' || userRole === 'DEPUTY_HEAD_TEACHER') {
    return <DeputyDashboardView />;
  }
  if (userRole === 'DOS') {
    return <DosDashboardView />;
  }
  if (userRole === 'TEACHER') {
    return <TeacherDashboardView />;
  }
  return <OverviewView />;
};

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      if (!saved || saved === 'undefined' || saved === 'null') return null;
      return JSON.parse(saved);
    } catch (e) {
      console.warn('[Auth] Corrupted auth_user in localStorage, resetting:', e);
      try {
        localStorage.removeItem('auth_user');
      } catch {}
      return null;
    }
  });

  const navigate = useNavigate();

  useEffect(() => {
    // Synchronize school branding, tab title, and favicon dynamically
    getPublicSettings().then((res) => {
      if (res.data.data) {
        const { logoUrl, schoolName } = res.data.data;
        if (schoolName) {
          document.title = `${schoolName} — Staff Portal`;
        }
        if (logoUrl) {
          let favicon: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
          if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
          }
          favicon.href = logoUrl;
        }
      }
    }).catch(() => {});
  }, []);

  const handleLoginSuccess = (user: any, token: string) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_token', token);
    setCurrentUser(user);
    navigate('/overview');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('teacher_workstation');
    setCurrentUser(null);
    navigate('/login');
  };

  return (
    <PullToRefresh>
      <div className="min-h-screen bg-gradient-to-br from-sky-50/40 via-white to-sky-50/30 text-slate-800 antialiased selection:bg-sky-100 selection:text-sky-800 dark:from-[#060c18] dark:via-[#081020] dark:to-[#060c18] dark:text-slate-100 dark:selection:bg-sky-900/60 dark:selection:text-sky-200 transition-colors duration-200">
        <WorkspaceErrorBoundary><Suspense fallback={<div role="status" className="p-6">Loading workspace…</div>}><Routes>
        {/* Public & Invitation Routes */}
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/overview" replace />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email-change" element={<VerifyEmailChangePage />} />

        {/* Protected App Routes under AppLayout Shell */}
        <Route
          element={
            <RoleGuard user={currentUser}>
              <AppLayout user={currentUser} onLogout={handleLogout} />
            </RoleGuard>
          }
        >
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewDispatcher user={currentUser} />} />

          {/* BATCH 1: Headteacher Routes */}
          <Route
            path="/settings"
            element={
              <RoleGuard allowedRoles={['HEAD_TEACHER']} user={currentUser}>
                <SettingsView />
              </RoleGuard>
            }
          />
          <Route
            path="/staff"
            element={
              <RoleGuard allowedRoles={['HEAD_TEACHER', 'SECRETARY']} user={currentUser}>
                <StaffManagementView />
              </RoleGuard>
            }
          />
          <Route
            path="/admissions"
            element={
              <RoleGuard allowedRoles={['HEAD_TEACHER', 'SECRETARY']} user={currentUser}>
                <StudentAdmissionView />
              </RoleGuard>
            }
          />
          <Route
            path="/letters"
            element={
              <RoleGuard allowedRoles={['HEAD_TEACHER']} user={currentUser}>
                <OfficialLetterView />
              </RoleGuard>
            }
          />
          <Route
            path="/fee-structures"
            element={
              <RoleGuard allowedRoles={['HEAD_TEACHER', 'BURSAR']} user={currentUser}>
                <FeeStructureView />
              </RoleGuard>
            }
          />
          <Route
            path="/attendance"
            element={
              <RoleGuard allowedRoles={['HEAD_TEACHER', 'DEPUTY_HEAD', 'SECRETARY']} user={currentUser}>
                <AttendanceOversightView />
              </RoleGuard>
            }
          />
          <Route
            path="/class-register"
            element={
              <RoleGuard allowedRoles={['TEACHER', 'DEPUTY_HEAD', 'HEAD_TEACHER', 'DOS']} user={currentUser}>
                <ClassRegisterView />
              </RoleGuard>
            }
          />
          <Route
            path="/my-learners"
            element={
              <RoleGuard allowedRoles={['TEACHER', 'DEPUTY_HEAD', 'HEAD_TEACHER', 'DOS']} user={currentUser}>
                <ClassLearnersView />
              </RoleGuard>
            }
          />
          <Route
            path="/class-performance"
            element={
              <RoleGuard allowedRoles={['TEACHER', 'HEAD_TEACHER', 'DEPUTY_HEAD', 'DOS']} user={currentUser}>
                <ClassPerformanceView />
              </RoleGuard>
            }
          />
          <Route
            path="/class-performance/:classId"
            element={
              <RoleGuard allowedRoles={['TEACHER', 'HEAD_TEACHER', 'DEPUTY_HEAD', 'DOS']} user={currentUser}>
                <ClassPerformanceView />
              </RoleGuard>
            }
          />
          <Route
            path="/school-results"
            element={
              <RoleGuard allowedRoles={['HEAD_TEACHER', 'DEPUTY_HEAD', 'DOS']} user={currentUser}>
                <SchoolResultsView />
              </RoleGuard>
            }
          />
          <Route
            path="/subject-performance"
            element={
              <RoleGuard allowedRoles={['HEAD_TEACHER', 'DEPUTY_HEAD', 'DOS', 'TEACHER']} user={currentUser}>
                <SubjectPerformanceView />
              </RoleGuard>
            }
          />
          <Route
            path="/finance"
            element={
              <RoleGuard allowedRoles={['HEAD_TEACHER', 'BURSAR']} user={currentUser}>
                <FinancialManagementView />
              </RoleGuard>
            }
          />

          {/* BATCH 2: Deputy Headteacher Routes */}
          <Route
            path="/allocations"
            element={
              <RoleGuard allowedRoles={['DEPUTY_HEAD']} user={currentUser}>
                <AllocationView />
              </RoleGuard>
            }
          />
          <Route
            path="/timetable"
            element={
              <RoleGuard allowedRoles={['DEPUTY_HEAD', 'HEAD_TEACHER', 'TEACHER', 'DOS']} user={currentUser}>
                <TimetableManagementView user={currentUser} />
              </RoleGuard>
            }
          />
          <Route
            path="/inventory"
            element={
              <RoleGuard allowedRoles={['DEPUTY_HEAD']} user={currentUser}>
                <InventoryView />
              </RoleGuard>
            }
          />
          <Route
            path="/leave-requests"
            element={
              <RoleGuard allowedRoles={['DEPUTY_HEAD']} user={currentUser}>
                <LeaveManagementView />
              </RoleGuard>
            }
          />
          <Route
            path="/marks-entry"
            element={
              <RoleGuard allowedRoles={['TEACHER', 'HEAD_TEACHER', 'DEPUTY_HEAD', 'DOS']} user={currentUser}>
                <MarksheetEntryView />
              </RoleGuard>
            }
          />
          <Route
            path="/class-exam-progress"
            element={
              <RoleGuard allowedRoles={['TEACHER', 'DEPUTY_HEAD', 'HEAD_TEACHER', 'DOS']} user={currentUser}>
                <ClassExamProgressView />
              </RoleGuard>
            }
          />

          {/* BATCH 3: Director of Studies Routes */}
          <Route
            path="/exams"
            element={
              <RoleGuard allowedRoles={['DOS']} user={currentUser}>
                <ExamTimetableView />
              </RoleGuard>
            }
          />
          <Route
            path="/marking-allocations"
            element={
              <RoleGuard allowedRoles={['DOS']} user={currentUser}>
                <MarkingAllocationView />
              </RoleGuard>
            }
          />
          <Route
            path="/mark-review"
            element={
              <RoleGuard allowedRoles={['DOS']} user={currentUser}>
                <MarkReviewView />
              </RoleGuard>
            }
          />
        </Route>

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes></Suspense></WorkspaceErrorBoundary>
      <ToastContainer position="top-right" autoClose={3500} theme="colored" />
    </div>
    </PullToRefresh>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
