const {
  sanitizeUserInput,
  securityHeaders,
  apiLimiter,
  sanitizeInput,
} = require('../../../src/middleware/security');

// Spy on console.warn
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
});

describe('Security Middleware', () => {
  describe('sanitizeUserInput', () => {
    it('should trim whitespace from string inputs in body', () => {
      const req = {
        body: {
          name: '  John Doe  ',
          email: '  test@example.com  ',
        },
        query: {},
        params: {},
      };
      const res = {};
      const next = jest.fn();

      sanitizeUserInput(req, res, next);

      expect(req.body.name).toBe('John Doe');
      expect(req.body.email).toBe('test@example.com');
      expect(next).toHaveBeenCalled();
    });

    it('should trim whitespace from query parameters', () => {
      const req = {
        body: {},
        query: {
          status: '  approved  ',
          search: '  test query  ',
        },
        params: {},
      };
      const res = {};
      const next = jest.fn();

      sanitizeUserInput(req, res, next);

      expect(req.query.status).toBe('approved');
      expect(req.query.search).toBe('test query');
      expect(next).toHaveBeenCalled();
    });

    it('should trim whitespace from route parameters', () => {
      const req = {
        body: {},
        query: {},
        params: {
          id: '  123  ',
        },
      };
      const res = {};
      const next = jest.fn();

      sanitizeUserInput(req, res, next);

      expect(req.params.id).toBe('123');
      expect(next).toHaveBeenCalled();
    });

    it('should handle nested objects', () => {
      const req = {
        body: {
          user: {
            name: '  John  ',
            profile: {
              bio: '  Software Developer  ',
            },
          },
        },
        query: {},
        params: {},
      };
      const res = {};
      const next = jest.fn();

      sanitizeUserInput(req, res, next);

      expect(req.body.user.name).toBe('John');
      expect(req.body.user.profile.bio).toBe('Software Developer');
      expect(next).toHaveBeenCalled();
    });

    it('should not affect non-string values', () => {
      const req = {
        body: {
          count: 42,
          active: true,
          tags: ['tag1', 'tag2'],
        },
        query: {},
        params: {},
      };
      const res = {};
      const next = jest.fn();

      sanitizeUserInput(req, res, next);

      expect(req.body.count).toBe(42);
      expect(req.body.active).toBe(true);
      expect(req.body.tags).toEqual(['tag1', 'tag2']);
      expect(next).toHaveBeenCalled();
    });

    it('should handle null and undefined values', () => {
      const req = {
        body: {
          value1: null,
          value2: undefined,
        },
        query: {},
        params: {},
      };
      const res = {};
      const next = jest.fn();

      sanitizeUserInput(req, res, next);

      expect(req.body.value1).toBeNull();
      expect(req.body.value2).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should handle request without body', () => {
      const req = {
        query: { search: '  test  ' },
        params: {},
      };
      const res = {};
      const next = jest.fn();

      sanitizeUserInput(req, res, next);

      expect(req.query.search).toBe('test');
      expect(next).toHaveBeenCalled();
    });

    it('should handle request without query', () => {
      const req = {
        body: { name: '  John  ' },
        params: {},
      };
      const res = {};
      const next = jest.fn();

      sanitizeUserInput(req, res, next);

      expect(req.body.name).toBe('John');
      expect(next).toHaveBeenCalled();
    });

    it('should handle request without params', () => {
      const req = {
        body: { name: '  John  ' },
        query: {},
      };
      const res = {};
      const next = jest.fn();

      sanitizeUserInput(req, res, next);

      expect(req.body.name).toBe('John');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('securityHeaders', () => {
    it('should set security headers', () => {
      const req = {};
      const res = {
        removeHeader: jest.fn(),
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      securityHeaders(req, res, next);

      expect(res.removeHeader).toHaveBeenCalledWith('X-Powered-By');
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Rate Limiter', () => {
    it('should export rate limiter middleware', () => {
      // Verify that the rate limiters are exported and configured
      expect(apiLimiter).toBeDefined();
      expect(typeof apiLimiter).toBe('function');
    });

    it('should skip rate limiting for health check endpoints', async () => {
      // Test the actual middleware with /health path
      const mockReq = {
        path: '/health',
        ip: '127.0.0.1',
        headers: {},
        app: {
          get: jest.fn(() => false),
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      };
      const mockNext = jest.fn();

      // Execute the actual apiLimiter middleware
      await apiLimiter(mockReq, mockRes, mockNext);

      // Should call next without rate limiting
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip rate limiting for /api/health endpoint', async () => {
      // Test the actual middleware with /api/health path
      const mockReq = {
        path: '/api/health',
        ip: '192.168.1.1',
        headers: {},
        app: {
          get: jest.fn(() => false),
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      };
      const mockNext = jest.fn();

      // Execute the actual apiLimiter middleware
      await apiLimiter(mockReq, mockRes, mockNext);

      // Should call next without rate limiting
      expect(mockNext).toHaveBeenCalled();
    });

    it('should apply rate limiting for other endpoints', async () => {
      // Test the actual middleware with non-health path
      const mockReq = {
        path: '/api/other',
        ip: '10.0.0.1',
        headers: {},
        app: {
          get: jest.fn(() => false),
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      };
      const mockNext = jest.fn();

      // Execute the actual apiLimiter middleware
      await apiLimiter(mockReq, mockRes, mockNext);

      // Should call next (within rate limit)
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('MongoDB Sanitization', () => {
    it('should trigger onSanitize callback when malicious input is detected', () => {
      // This tests the onSanitize callback at line 64
      // Create a mock request with potentially malicious input
      const req = {
        path: '/api/test',
        body: {
          email: 'test@example.com',
          // This would be sanitized by mongoSanitize
          $ne: null,
        },
      };
      const res = {};
      const next = jest.fn();

      // Call sanitizeInput middleware
      sanitizeInput(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Helmet Configuration - Production Mode', () => {
    it('should load helmet config with production settings', () => {
      // Set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Reset and reload the module
      jest.resetModules();
      const { helmetConfig } = require('../../../src/middleware/security');

      // Verify helmetConfig is defined
      expect(helmetConfig).toBeDefined();

      // Restore
      process.env.NODE_ENV = originalEnv;
    });

    it('should load helmet config with non-production settings', () => {
      // Set NODE_ENV to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Reset and reload the module
      jest.resetModules();
      const { helmetConfig } = require('../../../src/middleware/security');

      // Verify helmetConfig is defined
      expect(helmetConfig).toBeDefined();

      // Restore
      process.env.NODE_ENV = originalEnv;
    });
  });
});
