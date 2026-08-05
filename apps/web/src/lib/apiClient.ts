import axios from 'axios';

let apiUrl = import.meta.env.VITE_API_URL || '';
if (apiUrl && !apiUrl.startsWith('http')) apiUrl = `https://${apiUrl}`;

export const apiClient = axios.create({
  baseURL: apiUrl,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
