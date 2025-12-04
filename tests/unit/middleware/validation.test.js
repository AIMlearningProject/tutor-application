// tests/unit/middleware/validation.test.js
const { validateTutorSession, validateAdminReview } = require('../../../src/middleware/validation');

describe('Validation Middleware Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      session: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      redirect: jest.fn(),
    };
    next = jest.fn();
  });

  describe('validateTutorSession middleware', () => {
    test('should pass validation with valid data', () => {
      req.body = {
        date: '2024-01-15',
        location: 'Online',
        description: 'Helped student with math homework problems',
        hours: 2.5,
      };

      validateTutorSession(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.session.errors).toBeUndefined();
    });

    test('should fail with missing date', () => {
      req.body = {
        location: 'Online',
        description: 'Test description',
        hours: 1,
      };

      validateTutorSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining(['Date is required']),
      });
    });

    test('should fail with invalid date format', () => {
      req.body = {
        date: 'invalid-date',
        location: 'Online',
        description: 'Test description',
        hours: 1,
      };

      validateTutorSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining(['Invalid date format']),
      });
    });

    test('should fail with future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      req.body = {
        date: futureDate.toISOString().split('T')[0],
        location: 'Online',
        description: 'Test description',
        hours: 1,
      };

      validateTutorSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining(['Date cannot be in the future']),
      });
    });

    test('should fail with missing location', () => {
      req.body = {
        date: '2024-01-15',
        description: 'Test description',
        hours: 1,
      };

      validateTutorSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining(['Location is required']),
      });
    });

    test('should fail with location too short', () => {
      req.body = {
        date: '2024-01-15',
        location: 'A',
        description: 'Test description',
        hours: 1,
      };

      validateTutorSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining(['Location must be at least 2 characters']),
      });
    });

    test('should fail with location too long', () => {
      req.body = {
        date: '2024-01-15',
        location: 'A'.repeat(201),
        description: 'Test description',
        hours: 1,
      };

      validateTutorSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining(['Location must not exceed 200 characters']),
      });
    });

    test('should fail with missing description', () => {
      req.body = {
        date: '2024-01-15',
        location: 'Online',
        hours: 1,
      };

      validateTutorSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining(['Description is required']),
      });
    });

    test('should fail with description too short', () => {
      req.body = {
        date: '2024-01-15',
        location: 'Online',
        description: 'Short',
        hours: 1,
      };

      validateTutorSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining(['Description must be at least 10 characters']),
      });
    });

    test('should fail with description too long', () => {
      req.body = {
        date: '2024-01-15',
        location: 'Online',
        description: 'A'.repeat(2001),
        hours: 1,
      };

      validateTutorSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining(['Description must not exceed 2000 characters']),
      });
    });

    test('should fail with missing hours', () => {
      req.body = {
        date: '2024-01-15',
        location: 'Online',
        description: 'Valid description here',
      };

      validateTutorSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining(['Hours is required and must be a number']),
      });
    });

    test('should fail with non-numeric hours', () => {
      req.body = {
        date: '2024-01-15',
        location: 'Online',
        description: 'Valid description here',
        hours: 'invalid',
      };

      validateTutorSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining(['Hours is required and must be a number']),
      });
    });

    test('should fail with hours less than 0.5', () => {
      req.body = {
        date: '2024-01-15',
        location: 'Online',
        description: 'Valid description here',
        hours: 0.25,
      };

      validateTutorSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining(['Hours must be at least 0.5']),
      });
    });

    test('should fail with hours greater than 24', () => {
      req.body = {
        date: '2024-01-15',
        location: 'Online',
        description: 'Valid description here',
        hours: 25,
      };

      validateTutorSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining(['Hours cannot exceed 24']),
      });
    });

    test('should fail with hours not in 0.5 increments', () => {
      req.body = {
        date: '2024-01-15',
        location: 'Online',
        description: 'Valid description here',
        hours: 1.3,
      };

      validateTutorSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining([
          'Hours must be in increments of 0.5 (e.g., 0.5, 1.0, 1.5)',
        ]),
      });
    });

    test('should sanitize location and description', () => {
      req.body = {
        date: '2024-01-15',
        location: '  Online  ',
        description: '  Valid description here  ',
        hours: 1.5,
      };

      validateTutorSession(req, res, next);

      expect(req.body.location).toBe('Online');
      expect(req.body.description).toBe('Valid description here');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateAdminReview middleware', () => {
    test('should pass with valid approved action', () => {
      req.body = {
        action: 'approved',
        note: 'Good work',
      };

      validateAdminReview(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should pass with valid rejected action', () => {
      req.body = {
        action: 'rejected',
        note: 'Needs more detail',
      };

      validateAdminReview(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should fail with invalid action', () => {
      req.body = {
        action: 'invalid',
        note: 'Test',
      };

      validateAdminReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining([expect.stringContaining('Invalid action')]),
      });
    });

    test('should fail with note too long', () => {
      req.body = {
        action: 'approved',
        note: 'A'.repeat(1001),
      };

      validateAdminReview(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining(['Review note must not exceed 1000 characters']),
      });
    });

    test('should sanitize note', () => {
      req.body = {
        action: 'approved',
        note: '  Good work  ',
      };

      validateAdminReview(req, res, next);

      expect(req.body.note).toBe('Good work');
      expect(next).toHaveBeenCalled();
    });

    test('should pass validation without note', () => {
      req.body = {
        action: 'approved',
      };

      validateAdminReview(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.note).toBeUndefined();
    });

    test('should pass validation with empty note', () => {
      req.body = {
        action: 'rejected',
        note: '',
      };

      validateAdminReview(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
