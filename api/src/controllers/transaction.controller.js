import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Account } from '../models/Account.js';
import { Transaction, TRANSACTION_TYPES } from '../models/Transaction.js';
import { ApiError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../utils/validators.js';
import { findOwned, TRANSACTION_POPULATE } from '../utils/query.js';
import { escapeRegExp, money, articleFor } from '../utils/format.js';
import { monthRange, dayKeyEnd } from '../utils/dates.js';

const SORT_FIELDS = ['-date', 'date', '-amount', 'amount'];

function buildSort(sort) {
  if (sort === 'date') return { date: 1, _id: 1 };
  if (sort === 'amount') return { amount: 1, _id: 1 };
  if (sort === '-amount') return { amount: -1, _id: -1 };
  return { date: -1, _id: -1 };
}

function idOf(value) {
  if (!value) return null;
  if (typeof value === 'object') return String(value._id ?? value.id ?? '') || null;
  return String(value);
}

// Responses carry `account`/`transferTo` objects while requests use `*Id` names, matching the
// existing `categoryId` convention; echoing a serialised transaction back is also accepted.
function withAccountAliases(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  const payload = { ...body };
  if (payload.accountId === undefined && payload.account !== undefined) payload.accountId = idOf(payload.account);
  if (payload.transferToAccountId === undefined && payload.transferTo !== undefined) {
    payload.transferToAccountId = idOf(payload.transferTo);
  }
  delete payload.account;
  delete payload.transferTo;
  return payload;
}

async function resolveCategory({ owner, categoryId, type }) {
  const category = await Category.findOne({ _id: categoryId, owner });
  if (!category) throw ApiError.notFound('Category not found');
  if (category.type !== type) {
    throw ApiError.badRequest(
      `Category "${category.name}" is ${articleFor(category.type).toLowerCase()} ${category.type} category and cannot be used for ${articleFor(type).toLowerCase()} ${type} entry`
    );
  }
  return category;
}

async function resolveAccountRef({ owner, accountId, label }) {
  if (!mongoose.isObjectIdOrHexString(accountId)) throw ApiError.notFound(`${label} not found`);
  const account = await Account.findOne({ _id: accountId, owner });
  if (!account) throw ApiError.notFound(`${label} not found`);
  return account;
}

async function resolveRefs({ owner, type, categoryId, accountId, transferToId }) {
  if (type === 'transfer') {
    if (!accountId || !transferToId) {
      throw ApiError.badRequest('Validation failed', [
        'A transfer needs both an account to move money from and an account to move money to',
      ]);
    }
    if (String(accountId) === String(transferToId)) {
      throw ApiError.badRequest('Transfer source and destination must be different accounts');
    }
    const source = await resolveAccountRef({ owner, accountId, label: 'Account' });
    const destination = await resolveAccountRef({ owner, accountId: transferToId, label: 'Destination account' });
    return { category: null, account: source._id, transferTo: destination._id };
  }

  if (!categoryId) throw ApiError.badRequest('Validation failed', ['Category is required']);

  const category = await resolveCategory({ owner, categoryId, type });
  let account = null;
  if (accountId) {
    account = (await resolveAccountRef({ owner, accountId, label: 'Account' }))._id;
  }
  if (transferToId) {
    throw ApiError.badRequest(`Only a transfer can have a destination account, not a ${type}`);
  }
  return { category: category._id, account, transferTo: null };
}

function transactionSpecs({ required }) {
  return [
    { field: 'title', label: 'Title', type: 'text', required, min: 1, max: 140 },
    { field: 'amount', label: 'Amount', type: 'amount', required, gt: 0, max: 1e9 },
    { field: 'type', label: 'Type', type: 'enum', values: TRANSACTION_TYPES, required },
    { field: 'categoryId', label: 'Category', type: 'objectId', required: false, nullable: true },
    { field: 'date', label: 'Date', type: 'date', required },
    { field: 'note', label: 'Note', type: 'text', required: false, nullable: true, nullValue: '', max: 500 },
    { field: 'accountId', label: 'Account', type: 'objectId', required: false, nullable: true },
    { field: 'transferToAccountId', label: 'Destination account', type: 'objectId', required: false, nullable: true },
  ];
}

export const listTransactions = asyncHandler(async (req, res) => {
  const query = validate(
    req.query,
    [
      { field: 'type', label: 'type', type: 'enum', values: TRANSACTION_TYPES },
      { field: 'kind', label: 'kind', type: 'enum', values: TRANSACTION_TYPES },
      { field: 'categoryId', label: 'categoryId', type: 'objectId' },
      { field: 'accountId', label: 'accountId', type: 'objectId' },
      { field: 'search', label: 'search', type: 'text', max: 100 },
      { field: 'from', label: 'from', type: 'day' },
      { field: 'to', label: 'to', type: 'day' },
      { field: 'page', label: 'page', type: 'integer', min: 1, default: 1 },
      { field: 'limit', label: 'limit', type: 'integer', min: 1, max: 100, default: 20 },
      { field: 'sort', label: 'sort', type: 'enum', values: SORT_FIELDS, default: '-date' },
    ],
    { message: 'Invalid filter' }
  );

  if (query.type && query.kind && query.type !== query.kind) {
    throw ApiError.badRequest('Validation failed', ['"kind" and "type" cannot disagree']);
  }

  const filter = { owner: req.user._id };
  const transactionType = query.kind ?? query.type;
  if (transactionType) filter.type = transactionType;
  if (query.categoryId) filter.category = query.categoryId;

  const orClauses = [];
  if (query.search) {
    const pattern = new RegExp(escapeRegExp(query.search), 'i');
    orClauses.push({ $or: [{ title: pattern }, { note: pattern }] });
  }
  if (query.accountId) {
    orClauses.push({ $or: [{ account: query.accountId }, { transferTo: query.accountId }] });
  }
  if (orClauses.length === 1) Object.assign(filter, orClauses[0]);
  else if (orClauses.length > 1) filter.$and = orClauses;

  const from = query.from;
  const to = query.to;
  if (from && to && from > to) {
    throw ApiError.badRequest('Validation failed', ['"from" must be on or before "to"']);
  }
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) filter.date.$lt = dayKeyEnd(to);
  }

  const limit = query.limit;
  const page = query.page;
  const total = await Transaction.countDocuments(filter);
  const docs = await Transaction.find(filter)
    .sort(buildSort(query.sort))
    .skip((page - 1) * limit)
    .limit(limit)
    .populate(TRANSACTION_POPULATE);

  res.json({
    data: docs.map((doc) => doc.toPublicJSON()),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
});

export const createTransaction = asyncHandler(async (req, res) => {
  const values = validate(withAccountAliases(req.body), transactionSpecs({ required: true }));

  const refs = await resolveRefs({
    owner: req.user._id,
    type: values.type,
    categoryId: values.categoryId,
    accountId: values.accountId,
    transferToId: values.transferToAccountId,
  });

  const created = await Transaction.create({
    owner: req.user._id,
    title: values.title,
    amount: values.amount,
    type: values.type,
    note: values.note ?? '',
    date: values.date,
    category: refs.category,
    account: refs.account,
    transferTo: refs.transferTo,
  });

  const populated = await created.populate(TRANSACTION_POPULATE);
  res.status(201).json({ transaction: populated.toPublicJSON() });
});

export const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await findOwned({
    model: Transaction,
    id: req.params.id,
    owner: req.user._id,
    message: 'Transaction not found',
    populate: TRANSACTION_POPULATE,
  });
  res.json({ transaction: transaction.toPublicJSON() });
});

