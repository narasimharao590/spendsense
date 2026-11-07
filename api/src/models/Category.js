import mongoose from 'mongoose';
import { DEFAULT_CATEGORIES } from '../config/defaultCategories.js';

const { Schema } = mongoose;

export const CATEGORY_TYPES = ['expense', 'income'];

const categorySchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [1, 'Category name is required'],
      maxlength: [60, 'Category name must be at most 60 characters'],
    },
    nameLower: { type: String, required: true },
    type: { type: String, enum: CATEGORY_TYPES, required: true },
    color: {
      type: String,
      default: '#64748b',
      lowercase: true,
      trim: true,
      match: [/^#[0-9a-f]{6}$/, 'Color must be a hex value such as #f97316'],
    },
    icon: {
      type: String,
      default: 'tag',
      trim: true,
      maxlength: 40,
      match: [/^[a-z0-9][a-z0-9-]*$/, 'Icon must be a slug such as "utensils"'],
    },
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: () => new Date() },
  },
  {
    versionKey: false,
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.nameLower;
        return ret;
      },
    },
  }
);

categorySchema.index({ owner: 1, nameLower: 1, type: 1 }, { unique: true });

categorySchema.pre('validate', function normaliseName() {
  if (this.isModified('name') || !this.nameLower) {
    this.nameLower = String(this.name || '').trim().toLowerCase();
  }
});

categorySchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    name: this.name,
    type: this.type,
    color: this.color,
    icon: this.icon,
    isDefault: this.isDefault,
    createdAt: this.createdAt ? new Date(this.createdAt).toISOString() : undefined,
  };
};

categorySchema.statics.createDefaults = async function createDefaults(ownerId) {
  const docs = DEFAULT_CATEGORIES.map((category) => ({
    owner: ownerId,
    name: category.name,
    nameLower: category.name.toLowerCase(),
    type: category.type,
    color: category.color,
    icon: category.icon,
    isDefault: true,
  }));
  return Category.insertMany(docs);
};

export const Category = mongoose.model('Category', categorySchema);
