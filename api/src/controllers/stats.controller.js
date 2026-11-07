import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../utils/validators.js';
import { money, roundTo, shareOf } from '../utils/format.js';
import { TRANSACTION_POPULATE } from '../utils/query.js';
import { accountsSummary } from '../utils/accountBalances.js';
import { currentMonth, monthDayKeys, monthRange, shiftMonth, trailingMonthRange } from '../utils/dates.js';

const FALLBACK_CATEGORY = { name: 'Uncategorised', color: '#64748b', icon: 'tag' };
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

async function totalsByType(owner, month) {
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
  const result = { income: 0, expense: 0, transfer: 0, transferCount: 0, count: 0 };
  for (const row of rows) {
    if (row._id === 'income') result.income = money(row.total);
    else if (row._id === 'expense') result.expense = money(row.total);
    else if (row._id === 'transfer') {
      result.transfer = money(row.total);
      result.transferCount = row.count;
    }
    result.count += row.count;
  }
  return result;
}

async function breakdownByCategory(owner, month, type) {
  const { start, end } = monthRange(month);
  return Transaction.aggregate([
    { $match: { owner, type, date: { $gte: start, $lt: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        total: 1,
        count: 1,
        name: '$category.name',
        color: '$category.color',
        icon: '$category.icon',
      },
    },
  ]);
}

function toBreakdown(rows) {
  const total = rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
  return rows.map((row) => ({
    categoryId: String(row._id),
    name: row.name || FALLBACK_CATEGORY.name,
    color: row.color || FALLBACK_CATEGORY.color,
    icon: row.icon || FALLBACK_CATEGORY.icon,
    total: money(row.total),
    percent: shareOf(row.total, total, 1),
    count: Number(row.count) || 0,
  }));
}

async function categoryComparison(owner, month) {
  const { start: currentStart, end: currentEnd } = monthRange(month);
  const { start: previousStart } = monthRange(shiftMonth(month, -1));

  const rows = await Transaction.aggregate([
    { $match: { owner, type: 'expense', date: { $gte: previousStart, $lt: currentEnd } } },
    {
      $group: {
        _id: '$category',
        thisMonth: { $sum: { $cond: [{ $gte: ['$date', currentStart] }, '$amount', 0] } },
        lastMonth: { $sum: { $cond: [{ $lt: ['$date', currentStart] }, '$amount', 0] } },
        transactions: { $sum: { $cond: [{ $gte: ['$date', currentStart] }, 1, 0] } },
      },
    },
    { $sort: { thisMonth: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        thisMonth: 1,
        lastMonth: 1,
        transactions: 1,
        name: '$category.name',
        color: '$category.color',
        icon: '$category.icon',
      },
    },
  ]);

  return rows.map((row) => ({
    categoryId: String(row._id),
    name: row.name || FALLBACK_CATEGORY.name,
    color: row.color || FALLBACK_CATEGORY.color,
    icon: row.icon || FALLBACK_CATEGORY.icon,
    thisMonth: money(row.thisMonth),
    lastMonth: money(row.lastMonth),
    transactions: Number(row.transactions) || 0,
  }));
}

async function dailySeries(owner, month) {
  const { start, end } = monthRange(month);
  const rows = await Transaction.aggregate([
    { $match: { owner, date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } },
        income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
        expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
      },
    },
  ]);
  const byDay = new Map(rows.map((row) => [row._id, row]));
  return monthDayKeys(month).map((day) => {
    const row = byDay.get(day);
    return { date: day, income: money(row?.income ?? 0), expense: money(row?.expense ?? 0) };
  });
}

async function monthlyTrend(owner, month) {
  const { start, end, months } = trailingMonthRange(month, 6);
  const rows = await Transaction.aggregate([
    { $match: { owner, date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } },
        income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
        expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
      },
    },
  ]);
  const byMonth = new Map(rows.map((row) => [row._id, row]));
  return months.map((key) => {
    const row = byMonth.get(key);
    const income = money(row?.income ?? 0);
    const expense = money(row?.expense ?? 0);
    return { month: key, income, expense, net: money(income - expense) };
  });
}

