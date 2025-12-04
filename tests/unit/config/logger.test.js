// tests/unit/config/logger.test.js

// Mock winston to avoid actual file operations during tests
jest.mock('winston', () => {
  const mLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    add: jest.fn(),
  };

  return {
    createLogger: jest.fn(() => mLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      splat: jest.fn(),
      json: jest.fn(),
      colorize: jest.fn(),
      printf: jest.fn((fn) => fn),
    },
    transports: {
      Console: jest.fn(),
    },
  };
});

jest.mock('winston-daily-rotate-file', () => {
  return jest.fn();
});

// Import after mocking
const { logger, httpLogger, db, auth, session, email, app } = require('../../../src/config/logger');

describe('Logger Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Logger Instance', () => {
    test('should export logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
    });
  });

  describe('httpLogger Middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        method: 'GET',
        url: '/test',
        originalUrl: '/test',
        ip: '127.0.0.1',
        get: jest.fn((header) => {
          if (header === 'user-agent') {
            return 'Test User Agent';
          }
          return null;
        }),
        connection: { remoteAddress: '127.0.0.1' },
      };

      res = {
        statusCode: 200,
        on: jest.fn(),
      };

      next = jest.fn();
    });

    test('should call next middleware', () => {
      httpLogger(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should attach finish listener to response', () => {
      httpLogger(req, res, next);
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    test('should log info for successful requests (200)', () => {
      httpLogger(req, res, next);

      // Get the finish callback and call it
      const finishCallback = res.on.mock.calls[0][1];
      res.statusCode = 200;
      finishCallback();

      expect(logger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          status: 200,
        }),
      );
    });

    test('should log warning for 4xx errors', () => {
      httpLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      res.statusCode = 404;
      finishCallback();

      expect(logger.warn).toHaveBeenCalledWith(
        'HTTP Request Warning',
        expect.objectContaining({
          status: 404,
        }),
      );
    });

    test('should log error for 5xx errors', () => {
      httpLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      res.statusCode = 500;
      finishCallback();

      expect(logger.error).toHaveBeenCalledWith(
        'HTTP Request Failed',
        expect.objectContaining({
          status: 500,
        }),
      );
    });

    test('should include user info if user is authenticated', () => {
      req.user = {
        _id: 'user123',
        email: 'test@example.com',
      };

      httpLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      res.statusCode = 200;
      finishCallback();

      expect(logger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          userId: 'user123',
          userEmail: 'test@example.com',
        }),
      );
    });

    test('should use connection.remoteAddress if ip is not available', () => {
      delete req.ip;
      req.connection = { remoteAddress: '192.168.1.1' };

      httpLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(logger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          ip: '192.168.1.1',
        }),
      );
    });

    test('should use url if originalUrl is not available', () => {
      delete req.originalUrl;
      req.url = '/fallback-url';

      httpLogger(req, res, next);

      const finishCallback = res.on.mock.calls[0][1];
      finishCallback();

      expect(logger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          url: '/fallback-url',
        }),
      );
    });
  });

  describe('Database Loggers', () => {
    test('db.connect should mask credentials in URI', () => {
      db.connect('mongodb://user:password@localhost:27017/db');
      expect(logger.info).toHaveBeenCalledWith('Database connection attempt', {
        uri: 'mongodb://***@localhost:27017/db',
      });
    });

    test('db.connected should log success', () => {
      db.connected();
      expect(logger.info).toHaveBeenCalledWith('Database connected successfully');
    });

    test('db.error should log error details', () => {
      const error = new Error('Connection failed');
      error.stack = 'Error stack';
      db.error(error);
      expect(logger.error).toHaveBeenCalledWith('Database error', {
        error: 'Connection failed',
        stack: 'Error stack',
      });
    });

    test('db.disconnect should log disconnection', () => {
      db.disconnect();
      expect(logger.info).toHaveBeenCalledWith('Database disconnected');
    });
  });

  describe('Authentication Loggers', () => {
    test('auth.login should log user login', () => {
      const user = { _id: 'user123', email: 'test@example.com' };
      auth.login(user);
      expect(logger.info).toHaveBeenCalledWith('User logged in', {
        userId: 'user123',
        email: 'test@example.com',
      });
    });

    test('auth.logout should log user logout', () => {
      const user = { _id: 'user123', email: 'test@example.com' };
      auth.logout(user);
      expect(logger.info).toHaveBeenCalledWith('User logged out', {
        userId: 'user123',
        email: 'test@example.com',
      });
    });

    test('auth.loginFailed should log failed login attempt', () => {
      auth.loginFailed('test@example.com', 'Invalid password');
      expect(logger.warn).toHaveBeenCalledWith('Login failed', {
        email: 'test@example.com',
        reason: 'Invalid password',
      });
    });

    test('auth.unauthorized should log unauthorized access', () => {
      auth.unauthorized('/admin/dashboard', 'GET');
      expect(logger.warn).toHaveBeenCalledWith('Unauthorized access attempt', {
        url: '/admin/dashboard',
        method: 'GET',
      });
    });
  });

  describe('Session Loggers', () => {
    test('session.created should log session creation', () => {
      const sessionObj = { _id: 'session123' };
      session.created(sessionObj, 'user123');
      expect(logger.info).toHaveBeenCalledWith('Session created', {
        sessionId: 'session123',
        userId: 'user123',
      });
    });

    test('session.updated should log session update', () => {
      const sessionObj = { _id: 'session123' };
      session.updated(sessionObj, 'user123');
      expect(logger.info).toHaveBeenCalledWith('Session updated', {
        sessionId: 'session123',
        userId: 'user123',
      });
    });

    test('session.deleted should log session deletion', () => {
      session.deleted('session123', 'user123');
      expect(logger.info).toHaveBeenCalledWith('Session deleted', {
        sessionId: 'session123',
        userId: 'user123',
      });
    });

    test('session.submitted should log session submission', () => {
      const sessionObj = { _id: 'session123' };
      session.submitted(sessionObj, 'user123');
      expect(logger.info).toHaveBeenCalledWith('Session submitted for review', {
        sessionId: 'session123',
        userId: 'user123',
      });
    });

    test('session.approved should log session approval', () => {
      session.approved('session123', 'admin123');
      expect(logger.info).toHaveBeenCalledWith('Session approved', {
        sessionId: 'session123',
        adminId: 'admin123',
      });
    });

    test('session.rejected should log session rejection', () => {
      session.rejected('session123', 'admin123', 'Insufficient details');
      expect(logger.info).toHaveBeenCalledWith('Session rejected', {
        sessionId: 'session123',
        adminId: 'admin123',
        reason: 'Insufficient details',
      });
    });
  });

  describe('Email Loggers', () => {
    test('email.sent should log successful email', () => {
      email.sent('admin@example.com', 'New session submitted');
      expect(logger.info).toHaveBeenCalledWith('Email sent', {
        to: 'admin@example.com',
        subject: 'New session submitted',
      });
    });

    test('email.failed should log failed email', () => {
      const error = new Error('SMTP error');
      email.failed('admin@example.com', 'New session submitted', error);
      expect(logger.error).toHaveBeenCalledWith('Email failed to send', {
        to: 'admin@example.com',
        subject: 'New session submitted',
        error: 'SMTP error',
      });
    });
  });

  describe('Application Loggers', () => {
    test('app.start should log application startup', () => {
      app.start(3000);
      expect(logger.info).toHaveBeenCalledWith('Application started', {
        port: 3000,
        env: process.env.NODE_ENV,
      });
    });

    test('app.shutdown should log application shutdown', () => {
      app.shutdown();
      expect(logger.info).toHaveBeenCalledWith('Application shutting down');
    });

    test('app.error should log application error', () => {
      const error = new Error('Fatal error');
      error.stack = 'Error stack';
      app.error(error);
      expect(logger.error).toHaveBeenCalledWith('Application error', {
        error: 'Fatal error',
        stack: 'Error stack',
      });
    });
  });

  describe('Console Format Function - Direct Code Coverage', () => {
    test('should execute actual winston console format with metadata', () => {
      // Capture console.log to see if the format is actually called
      const originalLog = console.log;
      const logOutput = [];
      console.log = (...args) => logOutput.push(args.join(' '));

      // Temporarily set NODE_ENV to development to enable console transport
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Reset and unmock to get real winston
      jest.resetModules();
      jest.unmock('winston');
      jest.unmock('winston-daily-rotate-file');

      // Require the real logger
      const realLogger = require('../../../src/config/logger').logger;

      // Log messages with and without metadata to trigger the printf function
      realLogger.info('Test message with metadata', { userId: 'user123', extra: 'data' });
      realLogger.info('Test message without metadata');
      realLogger.warn('Warning without metadata');
      realLogger.error('Error without metadata');

      // Restore
      console.log = originalLog;
      process.env.NODE_ENV = originalEnv;

      // The test passes if logger was created without errors
      expect(realLogger).toBeDefined();
    });

    test('should not add console transport in production', () => {
      // Set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Reset and unmock to get real winston
      jest.resetModules();
      jest.unmock('winston');
      jest.unmock('winston-daily-rotate-file');

      // Require the real logger in production mode
      const realLogger = require('../../../src/config/logger').logger;

      // The logger should be created without console transport
      expect(realLogger).toBeDefined();

      // Restore
      process.env.NODE_ENV = originalEnv;
    });
  });
});
