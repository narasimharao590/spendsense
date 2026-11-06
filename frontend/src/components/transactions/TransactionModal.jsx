import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { useCurrency } from '../../hooks/useCurrency.js';
import api, { apiErrorMessage, unwrapResource } from '../../lib/api.js';
import { toMonthKey } from '../../lib/format.js';
import Button from '../ui/Button.jsx';
import CategoryCreator from '../CategoryCreator.jsx';
import Modal from '../ui/Modal.jsx';
import { AmountInput, SelectInput, TextArea, TextInput } from '../ui/formFields.jsx';
import SegmentedControl from '../ui/SegmentedControl.jsx';

const TODAY = () => dayjs().format('YYYY-MM-DD');

function blankForm() {
  return {
    title: '',
    amount: '',
    type: 'expense',
    categoryId: '',
    date: TODAY(),
    note: '',
  };
}

function formFromTransaction(transaction) {
  if (!transaction) {
    return blankForm();
  }

  return {
    title: transaction.title ?? '',
    amount: transaction.amount === undefined || transaction.amount === null
      ? ''
      : String(transaction.amount),
    type: transaction.type === 'income' ? 'income' : 'expense',
    categoryId: transaction.category?.id ? String(transaction.category.id) : '',
    date: transaction.date ? dayjs(transaction.date).format('YYYY-MM-DD') : TODAY(),
    note: transaction.note ?? '',
  };
}

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense', icon: ArrowDownRight },
  { value: 'income', label: 'Income', icon: ArrowUpRight },
];

export default function TransactionModal({
  open,
  transaction = null,
  categories = [],
  onClose,
  onSaved,
  onCategoryCreated,
}) {
  const toast = useToast();
  const currency = useCurrency();
  const isEdit = Boolean(transaction?.id);

  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreator, setShowCreator] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setForm(formFromTransaction(transaction));
    setErrors({});
    setFormError(null);
    setShowCreator(false);
  }, [open, transaction]);

  const availableCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type],
  );

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  function handleTypeChange(nextType) {
    setForm((current) => {
      const keepsCategory = current.categoryId
        ? categories.some(
            (category) => String(category.id) === current.categoryId && category.type === nextType,
          )
        : false;

      return {
        ...current,
        type: nextType,
        categoryId: keepsCategory ? current.categoryId : '',
      };
    });
    setErrors({});
  }

  function validate() {
    const nextErrors = {};

    if (form.title.trim().length < 2) {
      nextErrors.title = 'Give it a short, descriptive title.';
    }

    const amount = Number(form.amount);
    if (!form.amount.trim() || !Number.isFinite(amount) || amount <= 0) {
      nextErrors.amount = 'Enter an amount greater than zero.';
    }

    if (!form.categoryId) {
      nextErrors.categoryId = availableCategories.length
        ? 'Choose a category.'
        : 'Create a category for this type first.';
    }

    if (!dayjs(form.date, 'YYYY-MM-DD', true).isValid()) {
      nextErrors.date = 'Pick a valid date.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    const payload = {
      title: form.title.trim(),
      amount: Number(form.amount),
      type: form.type,
      categoryId: form.categoryId,
      date: form.date,
      note: form.note.trim(),
    };

    setSubmitting(true);
    setFormError(null);

    try {
      const response = isEdit
        ? await api.patch(`/transactions/${transaction.id}`, payload)
        : await api.post('/transactions', payload);

      const saved = unwrapResource(response.data, 'transaction');
      toast.success(isEdit ? 'Transaction updated.' : 'Transaction saved.');
      onSaved(saved, isEdit ? 'edit' : 'create');
    } catch (error) {
      const message = apiErrorMessage(error, 'Could not save the transaction.');
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const categoryOptions = availableCategories.map((category) => ({
    value: String(category.id),
    label: category.name,
  }));

  const countingMonth = toMonthKey(form.date);

  return (
    <Modal
      open={open}
      size="lg"
      title={isEdit ? 'Edit transaction' : 'Add transaction'}
      description={
        isEdit
          ? 'Update the details of this entry in your ledger.'
          : 'Record money moving in or out of your accounts.'
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button form="transaction-form" type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Add transaction'}
          </Button>
        </>
      }
    >
      <form id="transaction-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
        <SegmentedControl
          ariaLabel="Transaction type"
          value={form.type}
          onChange={handleTypeChange}
          options={TYPE_OPTIONS}
        />

        {formError ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700"
          >
            {formError}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Title"
            required
            data-autofocus
            value={form.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder={form.type === 'income' ? 'Monthly salary' : 'Weekly groceries'}
            error={errors.title}
            className="sm:col-span-2"
          />

          <AmountInput
            label="Amount"
            currency={currency}
            value={form.amount}
            onChange={(event) => update('amount', event.target.value)}
            placeholder="0.00"
            error={errors.amount}
          />

          <TextInput
            label="Date"
            type="date"
            required
            value={form.date}
            onChange={(event) => update('date', event.target.value)}
            error={errors.date}
            hint={`Counts towards ${countingMonth}`}
          />

          <SelectInput
            label="Category"
            required
            value={form.categoryId}
            onChange={(event) => update('categoryId', event.target.value)}
            options={categoryOptions}
            placeholder={
              availableCategories.length ? 'Choose a category' : 'No categories yet'
            }
            error={errors.categoryId}
            className="sm:col-span-2"
            action={
              <button
                type="button"
                onClick={() => setShowCreator((current) => !current)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary-700 transition hover:bg-primary-50"
                aria-expanded={showCreator}
              >
                <Plus size={13} aria-hidden="true" />
                {showCreator ? 'Close new category' : 'New category'}
              </button>
            }
          />

          <TextArea
            label="Note"
            value={form.note}
            onChange={(event) => update('note', event.target.value)}
            placeholder="Optional detail, e.g. split with flatmates"
            className="sm:col-span-2"
            hint={`${form.note.trim().length}/280 characters`}
            maxLength={280}
          />
        </div>

        {showCreator ? (
          <CategoryCreator
            defaultType={form.type}
            onCreated={(category) => {
              onCategoryCreated?.(category);
              update('categoryId', String(category.id));
              setShowCreator(false);
            }}
            onCancel={() => setShowCreator(false)}
          />
        ) : null}
      </form>
    </Modal>
  );
}
