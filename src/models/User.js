// src/models/User.js
const mongoose = require('mongoose');

// Define the User schema according to the software plan
const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['tutor', 'admin'],
    default: 'tutor',
    required: true,
  },
  language_preference: {
    type: String,
    enum: ['fi', 'en'],
    default: 'en',
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Update the updated_at timestamp before saving
userSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
