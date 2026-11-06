import { useMemo } from 'react';
import api, { unwrapList } from '../lib/api.js';
import { useApi } from './useApi.js';

export function useCategories({ type } = {}) {
  const { data, loading, error, refetch } = useApi(
    ({ signal }) =>
      api
        .get('/categories', { params: type ? { type } : undefined, signal })
        .then((response) => unwrapList(response.data)),
    [type ?? 'all'],
  );

  const categories = useMemo(() => data ?? [], [data]);

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories],
  );
  const incomeCategories = useMemo(
    () => categories.filter((category) => category.type === 'income'),
    [categories],
  );

  return {
    categories,
    expenseCategories,
    incomeCategories,
    loading,
    error,
    refetch,
  };
}
