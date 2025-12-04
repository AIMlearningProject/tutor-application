// tests/unit/middleware/auth.test.js
const {
  isAuthenticated,
  isAdmin,
  isTutor,
  attachUserRole,
} = require('../../../src/middleware/auth');

describe('Authentication Middleware Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
      locals: {},
    };
    next = jest.fn();
  });

  describe('isAuthenticated middleware', () => {
    test('should call next() when user is authenticated', () => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);

      isAuthenticated(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    test('should redirect to / when user is not authenticated', () => {
      req.isAuthenticated = jest.fn().mockReturnValue(false);

      isAuthenticated(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('isAdmin middleware', () => {
    test('should call next() when user is admin', () => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { role: 'admin', name: 'Admin User' };

      isAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should redirect when user is not admin', () => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { role: 'tutor', name: 'Tutor User' };

      isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(302);
      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(next).not.toHaveBeenCalled();
    });

    test('should redirect when user is not authenticated', () => {
      req.isAuthenticated = jest.fn().mockReturnValue(false);

      isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(302);
      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('isTutor middleware', () => {
    test('should call next() when user is tutor', () => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { role: 'tutor', name: 'Tutor User' };

      isTutor(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should call next() when user is admin (admins can access tutor routes)', () => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { role: 'admin', name: 'Admin User' };

      isTutor(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should redirect when user is not authenticated', () => {
      req.isAuthenticated = jest.fn().mockReturnValue(false);

      isTutor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(302);
      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('attachUserRole middleware', () => {
    test('should attach admin role info when user is admin', () => {
      req.user = { role: 'admin', name: 'Admin' };

      attachUserRole(req, res, next);

      expect(res.locals.isAdmin).toBe(true);
      expect(res.locals.isTutor).toBe(true); // Admins are also tutors
      expect(res.locals.user).toBe(req.user);
      expect(next).toHaveBeenCalled();
    });

    test('should attach tutor role info when user is tutor', () => {
      req.user = { role: 'tutor', name: 'Tutor' };

      attachUserRole(req, res, next);

      expect(res.locals.isAdmin).toBe(false);
      expect(res.locals.isTutor).toBe(true);
      expect(res.locals.user).toBe(req.user);
      expect(next).toHaveBeenCalled();
    });

    test('should set false for all roles when no user', () => {
      req.user = null;

      attachUserRole(req, res, next);

      expect(res.locals.isAdmin).toBe(false);
      expect(res.locals.isTutor).toBe(false);
      expect(res.locals.user).toBe(null);
      expect(next).toHaveBeenCalled();
    });
  });
});
