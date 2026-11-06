import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import BudgetList from '../components/budgets/BudgetList.jsx';
import BudgetModal from '../components/budgets/BudgetModal.jsx';
import BudgetSummaryStrip from '../components/budgets/BudgetSummaryStrip.jsx';
import MonthPicker from '../components/MonthPicker.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Button from '../components/ui/Button.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { SkeletonRows } from '../components/ui/Skeleton.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useCategories } from '../hooks/useCategories.js';
import api, { apiErrorMessage, unwrapList } from '../lib/api.js';
import { monthLabel, toMonthKey } from '../lib/format.js';

export default function Budgets() {
  const toast = useToast();
  const [month, setMonth] = useState(() => toMonthKey(new Date()));

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { expenseCategories, refetch: refetchCategories } = useCategories({ type: 'expense' });

  const budgetsCall = useApi(
    ({ signal }) =>
      api.get('/budgets', { params: { month }, signal }).then((response) => unwrapList(response.data)),
    [month],
  );

  const summaryCall = useApi(
    ({ signal }) =>
      api.get('/budgets/summary', { params: { month }, signal }).then((response) => response.data),
    [month],
  );

  const budgets = budgetsCall.data ?? [];
  const budgetedCategoryIds = budgets.map((budget) => String(budget.category?.id ?? ''));

  function openCreate() {
    setEditingBudget(null);
    setModalOpen(true);
  }

  function openEdit(budget) {
    setEditingBudget(budget);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingBudget(null);
  }

  function handleSaved() {
    closeModal();
    budgetsCall.refetch();
    summaryCall.refetch();
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await api.delete(`/budgets/${deleteTarget.id}`);
      toast.success(`${deleteTarget.category?.name ?? 'Budget'} budget removed.`);
      setDeleteTarget(null);
      budgetsCall.refetch();
      summaryCall.refetch();
    } catch (error) {
      const message = apiErrorMessage(error, 'Could not delete this budget.');
      setDeleteError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Budgets"
        description="Set a monthly limit for each expense category and track how far you have gone."
        actions={
          <>
            <MonthPicker month={month} onChange={setMonth} />
            <Button onClick={openCreate}>
              <Plus size={16} aria-hidden="true" />
              Add budget
            </Button>
          </>
        }
      />

      {budgetsCall.error || summaryCall.error ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-rose-200 bg-rose-50/60 p-5">
          <p role="alert" className="text-sm text-rose-800">
            {budgetsCall.error ?? summaryCall.error}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              budgetsCall.refetch();
              summaryCall.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      ) : null}

      <BudgetSummaryStrip summary={summaryCall.data} loading={summaryCall.loading} />

      {budgetsCall.loading ? (
        <div className="card p-5">
          <SkeletonRows rows={4} />
        </div>
      ) : budgets.length === 0 ? (
        <div className="card p-5 sm:p-6">
          <EmptyState
            icon={Wallet}
            title={`No budgets for ${monthLabel(month)}`}
            description="Pick an expense category, give it a monthly limit, and SpendSense tracks the rest."
            action={
              <Button onClick={openCreate}>
                <Plus size={16} aria-hidden="true" />
                Add your first budget
              </Button>
            }
          />
        </div>
      ) : (
        <section className="space-y-3" aria-label="Category budgets">
          <BudgetList budgets={budgets} onEdit={openEdit} onDelete={setDeleteTarget} />
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={openCreate}>
              <Plus size={15} aria-hidden="true" />
              Add another budget
            </Button>
          </div>
        </section>
      )}

      <BudgetModal
        open={modalOpen}
        month={month}
        budget={editingBudget}
        expenseCategories={expenseCategories}
        budgetedCategoryIds={budgetedCategoryIds}
        onClose={closeModal}
        onSaved={handleSaved}
        onCategoryCreated={refetchCategories}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this budget?"
        description={
          deleteTarget
            ? `The ${deleteTarget.category?.name ?? ''} limit for ${monthLabel(deleteTarget.month ?? month)} will be removed. Transactions are not affected.`
            : ''
        }
        message={deleteError}
        confirmLabel="Delete budget"
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
