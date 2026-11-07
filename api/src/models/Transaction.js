import mongoose from 'mongoose';
import { roundTo } from '../utils/format.js';
import { accountBrief } from '../utils/refs.js';

const { Schema } = mongoose;

export const TRANSACTION_TYPES = ['expense', 'income', 'transfer'];

function roundAmount(value) {
  return roundTo(value, 2);
}

const transactionSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
      set: roundAmount,
      get: roundAmount,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [1, 'Title is required'],
      maxlength: [140, 'Title must be at most 140 characters'],
    },
    note: { type: String, trim: true, maxlength: [500, 'Note must be at most 500 characters'], default: '' },
    date: { type: Date, required: [true, 'Date is required'] },
    // Optional so a transfer can carry no category; the controllers still require categoryId for
    // expense and income entries before the document is ever built.
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    account: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    transferTo: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
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

transactionSchema.index({ owner: 1, date: -1 });
transactionSchema.index({ owner: 1, category: 1 });
transactionSchema.index({ owner: 1, account: 1 });
transactionSchema.index({ owner: 1, transferTo: 1 });

function categoryRef(category) {
  if (!category) return null;
  if (typeof category.toPublicJSON === 'function') {
    const publicCategory = category.toPublicJSON();
    return {
      id: publicCategory.id,
      name: publicCategory.name,
      type: publicCategory.type,
      color: publicCategory.color,
      icon: publicCategory.icon,
    };
  }
  return {
    id: String(category._id ?? category.id),
    name: category.name,
    type: category.type,
    color: category.color,
    icon: category.icon,
  };
}

transactionSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    title: this.title,
    amount: roundTo(this.amount, 2),
    type: this.type,
    note: this.note ?? '',
    date: this.date ? new Date(this.date).toISOString() : null,
    category: categoryRef(this.category),
    account: accountBrief(this.account),
    transferTo: accountBrief(this.transferTo),
    createdAt: this.createdAt ? new Date(this.createdAt).toISOString() : undefined,
    updatedAt: this.updatedAt ? new Date(this.updatedAt).toISOString() : undefined,
  };
};

export const Transaction = mongoose.model('Transaction', transactionSchema);
