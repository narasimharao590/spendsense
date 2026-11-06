import axios from 'axios';
import { clearToken, readToken } from './session.js';

export const UNAUTHORIZED_EVENT = 'spendsense:unauthorized';

const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.trim() || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const isCredentialAttempt = url.includes('/auth/login') || url.includes('/auth/register');

    if (status === 401 && !isCredentialAttempt) {
      clearToken();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      if (window.location.pathname !== `${ROUTER_BASE}/login`) {
        window.location.assign(`${ROUTER_BASE}/login`);
      }
    }

    return Promise.reject(error);
  },
);

export const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export function apiErrorMessage(error, fallback = FALLBACK_ERROR_MESSAGE) {
  const payload = error?.response?.data;
  const details = Array.isArray(payload?.details) ? payload.details.filter(Boolean) : [];

  if (details.length > 0) {
    return details.join(' ');
  }
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  if (error?.code === 'ERR_NETWORK') {
    return 'Cannot reach the SpendSense server. Check that it is running.';
  }
  return fallback;
}

export function isAbortError(error) {
  return axios.isCancel?.(error) || error?.name === 'AbortError' || error?.code === 'ERR_CANCELED';
}

export function unwrapList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
}

export function unwrapResource(payload, key) {
  if (payload && typeof payload === 'object' && payload[key] !== undefined) {
    return payload[key];
  }
  return payload;
}

export default api;
