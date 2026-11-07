import mongoose from 'mongoose';
import { roundTo } from '../utils/format.js';
import { accountBrief } from '../utils/refs.js';

const { Schema } = mongoose;

export const PAYMENT_FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly'];

const MONTHS_PER_PERIOD = { weekly: 0, monthly: 1, quarterly: 3, yearly: 12 };

// Weekly payments are anchored on the day-of-month modulo 7 because dueDay is a day of the month
// (1-28), not a weekday name; the offset keeps the next weekly due date inside the coming 7 days.
function nextWeeklyDueDate(dueDay, from) {
  const offset = ((dueDay % 7) - (from.getUTCDate() % 7) + 7) % 7;
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + offset));
}

function startOfUtcDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function nextDueDateFor(frequency, dueDay, reference = new Date()) {
  const from = startOfUtcDay(reference);
  const day = Math.min(Math.max(Number(dueDay) || 1, 1), 28);
  if (frequency === 'weekly') return nextWeeklyDueDate(day, from);

  const candidate = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), day));
  if (candidate.getTime() >= from.getTime()) return candidate;
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, day));
}

export function advanceDueDate(currentDueDate, frequency) {
  const date = startOfUtcDay(currentDueDate);
  if (frequency === 'weekly') {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 7));
  }
  const months = MONTHS_PER_PERIOD[frequency] ?? 1;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

export function daysUntilDue(dueDate, reference = new Date()) {
  if (!dueDate) return 0;
  const target = startOfUtcDay(dueDate);
  const today = startOfUtcDay(reference);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function paymentStatus({ isActive, dueDate, reference = new Date() }) {
  if (!isActive) return 'inactive';
  const days = daysUntilDue(dueDate, reference);
  if (days < 0) return 'overdue';
  if (days <= 3) return 'due';
  return 'upcoming';
}

const paymentSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [1, 'Title is required'],
      maxlength: [80, 'Title must be at most 80 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
      set: (value) => roundTo(value, 2),
      get: (value) => roundTo(value, 2),
    },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: [true, 'Category is required'] },
    account: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    frequency: { type: String, enum: PAYMENT_FREQUENCIES, required: [true, 'Frequency is required'] },
    dueDay: {
      type: Number,
      required: [true, 'Due day is required'],
      min: [1, 'Due day must be between 1 and 28'],
      max: [28, 'Due day must be between 1 and 28'],
    },
    isActive: { type: Boolean, default: true },
    lastPaidAt: { type: Date, default: null },
    nextDueAt: { type: Date, required: [true, 'Next due date is required'] },
    note: { type: String, trim: true, maxlength: [200, 'Note must be at most 200 characters'], default: '' },
  },
  {
    versionKey: false,
    timestamps: true,
    toJSON: {
      virtuals: true,
      getters: true,
      transform(doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

paymentSchema.index({ owner: 1, nextDueAt: 1 });
paymentSchema.index({ owner: 1, isActive: 1 });

paymentSchema.methods.toPublicJSON = function toPublicJSON({ reference = new Date() } = {}) {
  const category = this.category;
  return {
    id: String(this._id),
    title: this.title,
    amount: roundTo(this.amount, 2),
    frequency: this.frequency,
    dueDay: this.dueDay,
    isActive: this.isActive,
    lastPaidAt: this.lastPaidAt ? new Date(this.lastPaidAt).toISOString() : null,
    nextDueAt: this.nextDueAt ? new Date(this.nextDueAt).toISOString() : null,
    note: this.note ?? '',
    category:
      category && typeof category === 'object' && category.name !== undefined
        ? {
            id: String(category._id ?? category.id),
            name: category.name,
            color: category.color,
            icon: category.icon,
          }
        : null,
    account: accountBrief(this.account),
    status: paymentStatus({ isActive: this.isActive, dueDate: this.nextDueAt, reference }),
    daysUntilDue: daysUntilDue(this.nextDueAt, reference),
  };
};

export const Payment = mongoose.model('Payment', paymentSchema);
