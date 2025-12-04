const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

// Configure Helmet for security headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health check endpoints
      return req.path === '/health' || req.path === '/api/health';
    },
  });

// General API rate limiter
const apiLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  'Too many requests from this IP, please try again later.',
);

// Strict rate limiter for authentication endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many login attempts, please try again after 15 minutes.',
);

// Rate limiter for session submission
const sessionSubmitLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 submissions per hour
  'Too many session submissions, please try again later.',
);

// MongoDB query sanitization (prevents NoSQL injection)
const sanitizeInput = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized input detected in ${req.path} for key: ${key}`);
  },
});

// HTTP Parameter Pollution protection
const protectAgainstHPP = hpp({
  whitelist: ['status', 'sort', 'fields'], // Allow these params to appear multiple times
});

// Input validation sanitization middleware
const sanitizeUserInput = (req, res, next) => {
  // Trim whitespace from string inputs
  const sanitizeObject = (obj) => {
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    });
  };

  if (req.body) {
    sanitizeObject(req.body);
  }
  if (req.query) {
    sanitizeObject(req.query);
  }
  if (req.params) {
    sanitizeObject(req.params);
  }

  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  next();
};

module.exports = {
  helmetConfig,
  apiLimiter,
  authLimiter,
  sessionSubmitLimiter,
  sanitizeInput,
  protectAgainstHPP,
  sanitizeUserInput,
  securityHeaders,
};
