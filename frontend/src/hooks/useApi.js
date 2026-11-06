import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorMessage, isAbortError } from '../lib/api.js';

/**
 * Fetches data through a caller supplied fetcher and keeps the newest request authoritative.
 * The fetcher is read through a ref so callers can pass a fresh closure on every render,
 * while `deps` describe the query inputs (month, filters, page) that trigger a new request.
 *
 * Returns `loading` for the first result of a query and `refreshing` when data is replaced,
 * plus `refetch` so pages can reload after a mutation without a skeleton flash.
 */
export function useApi(fetcher, deps = []) {
  const [result, setResult] = useState({ data: null, error: null });
  const [busy, setBusy] = useState(true);
  const [round, setRound] = useState(0);

  const requestIdRef = useRef(0);
  const signatureRef = useRef(null);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const signature = JSON.stringify(deps);

  useEffect(() => {
    if (signatureRef.current !== signature) {
      signatureRef.current = signature;
      setResult({ data: null, error: null });
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const controller = new AbortController();

    setBusy(true);

    Promise.resolve()
      .then(() => fetcherRef.current({ signal: controller.signal }))
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        setResult({ data: data === undefined ? null : data, error: null });
      })
      .catch((error) => {
        if (requestIdRef.current !== requestId || isAbortError(error)) return;
        setResult({ data: null, error: apiErrorMessage(error) });
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return;
        setBusy(false);
      });

    return () => {
      controller.abort();
    };
  }, [signature, round]);

  const refetch = useCallback(() => setRound((current) => current + 1), []);

  return {
    data: result.data,
    error: result.error,
    loading: busy && result.data === null,
    refreshing: busy && result.data !== null,
    refetch,
  };
}
