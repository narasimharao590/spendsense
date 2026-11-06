import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { UNAUTHORIZED_EVENT } from '../lib/api.js';
import { clearToken, readToken, writeToken } from '../lib/session.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readToken());
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (readToken() ? 'loading' : 'anonymous'));

  useEffect(() => {
    const initialToken = readToken();
    if (!initialToken) {
      setStatus('anonymous');
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;

    api
      .get('/auth/me', { signal: controller.signal })
      .then((response) => {
        if (cancelled) return;
        setUser(response.data.user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled || controller.signal.aborted) return;
        clearToken();
        setToken(null);
        setUser(null);
        setStatus('anonymous');
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setToken(readToken());
      setUser(null);
      setStatus(readToken() ? 'loading' : 'anonymous');
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const persistSession = useCallback((nextToken, nextUser) => {
    writeToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  const login = useCallback(
    async (email, password) => {
      const response = await api.post('/auth/login', { email, password });
      persistSession(response.data.token, response.data.user);
      return response.data.user;
    },
    [persistSession],
  );

  const register = useCallback(
    async (name, email, password) => {
      const response = await api.post('/auth/register', { name, email, password });
      persistSession(response.data.token, response.data.user);
      return response.data.user;
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const response = await api.patch('/auth/me', patch);
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const value = useMemo(
    () => ({ user, token, status, login, register, logout, updateProfile }),
    [user, token, status, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
