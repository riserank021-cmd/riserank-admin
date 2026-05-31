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
      window.location.href = '/login';
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
  suspend: (id) => api.patch(`/admin/users/${id}/suspend`),
  unsuspend: (id) => api.patch(`/admin/users/${id}/unsuspend`),
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
