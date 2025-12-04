// tests/unit/models/TutorSession.test.js
// Comprehensive tests for TutorSession model

const mongoose = require('mongoose');
const TutorSession = require('../../../src/models/TutorSession');
const User = require('../../../src/models/User');

require('../../setup');

describe('TutorSession Model Tests', () => {
  let testUser;

  beforeEach(async () => {
    // Create a test user for foreign key reference
    testUser = await User.create({
      googleId: 'test_google_id',
      name: 'Test Tutor',
      email: 'testtutor@example.com',
      role: 'tutor',
    });
  });

  describe('Schema Validation', () => {
    test('should create a valid session successfully', async () => {
      const validSession = {
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date('2024-01-15'),
        location: 'Online',
        description: 'Helped student with mathematics homework problems',
        hours: 2.5,
        status: 'draft',
      };

      const session = new TutorSession(validSession);
      const savedSession = await session.save();

      expect(savedSession._id).toBeDefined();
      expect(savedSession.user_id.toString()).toBe(testUser._id.toString());
      expect(savedSession.tutorName).toBe(validSession.tutorName);
      expect(savedSession.hours).toBe(validSession.hours);
      expect(savedSession.status).toBe(validSession.status);
    });

    test('should create session with default status as draft', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Room 101',
        description: 'Biology tutoring session on cell division',
        hours: 1.5,
      });

      const savedSession = await session.save();
      expect(savedSession.status).toBe('draft');
    });

    test('should fail without required user_id', async () => {
      const session = new TutorSession({
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Online',
        description: 'Test session',
        hours: 1,
      });

      await expect(session.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('should fail without required tutorName', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Online',
        description: 'Test session',
        hours: 1,
      });

      await expect(session.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('should fail without required date', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        location: 'Online',
        description: 'Test session',
        hours: 1,
      });

      await expect(session.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('should fail without required location', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        description: 'Test session',
        hours: 1,
      });

      await expect(session.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('should fail without required description', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Online',
        hours: 1,
      });

      await expect(session.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('should fail without required hours', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Online',
        description: 'Test session',
      });

      await expect(session.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('should fail with hours less than 0.5', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Online',
        description: 'Test session',
        hours: 0.3,
      });

      await expect(session.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('should accept hours of exactly 0.5', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Online',
        description: 'Quick tutoring session',
        hours: 0.5,
      });

      const savedSession = await session.save();
      expect(savedSession.hours).toBe(0.5);
    });

    test('should trim location whitespace', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: '  Room 202  ',
        description: 'Test session',
        hours: 1,
      });

      const savedSession = await session.save();
      expect(savedSession.location).toBe('Room 202');
    });

    test('should trim description whitespace', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Online',
        description: '  Test description  ',
        hours: 1,
      });

      const savedSession = await session.save();
      expect(savedSession.description).toBe('Test description');
    });

    test('should only accept valid status values', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Online',
        description: 'Test session',
        hours: 1,
        status: 'invalid_status',
      });

      await expect(session.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    test('should accept all valid status values', async () => {
      const statuses = ['draft', 'submitted', 'approved', 'rejected'];

      for (const status of statuses) {
        const session = new TutorSession({
          user_id: testUser._id,
          tutorName: 'Test Tutor',
          tutorEmail: `tutor_${status}@example.com`,
          date: new Date(),
          location: 'Online',
          description: `Session with status ${status}`,
          hours: 1,
          status: status,
        });

        const savedSession = await session.save();
        expect(savedSession.status).toBe(status);
      }
    });
  });

  describe('Model Hooks', () => {
    test('should set submitted_at when status changes to submitted', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Online',
        description: 'Test session',
        hours: 1,
        status: 'draft',
      });

      const savedSession = await session.save();
      expect(savedSession.submitted_at).toBeNull();

      savedSession.status = 'submitted';
      const updatedSession = await savedSession.save();

      expect(updatedSession.submitted_at).toBeDefined();
      expect(updatedSession.submitted_at).toBeInstanceOf(Date);
    });

    test('should set reviewed_at when status changes to approved', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Online',
        description: 'Test session',
        hours: 1,
        status: 'submitted',
      });

      const savedSession = await session.save();
      expect(savedSession.reviewed_at).toBeNull();

      savedSession.status = 'approved';
      const updatedSession = await savedSession.save();

      expect(updatedSession.reviewed_at).toBeDefined();
      expect(updatedSession.reviewed_at).toBeInstanceOf(Date);
    });

    test('should set reviewed_at when status changes to rejected', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Online',
        description: 'Test session',
        hours: 1,
        status: 'submitted',
      });

      const savedSession = await session.save();
      savedSession.status = 'rejected';
      const updatedSession = await savedSession.save();

      expect(updatedSession.reviewed_at).toBeDefined();
      expect(updatedSession.reviewed_at).toBeInstanceOf(Date);
    });

    test('should update updated_at timestamp on save', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Online',
        description: 'Test session',
        hours: 1,
      });

      const savedSession = await session.save();
      const initialUpdatedAt = savedSession.updated_at;

      await new Promise((resolve) => setTimeout(resolve, 100));
      savedSession.hours = 2;
      const updatedSession = await savedSession.save();

      expect(updatedSession.updated_at.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    test('should not update submitted_at if already set', async () => {
      const session = new TutorSession({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Online',
        description: 'Test session',
        hours: 1,
        status: 'submitted',
      });

      const savedSession = await session.save();
      const initialSubmittedAt = savedSession.submitted_at;

      await new Promise((resolve) => setTimeout(resolve, 100));
      savedSession.description = 'Updated description';
      const updatedSession = await savedSession.save();

      expect(updatedSession.submitted_at.getTime()).toBe(initialSubmittedAt.getTime());
    });
  });

  describe('Population and References', () => {
    test('should populate user_id reference', async () => {
      const session = await TutorSession.create({
        user_id: testUser._id,
        tutorName: 'Test Tutor',
        tutorEmail: 'testtutor@example.com',
        date: new Date(),
        location: 'Online',
        description: 'Test session',
        hours: 1,
      });

      const populatedSession = await TutorSession.findById(session._id).populate('user_id');

      expect(populatedSession.user_id).toBeDefined();
      expect(populatedSession.user_id.name).toBe(testUser.name);
      expect(populatedSession.user_id.email).toBe(testUser.email);
    });
  });
});
