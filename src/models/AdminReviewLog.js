// src/models/AdminReviewLog.js
const mongoose = require('mongoose');

// Define the AdminReviewLog schema for audit trails according to the software plan
const adminReviewLogSchema = new mongoose.Schema({
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  entry_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TutorSession',
    required: true,
  },
  action: {
    type: String,
    enum: ['approved', 'rejected'],
    required: true,
  },
  note: {
    type: String,
    default: null,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  admin_name: {
    type: String,
    required: true,
  },
  admin_email: {
    type: String,
    required: true,
  },
});

// Index for efficient queries
adminReviewLogSchema.index({ entry_id: 1, timestamp: -1 });
adminReviewLogSchema.index({ admin_id: 1, timestamp: -1 });

const AdminReviewLog = mongoose.model('AdminReviewLog', adminReviewLogSchema);

module.exports = AdminReviewLog;