export const overview = asyncHandler(async (req, res) => {
  const { month } = validate(
    req.query,
    [{ field: 'month', label: 'month', type: 'month', default: currentMonth() }],
    { message: 'Invalid month' }
  );

  const owner = req.user._id;
  const range = monthRange(month);
  const previousMonth = shiftMonth(month, -1);

  const [current, previous, expenseRows, incomeRows, recentDocs, topDocs, daily, monthly, accounts, comparison] =
    await Promise.all([
      totalsByType(owner, month),
      totalsByType(owner, previousMonth),
      breakdownByCategory(owner, month, 'expense'),
      breakdownByCategory(owner, month, 'income'),
      Transaction.find({ owner }).sort({ date: -1, _id: -1 }).limit(8).populate(TRANSACTION_POPULATE),
      Transaction.find({ owner, type: 'expense', date: { $gte: range.start, $lt: range.end } })
        .sort({ amount: -1, _id: 1 })
        .limit(5)
        .populate(TRANSACTION_POPULATE),
      dailySeries(owner, month),
      monthlyTrend(owner, month),
      accountsSummary(owner),
      categoryComparison(owner, month),
    ]);

  const income = current.income;
  const expense = current.expense;

  res.json({
    month,
    totals: {
      income,
      expense,
      net: money(income - expense),
      savingsRate: income > 0 ? roundTo((income - expense) / income, 3) : 0,
      transactionCount: current.count,
      transferCount: current.transferCount,
    },
    previous: {
      income: previous.income,
      expense: previous.expense,
      net: money(previous.income - previous.expense),
    },
    categoryBreakdown: toBreakdown(expenseRows),
    incomeBreakdown: toBreakdown(incomeRows),
    categoryComparison: comparison,
    accounts,
    daily,
    monthlyTrend: monthly,
    recent: recentDocs.map((doc) => doc.toPublicJSON()),
    topExpenses: topDocs.map((doc) => ({
      id: String(doc._id),
      title: doc.title,
      amount: money(doc.amount),
      date: doc.date ? new Date(doc.date).toISOString() : null,
      category: doc.category
        ? { name: doc.category.name, color: doc.category.color }
        : { name: FALLBACK_CATEGORY.name, color: FALLBACK_CATEGORY.color },
    })),
  });
});

function yearRange(year) {
  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year + 1, 0, 1)) };
}

function yearMonthKeys(year) {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
}

async function yearlyTypeTotals(owner, start, end) {
  const rows = await Transaction.aggregate([
    { $match: { owner, date: { $gte: start, $lt: end } } },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const result = { income: 0, expense: 0, expenseCount: 0, transferCount: 0, count: 0 };
  for (const row of rows) {
    if (row._id === 'income') result.income = money(row.total);
    else if (row._id === 'expense') {
      result.expense = money(row.total);
      result.expenseCount = row.count;
    } else if (row._id === 'transfer') result.transferCount = row.count;
    result.count += row.count;
  }
  return result;
}

async function yearlyMonthTotals(owner, start, end) {
  const rows = await Transaction.aggregate([
    { $match: { owner, date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } },
        income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
        expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
        count: { $sum: 1 },
      },
    },
  ]);
  return new Map(rows.map((row) => [row._id, row]));
}

