import { useState, useEffect } from 'react';

export function useAuth() {
  const [admin, setAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rr_admin') || 'null');
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!localStorage.getItem('rr_admin_token');

  const login = (token, adminData) => {
    localStorage.setItem('rr_admin_token', token);
    localStorage.setItem('rr_admin', JSON.stringify(adminData));
    setAdmin(adminData);
  };

  const logout = () => {
    localStorage.removeItem('rr_admin_token');
    localStorage.removeItem('rr_admin');
    setAdmin(null);
  };

  // Keeps localStorage + state in sync after a profile-affecting call (e.g.
  // GET /admin/me post-login, or a self-service change) without forcing a
  // re-login. Merges rather than replaces so callers can pass a partial update.
  const updateAdmin = (patch) => {
    setAdmin((prev) => {
      const next = { ...(prev ?? {}), ...patch };
      localStorage.setItem('rr_admin', JSON.stringify(next));
      return next;
    });
  };

  const isSuperAdmin = admin?.role === 'superadmin';
  const isAdminRole = admin?.role === 'admin';
  const isCoachingAdmin = admin?.role === 'coaching_admin';

  return {
    admin,
    isAuthenticated,
    login,
    logout,
    updateAdmin,
    isSuperAdmin,
    isAdminRole,
    isCoachingAdmin,
  };
}
