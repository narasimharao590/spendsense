import { ApiError } from './errors.js';
import { roundTo } from './format.js';
import { isValidDayKey, isValidMonth, normalizeInputDate } from './dates.js';

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const NUMERIC_STRING_RE = /^-?\d+(\.\d+)?$/;

export function isObjectId(value) {
  return typeof value === 'string' && OBJECT_ID_RE.test(value);
}

function labelOf(spec) {
  return spec.label || spec.field;
}

function isNumericInput(raw) {
  return typeof raw === 'number' || (typeof raw === 'string' && NUMERIC_STRING_RE.test(raw.trim()));
}

function coerceValue(spec, raw, errors) {
  const label = labelOf(spec);

  switch (spec.type) {
    case 'text': {
      if (typeof raw !== 'string') {
        errors.push(`${label} must be text`);
        return undefined;
      }
      const value = raw.trim();
      if (spec.min != null && value.length < spec.min) {
        errors.push(`${label} must be at least ${spec.min} characters`);
        return undefined;
      }
      if (spec.max != null && value.length > spec.max) {
        errors.push(`${label} must be at most ${spec.max} characters`);
        return undefined;
      }
      return value;
    }

    case 'email': {
      if (typeof raw !== 'string' || !EMAIL_RE.test(raw.trim())) {
        errors.push(`${label} must be a valid email address`);
        return undefined;
      }
      return raw.trim().toLowerCase();
    }

    case 'password': {
      if (typeof raw !== 'string') {
        errors.push(`${label} must be text`);
        return undefined;
      }
      if (raw.length < (spec.min ?? 8)) {
        errors.push(`${label} must be at least ${spec.min ?? 8} characters`);
        return undefined;
      }
      if (raw.length > (spec.max ?? 128)) {
        errors.push(`${label} must be at most ${spec.max ?? 128} characters`);
        return undefined;
      }
      return raw;
    }

    case 'amount': {
      if (!isNumericInput(raw)) {
        errors.push(`${label} must be a number`);
        return undefined;
      }
      const value = Number(typeof raw === 'string' ? raw.trim() : raw);
      if (!Number.isFinite(value)) {
        errors.push(`${label} must be a number`);
        return undefined;
      }
      const gt = spec.gt ?? 0;
      if (value <= gt) {
        errors.push(`${label} must be greater than ${gt}`);
      } else if (spec.max != null && value > spec.max) {
        errors.push(`${label} must be at most ${spec.max}`);
      } else {
        return roundTo(value, 2);
      }
      return undefined;
    }

    case 'signedAmount': {
      if (!isNumericInput(raw)) {
        errors.push(`${label} must be a number`);
        return undefined;
      }
      const value = Number(typeof raw === 'string' ? raw.trim() : raw);
      if (!Number.isFinite(value)) {
        errors.push(`${label} must be a number`);
        return undefined;
      }
      if (Math.abs(value) > (spec.max ?? 1e12)) {
        errors.push(`${label} must be within ${spec.max ?? 1e12}`);
        return undefined;
      }
      return roundTo(value, 2);
    }

    case 'integer': {
      if (!isNumericInput(raw)) {
        errors.push(`${label} must be a whole number`);
        return undefined;
      }
      const value = Number(typeof raw === 'string' ? raw.trim() : raw);
      if (!Number.isInteger(value)) {
        errors.push(`${label} must be a whole number`);
        return undefined;
      }
      if (spec.min != null && value < spec.min) {
        errors.push(`${label} must be at least ${spec.min}`);
        return undefined;
      }
      if (spec.max != null && value > spec.max) {
        errors.push(`${label} must be at most ${spec.max}`);
        return undefined;
      }
      return value;
    }

    case 'objectId': {
      if (typeof raw !== 'string' || !OBJECT_ID_RE.test(raw)) {
        errors.push(`${label} must be a valid identifier`);
        return undefined;
      }
      return raw;
    }

    case 'enum': {
      if (typeof raw !== 'string' || !spec.values.includes(raw)) {
        errors.push(`${label} must be one of: ${spec.values.join(', ')}`);
        return undefined;
      }
      return raw;
    }

    case 'boolean': {
      if (typeof raw === 'boolean') return raw;
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      errors.push(`${label} must be true or false`);
      return undefined;
    }

    case 'color': {
      if (typeof raw !== 'string' || !COLOR_RE.test(raw.trim())) {
        errors.push(`${label} must be a hex color like #f97316`);
        return undefined;
      }
      return raw.trim().toLowerCase();
    }

    case 'slug': {
      if (typeof raw !== 'string' || !SLUG_RE.test(raw.trim())) {
        errors.push(`${label} must be a short slug such as "utensils"`);
        return undefined;
      }
      return raw.trim().toLowerCase();
    }

    case 'month': {
      if (typeof raw !== 'string' || !isValidMonth(raw.trim())) {
        errors.push(`${label} must use the YYYY-MM format`);
        return undefined;
      }
      return raw.trim();
    }

    case 'day': {
      if (typeof raw !== 'string' || !isValidDayKey(raw.trim())) {
        errors.push(`${label} must be a YYYY-MM-DD date`);
        return undefined;
      }
      return raw.trim();
    }

    case 'date': {
      try {
        return normalizeInputDate(raw, label);
      } catch (error) {
        errors.push(error.message);
        return undefined;
      }
    }

    default:
      throw new Error(`Unknown validator type: ${spec.type}`);
  }
}

export function validate(source, specs, options = {}) {
  const payload = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  const values = {};
  const errors = [];

  for (const spec of specs) {
    const present =
      Object.prototype.hasOwnProperty.call(payload, spec.field) && payload[spec.field] !== undefined;
    const raw = present ? payload[spec.field] : undefined;

    if (raw === null && spec.nullable) {
      values[spec.field] = spec.nullValue ?? null;
      continue;
    }

    if (!present) {
      if (spec.required) errors.push(`${labelOf(spec)} is required`);
      else if ('default' in spec) values[spec.field] = spec.default;
      continue;
    }

    if (!spec.required && typeof raw === 'string' && raw.trim() === '' && spec.allowEmpty !== true && spec.type !== 'text') {
      if ('default' in spec) values[spec.field] = spec.default;
      continue;
    }

    const coerced = coerceValue(spec, raw, errors);
    if (coerced !== undefined) values[spec.field] = coerced;
  }

  if (errors.length) {
    throw new ApiError(400, options.message || 'Validation failed', unique(errors));
  }

  return values;
}

function unique(list) {
  return [...new Set(list)];
}
