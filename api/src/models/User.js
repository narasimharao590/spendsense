import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../config/defaultCategories.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [1, 'Name is required'],
      maxlength: [80, 'Name must be at most 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
      match: [/^[A-Z]{3}$/, 'Currency must be a 3-letter code'],
    },
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
        delete ret.password;
        return ret;
      },
    },
  }
);

userSchema.pre('save', async function hashPasswordWhenModified() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_COST);
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  const hash = this.password;
  if (typeof hash !== 'string' || hash.length === 0) return false;
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  return bcrypt.compare(candidate, hash);
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    currency: this.currency,
    createdAt: this.createdAt ? new Date(this.createdAt).toISOString() : undefined,
  };
};

export const User = mongoose.model('User', userSchema);
