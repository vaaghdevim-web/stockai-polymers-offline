import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, clearAuthState, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('stockai_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('stockai_token'));
  const [loading, setLoading] = useState(false);
  const [totpRequired, setTotpRequired] = useState(false);

  // Sync token state on external storage changes and auto-logout events
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem('stockai_token'));
      try {
        const saved = localStorage.getItem('stockai_user');
        setUser(saved ? JSON.parse(saved) : null);
      } catch {
        setUser(null);
      }
    };

    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
      setTotpRequired(false);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('stockai:auth-expired', handleAuthExpired);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('stockai:auth-expired', handleAuthExpired);
    };
  }, []);

  const login = async (usernameOrEmail, password, totpCode = null) => {
    setLoading(true);
    try {
      const response = await authApi.login({
        usernameOrEmail: usernameOrEmail ? usernameOrEmail.trim() : '',
        password: password || '',
        totpCode: totpCode ? totpCode.trim() : null,
      });

      const data = response.data;
      if (data && data.token) {
        localStorage.setItem('stockai_token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('stockai_refresh_token', data.refreshToken);
        }
        setAuthToken(data.token);
        const userData = {
          id: data.userId,
          name: data.userName,
          email: data.email,
          roles: Array.isArray(data.roles) ? data.roles : [],
        };
        localStorage.setItem('stockai_user', JSON.stringify(userData));
        setUser(userData);
        setToken(data.token);
        setTotpRequired(false);
        return { success: true, user: userData };
      } else {
        throw new Error('Malformed authentication response from backend server.');
      }
    } catch (err) {
      const status = err.response?.status;
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Authentication failed';

      // Check if backend specifically signals MFA/TOTP challenge requirement
      const isMfaChallenge =
        status === 401 &&
        (errorMsg.toLowerCase().includes('totp') ||
          errorMsg.toLowerCase().includes('mfa') ||
          errorMsg.toLowerCase().includes('mandatory') ||
          errorMsg.toLowerCase().includes('two-factor'));

      if (isMfaChallenge && (!totpCode || totpCode.trim() === '')) {
        setTotpRequired(true);
        return { totpRequired: true, message: errorMsg };
      }

      // If network error (backend down / unreachable)
      if (err.code === 'ERR_NETWORK' || !err.response) {
        throw new Error('StockAI Backend is unreachable. Verify that Spring Boot is running on port 8080.');
      }

      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthState();
      setUser(null);
      setToken(null);
      setTotpRequired(false);
    }
  };

  const refreshToken = async () => {
    const storedRefresh = localStorage.getItem('stockai_refresh_token');
    if (!storedRefresh) {
      await logout();
      return null;
    }
    try {
      const response = await authApi.refresh(storedRefresh);
      const data = response.data;
      if (data && data.token) {
        localStorage.setItem('stockai_token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('stockai_refresh_token', data.refreshToken);
        }
        setAuthToken(data.token);
        setToken(data.token);
        return data.token;
      }
      throw new Error('Refresh response missing token payload');
    } catch {
      await logout();
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        totpRequired,
        setTotpRequired,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
