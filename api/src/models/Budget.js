import mongoose from 'mongoose';
import { roundTo } from '../utils/format.js';

const { Schema } = mongoose;

const budgetSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: [true, 'Category is required'] },
    month: {
      type: String,
      required: [true, 'Month is required'],
      trim: true,
      uppercase: false,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must use the YYYY-MM format'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
      set: (value) => roundTo(value, 2),
      get: (value) => roundTo(value, 2),
    },
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

budgetSchema.index({ owner: 1, category: 1, month: 1 }, { unique: true });
budgetSchema.index({ owner: 1, month: 1 });

budgetSchema.methods.toPublicJSON = function toPublicJSON({ spent = 0 } = {}) {
  const amount = roundTo(this.amount, 2);
  const spentValue = roundTo(spent, 2);
  return {
    id: String(this._id),
    month: this.month,
    amount,
    spent: spentValue,
    remaining: roundTo(amount - spentValue, 2),
    percentUsed: amount > 0 ? roundTo((spentValue / amount) * 100, 1) : 0,
    category:
      this.category && typeof this.category === 'object'
        ? {
            id: String(this.category._id ?? this.category.id),
            name: this.category.name,
            color: this.category.color,
            icon: this.category.icon,
          }
        : null,
  };
};

export const Budget = mongoose.model('Budget', budgetSchema);
