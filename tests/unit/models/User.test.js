// tests/unit/models/User.test.js
// Comprehensive tests for User model

const mongoose = require('mongoose');
const User = require('../../../src/models/User');

// Load test setup
require('../../setup');

describe('User Model Tests', () => {
  describe('User Schema Validation', () => {
    test('should create a valid user successfully', async () => {
      const validUser = {
        googleId: 'google123456',
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'tutor',
        language_preference: 'en'
      };

      const user = new User(validUser);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.googleId).toBe(validUser.googleId);
      expect(savedUser.name).toBe(validUser.name);
      expect(savedUser.email).toBe(validUser.email);
      expect(savedUser.role).toBe(validUser.role);
      expect(savedUser.language_preference).toBe(validUser.language_preference);
      expect(savedUser.created_at).toBeDefined();
      expect(savedUser.updated_at).toBeDefined();
    });

    test('should create user with default values', async () => {
      const minimalUser = {
        googleId: 'google789',
        name: 'Jane Smith',
        email: 'jane.smith@example.com'
      };

      const user = new User(minimalUser);
      const savedUser = await user.save();

      expect(savedUser.role).toBe('tutor'); // default role
      expect(savedUser.language_preference).toBe('en'); // default language
    });

    test('should fail to create user without required googleId', async () => {
      const userWithoutGoogleId = {
        name: 'Test User',
        email: 'test@example.com'
      };

      let error;
      try {
        const user = new User(userWithoutGoogleId);
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(error.errors.googleId).toBeDefined();
    });

    test('should fail to create user without required name', async () => {
      const userWithoutName = {
        googleId: 'google456',
        email: 'test@example.com'
      };

      let error;
      try {
        const user = new User(userWithoutName);
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(error.errors.name).toBeDefined();
    });

    test('should fail to create user without required email', async () => {
      const userWithoutEmail = {
        googleId: 'google789',
        name: 'Test User'
      };

      let error;
      try {
        const user = new User(userWithoutEmail);
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(error.errors.email).toBeDefined();
    });

    test('should enforce unique googleId', async () => {
      const user1 = new User({
        googleId: 'unique123',
        name: 'User One',
        email: 'user1@example.com'
      });
      await user1.save();

      const user2 = new User({
        googleId: 'unique123', // duplicate
        name: 'User Two',
        email: 'user2@example.com'
      });

      let error;
      try {
        await user2.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB duplicate key error code
    });

    test('should enforce unique email', async () => {
      const user1 = new User({
        googleId: 'google111',
        name: 'User One',
        email: 'same@example.com'
      });
      await user1.save();

      const user2 = new User({
        googleId: 'google222',
        name: 'User Two',
        email: 'same@example.com' // duplicate
      });

      let error;
      try {
        await user2.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000);
    });

    test('should convert email to lowercase', async () => {
      const user = new User({
        googleId: 'google333',
        name: 'Test User',
        email: 'TEST@EXAMPLE.COM'
      });

      const savedUser = await user.save();
      expect(savedUser.email).toBe('test@example.com');
    });

    test('should trim email whitespace', async () => {
      const user = new User({
        googleId: 'google444',
        name: 'Test User',
        email: '  test@example.com  '
      });

      const savedUser = await user.save();
      expect(savedUser.email).toBe('test@example.com');
    });

    test('should only accept valid role values', async () => {
      const userWithInvalidRole = {
        googleId: 'google555',
        name: 'Test User',
        email: 'test@example.com',
        role: 'invalid_role'
      };

      let error;
      try {
        const user = new User(userWithInvalidRole);
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    });

    test('should accept "tutor" as valid role', async () => {
      const user = new User({
        googleId: 'google666',
        name: 'Tutor User',
        email: 'tutor@example.com',
        role: 'tutor'
      });

      const savedUser = await user.save();
      expect(savedUser.role).toBe('tutor');
    });

    test('should accept "admin" as valid role', async () => {
      const user = new User({
        googleId: 'google777',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin'
      });

      const savedUser = await user.save();
      expect(savedUser.role).toBe('admin');
    });

    test('should only accept valid language values', async () => {
      const userWithInvalidLang = {
        googleId: 'google888',
        name: 'Test User',
        email: 'test@example.com',
        language_preference: 'invalid_lang'
      };

      let error;
      try {
        const user = new User(userWithInvalidLang);
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    });

    test('should accept "en" as valid language', async () => {
      const user = new User({
        googleId: 'google999',
        name: 'English User',
        email: 'english@example.com',
        language_preference: 'en'
      });

      const savedUser = await user.save();
      expect(savedUser.language_preference).toBe('en');
    });

    test('should accept "fi" as valid language', async () => {
      const user = new User({
        googleId: 'google000',
        name: 'Finnish User',
        email: 'finnish@example.com',
        language_preference: 'fi'
      });

      const savedUser = await user.save();
      expect(savedUser.language_preference).toBe('fi');
    });
  });

  describe('User Model Hooks', () => {
    test('should update updated_at timestamp on save', async () => {
      const user = new User({
        googleId: 'google_hook1',
        name: 'Hook Test',
        email: 'hook@example.com'
      });

      const savedUser = await user.save();
      const initialUpdatedAt = savedUser.updated_at;

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 100));
      savedUser.name = 'Updated Name';
      const updatedUser = await savedUser.save();

      expect(updatedUser.updated_at.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });

    test('should set created_at on first save', async () => {
      const user = new User({
        googleId: 'google_hook2',
        name: 'Created Test',
        email: 'created@example.com'
      });

      const savedUser = await user.save();
      expect(savedUser.created_at).toBeDefined();
      expect(savedUser.created_at).toBeInstanceOf(Date);
    });
  });
});
