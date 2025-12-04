const express = require('express');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const mongoose = require('mongoose');
const i18n = require('i18n');
require('dotenv').config();

// Import logger
const { logger, httpLogger, app: appLogger, db: dbLogger } = require('./config/logger');

// Import models
const User = require('./models/User');
const TutorSession = require('./models/TutorSession');

// Import routes
const authRoutes = require('./routes/authRoutes');
const tutorRoutes = require('./routes/tutorRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import middleware
const { attachUserRole } = require('./middleware/auth');
const {
  helmetConfig,
  apiLimiter,
  sanitizeInput,
  protectAgainstHPP,
  sanitizeUserInput,
  securityHeaders,
} = require('./middleware/security');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure i18n
i18n.configure({
  locales: ['en', 'fi'],
  defaultLocale: 'en',
  directory: path.join(__dirname, 'locales'),
  cookie: 'language',
  queryParameter: 'lang',
  autoReload: true,
  updateFiles: false,
  syncFiles: false,
  objectNotation: true,
});

// Security middleware (must be early in the chain)
app.use(helmetConfig);
app.use(securityHeaders);
app.use(apiLimiter);
app.use(sanitizeInput);
app.use(protectAgainstHPP);

// Middleware to parse incoming request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Input sanitization after parsing
app.use(sanitizeUserInput);

// Middleware to serve static files (like CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware for session handling with secure configuration
if (!process.env.SESSION_SECRET) {
  logger.error('CRITICAL: SESSION_SECRET environment variable is not set!');
  process.exit(1);
}

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Initialize i18n middleware
app.use(i18n.init);

// Set language based on user preference or cookie
app.use((req, res, next) => {
  if (req.user && req.user.language_preference) {
    req.setLocale(req.user.language_preference);
  }
  res.locals.__ = res.__;
  res.locals.currentLocale = req.getLocale();
  next();
});

// HTTP request logging middleware
app.use(httpLogger);

// Attach user role middleware to all routes
app.use(attachUserRole);

// Health check endpoint
app.get('/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };
  res.status(200).json(healthcheck);
});

// Use the routes
app.use('/auth', authRoutes);
app.use('/tutor', tutorRoutes);
app.use('/admin', adminRoutes);

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Google OAuth Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists in our database
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // Update user info if changed
          user.name = profile.displayName;
          user.email = profile.emails[0].value;
          await user.save();
          return done(null, user);
        }

        // Determine role: check if email matches ADMIN_EMAIL from env
        const isAdmin = profile.emails[0].value === process.env.ADMIN_EMAIL;

        // Create new user
        user = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          role: isAdmin ? 'admin' : 'tutor',
          language_preference: 'en',
        });

        await user.save();
        return done(null, user);
      } catch (error) {
        logger.error('Error in Google OAuth strategy', {
          error: error.message,
          stack: error.stack,
        });
        return done(error, null);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Connect to MongoDB
dbLogger.connect(process.env.MONGO_URI);
mongoose.set('debug', true); // Enable debugging logs
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout set to 5 seconds
  })
  .then(() => {
    dbLogger.connected();
  })
  .catch((err) => {
    logger.warn('MongoDB connection failed - running without database', {
      error: err.message,
    });
    // Don't exit - allow app to run without database for demo
  });

// Demo login routes (for development/testing without OAuth)
app.post('/demo-login', async (req, res) => {
  const { email } = req.body;
  try {
    const User = require('./models/User');
    const user = await User.findOne({ email });
    if (user) {
      req.session.passport = { user: user._id.toString() };
      req.session.save(() => {
        if (user.role === 'admin') {
          res.redirect('/admin/dashboard');
        } else {
          res.redirect('/tutor');
        }
      });
    } else {
      res.redirect('/?error=user_not_found');
    }
  } catch (err) {
    console.error('Demo login error:', err);
    res.redirect('/?error=login_failed');
  }
});

// Define the route for root "/"
app.get('/', (req, res) => {
  res.render('index', {
    user: req.user || null,
    isAdmin: req.user && req.user.role === 'admin',
  });
});

// Define the route for /dashboard
app.get('/dashboard', async (req, res) => {
  if (!req.user) {
    return res.redirect('/'); // Redirect to home if the user is not authenticated
  }

  try {
    let tutorSessions;
    if (req.user.role === 'admin') {
      // Admin user can see all tutor sessions
      tutorSessions = await TutorSession.find().sort({ date: -1 });
    } else {
      // Regular user can only see their own tutor sessions
      tutorSessions = await TutorSession.find({ user_id: req.user._id }).sort({ date: -1 });
    }

    res.render('dashboard', { user: req.user, tutorSessions });
  } catch (error) {
    logger.error('Error retrieving tutor sessions', { error: error.message, stack: error.stack });
    res.render('dashboard', { user: req.user, tutorSessions: [] });
  }
});

// Language switcher
app.get('/language/:lang', (req, res) => {
  const lang = req.params.lang;
  if (['en', 'fi'].includes(lang)) {
    res.cookie('language', lang, { maxAge: 365 * 24 * 60 * 60 * 1000 }); // 1 year

    // Update user preference if logged in
    if (req.user) {
      User.findByIdAndUpdate(req.user._id, { language_preference: lang })
        .then(() => {
          res.redirect('back');
        })
        .catch((err) => {
          logger.error('Error updating language preference', {
            error: err.message,
            stack: err.stack,
          });
          res.redirect('back');
        });
    } else {
      res.redirect('back');
    }
  } else {
    res.redirect('back');
  }
});

// Handle logout
app.get('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

// 404 handler - must be after all other routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  appLogger.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  appLogger.shutdown();
  process.exit(0);
});

// Start the server
app.listen(PORT, () => {
  appLogger.start(PORT);
});
