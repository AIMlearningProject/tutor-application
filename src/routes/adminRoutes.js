// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const TutorSession = require('../models/TutorSession');
const AdminReviewLog = require('../models/AdminReviewLog');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Admin Dashboard Route with filters
router.get('/dashboard', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status, tutor, startDate, endDate } = req.query;

    // Build query
    const query = {};

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
      errors,
    });
  } catch (err) {
    console.error('Error retrieving tutor sessions:', err);
    res.render('adminDashboard', {
      tutorSessions: [],
      stats: null,
      filters: {},
      success: null,
      errors: ['Error loading dashboard'],
    });
  }
});

// Get all sessions (API endpoint for tests)
router.get('/sessions', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status, tutor, startDate, endDate } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (tutor) {
      query.tutorName = new RegExp(tutor, 'i');
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

    res.status(200).json({ sessions: tutorSessions });
  } catch (err) {
    console.error('Error retrieving sessions:', err);
    res.status(500).json({ error: 'Error loading sessions' });
  }
});

// View single session details
router.get('/session/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const session = await TutorSession.findById(req.params.id).populate('user_id', 'name email');

    if (!session) {
      req.session.errors = ['Session not found'];
      return res.redirect('/admin');
    }

    // Get review history for this session
    const reviewLogs = await AdminReviewLog.find({ entry_id: session._id }).sort({ timestamp: -1 });

    res.render('sessionDetail', { session, reviewLogs });
  } catch (err) {
    console.error('Error retrieving session:', err);
    req.session.errors = ['Error loading session details'];
    res.redirect('/admin');
  }
});

// Approve a session
router.post('/session/:id/approve', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { reviewNotes: note } = req.body;

    // Validate note length
    if (note && note.trim().length > 1000) {
      return res.status(400).json({ errors: ['Review note must not exceed 1000 characters'] });
    }
    const session = await TutorSession.findOne({
      _id: req.params.id,
      status: 'submitted',
    });

    if (!session) {
      return res.status(400).json({ error: 'Session not found or not submitted' });
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
      admin_email: req.user.email,
    });
    await reviewLog.save();

    res.status(302).redirect('/admin/dashboard');
  } catch (err) {
    console.error('Error approving session:', err);
    req.session.errors = ['Error approving session. Please try again.'];
    res.redirect('/admin');
  }
});

// Reject a session
router.post('/session/:id/reject', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { reviewNotes: note } = req.body;

    // Validate note length
    if (note && note.trim().length > 1000) {
      return res.status(400).json({ errors: ['Review note must not exceed 1000 characters'] });
    }
    const session = await TutorSession.findOne({
      _id: req.params.id,
      status: 'submitted',
    });

    if (!session) {
      return res.status(400).json({ error: 'Session not found or not submitted' });
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
      admin_email: req.user.email,
    });
    await reviewLog.save();

    res.status(302).redirect('/admin/dashboard');
  } catch (err) {
    console.error('Error rejecting session:', err);
    req.session.errors = ['Error rejecting session. Please try again.'];
    res.redirect('/admin');
  }
});

// Export to CSV (with both routes for compatibility)
router.get('/export', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status, tutor, startDate, endDate } = req.query;

    // Build query (same as dashboard)
    const query = {};
    if (status) {
      query.status = status;
    }
    if (tutor) {
      query.tutorName = new RegExp(tutor, 'i');
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

    const sessions = await TutorSession.find(query)
      .populate('user_id', 'name email')
      .sort({ date: -1 });

    // Generate CSV
    let csv =
      'Tutor Name,Email,Date,Location,Description,Hours,Status,Submitted At,Reviewed At,Review Note\n';

    sessions.forEach((session) => {
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
        escapeCSV(session.review_note),
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

// Get statistics
router.get('/stats', isAuthenticated, isAdmin, async (req, res) => {
  // Note: calculateStats() handles errors internally and returns null on failure
  const stats = await calculateStats();
  res.status(200).json(stats);
});

// Helper function to escape CSV fields
function escapeCSV(field) {
  if (field === null || field === undefined) {
    return '';
  }
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// DELETE Session Route
router.post('/session/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const sessionId = req.params.id;
    await TutorSession.findByIdAndDelete(sessionId);
    req.session.success = 'Session deleted successfully';
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Error deleting session:', err);
    req.session.errors = ['Error deleting session'];
    res.redirect('/admin/dashboard');
  }
});

// GET Edit Session Form
router.get('/session/:id/edit', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const session = await TutorSession.findById(req.params.id).populate('user_id', 'name email');
    if (!session) {
      req.session.errors = ['Session not found'];
      return res.redirect('/admin/dashboard');
    }
    res.render('editSession', { session, errors: [], success: null });
  } catch (err) {
    console.error('Error loading session for edit:', err);
    req.session.errors = ['Error loading session'];
    res.redirect('/admin/dashboard');
  }
});

// POST Update Session
router.post('/session/:id/update', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { tutorName, date, location, description, hours, status } = req.body;
    await TutorSession.findByIdAndUpdate(req.params.id, {
      tutorName,
      date,
      location,
      description,
      hours: parseFloat(hours),
      status,
    });
    req.session.success = 'Session updated successfully';
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Error updating session:', err);
    req.session.errors = ['Error updating session'];
    res.redirect('/admin/dashboard');
  }
});

// Settings Page
router.get('/settings', isAuthenticated, isAdmin, (req, res) => {
  res.render('adminSettings', {
    user: req.user,
    success: req.session.success || null,
    errors: req.session.errors || [],
  });
  req.session.success = null;
  req.session.errors = null;
});

// User Management Page
router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find().sort({ createdAt: -1 });
    res.render('adminUsers', {
      users,
      success: req.session.success || null,
      errors: req.session.errors || [],
    });
    req.session.success = null;
    req.session.errors = null;
  } catch (err) {
    console.error('Error loading users:', err);
    res.render('adminUsers', {
      users: [],
      success: null,
      errors: ['Error loading users'],
    });
  }
});

// Helper function to calculate statistics
async function calculateStats() {
  try {
    const total = await TutorSession.countDocuments();
    const pending = await TutorSession.countDocuments({ status: 'submitted' });
    const approved = await TutorSession.countDocuments({ status: 'approved' });
    const rejected = await TutorSession.countDocuments({ status: 'rejected' });
    const draft = await TutorSession.countDocuments({ status: 'draft' });

    const totalHours = await TutorSession.aggregate([
      { $group: { _id: null, total: { $sum: '$hours' } } },
    ]);

    const hoursByTutor = await TutorSession.aggregate([
      { $group: { _id: '$tutorEmail', total: { $sum: '$hours' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const statusCounts = await TutorSession.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      draft,
      totalHours: totalHours[0]?.total || 0,
      hoursByTutor,
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  } catch (err) {
    console.error('Error calculating stats:', err);
    return { total: 0, pending: 0, approved: 0, rejected: 0, draft: 0 };
  }
}

module.exports = router;