async function yearlyExpenseByCategory(owner, start, end) {
  return Transaction.aggregate([
    { $match: { owner, type: 'expense', date: { $gte: start, $lt: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    { $project: { total: 1, count: 1, name: '$category.name', color: '$category.color', icon: '$category.icon' } },
  ]);
}

async function yearlyExpenseByCategoryMonth(owner, start, end) {
  const rows = await Transaction.aggregate([
    { $match: { owner, type: 'expense', date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: {
          category: '$category',
          month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } },
        },
        total: { $sum: '$amount' },
      },
    },
  ]);
  const byCategory = new Map();
  for (const row of rows) {
    const key = String(row._id.category);
    if (!byCategory.has(key)) byCategory.set(key, new Map());
    byCategory.get(key).set(row._id.month, money(row.total));
  }
  return byCategory;
}

async function yearlyExpenseByWeekday(owner, start, end) {
  const rows = await Transaction.aggregate([
    { $match: { owner, type: 'expense', date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $dayOfWeek: { date: '$date', timezone: 'UTC' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);
  const byDay = new Map(rows.map((row) => [((Number(row._id) + 5) % 7), row]));
  return DAY_LABELS.map((label, index) => ({
    label,
    total: money(byDay.get(index)?.total ?? 0),
    count: Number(byDay.get(index)?.count ?? 0),
  }));
}

export const analytics = asyncHandler(async (req, res) => {
  const { year } = validate(
    req.query,
    [{ field: 'year', label: 'year', type: 'integer', min: 1901, max: 2200, default: new Date().getUTCFullYear() }],
    { message: 'Invalid year' }
  );

  const owner = req.user._id;
  const { start, end } = yearRange(year);
  const previous = yearRange(year - 1);
  const monthKeys = yearMonthKeys(year);

  const [typeTotals, monthTotals, categoryRows, categoryMonths, weekdayRows, biggestDocs, previousTotals] =
    await Promise.all([
      yearlyTypeTotals(owner, start, end),
      yearlyMonthTotals(owner, start, end),
      yearlyExpenseByCategory(owner, start, end),
      yearlyExpenseByCategoryMonth(owner, start, end),
      yearlyExpenseByWeekday(owner, start, end),
      Transaction.find({ owner, type: 'expense', date: { $gte: start, $lt: end } })
        .sort({ amount: -1, _id: 1 })
        .limit(1)
        .populate(TRANSACTION_POPULATE),
      yearlyTypeTotals(owner, previous.start, previous.end),
    ]);

  const income = typeTotals.income;
  const expense = typeTotals.expense;

  const monthly = monthKeys.map((key) => {
    const row = monthTotals.get(key);
    const monthIncome = money(row?.income ?? 0);
    const monthExpense = money(row?.expense ?? 0);
    return { month: key, income: monthIncome, expense: monthExpense, net: money(monthIncome - monthExpense) };
  });

  const categoryShare = categoryRows.map((row) => ({
    categoryId: String(row._id),
    name: row.name || FALLBACK_CATEGORY.name,
    color: row.color || FALLBACK_CATEGORY.color,
    icon: row.icon || FALLBACK_CATEGORY.icon,
    total: money(row.total),
    percent: shareOf(row.total, expense, 1),
    count: Number(row.count) || 0,
  }));

  const series = categoryShare.slice(0, 6).map((entry) => {
    const byMonth = categoryMonths.get(entry.categoryId) ?? new Map();
    return {
      categoryId: entry.categoryId,
      name: entry.name,
      color: entry.color,
      values: monthKeys.map((key) => money(byMonth.get(key) ?? 0)),
    };
  });

  const biggest = biggestDocs[0];

  res.json({
    year,
    totals: {
      income,
      expense,
      net: money(income - expense),
      savingsRate: income > 0 ? roundTo((income - expense) / income, 3) : 0,
      monthsWithData: monthTotals.size,
      transactionCount: typeTotals.count,
    },
    monthly,
    categoryShare,
    categoryTrend: { months: monthKeys, series },
    averages: {
      monthlyExpense: roundTo(expense / 12, 2),
      monthlyIncome: roundTo(income / 12, 2),
      perTransaction: typeTotals.expenseCount > 0 ? roundTo(expense / typeTotals.expenseCount, 2) : 0,
    },
    dayOfWeek: weekdayRows,
    biggest: biggest
      ? {
          id: String(biggest._id),
          title: biggest.title,
          amount: money(biggest.amount),
          date: biggest.date ? new Date(biggest.date).toISOString() : null,
          category: biggest.category
            ? { name: biggest.category.name, color: biggest.category.color }
            : { name: FALLBACK_CATEGORY.name, color: FALLBACK_CATEGORY.color },
        }
      : null,
    yoy:
      previousTotals.count > 0
        ? {
            income: money(income - previousTotals.income),
            expense: money(expense - previousTotals.expense),
            net: money(income - expense - (previousTotals.income - previousTotals.expense)),
          }
        : null,
  });
});
