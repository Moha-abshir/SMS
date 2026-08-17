import React, { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './modules/auth/LoginPage';
import { AcceptInvitationPage } from './modules/auth/AcceptInvitationPage';
import { ResetPasswordPage } from './modules/auth/ResetPasswordPage';
import { VerifyEmailChangePage } from './modules/auth/VerifyEmailChangePage';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { apiClient } from './lib/apiClient';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });

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
