import { Category } from '../models/Category.js';
import { Payment, PAYMENT_FREQUENCIES, advanceDueDate, daysUntilDue, nextDueDateFor } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { Account } from '../models/Account.js';
import { ApiError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../utils/validators.js';
import { findOwned, PAYMENT_POPULATE } from '../utils/query.js';
import { money, roundTo } from '../utils/format.js';
import { currentMonth, monthRange } from '../utils/dates.js';

const STATUSES = ['overdue', 'due', 'upcoming', 'inactive'];

const MONTHLY_FACTOR = { weekly: 4.333, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };

function paymentSpecs({ required }) {
  return [
    { field: 'title', label: 'Title', type: 'text', required, min: 1, max: 80 },
    { field: 'amount', label: 'Amount', type: 'amount', required, gt: 0, max: 1e9 },
    { field: 'categoryId', label: 'Category', type: 'objectId', required },
    { field: 'frequency', label: 'Frequency', type: 'enum', values: PAYMENT_FREQUENCIES, required },
    { field: 'dueDay', label: 'Due day', type: 'integer', required, min: 1, max: 28 },
    { field: 'accountId', label: 'Account', type: 'objectId', required: false, nullable: true },
    { field: 'note', label: 'Note', type: 'text', required: false, nullable: true, nullValue: '', max: 200 },
    { field: 'isActive', label: 'Is active', type: 'boolean', required: false },
  ];
}

async function resolveExpenseCategory({ owner, categoryId }) {
  const category = await Category.findOne({ _id: categoryId, owner });
  if (!category) throw ApiError.notFound('Category not found');
  if (category.type !== 'expense') {
    throw ApiError.badRequest(`Payments can only be set on expense categories, "${category.name}" is income`);
  }
  return category;
}

async function resolveAccount({ owner, accountId }) {
  const account = await Account.findOne({ _id: accountId, owner });
  if (!account) throw ApiError.notFound('Account not found');
  return account;
}

function utcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function decorate(payment) {
  return payment.toPublicJSON({ reference: new Date() });
}

function matchesStatus(payment, status) {
  return decorate(payment).status === status;
}

export const listPayments = asyncHandler(async (req, res) => {
  const query = validate(
    req.query,
    [
      { field: 'status', label: 'status', type: 'enum', values: STATUSES },
      { field: 'isActive', label: 'isActive', type: 'boolean' },
    ],
    { message: 'Invalid filter' }
  );

  const filter = { owner: req.user._id };
  if (query.isActive !== undefined) filter.isActive = query.isActive;

  const payments = await Payment.find(filter).sort({ nextDueAt: 1, createdAt: 1 }).populate(PAYMENT_POPULATE);

  const data = payments
    .filter((payment) => (query.status ? matchesStatus(payment, query.status) : true))
    .map((payment) => decorate(payment));

  res.json({ data });
});

export const createPayment = asyncHandler(async (req, res) => {
  const values = validate(req.body, paymentSpecs({ required: true }));

  const category = await resolveExpenseCategory({ owner: req.user._id, categoryId: values.categoryId });
  let account = null;
  if (values.accountId) {
    account = await resolveAccount({ owner: req.user._id, accountId: values.accountId });
  }

  const payment = await Payment.create({
    owner: req.user._id,
    title: values.title,
    amount: values.amount,
    category: category._id,
    account: account ? account._id : null,
    frequency: values.frequency,
    dueDay: values.dueDay,
    isActive: values.isActive ?? true,
    note: values.note ?? '',
    nextDueAt: nextDueDateFor(values.frequency, values.dueDay, new Date()),
  });

  const populated = await payment.populate(PAYMENT_POPULATE);
  res.status(201).json({ payment: decorate(populated) });
});

export const updatePayment = asyncHandler(async (req, res) => {
  const payment = await findOwned({
    model: Payment,
    id: req.params.id,
    owner: req.user._id,
    message: 'Payment not found',
  });

  const patch = validate(req.body, paymentSpecs({ required: false }));

  const touched = [
    'title',
    'amount',
    'categoryId',
    'frequency',
    'dueDay',
    'accountId',
    'note',
    'isActive',
  ].some((field) => patch[field] !== undefined);
  if (!touched) throw ApiError.badRequest('Nothing to update', ['Provide at least one field to change']);

  if (patch.categoryId !== undefined) {
    const category = await resolveExpenseCategory({ owner: req.user._id, categoryId: patch.categoryId });
    payment.category = category._id;
  }
  if (patch.accountId !== undefined) {
    if (patch.accountId === null) payment.account = null;
    else {
      const account = await resolveAccount({ owner: req.user._id, accountId: patch.accountId });
      payment.account = account._id;
    }
  }

  if (patch.title !== undefined) payment.title = patch.title;
  if (patch.amount !== undefined) payment.amount = patch.amount;
  if (patch.note !== undefined) payment.note = patch.note;
  if (patch.isActive !== undefined) payment.isActive = patch.isActive;

  const scheduleChanged =
    (patch.frequency !== undefined && patch.frequency !== payment.frequency) ||
    (patch.dueDay !== undefined && patch.dueDay !== payment.dueDay);

  if (patch.frequency !== undefined) payment.frequency = patch.frequency;
  if (patch.dueDay !== undefined) payment.dueDay = patch.dueDay;
  if (scheduleChanged) payment.nextDueAt = nextDueDateFor(payment.frequency, payment.dueDay, new Date());

  await payment.save();
  const populated = await payment.populate(PAYMENT_POPULATE);
  res.json({ payment: decorate(populated) });
});

export const deletePayment = asyncHandler(async (req, res) => {
  const payment = await findOwned({
    model: Payment,
    id: req.params.id,
    owner: req.user._id,
    message: 'Payment not found',
  });
  await payment.deleteOne();
  res.status(204).end();
});

export const payPayment = asyncHandler(async (req, res) => {
  const payment = await findOwned({
    model: Payment,
    id: req.params.id,
    owner: req.user._id,
    message: 'Payment not found',
  });

  const { date } = validate(req.body, [{ field: 'date', label: 'Date', type: 'date' }], {
    message: 'Invalid date',
  });
  const paidAt = date ?? utcToday();

  const transaction = await Transaction.create({
    owner: req.user._id,
    title: payment.title,
    amount: payment.amount,
    type: 'expense',
    category: payment.category,
    account: payment.account ?? null,
    date: paidAt,
    note: '',
  });

  payment.lastPaidAt = paidAt;
  payment.nextDueAt = advanceDueDate(payment.nextDueAt, payment.frequency);
  await payment.save();

  const populatedPayment = await payment.populate(PAYMENT_POPULATE);
  const populatedTransaction = await transaction.populate([
    { path: 'category', select: 'name type color icon' },
    { path: 'account', select: 'name kind color icon' },
  ]);

  res.status(201).json({
    payment: decorate(populatedPayment),
    transaction: populatedTransaction.toPublicJSON(),
  });
});

export const paymentsSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const payments = await Payment.find({ owner: req.user._id }).sort({ nextDueAt: 1, createdAt: 1 }).populate(PAYMENT_POPULATE);

  const active = payments.filter((payment) => payment.isActive);
  const monthlyCommitted = roundTo(
    active.reduce((total, payment) => total + money(payment.amount) * (MONTHLY_FACTOR[payment.frequency] ?? 1), 0),
    2
  );

  const { start, end } = monthRange(currentMonth(now));
  const dueThisMonth = roundTo(
    active
      .filter((payment) => payment.nextDueAt >= start && payment.nextDueAt < end)
      .reduce((total, payment) => total + money(payment.amount), 0),
    2
  );

  const overdueCount = active.filter((payment) => daysUntilDue(payment.nextDueAt, now) < 0).length;

  res.json({
    monthlyCommitted,
    dueThisMonth,
    overdueCount,
    activeCount: active.length,
    nextUp: active.slice(0, 5).map((payment) => decorate(payment)),
  });
});
