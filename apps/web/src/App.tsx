import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './modules/auth/LoginPage';
import { AcceptInvitationPage } from './modules/auth/AcceptInvitationPage';
import { ResetPasswordPage } from './modules/auth/ResetPasswordPage';
import { VerifyEmailChangePage } from './modules/auth/VerifyEmailChangePage';
import { DashboardPage } from './modules/dashboard/DashboardPage';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLoginSuccess = (user: any, token: string) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_token', token);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    setCurrentUser(null);
  };

  const currentPath = window.location.pathname;

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        {currentPath === '/accept-invitation' ? (
          <AcceptInvitationPage />
        ) : currentPath === '/reset-password' ? (
          <ResetPasswordPage />
        ) : currentPath === '/verify-email-change' ? (
          <VerifyEmailChangePage />
        ) : !currentUser ? (
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        ) : (
          <DashboardPage user={currentUser} onLogout={handleLogout} />
        )}
        <ToastContainer position="top-right" autoClose={3500} theme="colored" />
      </div>
    </ThemeProvider>
  );
};

export default App;
