// tests/unit/models/AdminReviewLog.test.js
const mongoose = require('mongoose');
const AdminReviewLog = require('../../../src/models/AdminReviewLog');
const User = require('../../../src/models/User');
const TutorSession = require('../../../src/models/TutorSession');

require('../../setup');

describe('AdminReviewLog Model Tests', () => {
  let admin, tutor, session;

  beforeEach(async () => {
    admin = await User.create({
      googleId: 'admin_google',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
    });

    tutor = await User.create({
      googleId: 'tutor_google',
      name: 'Tutor User',
      email: 'tutor@example.com',
      role: 'tutor',
    });

    session = await TutorSession.create({
      user_id: tutor._id,
      tutorName: tutor.name,
      tutorEmail: tutor.email,
      date: new Date(),
      location: 'Online',
      description: 'Test session',
      hours: 1,
      status: 'submitted',
    });
  });

  describe('Schema Validation', () => {
    test('should create a valid review log successfully', async () => {
      const log = new AdminReviewLog({
        admin_id: admin._id,
        entry_id: session._id,
        action: 'approved',
        note: 'Good work',
        admin_name: admin.name,
        admin_email: admin.email,
      });

      const savedLog = await log.save();
      expect(savedLog._id).toBeDefined();
      expect(savedLog.action).toBe('approved');
      expect(savedLog.note).toBe('Good work');
    });

    test('should create log with timestamp automatically', async () => {
      const log = new AdminReviewLog({
        admin_id: admin._id,
        entry_id: session._id,
        action: 'rejected',
        admin_name: admin.name,
        admin_email: admin.email,
      });

      const savedLog = await log.save();
      expect(savedLog.timestamp).toBeDefined();
      expect(savedLog.timestamp).toBeInstanceOf(Date);
    });

    test('should fail without required admin_id', async () => {
      const log = new AdminReviewLog({
        entry_id: session._id,
        action: 'approved',
        admin_name: 'Admin',
        admin_email: 'admin@example.com',
      });

      await expect(log.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('should fail without required entry_id', async () => {
      const log = new AdminReviewLog({
        admin_id: admin._id,
        action: 'approved',
        admin_name: admin.name,
        admin_email: admin.email,
      });

      await expect(log.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('should fail without required action', async () => {
      const log = new AdminReviewLog({
        admin_id: admin._id,
        entry_id: session._id,
        admin_name: admin.name,
        admin_email: admin.email,
      });

      await expect(log.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('should only accept approved or rejected as action', async () => {
      const log = new AdminReviewLog({
        admin_id: admin._id,
        entry_id: session._id,
        action: 'invalid',
        admin_name: admin.name,
        admin_email: admin.email,
      });

      await expect(log.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('should trim note whitespace', async () => {
      const log = new AdminReviewLog({
        admin_id: admin._id,
        entry_id: session._id,
        action: 'approved',
        note: '  Good work  ',
        admin_name: admin.name,
        admin_email: admin.email,
      });

      const savedLog = await log.save();
      expect(savedLog.note).toBe('Good work');
    });
  });
});
