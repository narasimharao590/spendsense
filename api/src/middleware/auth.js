import { ApiError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { extractBearerToken, verifyToken } from '../utils/token.js';
import { User } from '../models/User.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    throw ApiError.unauthorized('Authentication required');
  }
  const payload = verifyToken(token);
  const userId = payload.sub || payload.userId;
  if (!userId) {
    throw ApiError.unauthorized('Invalid authentication token');
  }
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('Account no longer exists');
  }
  req.user = user;
  req.userId = String(user._id);
  next();
});
