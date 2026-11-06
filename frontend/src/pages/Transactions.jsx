import { useEffect, useMemo, useState } from 'react';
import { Inbox, Plus, SearchX } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Button from '../components/ui/Button.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import TransactionCards from '../components/transactions/TransactionCards.jsx';
import TransactionFilters from '../components/transactions/TransactionFilters.jsx';
import TransactionModal from '../components/transactions/TransactionModal.jsx';
import TransactionTable from '../components/transactions/TransactionTable.jsx';
import { SkeletonRows } from '../components/ui/Skeleton.jsx';
import { useCategories } from '../hooks/useCategories.js';
import { useApi } from '../hooks/useApi.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import api, { apiErrorMessage, unwrapList } from '../lib/api.js';
import { monthRange, toMonthKey } from '../lib/format.js';

const INITIAL_FILTERS = {
  search: '',
  type: '',
  categoryId: '',
  from: '',
  to: '',
  sort: '-date',
};

export default function Transactions() {
  const toast = useToast();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { categories, refetch: refetchCategories } = useCategories();
  const debouncedSearch = useDebouncedValue(filters.search, 350);

  const params = useMemo(
    () => ({
      type: filters.type || undefined,
      categoryId: filters.categoryId || undefined,
      search: debouncedSearch.trim() || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      sort: filters.sort,
      page,
      limit,
    }),
    [filters.type, filters.categoryId, filters.from, filters.to, filters.sort, debouncedSearch, page, limit],
  );

  const listCall = useApi(
    ({ signal }) =>
      api
        .get('/transactions', { params, signal })
        .then((response) => ({
          rows: unwrapList(response.data),
          total: Number(response.data.total) || 0,
          pages: Number(response.data.pages) || 1,
        })),
    [params.type, params.categoryId, params.search, params.from, params.to, params.sort, params.page, params.limit],
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.type, filters.categoryId, filters.from, filters.to, filters.sort, limit]);

  const rows = listCall.data?.rows ?? [];
  const total = listCall.data?.total ?? 0;
  const pages = listCall.data?.pages ?? 1;
  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    Boolean(filters.type) ||
    Boolean(filters.categoryId) ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    filters.sort !== INITIAL_FILTERS.sort;

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function clearFilters() {
    setFilters(INITIAL_FILTERS);
  }

  function applyThisMonth() {
    const { from, to } = monthRange(toMonthKey(new Date()));
    setFilters((current) => ({ ...current, from, to }));
  }

  function openCreate() {
    setEditingTransaction(null);
    setModalOpen(true);
  }

  function openEdit(transaction) {
    setEditingTransaction(transaction);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingTransaction(null);
  }

  function handleSaved() {
    closeModal();
    listCall.refetch();
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await api.delete(`/transactions/${deleteTarget.id}`);
      toast.success(`${deleteTarget.title} deleted.`);
      setDeleteTarget(null);
      listCall.refetch();
    } catch (error) {
      const message = apiErrorMessage(error, 'Could not delete this transaction.');
      setDeleteError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Transactions"
        description="Every entry you have recorded, filterable by type, category and date range."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            Add transaction
          </Button>
        }
      />

      <TransactionFilters
        search={filters.search}
        onSearchChange={(value) => updateFilter('search', value)}
        type={filters.type}
        onTypeChange={(value) => updateFilter('type', value)}
        categoryId={filters.categoryId}
        onCategoryIdChange={(value) => updateFilter('categoryId', value)}
        categories={categories}
        from={filters.from}
        onFromChange={(value) => updateFilter('from', value)}
        to={filters.to}
        onToChange={(value) => updateFilter('to', value)}
        sort={filters.sort}
        onSortChange={(value) => updateFilter('sort', value)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        onThisMonth={applyThisMonth}
        total={total}
        loading={listCall.loading}
        onAdd={openCreate}
      />

      {listCall.error ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-rose-200 bg-rose-50/60 p-5">
          <p role="alert" className="text-sm text-rose-800">
            {listCall.error}
          </p>
          <Button variant="secondary" onClick={listCall.refetch}>
            Try again
          </Button>
        </div>
      ) : null}

      {listCall.loading ? (
        <div className="card p-4 sm:p-5">
          <SkeletonRows rows={6} />
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-5 sm:p-6">
          <EmptyState
            icon={hasActiveFilters ? SearchX : Inbox}
            title={hasActiveFilters ? 'No transactions match these filters' : 'No transactions yet'}
            description={
              hasActiveFilters
                ? 'Try a wider date range, or clear the filters to see everything.'
                : 'Log your first expense or income and it will show up here.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button onClick={openCreate}>
                  <Plus size={16} aria-hidden="true" />
                  Add transaction
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="card p-4 sm:p-5">
          <div className="hidden md:block">
            <TransactionTable transactions={rows} onEdit={openEdit} onDelete={setDeleteTarget} />
          </div>
          <div className="md:hidden">
            <TransactionCards transactions={rows} onEdit={openEdit} onDelete={setDeleteTarget} />
          </div>

          <nav aria-label="Pagination" className="mt-4">
            <Pagination
              page={page}
              pages={pages}
              total={total}
              limit={limit}
              loading={listCall.loading || listCall.refreshing}
              onPrevious={() => setPage((current) => Math.max(current - 1, 1))}
              onNext={() => setPage((current) => Math.min(current + 1, pages))}
              onLimitChange={setLimit}
            />
          </nav>
        </div>
      )}

      <TransactionModal
        open={modalOpen}
        transaction={editingTransaction}
        categories={categories}
        onClose={closeModal}
        onSaved={handleSaved}
        onCategoryCreated={refetchCategories}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this transaction?"
        description={deleteTarget ? `"${deleteTarget.title}" will be removed from your ledger.` : ''}
        message={deleteError}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
