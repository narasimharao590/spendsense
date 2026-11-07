import mongoose from 'mongoose';
import { roundTo } from '../utils/format.js';

const { Schema } = mongoose;

export const ACCOUNT_KINDS = ['cash', 'savings', 'investment', 'credit'];

export const ACCOUNT_KIND_LABELS = {
  cash: 'Cash',
  savings: 'Savings',
  investment: 'Investments',
  credit: 'Credit',
};

export const ACCOUNT_KIND_ORDER = ACCOUNT_KINDS;

const accountSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      minlength: [1, 'Account name is required'],
      maxlength: [60, 'Account name must be at most 60 characters'],
    },
    nameLower: { type: String, required: true },
    kind: { type: String, enum: ACCOUNT_KINDS, required: [true, 'Account kind is required'] },
    openingBalance: {
      type: Number,
      default: 0,
      min: [-1e12, 'Opening balance is out of range'],
      max: [1e12, 'Opening balance is out of range'],
      set: (value) => roundTo(Number(value) || 0, 2),
      get: (value) => roundTo(value, 2),
    },
    color: {
      type: String,
      default: '#64748b',
      lowercase: true,
      trim: true,
      match: [/^#[0-9a-f]{6}$/, 'Color must be a hex value such as #f97316'],
    },
    icon: {
      type: String,
      default: 'wallet',
      trim: true,
      maxlength: 40,
      match: [/^[a-z0-9][a-z0-9-]*$/, 'Icon must be a slug such as "credit-card"'],
    },
    note: { type: String, trim: true, maxlength: [200, 'Note must be at most 200 characters'], default: '' },
    isActive: { type: Boolean, default: true },
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
        delete ret.nameLower;
        delete ret.owner;
        return ret;
      },
    },
  }
);

accountSchema.index({ owner: 1, nameLower: 1 }, { unique: true });

accountSchema.pre('validate', function normaliseName() {
  if (this.isModified('name') || !this.nameLower) {
    this.nameLower = String(this.name || '').trim().toLowerCase();
  }
});

accountSchema.methods.toPublicJSON = function toPublicJSON({ balance = 0, transactionCount = 0 } = {}) {
  return {
    id: String(this._id),
    name: this.name,
    kind: this.kind,
    openingBalance: roundTo(this.openingBalance, 2),
    color: this.color,
    icon: this.icon,
    note: this.note ?? '',
    isActive: this.isActive,
    balance: roundTo(balance, 2),
    transactionCount: Number(transactionCount) || 0,
  };
};

export const Account = mongoose.model('Account', accountSchema);
