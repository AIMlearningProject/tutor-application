const express = require('express');
const router = express.Router();
const TutorSession = require('../models/TutorSession');
const { sendEmailToAdmin } = require('../emailService');
const { isAuthenticated, isTutor } = require('../middleware/auth');
const { validateTutorSession } = require('../middleware/validation');

// Display the tutor form (only if logged in as tutor)
router.get('/', isAuthenticated, isTutor, async (req, res) => {
  try {
    // Retrieve tutor's own sessions from MongoDB
    const tutorSessions = await TutorSession.find({ user_id: req.user._id }).sort({ date: -1 });
    const errors = req.session.errors || [];
    req.session.errors = null; // Clear errors after displaying

    res.render('tutorForm', { user: req.user, tutorSessions, errors });
  } catch (err) {
    console.error('Error retrieving tutor sessions:', err);
    res.render('tutorForm', { user: req.user, tutorSessions: [], errors: [] });
  }
});

// Handle tutor form submission (create new session as draft)
router.post('/session', isAuthenticated, isTutor, validateTutorSession, async (req, res) => {
  const { date, location, description, hours } = req.body;

  // Create a new tutor session document with data from the form
  const newSession = new TutorSession({
    user_id: req.user._id,
    tutorName: req.user.name,
    tutorEmail: req.user.email,
    date: new Date(date),
    location,
    description,
    hours,
    status: 'draft', // Start as draft
  });

  try {
    await newSession.save();
    res.status(302).redirect('/tutor');
  } catch (err) {
    console.error('Error saving session:', err);
    req.session.errors = ['Error saving session. Please try again.'];
    res.redirect('/tutor');
  }
});

// Submit a draft session for admin review
router.post('/session/:id/submit', isAuthenticated, isTutor, async (req, res) => {
  try {
    const session = await TutorSession.findOne({
      _id: req.params.id,
      user_id: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft sessions can be submitted' });
    }

    session.status = 'submitted';
    await session.save();

    // Send email notification to admin (fire and forget)
    sendEmailToAdmin(session).catch((err) => console.error('Email send error:', err));

    res.status(302).redirect('/tutor');
  } catch (err) {
    console.error('Error submitting session:', err);
    req.session.errors = ['Error submitting session. Please try again.'];
    res.redirect('/tutor');
  }
});

// Edit a draft session
router.post(
  '/session/:id/update',
  isAuthenticated,
  isTutor,
  validateTutorSession,
  async (req, res) => {
    const { date, location, description, hours } = req.body;

    try {
      const session = await TutorSession.findOne({
        _id: req.params.id,
        user_id: req.user._id,
        status: 'draft',
      });

      if (!session) {
        return res.status(400).json({ error: 'Session not found or cannot be edited' });
      }

      // Update session fields
      session.date = new Date(date);
      session.location = location;
      session.description = description;
      session.hours = hours;

      await session.save();
      res.status(302).redirect('/tutor');
    } catch (err) {
      console.error('Error updating session:', err);
      req.session.errors = ['Error updating session. Please try again.'];
      res.redirect('/tutor');
    }
  },
);

// Delete a draft session
router.post('/session/:id/delete', isAuthenticated, isTutor, async (req, res) => {
  try {
    const session = await TutorSession.findOne({
      _id: req.params.id,
      user_id: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft sessions can be deleted' });
    }

    await TutorSession.deleteOne({ _id: req.params.id });
    res.status(302).redirect('/tutor');
  } catch (err) {
    console.error('Error deleting session:', err);
    req.session.errors = ['Error deleting session. Please try again.'];
    res.redirect('/tutor');
  }
});

module.exports = router;
