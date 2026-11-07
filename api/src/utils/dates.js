import { ApiError } from './errors.js';

// Day and month boundaries are computed in UTC because every date-only payload is stored as UTC
// midnight (see normalizeInputDate). Mixing local-time boundaries with UTC-stored days would shift
// transactions across month edges and corrupt the daily/monthly buckets.
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
// V8's Date parser happily accepts slop like "2026-11", "11-04-2026" or "Nov 4 26"; only these
// two wire formats are accepted so a mistyped payload can never be silently reinterpreted.
const ISO_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?$/;

function pad2(value) {
  return String(value).padStart(2, '0');
}

function toMonthKey(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

export function currentMonth(date = new Date()) {
  return toMonthKey(date);
}

export function isValidMonth(month) {
  return typeof month === 'string' && MONTH_PATTERN.test(month);
}

function assertMonth(month, field = 'month') {
  if (!isValidMonth(month)) {
    throw ApiError.badRequest(`${field} must use the YYYY-MM format`);
  }
}

function monthParts(month) {
  const [, year, mm] = MONTH_PATTERN.exec(month);
  return { year: Number(year), month: Number(mm) };
}

export function monthRange(month) {
  assertMonth(month);
  const { year, month: mm } = monthParts(month);
  return {
    start: new Date(Date.UTC(year, mm - 1, 1)),
    end: new Date(Date.UTC(year, mm, 1)),
  };
}

export function shiftMonth(month, delta) {
  const { year, month: mm } = monthParts(month);
  return toMonthKey(new Date(Date.UTC(year, mm - 1 + delta, 1)));
}

export function daysInMonth(month) {
  const { year, month: mm } = monthParts(month);
  return new Date(Date.UTC(year, mm, 0)).getUTCDate();
}

export function monthDayKeys(month) {
  assertMonth(month);
  return Array.from({ length: daysInMonth(month) }, (_, index) => `${month}-${pad2(index + 1)}`);
}

function monthSequence(startMonth, count) {
  return Array.from({ length: count }, (_, index) => shiftMonth(startMonth, index));
}

export function trailingMonthRange(endMonth, count) {
  const startMonth = shiftMonth(endMonth, -(count - 1));
  return {
    start: monthRange(startMonth).start,
    end: monthRange(endMonth).end,
    startMonth,
    months: monthSequence(startMonth, count),
  };
}

export function isValidDayKey(value) {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

export function dayKeyEnd(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1));
}

export function normalizeInputDate(value, field = 'date') {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw ApiError.badRequest(`${field} is not a valid date`);
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const fromEpoch = new Date(value);
    if (Number.isNaN(fromEpoch.getTime())) throw ApiError.badRequest(`${field} is not a valid date`);
    return fromEpoch;
  }

  if (typeof value !== 'string' || !value.trim()) {
    throw ApiError.badRequest(`${field} must be a YYYY-MM-DD date`);
  }

  const raw = value.trim();
  if (DAY_PATTERN.test(raw)) {
    if (!isValidDayKey(raw)) throw ApiError.badRequest(`${field} is not a real calendar date`);
    const [y, m, d] = raw.split('-').map(Number);
    if (y < 1900 || y > 2200) throw ApiError.badRequest(`${field} year must be between 1900 and 2200`);
    return new Date(Date.UTC(y, m - 1, d));
  }

  if (!ISO_DATETIME_PATTERN.test(raw)) {
    throw ApiError.badRequest(`${field} must be a YYYY-MM-DD date or an ISO datetime`);
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() < 1900 || parsed.getUTCFullYear() > 2200) {
    throw ApiError.badRequest(`${field} must be a YYYY-MM-DD date or an ISO datetime`);
  }
  return parsed;
}
