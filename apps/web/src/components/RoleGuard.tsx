import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Forbidden403Page } from './Forbidden403Page';

interface RoleGuardProps {
  allowedRoles?: string[];
  user?: any;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, user, children }) => {
  const location = useLocation();

  // Retrieve user if not passed directly via props
  const currentUser = user || (() => {
    try {
      const saved = localStorage.getItem('auth_user');
      if (!saved || saved === 'undefined' || saved === 'null') return null;
      return JSON.parse(saved);
    } catch {
      return null;
    }
  })();

  // 1. Unauthenticated check
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role normalization (handles roleName or role field)
  const userRole = currentUser.roleName || currentUser.role || 'GUEST';

  // 3. Permission check
  if (allowedRoles && allowedRoles.length > 0) {
    const hasPermission = allowedRoles.some((role) => {
      if (role === 'DEPUTY_HEAD') {
        return userRole === 'DEPUTY_HEAD' || userRole === 'DEPUTY_HEAD_TEACHER';
      }
      return userRole === role;
    });

    if (!hasPermission) {
      return <Forbidden403Page requestedPath={location.pathname} userRole={userRole} />;
    }
  }

  return <>{children}</>;
};
