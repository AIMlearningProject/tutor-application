// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const TutorSession = require('../models/TutorSession');
const AdminReviewLog = require('../models/AdminReviewLog');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { validateAdminReview } = require('../middleware/validation');

// Admin Dashboard Route with filters
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status, tutor, startDate, endDate } = req.query;

    // Build query
    let query = {};

    if (status) {
      query.status = status;
    }

    if (tutor) {
      query.tutorName = new RegExp(tutor, 'i'); // Case-insensitive search
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    // Retrieve filtered tutor sessions from MongoDB
    const tutorSessions = await TutorSession.find(query)
      .populate('user_id', 'name email')
      .sort({ date: -1 });

    // Calculate statistics
    const stats = await calculateStats();

    const success = req.session.success || null;
    const errors = req.session.errors || [];
    req.session.success = null;
    req.session.errors = null;

    res.render('adminDashboard', {
      tutorSessions,
      stats,
      filters: { status, tutor, startDate, endDate },
      success,
      errors
    });
  } catch (err) {
    console.error('Error retrieving tutor sessions:', err);
    res.render('adminDashboard', {
      tutorSessions: [],
      stats: null,
      filters: {},
      success: null,
      errors: ['Error loading dashboard']
    });
  }
});

// View single session details
router.get('/session/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const session = await TutorSession.findById(req.params.id)
      .populate('user_id', 'name email');

    if (!session) {
      req.session.errors = ['Session not found'];
      return res.redirect('/admin');
    }

    // Get review history for this session
    const reviewLogs = await AdminReviewLog.find({ entry_id: session._id })
      .sort({ timestamp: -1 });

    res.render('sessionDetail', { session, reviewLogs });
  } catch (err) {
    console.error('Error retrieving session:', err);
    req.session.errors = ['Error loading session details'];
    res.redirect('/admin');
  }
});

// Approve a session
router.post('/approve/:id', isAuthenticated, isAdmin, validateAdminReview, async (req, res) => {
  try {
    const { note } = req.body;
    const session = await TutorSession.findOne({
      _id: req.params.id,
      status: 'submitted'
    });

    if (!session) {
      req.session.errors = ['Session not found or not submitted'];
      return res.redirect('/admin');
    }

    // Update session status
    session.status = 'approved';
    session.review_note = note || null;
    await session.save();

    // Create audit log
    const reviewLog = new AdminReviewLog({
      admin_id: req.user._id,
      entry_id: session._id,
      action: 'approved',
      note: note || null,
      admin_name: req.user.name,
      admin_email: req.user.email
    });
    await reviewLog.save();

    req.session.success = 'Session approved successfully!';
    res.redirect('/admin');
  } catch (err) {
    console.error('Error approving session:', err);
    req.session.errors = ['Error approving session. Please try again.'];
    res.redirect('/admin');
  }
});

// Reject a session
router.post('/reject/:id', isAuthenticated, isAdmin, validateAdminReview, async (req, res) => {
  try {
    const { note } = req.body;
    const session = await TutorSession.findOne({
      _id: req.params.id,
      status: 'submitted'
    });

    if (!session) {
      req.session.errors = ['Session not found or not submitted'];
      return res.redirect('/admin');
    }

    // Update session status
    session.status = 'rejected';
    session.review_note = note || 'No reason provided';
    await session.save();

    // Create audit log
    const reviewLog = new AdminReviewLog({
      admin_id: req.user._id,
      entry_id: session._id,
      action: 'rejected',
      note: note || 'No reason provided',
      admin_name: req.user.name,
      admin_email: req.user.email
    });
    await reviewLog.save();

    req.session.success = 'Session rejected successfully!';
    res.redirect('/admin');
  } catch (err) {
    console.error('Error rejecting session:', err);
    req.session.errors = ['Error rejecting session. Please try again.'];
    res.redirect('/admin');
  }
});

// Export to CSV
router.get('/export/csv', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status, tutor, startDate, endDate } = req.query;

    // Build query (same as dashboard)
    let query = {};
    if (status) query.status = status;
    if (tutor) query.tutorName = new RegExp(tutor, 'i');
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const sessions = await TutorSession.find(query)
      .populate('user_id', 'name email')
      .sort({ date: -1 });

    // Generate CSV
    let csv = 'Tutor Name,Email,Date,Location,Description,Hours,Status,Submitted At,Reviewed At,Review Note\n';

    sessions.forEach(session => {
      const row = [
        escapeCSV(session.tutorName),
        escapeCSV(session.tutorEmail),
        session.date.toISOString().split('T')[0],
        escapeCSV(session.location),
        escapeCSV(session.description),
        session.hours,
        session.status,
        session.submitted_at ? session.submitted_at.toISOString() : '',
        session.reviewed_at ? session.reviewed_at.toISOString() : '',
        escapeCSV(session.review_note || '')
      ];
      csv += row.join(',') + '\n';
    });

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=tutor-sessions-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('Error exporting to CSV:', err);
    req.session.errors = ['Error exporting data'];
    res.redirect('/admin');
  }
});

// Helper function to escape CSV fields
function escapeCSV(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper function to calculate statistics
async function calculateStats() {
  try {
    const totalHours = await TutorSession.aggregate([
      { $group: { _id: null, total: { $sum: '$hours' } } }
    ]);

    const hoursByTutor = await TutorSession.aggregate([
      { $group: { _id: '$tutorEmail', total: { $sum: '$hours' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    const statusCounts = await TutorSession.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    return {
      totalHours: totalHours[0]?.total || 0,
      hoursByTutor,
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
  } catch (err) {
    console.error('Error calculating stats:', err);
    return null;
  }
}

=======
const TutorSession = require('../models/TutorSession'); // Adjust path if needed

// Middleware to check if the user is an admin
function isAdmin(req, res, next) {
  if (req.user && req.user.email === 'admin@example.com') {
    return next();
  }
  res.redirect('/'); // Redirect to home if not an admin
}

// Admin Dashboard Route
router.get('/', isAdmin, async (req, res) => {
  try {
    // Retrieve all tutor sessions from MongoDB
    const tutorSessions = await TutorSession.find();
    // Render the admin dashboard view and pass the tutor sessions to the view
    res.render('adminDashboard', { tutorSessions });
  } catch (err) {
    console.error('Error retrieving tutor sessions:', err);
    res.render('adminDashboard', { tutorSessions: [] });
  }
});

>>>>>>> 45e40af45cddae03539a08afea6bddefc54cef02
module.exports = router;
