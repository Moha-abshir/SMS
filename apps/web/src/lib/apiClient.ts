import axios, { AxiosError } from 'axios';
import { sanitizeErrorMessage } from './formatters';

let apiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
if (apiUrl && !apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
  apiUrl = `https://${apiUrl}`;
}

if (!apiUrl && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  console.warn('[API Client Warning] VITE_API_URL is not set. API requests will target the frontend host origin.');
}

export const apiClient = axios.create({
  baseURL: apiUrl,
  // A broken connection must settle instead of leaving pages/drawers loading forever.
  timeout: 30_000,
  timeoutErrorMessage: 'The server took too long to respond. Please try again.',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  // The API sends Cache-Control: no-store and disables ETags. Keep stable GET
  // URLs so browsers can reuse CORS preflight permission on later visits.

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const expectsJson = !response.config.responseType || response.config.responseType === 'json';
    if (expectsJson && response.config.url?.includes('/api/') && response.status !== 204) {
      if (!response.data || typeof response.data !== 'object') {
        throw new AxiosError('The server returned an unexpected response. Please try again.', 'ERR_BAD_RESPONSE', response.config, response.request, response);
      }
      if (response.data.success === false) {
        throw new AxiosError(sanitizeErrorMessage(response.data.message || 'The request could not be completed.'), 'ERR_BAD_RESPONSE', response.config, response.request, response);
      }
    }
    return response;
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        // Do not force-reload the page if this is a login/auth attempt, an action confirmation, or an unauthenticated public route
        const url = error.config?.url || '';
        const isAuthRequest = url.includes('/api/auth/login') || url.includes('/api/auth/verify-2fa') || url.includes('/api/auth/password-reset');
        const isActionAuthorization = url.includes('/api/timetable/generate') || Boolean((error.config as any)?.skipAuthRedirect);
        const isPublicRequest = url.includes('/api/settings/public');
        const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
        const isAuthPage = pathname === '/' || pathname === '/login' || pathname.startsWith('/reset-password') || pathname.startsWith('/accept-invitation') || pathname.startsWith('/verify-email');

        if (!isAuthRequest && !isActionAuthorization && !isPublicRequest && !isAuthPage) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          localStorage.removeItem('teacher_workstation');
          window.location.href = '/login';
        }
      }

      // Sanitize raw SQL/DB traceback messages if present in server response
      if (error.response.data && typeof error.response.data.message === 'string') {
        error.response.data.message = sanitizeErrorMessage(error.response.data.message);
      }
    }
    return Promise.reject(error);
  }
);
