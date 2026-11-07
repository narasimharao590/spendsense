import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from './errors.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch (error) {
    const expired = error instanceof jwt.TokenExpiredError;
    throw ApiError.unauthorized(expired ? 'Session expired, please sign in again' : 'Invalid authentication token');
  }
}

export function extractBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') return null;
  return token.trim();
}
