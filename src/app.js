const express = require('express');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const mongoose = require('mongoose');
<<<<<<< HEAD
const i18n = require('i18n');
require('dotenv').config();

// Import models
const User = require('./models/User');
const TutorSession = require('./models/TutorSession');
const AdminReviewLog = require('./models/AdminReviewLog');

=======
require('dotenv').config();

>>>>>>> 45e40af45cddae03539a08afea6bddefc54cef02
// Import routes
const authRoutes = require('./routes/authRoutes');
const tutorRoutes = require('./routes/tutorRoutes');
const adminRoutes = require('./routes/adminRoutes');
<<<<<<< HEAD

// Import middleware
const { attachUserRole } = require('./middleware/auth');
=======
const TutorSession = require('./models/TutorSession');
>>>>>>> 45e40af45cddae03539a08afea6bddefc54cef02

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

<<<<<<< HEAD
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
  objectNotation: true
});

=======
>>>>>>> 45e40af45cddae03539a08afea6bddefc54cef02
// Middleware to parse incoming request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware to serve static files (like CSS)
app.use(express.static(path.join(__dirname, 'public')));

<<<<<<< HEAD
// Middleware for session handling with secure configuration
if (!process.env.SESSION_SECRET) {
  console.error('CRITICAL: SESSION_SECRET environment variable is not set!');
  process.exit(1);
}

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
=======
// Middleware for session handling
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true
>>>>>>> 45e40af45cddae03539a08afea6bddefc54cef02
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

<<<<<<< HEAD
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

// Attach user role middleware to all routes
app.use(attachUserRole);

=======
>>>>>>> 45e40af45cddae03539a08afea6bddefc54cef02
// Use the routes
app.use('/auth', authRoutes);
app.use('/tutor', tutorRoutes);
app.use('/admin', adminRoutes);

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Google OAuth Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
<<<<<<< HEAD
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
      language_preference: 'en'
    });

    await user.save();
    return done(null, user);
  } catch (error) {
    console.error('Error in Google OAuth strategy:', error);
    return done(error, null);
  }
}));

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
=======
  callbackURL: 'http://localhost:3000/auth/google/callback',
},
(accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
>>>>>>> 45e40af45cddae03539a08afea6bddefc54cef02
});

// Connect to MongoDB
mongoose.set('debug', true);  // Enable debugging logs
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000  // Timeout set to 30 seconds
})
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);  // Exit the process with a failure code
  });

// Define the route for root "/"
app.get('/', (req, res) => {
<<<<<<< HEAD
  res.render('index');
=======
  const isAdmin = req.user && req.user.email === process.env.ADMIN_EMAIL;
  res.render('index', { user: req.user, isAdmin });
>>>>>>> 45e40af45cddae03539a08afea6bddefc54cef02
});

// Define the route for /dashboard
app.get('/dashboard', async (req, res) => {
  if (!req.user) {
    return res.redirect('/');  // Redirect to home if the user is not authenticated
  }

  try {
    let tutorSessions;
<<<<<<< HEAD
    if (req.user.role === 'admin') {
      // Admin user can see all tutor sessions
      tutorSessions = await TutorSession.find().sort({ date: -1 });
    } else {
      // Regular user can only see their own tutor sessions
      tutorSessions = await TutorSession.find({ user_id: req.user._id }).sort({ date: -1 });
    }

    res.render('dashboard', { tutorSessions });
  } catch (error) {
    console.error('Error retrieving tutor sessions:', error);
    res.render('dashboard', { tutorSessions: [] });
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
        .catch(err => {
          console.error('Error updating language preference:', err);
          res.redirect('back');
        });
    } else {
      res.redirect('back');
    }
  } else {
    res.redirect('back');
=======
    if (req.user.email === process.env.ADMIN_EMAIL) {
      // Admin user can see all tutor sessions
      tutorSessions = await TutorSession.find();
    } else {
      // Regular user can only see their own tutor sessions
      tutorSessions = await TutorSession.find({ tutorName: req.user.displayName });
    }

    res.render('dashboard', { user: req.user, tutorSessions });
  } catch (error) {
    console.error('Error retrieving tutor sessions:', error);
    res.render('dashboard', { user: req.user, tutorSessions: [] });
>>>>>>> 45e40af45cddae03539a08afea6bddefc54cef02
  }
});

// Handle logout
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
