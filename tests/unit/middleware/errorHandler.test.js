const {
  AppError,
  catchAsync,
  notFoundHandler,
  errorHandler,
} = require('../../../src/middleware/errorHandler');

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      originalUrl: '/test',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      render: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });
  describe('AppError', () => {
    it('should create operational error with correct properties', () => {
      const error = new AppError('Test error', 400);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
    });

    it('should set status to error for 500 codes', () => {
      const error = new AppError('Server error', 500);

      expect(error.status).toBe('error');
    });

    it('should allow setting non-operational errors', () => {
      const error = new AppError('Programming error', 500, false);

      expect(error.isOperational).toBe(false);
    });
  });

  describe('catchAsync', () => {
    it('should catch async errors and pass to next', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = catchAsync(asyncFn);

      const req = {};
      const res = {};
      const next = jest.fn();

      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should not call next if async function succeeds', async () => {
      const asyncFn = jest.fn().mockResolvedValue(undefined);
      const wrappedFn = catchAsync(asyncFn);

      const req = {};
      const res = {};
      const next = jest.fn();

      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 error with correct URL', () => {
      const testReq = {
        originalUrl: '/api/nonexistent',
      };
      const testRes = {};
      const testNext = jest.fn();

      notFoundHandler(testReq, testRes, testNext);

      expect(testNext).toHaveBeenCalled();
      const error = testNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('/api/nonexistent');
    });
  });

  describe('errorHandler', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    describe('Development Mode', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      it('should send detailed error for API requests', () => {
        req.originalUrl = '/api/test';
        const error = new AppError('Test error', 400);

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          status: 'fail',
          error: expect.any(Object),
          message: 'Test error',
          stack: expect.any(String),
        });
      });

      it('should render error page for non-API requests', () => {
        req.originalUrl = '/dashboard';
        const error = new AppError('Page error', 404);

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.render).toHaveBeenCalledWith('error', {
          title: 'Something went wrong!',
          message: 'Page error',
          error: expect.any(Object),
        });
      });

      it('should set default statusCode if not provided', () => {
        const error = new Error('Generic error');
        req.originalUrl = '/api/test';

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
      });
    });

    describe('Production Mode', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      it('should send operational error details for API', () => {
        req.originalUrl = '/api/test';
        const error = new AppError('Operational error', 400);

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          status: 'fail',
          message: 'Operational error',
        });
      });

      it('should hide non-operational error details for API', () => {
        req.originalUrl = '/api/test';
        const error = new AppError('Programming error', 500, false);

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          status: 'error',
          message: 'Something went wrong',
        });
      });

      it('should render operational error page', () => {
        req.originalUrl = '/dashboard';
        const error = new AppError('User error', 400);

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.render).toHaveBeenCalledWith('error', {
          title: 'Something went wrong!',
          message: 'User error',
        });
      });

      it('should render generic error page for non-operational errors', () => {
        req.originalUrl = '/dashboard';
        const error = new AppError('System error', 500, false);

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.render).toHaveBeenCalledWith('error', {
          title: 'Something went wrong!',
          message: 'Please try again later.',
        });
      });

      it('should handle Mongoose CastError', () => {
        req.originalUrl = '/api/test';
        const error = {
          name: 'CastError',
          path: '_id',
          value: 'invalid-id',
          statusCode: 500,
        };

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          status: 'fail',
          message: 'Invalid _id: invalid-id',
        });
      });

      it('should handle Mongoose duplicate field error', () => {
        req.originalUrl = '/api/test';
        const error = {
          code: 11000,
          keyPattern: { email: 1 },
          statusCode: 500,
        };

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          status: 'fail',
          message: 'Duplicate field value for email. Please use another value.',
        });
      });

      it('should handle Mongoose validation error', () => {
        req.originalUrl = '/api/test';
        const error = {
          name: 'ValidationError',
          errors: {
            name: { message: 'Name is required' },
            email: { message: 'Email is invalid' },
          },
          statusCode: 500,
        };

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          status: 'fail',
          message: 'Invalid input data. Name is required. Email is invalid',
        });
      });

      it('should handle JWT error', () => {
        req.originalUrl = '/api/test';
        const error = {
          name: 'JsonWebTokenError',
          statusCode: 500,
        };

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          status: 'fail',
          message: 'Invalid token. Please log in again.',
        });
      });

      it('should handle JWT expired error', () => {
        req.originalUrl = '/api/test';
        const error = {
          name: 'TokenExpiredError',
          statusCode: 500,
        };

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          status: 'fail',
          message: 'Your token has expired. Please log in again.',
        });
      });
    });

    describe('Default Mode', () => {
      beforeEach(() => {
        delete process.env.NODE_ENV;
      });

      it('should default to development mode behavior', () => {
        req.originalUrl = '/api/test';
        const error = new AppError('Test error', 400);

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          status: 'fail',
          error: expect.any(Object),
          message: 'Test error',
          stack: expect.any(String),
        });
      });
    });
  });
});
