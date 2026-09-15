import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './modules/auth/LoginPage';
import { AcceptInvitationPage } from './modules/auth/AcceptInvitationPage';
import { ResetPasswordPage } from './modules/auth/ResetPasswordPage';
import { VerifyEmailChangePage } from './modules/auth/VerifyEmailChangePage';
import { AppLayout } from './components/AppLayout';
import { RoleGuard } from './components/RoleGuard';
import { OverviewView } from './modules/dashboard/OverviewView';
import { DeputyDashboardView } from './modules/dashboard/DeputyDashboardView';
import { DosDashboardView } from './modules/dashboard/DosDashboardView';
import { SettingsView } from './modules/settings/SettingsView';
import { StaffManagementView } from './modules/staff/StaffManagementView';
import { StudentAdmissionView } from './modules/admissions/StudentAdmissionView';
import { OfficialLetterView } from './modules/letters/OfficialLetterView';
import { FeeStructureView } from './modules/finance/FeeStructureView';
import { FinancialManagementView } from './modules/finance/FinancialManagementView';
import { AllocationView } from './modules/allocations/AllocationView';
import { InventoryView } from './modules/inventory/InventoryView';
import { LeaveManagementView } from './modules/leave/LeaveManagementView';
import { AttendanceOversightView } from './modules/attendance/AttendanceOversightView';
import { MarkReviewView } from './modules/marks/MarkReviewView';
import { SubjectPerformanceView } from './modules/dos/SubjectPerformanceView';
import { ExamTimetableView } from './modules/exams/ExamTimetableView';
import { InvigilatorAllocationView } from './modules/exams/InvigilatorAllocationView';
import { MarkingAllocationView } from './modules/exams/MarkingAllocationView';
import { ReportCardLockView } from './modules/exams/ReportCardLockView';
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
  return <OverviewView />;
};

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const navigate = useNavigate();

  useEffect(() => {
    // Synchronize school branding, tab title, and favicon dynamically
    apiClient.get('/api/settings/public').then((res) => {
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
    setCurrentUser(null);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50/40 via-white to-sky-50/30 text-slate-800 antialiased selection:bg-sky-100 selection:text-sky-800">
      <Routes>
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
              <RoleGuard allowedRoles={['HEAD_TEACHER']} user={currentUser}>
                <FeeStructureView />
              </RoleGuard>
            }
          />
          <Route
            path="/report-locks"
            element={
              <RoleGuard allowedRoles={['HEAD_TEACHER', 'DOS']} user={currentUser}>
                <ReportCardLockView />
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
            path="/subject-performance"
            element={
              <RoleGuard allowedRoles={['HEAD_TEACHER', 'DEPUTY_HEAD', 'DOS']} user={currentUser}>
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
            path="/mark-review"
            element={
              <RoleGuard allowedRoles={['DEPUTY_HEAD']} user={currentUser}>
                <MarkReviewView />
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
            path="/invigilation"
            element={
              <RoleGuard allowedRoles={['DOS']} user={currentUser}>
                <InvigilatorAllocationView />
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
        </Route>

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3500} theme="colored" />
    </div>
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
