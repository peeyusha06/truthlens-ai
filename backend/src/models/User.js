/**
 * User.js – Mongoose model for authentication
 *
 * Stores registered users. Passwords are hashed with bcryptjs.
 * Does NOT affect existing Result collection.
 */

'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type    : String,
      required: [true, 'Name is required'],
      trim    : true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name too long'],
    },
    email: {
      type    : String,
      required: [true, 'Email is required'],
      unique  : true,
      lowercase: true,
      trim    : true,
      match   : [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type    : String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select  : false, // Never return password in queries by default
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Pre-save hook: hash password before storing ──
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare plaintext password ──
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);
module.exports = User;
