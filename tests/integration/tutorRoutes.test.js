const request = require('supertest');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import models
const User = require('../../src/models/User');
const TutorSession = require('../../src/models/TutorSession');

// Import routes
const tutorRoutes = require('../../src/routes/tutorRoutes');

// Mock email service
jest.mock('../../src/emailService', () => ({
  sendEmailToAdmin: jest.fn().mockResolvedValue(true),
}));

describe('Tutor Routes Integration Tests', () => {
  let app;
  let mongoServer;
  let testUser;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Set up Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
      }),
    );

    // Set up view engine for rendering
    app.set('view engine', 'ejs');
    app.set('views', require('path').join(__dirname, '../../src/views'));

    // Middleware to simulate authenticated user
    app.use((req, res, next) => {
      if (req.headers['x-test-user-id']) {
        User.findById(req.headers['x-test-user-id'])
          .then((user) => {
            req.user = user;
            req.isAuthenticated = () => true;
            next();
          })
          .catch(next);
      } else {
        req.isAuthenticated = () => false;
        next();
      }
    });

    app.use('/tutor', tutorRoutes);

    // Error handler
    app.use((err, req, res, _next) => {
      res.status(err.statusCode || 500).json({ error: err.message });
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Create test user before each test
    testUser = await User.create({
      googleId: 'test-google-id-123',
      name: 'Test Tutor',
      email: 'tutor@example.com',
      role: 'tutor',
    });
  });

  afterEach(async () => {
    await TutorSession.deleteMany({});
    await User.deleteMany({});
  });

  describe('GET /tutor', () => {
    it('should redirect unauthenticated users to root', async () => {
      const response = await request(app).get('/tutor');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/');
    });

    it('should render tutor dashboard for authenticated tutor', async () => {
      const response = await request(app).get('/tutor').set('x-test-user-id', testUser._id);

      expect(response.status).toBe(200);
    });

    it('should display tutor sessions for authenticated user', async () => {
      // Create test sessions
      await TutorSession.create({
        user_id: testUser._id,
        tutorName: testUser.name,
        tutorEmail: testUser.email,
        date: new Date('2024-01-15'),
        location: 'Test Location',
        description: 'Test session description',
        hours: 2,
        status: 'draft',
      });

      const response = await request(app).get('/tutor').set('x-test-user-id', testUser._id);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /tutor/session', () => {
    it('should create a new draft session with valid data', async () => {
      const sessionData = {
        date: '2024-01-15',
        location: 'Test Location',
        description: 'This is a test session with enough characters',
        hours: 2.5,
      };

      const response = await request(app)
        .post('/tutor/session')
        .send(sessionData)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/tutor');

      // Verify session was created in database
      const sessions = await TutorSession.find({ user_id: testUser._id });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].status).toBe('draft');
      expect(sessions[0].location).toBe('Test Location');
    });

    it('should reject session with invalid data', async () => {
      const invalidData = {
        date: '2024-01-15',
        location: 'A',
        description: 'Short',
        hours: 0.3,
      };

      const response = await request(app)
        .post('/tutor/session')
        .send(invalidData)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(400);

      // Verify no session was created
      const sessions = await TutorSession.find({ user_id: testUser._id });
      expect(sessions).toHaveLength(0);
    });

    it('should reject session with date in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const sessionData = {
        date: futureDate.toISOString().split('T')[0],
        location: 'Test Location',
        description: 'This is a test session with enough characters',
        hours: 2,
      };

      const response = await request(app)
        .post('/tutor/session')
        .send(sessionData)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const sessionData = {
        date: '2024-01-15',
        location: 'Test Location',
        description: 'This is a test session with enough characters',
        hours: 2,
      };

      const response = await request(app).post('/tutor/session').send(sessionData);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/');
    });
  });

  describe('POST /tutor/session/:id/submit', () => {
    it('should submit a draft session for review', async () => {
      const session = await TutorSession.create({
        user_id: testUser._id,
        tutorName: testUser.name,
        tutorEmail: testUser.email,
        date: new Date('2024-01-15'),
        location: 'Test Location',
        description: 'Test session description',
        hours: 2,
        status: 'draft',
      });

      const response = await request(app)
        .post(`/tutor/session/${session._id}/submit`)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(302);

      // Verify session status was updated
      const updatedSession = await TutorSession.findById(session._id);
      expect(updatedSession.status).toBe('submitted');
    });

    it('should submit session even when email fails', async () => {
      const { sendEmailToAdmin } = require('../../src/emailService');
      sendEmailToAdmin.mockRejectedValueOnce(new Error('Email service error'));

      const session = await TutorSession.create({
        user_id: testUser._id,
        tutorName: testUser.name,
        tutorEmail: testUser.email,
        date: new Date('2024-01-15'),
        location: 'Test Location',
        description: 'Test session description',
        hours: 2,
        status: 'draft',
      });

      const response = await request(app)
        .post(`/tutor/session/${session._id}/submit`)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(302);

      // Verify session status was updated even though email failed
      const updatedSession = await TutorSession.findById(session._id);
      expect(updatedSession.status).toBe('submitted');

      // Reset mock
      sendEmailToAdmin.mockResolvedValue(true);
    });

    it('should not submit session that is not in draft status', async () => {
      const session = await TutorSession.create({
        user_id: testUser._id,
        tutorName: testUser.name,
        tutorEmail: testUser.email,
        date: new Date('2024-01-15'),
        location: 'Test Location',
        description: 'Test session description',
        hours: 2,
        status: 'submitted',
      });

      const response = await request(app)
        .post(`/tutor/session/${session._id}/submit`)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(400);
    });

    it("should not allow submitting another user's session", async () => {
      const otherUser = await User.create({
        googleId: 'other-google-id',
        name: 'Other User',
        email: 'other@example.com',
        role: 'tutor',
      });

      const session = await TutorSession.create({
        user_id: otherUser._id,
        tutorName: otherUser.name,
        tutorEmail: otherUser.email,
        date: new Date('2024-01-15'),
        location: 'Test Location',
        description: 'Test session description',
        hours: 2,
        status: 'draft',
      });

      const response = await request(app)
        .post(`/tutor/session/${session._id}/submit`)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /tutor/session/:id/update', () => {
    it('should update a draft session', async () => {
      const session = await TutorSession.create({
        user_id: testUser._id,
        tutorName: testUser.name,
        tutorEmail: testUser.email,
        date: new Date('2024-01-15'),
        location: 'Original Location',
        description: 'Original description that is long enough',
        hours: 2,
        status: 'draft',
      });

      const updateData = {
        date: '2024-01-16',
        location: 'Updated Location',
        description: 'Updated description that is also long enough',
        hours: 3,
      };

      const response = await request(app)
        .post(`/tutor/session/${session._id}/update`)
        .send(updateData)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(302);

      // Verify session was updated
      const updatedSession = await TutorSession.findById(session._id);
      expect(updatedSession.location).toBe('Updated Location');
      expect(updatedSession.hours).toBe(3);
    });

    it('should not update submitted session', async () => {
      const session = await TutorSession.create({
        user_id: testUser._id,
        tutorName: testUser.name,
        tutorEmail: testUser.email,
        date: new Date('2024-01-15'),
        location: 'Original Location',
        description: 'Original description that is long enough',
        hours: 2,
        status: 'submitted',
      });

      const updateData = {
        date: '2024-01-16',
        location: 'Updated Location',
        description: 'Updated description that is also long enough',
        hours: 3,
      };

      const response = await request(app)
        .post(`/tutor/session/${session._id}/update`)
        .send(updateData)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Session not found or cannot be edited');
    });

    it('should not update non-existent session', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = {
        date: '2024-01-16',
        location: 'Updated Location',
        description: 'Updated description that is also long enough',
        hours: 3,
      };

      const response = await request(app)
        .post(`/tutor/session/${fakeId}/update`)
        .send(updateData)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Session not found or cannot be edited');
    });
  });

  describe('POST /tutor/session/:id/delete', () => {
    it('should delete a draft session', async () => {
      const session = await TutorSession.create({
        user_id: testUser._id,
        tutorName: testUser.name,
        tutorEmail: testUser.email,
        date: new Date('2024-01-15'),
        location: 'Test Location',
        description: 'Test session description',
        hours: 2,
        status: 'draft',
      });

      const response = await request(app)
        .post(`/tutor/session/${session._id}/delete`)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(302);

      // Verify session was deleted
      const deletedSession = await TutorSession.findById(session._id);
      expect(deletedSession).toBeNull();
    });

    it('should not delete submitted session', async () => {
      const session = await TutorSession.create({
        user_id: testUser._id,
        tutorName: testUser.name,
        tutorEmail: testUser.email,
        date: new Date('2024-01-15'),
        location: 'Test Location',
        description: 'Test session description',
        hours: 2,
        status: 'submitted',
      });

      const response = await request(app)
        .post(`/tutor/session/${session._id}/delete`)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(400);
    });

    it("should not allow deleting another user's session", async () => {
      const otherUser = await User.create({
        googleId: 'other-google-id',
        name: 'Other User',
        email: 'other@example.com',
        role: 'tutor',
      });

      const session = await TutorSession.create({
        user_id: otherUser._id,
        tutorName: otherUser.name,
        tutorEmail: otherUser.email,
        date: new Date('2024-01-15'),
        location: 'Test Location',
        description: 'Test session description',
        hours: 2,
        status: 'draft',
      });

      const response = await request(app)
        .post(`/tutor/session/${session._id}/delete`)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors when retrieving sessions', async () => {
      // Mock TutorSession.find to throw an error
      jest.spyOn(TutorSession, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app).get('/tutor').set('x-test-user-id', testUser._id);

      expect(response.status).toBe(200); // Should still render with empty sessions
      TutorSession.find.mockRestore();
    });

    it('should handle database errors when creating session', async () => {
      // Mock save to throw an error
      jest.spyOn(TutorSession.prototype, 'save').mockImplementationOnce(() => {
        throw new Error('Database save error');
      });

      const sessionData = {
        date: '2024-01-15',
        location: 'Test Location',
        description: 'This is a test session with enough characters',
        hours: 2,
      };

      const response = await request(app)
        .post('/tutor/session')
        .send(sessionData)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(302); // Should still redirect
      TutorSession.prototype.save.mockRestore();
    });

    it('should handle database errors when submitting session', async () => {
      const session = await TutorSession.create({
        user_id: testUser._id,
        tutorName: testUser.name,
        tutorEmail: testUser.email,
        date: new Date('2024-01-15'),
        location: 'Test Location',
        description: 'Test session description',
        hours: 2,
        status: 'draft',
      });

      // Mock findOne to throw an error
      jest.spyOn(TutorSession, 'findOne').mockImplementationOnce(() => {
        throw new Error('Database query error');
      });

      const response = await request(app)
        .post(`/tutor/session/${session._id}/submit`)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(302); // Should redirect with error
      TutorSession.findOne.mockRestore();
    });

    it('should handle database errors when updating session', async () => {
      const session = await TutorSession.create({
        user_id: testUser._id,
        tutorName: testUser.name,
        tutorEmail: testUser.email,
        date: new Date('2024-01-15'),
        location: 'Original Location',
        description: 'Original description that is long enough',
        hours: 2,
        status: 'draft',
      });

      // Mock findOne to throw an error
      jest.spyOn(TutorSession, 'findOne').mockImplementationOnce(() => {
        throw new Error('Database query error');
      });

      const updateData = {
        date: '2024-01-16',
        location: 'Updated Location',
        description: 'Updated description that is also long enough',
        hours: 3,
      };

      const response = await request(app)
        .post(`/tutor/session/${session._id}/update`)
        .send(updateData)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(302); // Should redirect with error
      TutorSession.findOne.mockRestore();
    });

    it('should handle database errors when deleting session', async () => {
      const session = await TutorSession.create({
        user_id: testUser._id,
        tutorName: testUser.name,
        tutorEmail: testUser.email,
        date: new Date('2024-01-15'),
        location: 'Test Location',
        description: 'Test session description',
        hours: 2,
        status: 'draft',
      });

      // Mock findOne to throw an error
      jest.spyOn(TutorSession, 'findOne').mockImplementationOnce(() => {
        throw new Error('Database query error');
      });

      const response = await request(app)
        .post(`/tutor/session/${session._id}/delete`)
        .set('x-test-user-id', testUser._id);

      expect(response.status).toBe(302); // Should redirect with error
      TutorSession.findOne.mockRestore();
    });
  });
});
