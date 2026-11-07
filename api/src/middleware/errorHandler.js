import mongoose from 'mongoose';
import { ApiError } from '../utils/errors.js';
import { articleFor } from '../utils/format.js';
import { env } from '../config/env.js';

function fromBodyParser(error) {
  if (error?.type === 'entity.parse.failed' || (error instanceof SyntaxError && 'body' in error)) {
    return new ApiError(400, 'Request body must be valid JSON');
  }
  if (error?.type === 'entity.too.large') {
    return new ApiError(413, 'Request body is too large');
  }
  if (error?.type === 'encoding.unsupported') {
    return new ApiError(415, 'Unsupported content type, send application/json');
  }
  return null;
}

function fromMongoError(error) {
  if (error instanceof mongoose.Error.ValidationError) {
    return new ApiError(400, 'Validation failed', Object.values(error.errors).map((item) => item.message));
  }
  if (error instanceof mongoose.Error.CastError) {
    return new ApiError(400, `${error.path} is not valid`);
  }

  const isDuplicate = error?.code === 11000 || /E11000/.test(error?.message || '');
  if (isDuplicate) {
    const keys = error.keyValue || {};
    if (keys.email) return new ApiError(409, 'An account with this email already exists');
    if (keys.nameLower) {
      if (error.collection === 'accounts') {
        const name = keys.name || keys.nameLower;
        return new ApiError(409, `An account named "${name}" already exists`);
      }
      const name = keys.name || keys.nameLower;
      if (!keys.type) return new ApiError(409, `Category "${name}" already exists`);
      return new ApiError(409, `${articleFor(keys.type)} ${keys.type} category named "${name}" already exists`);
    }
    if (keys.month) return new ApiError(409, `A budget for this category already exists in ${keys.month}`);
    return new ApiError(409, 'That record already exists');
  }
  return null;
}

function mapError(error) {
  if (error instanceof ApiError) return error;
  return fromMongoError(error) || fromBodyParser(error);
}

// Express only treats middleware as an error handler when it declares four parameters.
export function errorHandler(error, req, res, _next) {
  const mapped = mapError(error);
  const status = mapped?.status || Number(error?.status) || 500;
  const isServerError = status >= 500;

  if (isServerError || env.nodeEnv !== 'production') {
    console.error(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${status}`,
      error?.stack || error
    );
  }

  const message = isServerError && env.nodeEnv === 'production' ? 'Something went wrong' : mapped?.message || error?.message || 'Something went wrong';
  const body = { message };
  if (mapped?.details) body.details = mapped.details;

  if (res.headersSent) return;
  res.status(status).json(body);
}
