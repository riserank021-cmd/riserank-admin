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

// ── Video Classes ─────────────────────────────────────────────────────────────
export const videosAPI = {
  list: (params)      => api.get('/videos', { params }),
  getById: (id)        => api.get(`/videos/${id}`),
  create: (data)       => api.post('/videos', data),
  update: (id, data)   => api.put(`/videos/${id}`, data),
  remove: (id)          => api.delete(`/videos/${id}`),
  publish: (id)         => api.patch(`/videos/${id}/publish`),
  archive: (id)         => api.patch(`/videos/${id}/archive`),
  setLiveStatus: (id, liveStatus) => api.patch(`/videos/${id}/live-status`, { liveStatus }),
};

export const teachersAPI = {
  list: (params)      => api.get('/teachers', { params }),
  getById: (id)         => api.get(`/teachers/${id}`),
  create: (data)        => api.post('/teachers', data),
  update: (id, data)    => api.put(`/teachers/${id}`, data),
  remove: (id)           => api.delete(`/teachers/${id}`),
};

export const playlistsAPI = {
  list: (params)      => api.get('/playlists', { params }),
  getById: (id)         => api.get(`/playlists/${id}`),
  create: (data)        => api.post('/playlists', data),
  update: (id, data)    => api.put(`/playlists/${id}`, data),
  setVideos: (id, videos) => api.put(`/playlists/${id}/videos`, { videos }),
  remove: (id)           => api.delete(`/playlists/${id}`),
};

export const batchesAPI = {
  list: (params)      => api.get('/batches', { params }),
  getById: (id)         => api.get(`/batches/${id}`),
  create: (data)        => api.post('/batches', data),
  update: (id, data)    => api.put(`/batches/${id}`, data),
  remove: (id)           => api.delete(`/batches/${id}`),
  listStudents: (id, params) => api.get(`/batches/${id}/students`, { params }),
  addStudents: (id, studentIds) => api.post(`/batches/${id}/students`, { studentIds }),
  removeStudents: (id, studentIds) => api.post(`/batches/${id}/students/remove`, { studentIds }),
};

export const videoAnalyticsAPI = {
  overview: ()                => api.get('/video-analytics/overview'),
  popular: (params)           => api.get('/video-analytics/popular', { params }),
  dailyViews: (params)        => api.get('/video-analytics/daily-views', { params }),
  monthlyViews: (params)      => api.get('/video-analytics/monthly-views', { params }),
  videoStats: (videoId)       => api.get(`/video-analytics/video/${videoId}`),
  teacherAnalytics: (teacherId) => api.get(`/video-analytics/teacher/${teacherId}`),
  batchAnalytics: (batchId)   => api.get(`/video-analytics/batch/${batchId}`),
};
