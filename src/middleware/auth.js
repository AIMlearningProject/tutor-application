// src/middleware/auth.js
// Authentication and authorization middleware

/**
 * Middleware to check if user is authenticated
 */
function isAuthenticated(req, res, next) {
  // Support both passport and session-based auth
  if ((req.isAuthenticated && req.isAuthenticated()) || req.user) {
    return next();
  }
  res.redirect('/');
}

/**
 * Middleware to check if the authenticated user has admin role
 */
function isAdmin(req, res, next) {
  // Support both passport and session-based auth
  if (
    ((req.isAuthenticated && req.isAuthenticated()) || req.user) &&
    req.user &&
    req.user.role === 'admin'
  ) {
    return next();
  }

  // Redirect non-admin users to home
  res.status(302).redirect('/');
}

/**
 * Middleware to check if the authenticated user has tutor role
 */
function isTutor(req, res, next) {
  // Support both passport and session-based auth
  if (
    ((req.isAuthenticated && req.isAuthenticated()) || req.user) &&
    req.user &&
    (req.user.role === 'tutor' || req.user.role === 'admin')
  ) {
    return next();
  }

  // Redirect non-tutor users to home
  res.status(302).redirect('/');
}

/**
 * Middleware to attach user role info to all requests
 */
function attachUserRole(req, res, next) {
  if (req.user) {
    res.locals.isAdmin = req.user.role === 'admin';
    res.locals.isTutor = req.user.role === 'tutor' || req.user.role === 'admin';
  } else {
    res.locals.isAdmin = false;
    res.locals.isTutor = false;
  }
  res.locals.user = req.user || null;
  next();
}

module.exports = {
  isAuthenticated,
  isAdmin,
  isTutor,
  attachUserRole,
};
