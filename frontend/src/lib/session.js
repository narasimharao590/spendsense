export const TOKEN_STORAGE_KEY = 'spendsense.token';

export function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    /* storage can be unavailable in private mode; the session then lives in memory only */
  }
}

export function clearToken() {
  writeToken(null);
}
