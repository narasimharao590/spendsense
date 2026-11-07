import { Account, ACCOUNT_KIND_LABELS, ACCOUNT_KIND_ORDER } from '../models/Account.js';
import { Transaction } from '../models/Transaction.js';
import { money, roundTo } from './format.js';

const BLANK_DELTA = { income: 0, expense: 0, transferIn: 0, transferOut: 0, transactionCount: 0 };

function entryFor(map, key) {
  let entry = map.get(key);
  if (!entry) {
    entry = { ...BLANK_DELTA };
    map.set(key, entry);
  }
  return entry;
}

// balance = openingBalance + income - expense + transferIn - transferOut, derived on read so it can
// never drift from the transactions it is built from. Transactions with no account are ignored.
export async function accountDeltas(owner) {
  const [sourceRows, destinationRows] = await Promise.all([
    Transaction.aggregate([
      { $match: { owner, account: { $ne: null } } },
      {
        $group: {
          _id: '$account',
          income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
          transferOut: { $sum: { $cond: [{ $eq: ['$type', 'transfer'] }, '$amount', 0] } },
          transactionCount: { $sum: 1 },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { owner, transferTo: { $ne: null } } },
      { $group: { _id: '$transferTo', transferIn: { $sum: '$amount' }, transactionCount: { $sum: 1 } } },
    ]),
  ]);

  const deltas = new Map();
  for (const row of sourceRows) {
    const entry = entryFor(deltas, String(row._id));
    entry.income = money(row.income);
    entry.expense = money(row.expense);
    entry.transferOut = money(row.transferOut);
    entry.transactionCount += row.transactionCount || 0;
  }
  for (const row of destinationRows) {
    const entry = entryFor(deltas, String(row._id));
    entry.transferIn = money(row.transferIn);
    entry.transactionCount += row.transactionCount || 0;
  }
  return deltas;
}

export function balanceOf(account, delta = BLANK_DELTA) {
  return roundTo(
    money(account.openingBalance) +
      money(delta.income) -
      money(delta.expense) +
      money(delta.transferIn) -
      money(delta.transferOut),
    2
  );
}

export async function accountsWithBalances({ owner, filter = {}, sort = { nameLower: 1 } }) {
  const accounts = await Account.find({ owner, ...filter }).sort(sort);
  const deltas = await accountDeltas(owner);
  return accounts.map((account) => {
    const delta = deltas.get(String(account._id)) ?? BLANK_DELTA;
    return account.toPublicJSON({ balance: balanceOf(account, delta), transactionCount: delta.transactionCount });
  });
}

export async function accountsSummary(owner) {
  const accounts = await Account.find({ owner }).sort({ nameLower: 1 });
  const deltas = await accountDeltas(owner);

  const byKind = new Map(
    ACCOUNT_KIND_ORDER.map((kind) => [kind, { kind, label: ACCOUNT_KIND_LABELS[kind], balance: 0, count: 0 }])
  );
  const totals = { cash: 0, savings: 0, investments: 0, credit: 0, netWorth: 0 };

  for (const account of accounts) {
    const delta = deltas.get(String(account._id)) ?? BLANK_DELTA;
    const balance = balanceOf(account, delta);
    totals.netWorth = roundTo(totals.netWorth + balance, 2);
    const bucket = byKind.get(account.kind);
    if (bucket) {
      bucket.balance = roundTo(bucket.balance + balance, 2);
      bucket.count += 1;
    }
    if (account.kind === 'cash') totals.cash = roundTo(totals.cash + balance, 2);
    else if (account.kind === 'savings') totals.savings = roundTo(totals.savings + balance, 2);
    else if (account.kind === 'investment') totals.investments = roundTo(totals.investments + balance, 2);
    else if (account.kind === 'credit') totals.credit = roundTo(totals.credit + balance, 2);
  }

  return {
    netWorth: totals.netWorth,
    cash: totals.cash,
    savings: totals.savings,
    investments: totals.investments,
    credit: totals.credit,
    totalBalance: roundTo(totals.cash + totals.savings + totals.investments, 2),
    accountCount: accounts.length,
    byKind: ACCOUNT_KIND_ORDER.map((kind) => byKind.get(kind)),
  };
}
