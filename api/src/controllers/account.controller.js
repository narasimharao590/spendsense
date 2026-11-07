import { Account, ACCOUNT_KINDS } from '../models/Account.js';
import { Transaction } from '../models/Transaction.js';
import { Payment } from '../models/Payment.js';
import { ApiError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../utils/validators.js';
import { findOwned } from '../utils/query.js';
import { accountsSummary, accountsWithBalances } from '../utils/accountBalances.js';

const KIND_RANK = { cash: 0, savings: 1, investment: 2, credit: 3 };

async function ensureUniqueName({ owner, name, excludeId }) {
  const filter = { owner, nameLower: name.trim().toLowerCase() };
  if (excludeId) filter._id = { $ne: excludeId };
  const clash = await Account.findOne(filter).lean();
  if (clash) {
    throw ApiError.conflict(`An account named "${name.trim()}" already exists`);
  }
}

function accountSpecs({ required }) {
  return [
    { field: 'name', label: 'Name', type: 'text', required, min: 1, max: 60 },
    { field: 'kind', label: 'Kind', type: 'enum', values: ACCOUNT_KINDS, required },
    { field: 'openingBalance', label: 'Opening balance', type: 'signedAmount', required: false, default: 0 },
    { field: 'color', label: 'Color', type: 'color', required: false, default: '#64748b' },
    { field: 'icon', label: 'Icon', type: 'slug', required: false, default: 'wallet' },
    { field: 'note', label: 'Note', type: 'text', required: false, nullable: true, nullValue: '', max: 200 },
    { field: 'isActive', label: 'Is active', type: 'boolean', required: false },
  ];
}

export const listAccounts = asyncHandler(async (req, res) => {
  const { kind } = validate(req.query, [{ field: 'kind', label: 'kind', type: 'enum', values: ACCOUNT_KINDS }], {
    message: 'Invalid kind',
  });

  const filter = kind ? { kind } : {};
  const accounts = await accountsWithBalances({ owner: req.user._id, filter });
  accounts.sort(
    (a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  );

  res.json({ data: accounts });
});

export const createAccount = asyncHandler(async (req, res) => {
  const values = validate(req.body, accountSpecs({ required: true }));

  await ensureUniqueName({ owner: req.user._id, name: values.name });

  const account = await Account.create({
    owner: req.user._id,
    name: values.name,
    kind: values.kind,
    openingBalance: values.openingBalance,
    color: values.color,
    icon: values.icon,
    note: values.note ?? '',
    isActive: values.isActive ?? true,
  });

  res.status(201).json({ account: account.toPublicJSON({ balance: account.openingBalance, transactionCount: 0 }) });
});

export const getAccountSummary = asyncHandler(async (req, res) => {
  res.json(await accountsSummary(req.user._id));
});

export const updateAccount = asyncHandler(async (req, res) => {
  const account = await findOwned({
    model: Account,
    id: req.params.id,
    owner: req.user._id,
    message: 'Account not found',
  });

  const patch = validate(req.body, accountSpecs({ required: false }));

  if (
    patch.name === undefined &&
    patch.kind === undefined &&
    patch.openingBalance === undefined &&
    patch.color === undefined &&
    patch.icon === undefined &&
    patch.note === undefined &&
    patch.isActive === undefined
  ) {
    throw ApiError.badRequest('Nothing to update', ['Provide a name, kind, opening balance, color, icon, note or isActive']);
  }

  if (patch.name !== undefined && patch.name !== account.name) {
    await ensureUniqueName({ owner: req.user._id, name: patch.name, excludeId: account._id });
    account.name = patch.name;
  }
  if (patch.kind !== undefined) account.kind = patch.kind;
  if (patch.openingBalance !== undefined) account.openingBalance = patch.openingBalance;
  if (patch.color !== undefined) account.color = patch.color;
  if (patch.icon !== undefined) account.icon = patch.icon;
  if (patch.note !== undefined) account.note = patch.note;
  if (patch.isActive !== undefined) account.isActive = patch.isActive;

  await account.save();

  const [decorated] = await accountsWithBalances({
    owner: req.user._id,
    filter: { _id: account._id },
    sort: { _id: 1 },
  });
  res.json({ account: decorated });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const account = await findOwned({
    model: Account,
    id: req.params.id,
    owner: req.user._id,
    message: 'Account not found',
  });

  const transactionCount = await Transaction.countDocuments({
    owner: req.user._id,
    $or: [{ account: account._id }, { transferTo: account._id }],
  });
  if (transactionCount > 0) {
    throw ApiError.conflict(
      `Cannot delete "${account.name}": ${transactionCount} transaction${transactionCount === 1 ? '' : 's'} still ${
        transactionCount === 1 ? 'uses' : 'use'
      } it. Move or delete those transactions first.`
    );
  }

  const paymentCount = await Payment.countDocuments({ owner: req.user._id, account: account._id });
  if (paymentCount > 0) {
    throw ApiError.conflict(
      `Cannot delete "${account.name}": ${paymentCount} recurring payment${paymentCount === 1 ? '' : 's'} still ${
        paymentCount === 1 ? 'uses' : 'use'
      } it. Reassign or delete those payments first.`
    );
  }

  await account.deleteOne();
  res.status(204).end();
});
