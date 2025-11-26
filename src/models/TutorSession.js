// src/models/TutorSession.js
const mongoose = require('mongoose');

// Define the schema for tutor sessions according to the software plan
const tutorSessionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tutorName: {
    type: String,
    required: true,
  },
  tutorEmail: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  hours: {
    type: Number, // in hours (replaces 'duration')
    required: true,
    min: 0.5,
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'draft',
    required: true,
  },
  submitted_at: {
    type: Date,
    default: null,
  },
  reviewed_at: {
    type: Date,
    default: null,
  },
  review_note: {
    type: String,
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  }
});

// Update the updated_at timestamp before saving
tutorSessionSchema.pre('save', function(next) {
  this.updated_at = Date.now();

  // Set submitted_at if status changes to submitted
  if (this.isModified('status') && this.status === 'submitted' && !this.submitted_at) {
    this.submitted_at = Date.now();
  }

  // Set reviewed_at if status changes to approved or rejected
  if (this.isModified('status') && (this.status === 'approved' || this.status === 'rejected') && !this.reviewed_at) {
    this.reviewed_at = Date.now();
  }

  next();
});

// Index for efficient queries
tutorSessionSchema.index({ user_id: 1, status: 1, date: -1 });

const TutorSession = mongoose.model('TutorSession', tutorSessionSchema);

module.exports = TutorSession;
