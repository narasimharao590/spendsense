import dayjs from 'dayjs';

export const DEFAULT_CURRENCY = 'INR';
const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;

const currencyFormatters = new Map();

function getCurrencyFormatter(code) {
  const normalized =
    typeof code === 'string' && code.trim().length === 3
      ? code.trim().toUpperCase()
      : DEFAULT_CURRENCY;
  const locale = normalized === 'INR' ? 'en-IN' : undefined;

  let formatter = currencyFormatters.get(normalized);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: normalized,
        maximumFractionDigits: 2,
      });
    } catch {
      formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: DEFAULT_CURRENCY,
        maximumFractionDigits: 2,
      });
    }
    currencyFormatters.set(normalized, formatter);
  }

  return { formatter, code: normalized };
}

export function formatMoney(amount, currency = DEFAULT_CURRENCY) {
  const value = Number(amount);
  const safeValue = Number.isFinite(value) ? value : 0;
  const { formatter } = getCurrencyFormatter(currency);
  return formatter.format(safeValue);
}

export function formatSignedMoney(amount, currency = DEFAULT_CURRENCY) {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return formatMoney(0, currency);
  }
  const absPrefix = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${absPrefix}${formatMoney(Math.abs(value), currency)}`;
}

export function formatCompactMoney(amount, currency = DEFAULT_CURRENCY) {
  const value = Number(amount);
  const safeValue = Number.isFinite(value) ? value : 0;
  const code =
    typeof currency === 'string' && currency.trim().length === 3
      ? currency.trim().toUpperCase()
      : DEFAULT_CURRENCY;

  try {
    return new Intl.NumberFormat(code === 'INR' ? 'en-IN' : undefined, {
      style: 'currency',
      currency: code,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(safeValue);
  } catch {
    return formatMoney(safeValue, code);
  }
}

export function formatDate(value, pattern = 'MMM D, YYYY') {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(pattern) : '';
}

export function toMonthKey(date = new Date()) {
  const parsed = dayjs(date);
  return (parsed.isValid() ? parsed : dayjs()).format('YYYY-MM');
}

export function isMonthKey(value) {
  return typeof value === 'string' && MONTH_KEY_PATTERN.test(value);
}

function toMonthStart(monthKey) {
  if (isMonthKey(monthKey)) {
    return dayjs(`${monthKey}-01`);
  }
  const parsed = dayjs(monthKey);
  return (parsed.isValid() ? parsed : dayjs()).startOf('month');
}

export function monthLabel(monthKey) {
  return toMonthStart(monthKey).format('MMMM YYYY');
}

export function monthShortLabel(monthKey) {
  return toMonthStart(monthKey).format('MMM');
}

export function monthRange(monthKey) {
  const start = toMonthStart(monthKey).startOf('month');
  const end = start.endOf('month');
  return { from: start.format('YYYY-MM-DD'), to: end.format('YYYY-MM-DD') };
}

export function addMonths(monthKey, delta) {
  return toMonthStart(monthKey).add(delta, 'month').format('YYYY-MM');
}

export function dayNumber(date) {
  const parsed = dayjs(date);
  return parsed.isValid() ? Number(parsed.format('D')) : '';
}

export function formatPercent(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '0%';
  }
  return `${number.toFixed(digits)}%`;
}

export function percentDelta(current, previous) {
  const currentValue = Number(current);
  const previousValue = Number(previous);

  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue === 0) {
    return null;
  }

  const delta = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  return Math.round(delta * 10) / 10;
}
