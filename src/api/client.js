/**
 * Axios client — auto-attaches admin JWT and handles 401s.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rr_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rr_admin_token');
      localStorage.removeItem('rr_admin');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    api.post('/auth/admin/login', { email, password }),
};

// ── Questions ─────────────────────────────────────────────────────────────────
export const questionsAPI = {
  list: (params) => api.get('/questions', { params }),
  getById: (id) => api.get(`/questions/${id}`),
  create: (data) => api.post('/questions', data),
  update: (id, data) => api.put(`/questions/${id}`, data),
  remove: (id) => api.delete(`/questions/${id}`),
};

// ── Quizzes ───────────────────────────────────────────────────────────────────
export const quizzesAPI = {
  list: (params) => api.get('/quizzes', { params }),
  getById: (id) => api.get(`/quizzes/${id}`),
  create: (data) => api.post('/quizzes', data),
  update: (id, data) => api.put(`/quizzes/${id}`, data),
  remove: (id) => api.delete(`/quizzes/${id}`),
};

// ── Current Affairs ───────────────────────────────────────────────────────────
export const currentAffairsAPI = {
  list: (params) => api.get('/current-affairs', { params }),
  getById: (id) => api.get(`/current-affairs/${id}`),
  create: (data) => api.post('/current-affairs', data),
  update: (id, data) => api.put(`/current-affairs/${id}`, data),
  remove: (id) => api.delete(`/current-affairs/${id}`),
  publish: (id) => api.patch(`/current-affairs/${id}/publish`),
  archive: (id) => api.patch(`/current-affairs/${id}/archive`),
};

// ── Categories ────────────────────────────────────────────────────────────────
export const categoriesAPI = {
  list: () => api.get('/categories'),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersAPI = {
  list: (params) => api.get('/admin/users', { params }),
  getById: (id) => api.get(`/admin/users/${id}`),
  suspend: (id, reason = 'Suspended by administrator') =>
    api.patch(`/admin/users/${id}/suspend`, { reason }),
  unsuspend: (id) => api.patch(`/admin/users/${id}/unsuspend`),
  updateRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  overview: () => api.get('/analytics/overview'),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsAPI = {
  list: (params) => api.get('/admin/reports', { params }),
  review: (id, data) => api.patch(`/admin/reports/${id}/review`, data),
};

// ── Live Tests ─────────────────────────────────────────────────────────────────
export const liveTestsAPI = {
  list: (params)      => api.get('/live-tests', { params }),
  getById: (id)       => api.get(`/live-tests/${id}`),
  create: (data)      => api.post('/live-tests', data),
  update: (id, data)  => api.patch(`/live-tests/${id}`, data),
  setStatus: (id, status) => api.patch(`/live-tests/${id}/status`, { status }),
  remove: (id)        => api.delete(`/live-tests/${id}`),
  leaderboard: (id)   => api.get(`/live-tests/${id}/leaderboard`),
  stats: (id)         => api.get(`/live-tests/${id}/stats`),
};
