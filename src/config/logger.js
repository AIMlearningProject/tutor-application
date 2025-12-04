const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const logDir = process.env.LOG_FILE_PATH || './logs';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Console format with colors for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  }),
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'tutor-application' },
  transports: [
    // Write all logs to daily rotating files
    new DailyRotateFile({
      filename: path.join(logDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d', // Keep logs for 14 days
      level: 'info',
    }),
    // Separate file for errors
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d', // Keep error logs for 30 days
      level: 'error',
    }),
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
}

// Create HTTP request logger middleware
const httpLogger = (req, res, next) => {
  const start = Date.now();

  // Log after response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    if (req.user) {
      logData.userId = req.user._id;
      logData.userEmail = req.user.email;
    }

    if (res.statusCode >= 500) {
      logger.error('HTTP Request Failed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request Warning', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

// Helper methods for common logging patterns
const loggers = {
  // Database operations
  db: {
    connect: (uri) =>
      logger.info('Database connection attempt', { uri: uri.replace(/\/\/.*@/, '//***@') }),
    connected: () => logger.info('Database connected successfully'),
    error: (error) => logger.error('Database error', { error: error.message, stack: error.stack }),
    disconnect: () => logger.info('Database disconnected'),
  },

  // Authentication operations
  auth: {
    login: (user) => logger.info('User logged in', { userId: user._id, email: user.email }),
    logout: (user) => logger.info('User logged out', { userId: user._id, email: user.email }),
    loginFailed: (email, reason) => logger.warn('Login failed', { email, reason }),
    unauthorized: (url, method) => logger.warn('Unauthorized access attempt', { url, method }),
  },

  // Session operations
  session: {
    created: (session, userId) =>
      logger.info('Session created', { sessionId: session._id, userId }),
    updated: (session, userId) =>
      logger.info('Session updated', { sessionId: session._id, userId }),
    deleted: (sessionId, userId) => logger.info('Session deleted', { sessionId, userId }),
    submitted: (session, userId) =>
      logger.info('Session submitted for review', { sessionId: session._id, userId }),
    approved: (sessionId, adminId) => logger.info('Session approved', { sessionId, adminId }),
    rejected: (sessionId, adminId, reason) =>
      logger.info('Session rejected', { sessionId, adminId, reason }),
  },

  // Email operations
  email: {
    sent: (to, subject) => logger.info('Email sent', { to, subject }),
    failed: (to, subject, error) =>
      logger.error('Email failed to send', { to, subject, error: error.message }),
  },

  // Application events
  app: {
    start: (port) => logger.info('Application started', { port, env: process.env.NODE_ENV }),
    shutdown: () => logger.info('Application shutting down'),
    error: (error) =>
      logger.error('Application error', { error: error.message, stack: error.stack }),
  },
};

module.exports = {
  logger,
  httpLogger,
  ...loggers,
};
