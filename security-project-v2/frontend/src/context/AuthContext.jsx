import { createContext, useContext, useState, useCallback } from 'react';
import client from '../api/client';
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user,  setUser]  = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const login = useCallback((userData, jwt) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', jwt);
    setUser(userData); setToken(jwt);
  }, []);
  const logout = useCallback(() => {
    localStorage.removeItem('user'); localStorage.removeItem('token');
    setUser(null); setToken(null);
  }, []);
  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: Boolean(token && user) }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
