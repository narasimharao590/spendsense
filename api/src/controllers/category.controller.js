import { Category, CATEGORY_TYPES } from '../models/Category.js';
import { Transaction } from '../models/Transaction.js';
import { Budget } from '../models/Budget.js';
import { ApiError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { articleFor } from '../utils/format.js';
import { validate } from '../utils/validators.js';
import { findOwned } from '../utils/query.js';

async function ensureUniqueName({ owner, name, type, excludeId }) {
  const filter = { owner, nameLower: name.trim().toLowerCase(), type };
  if (excludeId) filter._id = { $ne: excludeId };
  const clash = await Category.findOne(filter).lean();
  if (clash) {
    throw ApiError.conflict(`${articleFor(type)} ${type} category named "${name.trim()}" already exists`);
  }
}

export const listCategories = asyncHandler(async (req, res) => {
  const { type } = validate(req.query, [
    { field: 'type', label: 'type', type: 'enum', values: CATEGORY_TYPES },
  ]);

  const filter = { owner: req.user._id };
  if (type) filter.type = type;

  const categories = await Category.find(filter).sort({ nameLower: 1, createdAt: 1 });
  res.json({ data: categories.map((category) => category.toPublicJSON()) });
});

export const createCategory = asyncHandler(async (req, res) => {
  const values = validate(req.body, [
    { field: 'name', label: 'Name', type: 'text', required: true, min: 1, max: 60 },
    { field: 'type', label: 'Type', type: 'enum', values: CATEGORY_TYPES, required: true },
    { field: 'color', label: 'Color', type: 'color', default: '#64748b' },
    { field: 'icon', label: 'Icon', type: 'slug', default: 'tag' },
  ]);

  await ensureUniqueName({ owner: req.user._id, name: values.name, type: values.type });

  const category = await Category.create({
    owner: req.user._id,
    name: values.name,
    type: values.type,
    color: values.color,
    icon: values.icon,
    isDefault: false,
  });

  res.status(201).json({ category: category.toPublicJSON() });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await findOwned({
    model: Category,
    id: req.params.id,
    owner: req.user._id,
    message: 'Category not found',
  });

  const patch = validate(req.body, [
    { field: 'name', label: 'Name', type: 'text', min: 1, max: 60 },
    { field: 'type', label: 'Type', type: 'enum', values: CATEGORY_TYPES },
    { field: 'color', label: 'Color', type: 'color' },
    { field: 'icon', label: 'Icon', type: 'slug' },
  ]);

  if (patch.type !== undefined && patch.type !== category.type) {
    throw ApiError.badRequest('Category type cannot be changed', [
      'Create a new category instead, transactions and budgets depend on the type',
    ]);
  }
  if (patch.name === undefined && patch.color === undefined && patch.icon === undefined) {
    throw ApiError.badRequest('Nothing to update', ['Provide a name, color or icon']);
  }

  const nextName = patch.name ?? category.name;
  if (patch.name !== undefined || patch.type !== undefined) {
    await ensureUniqueName({ owner: req.user._id, name: nextName, type: category.type, excludeId: category._id });
  }

  if (patch.name !== undefined) category.name = patch.name;
  if (patch.color !== undefined) category.color = patch.color;
  if (patch.icon !== undefined) category.icon = patch.icon;

  await category.save();
  res.json({ category: category.toPublicJSON() });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await findOwned({
    model: Category,
    id: req.params.id,
    owner: req.user._id,
    message: 'Category not found',
  });

  const linked = await Transaction.countDocuments({ owner: req.user._id, category: category._id });
  if (linked > 0) {
    throw ApiError.conflict(
      `Cannot delete "${category.name}": ${linked} transaction${linked === 1 ? '' : 's'} still use${linked === 1 ? 's' : ''} it. Move or delete those transactions first.`
    );
  }

  await Budget.deleteMany({ owner: req.user._id, category: category._id });
  await category.deleteOne();
  res.status(204).end();
});
