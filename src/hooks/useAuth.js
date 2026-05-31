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

  return { admin, isAuthenticated, login, logout };
}
