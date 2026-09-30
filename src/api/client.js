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

// ── Admin / Coaching Admin self-service + account management ──────────────────
// getMe/changePassword: self-service (admin, superadmin, coaching_admin) — see
// /admin/me, /admin/me/change-password (Bug #2). listAdmins only ever returns
// role=admin accounts (backend limitation — see admin.service.js's listAdmins
// comment); coaching_admin accounts must be fetched per-center via
// coachingCentersAPI.listAdminsForCenter.
export const adminsAPI = {
  getMe: () => api.get('/admin/me'),
  changeMyPassword: (data) => api.put('/admin/me/change-password', data),
  list: (params) => api.get('/admin/admins', { params }),
  create: (data) => api.post('/admin/admins', data),
  update: (id, data) => api.patch(`/admin/admins/${id}`, data),
  remove: (id) => api.delete(`/admin/admins/${id}`),
};

// ── Coaching Centers ────────────────────────────────────────────────────────────
export const coachingCentersAPI = {
  list: (params) => api.get('/coaching-centers', { params }),
  getById: (idOrSlug) => api.get(`/coaching-centers/${idOrSlug}`),
  create: (data) => api.post('/coaching-centers', data),
  update: (id, data) => api.put(`/coaching-centers/${id}`, data),
  setStatus: (id, status) => api.patch(`/coaching-centers/${id}/status`, { status }),
  listAdminsForCenter: (id) => api.get(`/coaching-centers/${id}/admins`),
  uploadLogo: (id, file, onProgress) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post(`/upload/coaching-center/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  uploadCover: (id, file, onProgress) => {
    const formData = new FormData();
    formData.append('cover', file);
    return api.post(`/upload/coaching-center/${id}/cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
};

// ── Exams (dynamic, database-driven) ─────────────────────────────────────────
export const examsAPI = {
  list: (params) => api.get('/exams', { params }),
  getById: (id) => api.get(`/exams/${id}`),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.put(`/exams/${id}`, data),
  archive: (id) => api.patch(`/exams/${id}/archive`),
};

// ── Upload helpers not tied to an existing resource-specific object above ────
export const uploadAPI = {
  videoThumbnail: (file, onProgress) => {
    const formData = new FormData();
    formData.append('thumbnail', file);
    return api.post('/upload/video-thumbnail', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  teacherAvatar: (teacherId, file, onProgress) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post(`/upload/teacher/${teacherId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  // Current Affairs cover image (2026-09-30) — article must already exist
  // (needs its _id), same pattern as teacherAvatar above.
  currentAffairImage: (articleId, file, onProgress) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/upload/current-affairs/${articleId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
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
  // Image-reuse gallery (2026-09-30) -- distinct imageUrls already used by
  // other articles, so an editor can pick one instead of uploading again.
  imageGallery: () => api.get('/current-affairs/images/gallery'),
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
  // Super Admin only (route is authorize(SUPER_ADMIN) — not extended to plain
  // Admin on the backend), so the Activity Logs page gates on that role.
  adminLogs: (params) => api.get('/analytics/admin-logs', { params }),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsAPI = {
  list: (params) => api.get('/admin/reports', { params }),
  review: (id, data) => api.patch(`/admin/reports/${id}/review`, data),
  grouped: () => api.get('/admin/reports/grouped'),
  bulkReview: (questionId, data) => api.patch(`/admin/reports/question/${questionId}/bulk-review`, data),
};

// ── Exam Dates ────────────────────────────────────────────────────────────────
export const examDatesAPI = {
  list: () => api.get('/exam-dates'),
  create: (data) => api.post('/exam-dates', data),
  update: (id, data) => api.put(`/exam-dates/${id}`, data),
  remove: (id) => api.delete(`/exam-dates/${id}`),
};

// ── FAQs ──────────────────────────────────────────────────────────────────────
export const faqsAPI = {
  list: () => api.get('/faqs'),
  create: (data) => api.post('/faqs', data),
  update: (id, data) => api.put(`/faqs/${id}`, data),
  remove: (id) => api.delete(`/faqs/${id}`),
};

// ── Support Tickets ───────────────────────────────────────────────────────────
export const supportTicketsAPI = {
  list: (params) => api.get('/support-tickets', { params }),
  respond: (id, data) => api.patch(`/support-tickets/${id}/respond`, data),
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
  pendingRequests: ()    => api.get('/playlists/requests/pending'),
  respondToRequest: (id, userId, decision) => api.put(`/playlists/${id}/requests/${userId}`, { decision }),
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

// ── System Health ─────────────────────────────────────────────────────────────
export const systemHealthAPI = {
  check: () => api.get('/system-health/check'),
  testEmail: () => api.post('/system-health/test-email'),
  testPush: (userId) => api.post('/system-health/test-push', userId ? { userId } : {}),
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
