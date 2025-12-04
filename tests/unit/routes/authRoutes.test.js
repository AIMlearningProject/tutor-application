// Unit test for authRoutes OAuth callback
// This test mocks passport BEFORE loading the routes module

// Mock passport before any imports
const mockAuthenticate = jest.fn((strategy, options) => {
  return (req, res, next) => {
    if (options && options.failureRedirect) {
      // This is the callback route - simulate success
      req.user = { _id: 'test-user-id', name: 'Test', email: 'test@example.com' };
      next(); // Call next to proceed to the success callback
    } else {
      // Initial auth route
      res.redirect('/mock-google-auth');
    }
  };
});

jest.mock('passport', () => ({
  authenticate: mockAuthenticate,
}));

const express = require('express');
const request = require('supertest');

describe('AuthRoutes Unit Tests', () => {
  let app;

  beforeAll(() => {
    // Load routes AFTER passport is mocked
    const authRoutes = require('../../../src/routes/authRoutes');

    app = express();
    app.use('/auth', authRoutes);
  });

  test('should redirect to /tutor on successful OAuth callback', async () => {
    const response = await request(app).get('/auth/google/callback');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/tutor');
  });

  test('should call passport.authenticate with google strategy', async () => {
    await request(app).get('/auth/google/callback');

    expect(mockAuthenticate).toHaveBeenCalledWith(
      'google',
      expect.objectContaining({ failureRedirect: '/' }),
    );
  });
});
