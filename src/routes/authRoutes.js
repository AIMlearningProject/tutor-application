// routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const router = express.Router();

// Route for Google authentication
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback route after Google authentication
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/tutor');
  }
);

// Route to log out
router.get('/logout', (req, res) => {
  req.logout((err) => {
    res.redirect('/');
  });
});

module.exports = router;
