import { ApiError } from './errors.js';
import { isObjectId } from './validators.js';

function assertObjectId(value, message = 'Resource not found') {
  if (!isObjectId(value)) {
    throw ApiError.notFound(message);
  }
  return value;
}

export async function findOwned({ model, id, owner, message = 'Resource not found', populate, select }) {
  assertObjectId(id, message);
  let query = model.findOne({ _id: id, owner });
  if (select) query = query.select(select);
  if (populate) query = query.populate(populate);
  const doc = await query;
  if (!doc) throw ApiError.notFound(message);
  return doc;
}

export const CATEGORY_POPULATE = { path: 'category', select: 'name type color icon' };

export const ACCOUNT_POPULATE = { path: 'account', select: 'name kind color icon' };

export const TRANSFER_TO_POPULATE = { path: 'transferTo', select: 'name kind color icon' };

export const TRANSACTION_POPULATE = [CATEGORY_POPULATE, ACCOUNT_POPULATE, TRANSFER_TO_POPULATE];

export const PAYMENT_POPULATE = [
  { path: 'category', select: 'name type color icon' },
  ACCOUNT_POPULATE,
];
