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

    res.render('tutorForm', { tutorSessions, errors });
  } catch (err) {
    console.error('Error retrieving tutor sessions:', err);
    res.render('tutorForm', { tutorSessions: [], errors: [] });
  }
});

// Handle tutor form submission (create new session as draft)
router.post('/log', isAuthenticated, isTutor, validateTutorSession, async (req, res) => {
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
    status: 'draft' // Start as draft
  });

  try {
    await newSession.save();
    req.session.success = 'Session saved as draft successfully!';
    res.redirect('/tutor');
  } catch (err) {
    console.error('Error saving session:', err);
    req.session.errors = ['Error saving session. Please try again.'];
    res.redirect('/tutor');
  }
});

// Submit a draft session for admin review
router.post('/submit/:id', isAuthenticated, isTutor, async (req, res) => {
  try {
    const session = await TutorSession.findOne({
      _id: req.params.id,
      user_id: req.user._id,
      status: 'draft'
    });

    if (!session) {
      req.session.errors = ['Session not found or already submitted'];
      return res.redirect('/tutor');
    }

    session.status = 'submitted';
    await session.save();

    // Send email notification to admin
    sendEmailToAdmin(session);

    req.session.success = 'Session submitted for review!';
    res.redirect('/tutor');
  } catch (err) {
    console.error('Error submitting session:', err);
    req.session.errors = ['Error submitting session. Please try again.'];
    res.redirect('/tutor');
  }
});

// Edit a draft session
router.post('/edit/:id', isAuthenticated, isTutor, validateTutorSession, async (req, res) => {
  const { date, location, description, hours } = req.body;

  try {
    const session = await TutorSession.findOne({
      _id: req.params.id,
      user_id: req.user._id,
      status: 'draft'
    });

    if (!session) {
      req.session.errors = ['Session not found or cannot be edited'];
      return res.redirect('/tutor');
    }

    // Update session fields
    session.date = new Date(date);
    session.location = location;
    session.description = description;
    session.hours = hours;

    await session.save();
    req.session.success = 'Session updated successfully!';
    res.redirect('/tutor');
  } catch (err) {
    console.error('Error updating session:', err);
    req.session.errors = ['Error updating session. Please try again.'];
    res.redirect('/tutor');
  }
});

// Delete a draft session
router.post('/delete/:id', isAuthenticated, isTutor, async (req, res) => {
  try {
    const result = await TutorSession.deleteOne({
      _id: req.params.id,
      user_id: req.user._id,
      status: 'draft'
    });

    if (result.deletedCount === 0) {
      req.session.errors = ['Session not found or cannot be deleted'];
    } else {
      req.session.success = 'Session deleted successfully!';
    }

    res.redirect('/tutor');
  } catch (err) {
    console.error('Error deleting session:', err);
    req.session.errors = ['Error deleting session. Please try again.'];
    res.redirect('/tutor');
  }
});

module.exports = router;
