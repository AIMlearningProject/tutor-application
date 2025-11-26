// src/middleware/auth.js
// Authentication and authorization middleware

/**
 * Middleware to check if user is authenticated
 */
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

/**
 * Middleware to check if the authenticated user has admin role
 */
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }

  // Return 403 Forbidden if not admin
  res.status(403).render('error', {
    message: 'Access denied. Admin privileges required.',
    user: req.user
  });
}

/**
 * Middleware to check if the authenticated user has tutor role
 */
function isTutor(req, res, next) {
  if (req.isAuthenticated() && req.user && (req.user.role === 'tutor' || req.user.role === 'admin')) {
    return next();
  }

  // Return 403 Forbidden if not tutor
  res.status(403).render('error', {
    message: 'Access denied. Tutor privileges required.',
    user: req.user
  });
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
  attachUserRole
};
