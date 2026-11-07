import mongoose from 'mongoose';
import { Budget } from '../models/Budget.js';
import { Category } from '../models/Category.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../utils/validators.js';
import { findOwned, CATEGORY_POPULATE } from '../utils/query.js';
import { money, roundTo } from '../utils/format.js';
import { currentMonth, monthRange } from '../utils/dates.js';

async function spentByCategory({ owner, month, categoryIds }) {
  if (!categoryIds.length) return new Map();
  const { start, end } = monthRange(month);
  const rows = await Transaction.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(String(owner)),
        type: 'expense',
        category: { $in: categoryIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
        date: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), money(row.total)]));
}

function categoryIdOf(budget) {
  const category = budget.category;
  if (!category) return null;
  if (typeof category === 'object') return String(category._id ?? category.id ?? '');
  return String(category);
}

async function decorate(budgets, { owner, month }) {
  const ids = budgets.map(categoryIdOf).filter(Boolean);
  const spent = await spentByCategory({ owner, month, categoryIds: ids });
  return budgets.map((budget) =>
    budget.toPublicJSON({ spent: spent.get(categoryIdOf(budget)) ?? 0 })
  );
}

function readMonthQuery(req) {
  return validate(
    req.query,
    [{ field: 'month', label: 'month', type: 'month', default: currentMonth() }],
    { message: 'Invalid month' }
  ).month;
}

export const listBudgets = asyncHandler(async (req, res) => {
  const month = readMonthQuery(req);
  const budgets = await Budget.find({ owner: req.user._id, month }).populate(CATEGORY_POPULATE).sort({ createdAt: 1 });
  const data = await decorate(budgets, { owner: req.user._id, month });
  res.json({ data, month });
});

export const createBudget = asyncHandler(async (req, res) => {
  const values = validate(req.body, [
    { field: 'categoryId', label: 'Category', type: 'objectId', required: true },
    { field: 'amount', label: 'Amount', type: 'amount', required: true, gt: 0, max: 1e12 },
    { field: 'month', label: 'Month', type: 'month', required: true },
  ]);

  const category = await Category.findOne({ _id: values.categoryId, owner: req.user._id });
  if (!category) throw ApiError.notFound('Category not found');
  if (category.type !== 'expense') {
    throw ApiError.badRequest(`Budgets can only be set on expense categories, "${category.name}" is income`);
  }

  const clash = await Budget.findOne({ owner: req.user._id, category: category._id, month: values.month }).lean();
  if (clash) {
    throw ApiError.conflict(`A budget for "${category.name}" already exists in ${values.month}`);
  }

  const budget = await Budget.create({
    owner: req.user._id,
    category: category._id,
    amount: values.amount,
    month: values.month,
  });

  const populated = await budget.populate(CATEGORY_POPULATE);
  const [decorated] = await decorate([populated], { owner: req.user._id, month: values.month });
  res.status(201).json({ budget: decorated });
});

export const updateBudget = asyncHandler(async (req, res) => {
  const budget = await findOwned({
    model: Budget,
    id: req.params.id,
    owner: req.user._id,
    message: 'Budget not found',
  });

  const patch = validate(req.body, [
    { field: 'amount', label: 'Amount', type: 'amount', gt: 0, max: 1e12 },
    { field: 'month', label: 'Month', type: 'month' },
  ]);

  if (patch.amount === undefined && patch.month === undefined) {
    throw ApiError.badRequest('Nothing to update', ['Provide an amount or month']);
  }

  const nextMonth = patch.month ?? budget.month;
  if (patch.month !== undefined && patch.month !== budget.month) {
    const clash = await Budget.findOne({
      owner: req.user._id,
      category: budget.category,
      month: nextMonth,
    }).lean();
    if (clash) throw ApiError.conflict(`A budget for this category already exists in ${nextMonth}`);
  }

  if (patch.amount !== undefined) budget.amount = patch.amount;
  if (patch.month !== undefined) budget.month = patch.month;

  await budget.save();
  const populated = await budget.populate(CATEGORY_POPULATE);
  const [decorated] = await decorate([populated], { owner: req.user._id, month: nextMonth });
  res.json({ budget: decorated });
});

export const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await findOwned({
    model: Budget,
    id: req.params.id,
    owner: req.user._id,
    message: 'Budget not found',
  });
  await budget.deleteOne();
  res.status(204).end();
});

export const budgetSummary = asyncHandler(async (req, res) => {
  const month = readMonthQuery(req);
  const budgets = await Budget.find({ owner: req.user._id, month }).select('amount category').lean();

  const budgeted = roundTo(
    budgets.reduce((total, budget) => total + (Number(budget.amount) || 0), 0),
    2
  );
  const ids = budgets.map((budget) => String(budget.category));
  const spentMap = await spentByCategory({ owner: req.user._id, month, categoryIds: ids });
  const spent = roundTo(
    [...spentMap.values()].reduce((total, value) => total + value, 0),
    2
  );

  res.json({ month, budgeted, spent, remaining: roundTo(budgeted - spent, 2) });
});
