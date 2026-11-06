import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { useCurrency } from '../../hooks/useCurrency.js';
import api, { apiErrorMessage, unwrapResource } from '../../lib/api.js';
import { formatMoney, monthLabel } from '../../lib/format.js';
import Button from '../ui/Button.jsx';
import CategoryChip from '../ui/CategoryChip.jsx';
import CategoryCreator from '../CategoryCreator.jsx';
import Modal from '../ui/Modal.jsx';
import { AmountInput, SelectInput } from '../ui/formFields.jsx';

export default function BudgetModal({
  open,
  month,
  budget = null,
  expenseCategories = [],
  budgetedCategoryIds = [],
  onClose,
  onSaved,
  onCategoryCreated,
}) {
  const toast = useToast();
  const currency = useCurrency();
  const isEdit = Boolean(budget?.id);

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreator, setShowCreator] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setCategoryId(budget?.category?.id ? String(budget.category.id) : '');
    setAmount(budget ? String(budget.amount) : '');
    setErrors({});
    setFormError(null);
    setShowCreator(false);
  }, [open, budget]);

  const availableCategories = useMemo(
    () =>
      expenseCategories.filter(
        (category) =>
          isEdit || !budgetedCategoryIds.includes(String(category.id)),
      ),
    [expenseCategories, budgetedCategoryIds, isEdit],
  );

  const options = useMemo(() => {
    if (isEdit) {
      return [{ value: String(budget.category?.id ?? ''), label: budget.category?.name ?? '' }];
    }
    return availableCategories.map((category) => ({
      value: String(category.id),
      label: category.name,
    }));
  }, [availableCategories, budget, isEdit]);

  function validate() {
    const nextErrors = {};
    const parsed = Number(amount);

    if (!amount.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      nextErrors.amount = 'Set a monthly limit greater than zero.';
    }
    if (!categoryId) {
      nextErrors.categoryId = availableCategories.length
        ? 'Choose which category this budget covers.'
        : 'Create a new expense category to budget for.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const response = isEdit
        ? await api.patch(`/budgets/${budget.id}`, { amount: Number(amount) })
        : await api.post('/budgets', { categoryId, amount: Number(amount), month });

      const saved = unwrapResource(response.data, 'budget');
      toast.success(isEdit ? 'Budget updated.' : 'Budget created.');
      onSaved(saved, isEdit ? 'edit' : 'create');
    } catch (error) {
      const message = apiErrorMessage(error, 'Could not save the budget.');
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit budget' : 'Add budget'}
      description={
        isEdit
          ? `Adjust the monthly limit for ${monthLabel(budget?.month ?? month)}.`
          : `Set a spending limit for ${monthLabel(month)}.`
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button form="budget-form" type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Create budget'}
          </Button>
        </>
      }
    >
      <form id="budget-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
        {formError ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700"
          >
            {formError}
          </p>
        ) : null}

        <SelectInput
          label="Category"
          required
          data-autofocus
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value);
            setErrors((current) => ({ ...current, categoryId: undefined }));
          }}
          options={options}
          placeholder={availableCategories.length ? 'Choose a category' : 'No categories available'}
          error={errors.categoryId}
          disabled={isEdit}
          hint={
            isEdit
              ? undefined
              : 'Categories that already have a budget this month are hidden.'
          }
          action={
            isEdit ? null : (
              <button
                type="button"
                onClick={() => setShowCreator((current) => !current)}
                aria-expanded={showCreator}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary-700 transition hover:bg-primary-50"
              >
                <Plus size={13} aria-hidden="true" />
                {showCreator ? 'Close new category' : 'New category'}
              </button>
            )
          }
        />

        {isEdit && budget?.category ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Budgeting for</span>
            <CategoryChip category={budget.category} size="sm" />
          </div>
        ) : null}

        <AmountInput
          label="Monthly limit"
          currency={currency}
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setErrors((current) => ({ ...current, amount: undefined }));
          }}
          placeholder="0.00"
          error={errors.amount}
          hint={
            budget
              ? `Spent so far: ${formatMoney(budget.spent, currency)}`
              : 'You can change this at any time during the month.'
          }
        />

        {showCreator ? (
          <CategoryCreator
            defaultType="expense"
            onCreated={(category) => {
              onCategoryCreated?.(category);
              setCategoryId(String(category.id));
              setErrors((current) => ({ ...current, categoryId: undefined }));
              setShowCreator(false);
            }}
            onCancel={() => setShowCreator(false)}
          />
        ) : null}
      </form>
    </Modal>
  );
}
