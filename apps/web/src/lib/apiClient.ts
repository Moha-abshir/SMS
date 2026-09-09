import axios from 'axios';
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
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/';
      }

      // Sanitize raw SQL/DB traceback messages if present in server response
      if (error.response.data && typeof error.response.data.message === 'string') {
        error.response.data.message = sanitizeErrorMessage(error.response.data.message);
      }
    }
    return Promise.reject(error);
  }
);
