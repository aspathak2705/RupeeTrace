import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession } from '../types';
import { api, setAuthToken, getAuthToken } from '../api/client';

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isOfficer: boolean;
  isCitizen: boolean;
  loginDemo: (role: 'citizen' | 'officer') => Promise<void>;
  loginCredentials: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default fallback demo user (Citizen)
const DEFAULT_CITIZEN_USER: UserSession = {
  username: 'citizen',
  name: 'Sunita Sharma',
  role: 'citizen',
  designation: 'Active Citizen & Ward Resident',
  ward_code: 'K/E',
  locality: 'Andheri East, Marol'
};

const DEFAULT_OFFICER_USER: UserSession = {
  username: 'officer',
  name: 'Er. R. K. Patil',
  role: 'officer',
  designation: 'Executive Engineer (Roads & Infrastructure)',
  ward_code: 'K/E',
  office: 'BMC Assistant Commissioner Office, K/East Ward'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getAuthToken();
      if (!storedToken) {
        // Create initial authentic session via backend API
        try {
          const res = await api.login({ demo_role: 'citizen' });
          setToken(res.token);
          setUser(res.user);
        } catch (err) {
          console.warn('Initial session auth notice:', err);
          setAuthToken(null);
          setToken(null);
          setUser(null);
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const me = await api.getMe();
        setUser(me.user);
      } catch (err) {
        // Backend invalidated or expired token: clear frontend state
        setAuthToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginDemo = async (role: 'citizen' | 'officer') => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.login({ demo_role: role });
      setToken(res.token);
      setUser(res.user);
    } catch (err: any) {
      console.error('API login error:', err);
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginCredentials = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.login({ username, password });
      setToken(res.token);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Backend logout error:', err);
    } finally {
      // Invalidate current session on backend and clear frontend state
      setAuthToken(null);
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        isOfficer: user?.role === 'officer',
        isCitizen: user?.role === 'citizen',
        loginDemo,
        loginCredentials,
        logout,
        clearError: () => setError(null)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
