import { useAuth } from '../context/AuthContext.jsx';
import { DEFAULT_CURRENCY } from '../lib/format.js';

export function useCurrency() {
  const { user } = useAuth();
  return user?.currency || DEFAULT_CURRENCY;
}