export const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await findOwned({
    model: Transaction,
    id: req.params.id,
    owner: req.user._id,
    message: 'Transaction not found',
  });

  const patch = validate(withAccountAliases(req.body), transactionSpecs({ required: false }));

  const nextType = patch.type ?? transaction.type;
  const refs = await resolveRefs({
    owner: req.user._id,
    type: nextType,
    categoryId: patch.categoryId === undefined ? idOf(transaction.category) : patch.categoryId,
    accountId: patch.accountId === undefined ? idOf(transaction.account) : patch.accountId,
    transferToId:
      patch.transferToAccountId === undefined ? idOf(transaction.transferTo) : patch.transferToAccountId,
  });

  if (patch.title !== undefined) transaction.title = patch.title;
  if (patch.amount !== undefined) transaction.amount = patch.amount;
  if (patch.note !== undefined) transaction.note = patch.note;
  if (patch.date !== undefined) transaction.date = patch.date;

  transaction.type = nextType;
  transaction.category = refs.category;
  transaction.account = refs.account;
  transaction.transferTo = refs.transferTo;

  await transaction.save();
  const populated = await transaction.populate(TRANSACTION_POPULATE);
  res.json({ transaction: populated.toPublicJSON() });
});

export const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await findOwned({
    model: Transaction,
    id: req.params.id,
    owner: req.user._id,
    message: 'Transaction not found',
  });
  await transaction.deleteOne();
  res.status(204).end();
});

export const monthlySummary = asyncHandler(async (req, res) => {
  const { year } = validate(
    req.query,
    [{ field: 'year', label: 'year', type: 'integer', min: 1901, max: 2200, default: new Date().getUTCFullYear() }],
    { message: 'Invalid year' }
  );

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const rows = await Transaction.aggregate([
    { $match: { owner: req.user._id, date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } },
        income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
        expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
      },
    },
  ]);

  const byMonth = new Map(rows.map((row) => [row._id, row]));
  const data = Array.from({ length: 12 }, (_, index) => {
    const key = `${year}-${String(index + 1).padStart(2, '0')}`;
    const row = byMonth.get(key);
    const income = money(row?.income ?? 0);
    const expense = money(row?.expense ?? 0);
    return { month: key, income, expense, net: money(income - expense) };
  });

  res.json({ data });
});

export async function monthlyTotals(owner, month) {
  const { start, end } = monthRange(month);
  const rows = await Transaction.aggregate([
    { $match: { owner, date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const result = { income: 0, expense: 0, transactionCount: 0 };
  for (const row of rows) {
    if (row._id === 'income') result.income = money(row.total);
    if (row._id === 'expense') result.expense = money(row.total);
    result.transactionCount += row.count;
  }
  return result;
}
