import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../utils/token.js';
import { validate } from '../utils/validators.js';

const registerSpecs = [
  { field: 'name', label: 'Name', type: 'text', required: true, min: 1, max: 80 },
  { field: 'email', label: 'Email', type: 'email', required: true },
  { field: 'password', label: 'Password', type: 'password', required: true, min: 8, max: 128 },
];

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = validate(req.body, registerSpecs);

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({ name, email, password });

  try {
    await Category.createDefaults(user._id);
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw error;
  }

  res.status(201).json({ token: signToken(user), user: user.toPublicJSON() });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = validate(
    req.body,
    [
      { field: 'email', label: 'Email', type: 'email', required: true },
      { field: 'password', label: 'Password', type: 'password', required: true, min: 1, max: 128 },
    ],
    { message: 'Please provide your email and password' }
  );

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  res.json({ token: signToken(user), user: user.toPublicJSON() });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

export const updateMe = asyncHandler(async (req, res) => {
  const patch = validate(
    req.body,
    [
      { field: 'name', label: 'Name', type: 'text', min: 1, max: 80 },
      { field: 'currency', label: 'Currency', type: 'text', min: 3, max: 3 },
    ],
    { message: 'Provide a name or currency to update' }
  );

  const user = req.user;
  if (patch.name === undefined && patch.currency === undefined) {
    throw ApiError.badRequest('Nothing to update', ['Provide a name or currency']);
  }
  if (patch.name !== undefined) user.name = patch.name;
  if (patch.currency !== undefined) {
    if (!/^[A-Za-z]{3}$/.test(patch.currency)) {
      throw ApiError.badRequest('Validation failed', ['Currency must be a 3-letter code']);
    }
    user.currency = patch.currency.toUpperCase();
  }

  await user.save();
  res.json({ user: user.toPublicJSON() });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = validate(
    req.body,
    [
      { field: 'currentPassword', label: 'Current password', type: 'password', required: true, min: 1, max: 128 },
      { field: 'newPassword', label: 'New password', type: 'password', required: true, min: 8, max: 128 },
    ],
    { message: 'Provide your current password and a new password' }
  );

  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw ApiError.unauthorized('Account no longer exists');

  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from the current one');
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Password changed successfully' });
});
