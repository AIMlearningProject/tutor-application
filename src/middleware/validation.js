// src/middleware/validation.js
// Input validation and sanitization middleware

/**
 * Sanitize and validate tutor session input
 */
function validateTutorSession(req, res, next) {
  const { date, location, description, hours } = req.body;
  const errors = [];

  // Validate date
  if (!date) {
    errors.push('Date is required');
  } else {
    const sessionDate = new Date(date);
    if (isNaN(sessionDate.getTime())) {
      errors.push('Invalid date format');
    }
    // Check if date is not in the future (more than 1 day ahead)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (sessionDate > tomorrow) {
      errors.push('Date cannot be in the future');
    }
  }

  // Validate location
  if (!location || location.trim().length === 0) {
    errors.push('Location is required');
  } else if (location.trim().length < 2) {
    errors.push('Location must be at least 2 characters');
  } else if (location.trim().length > 200) {
    errors.push('Location must not exceed 200 characters');
  }

  // Validate description
  if (!description || description.trim().length === 0) {
    errors.push('Description is required');
  } else if (description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  } else if (description.trim().length > 2000) {
    errors.push('Description must not exceed 2000 characters');
  }

  // Validate hours
  const hoursNum = parseFloat(hours);
  if (!hours || isNaN(hoursNum)) {
    errors.push('Hours is required and must be a number');
  } else if (hoursNum < 0.5) {
    errors.push('Hours must be at least 0.5');
  } else if (hoursNum > 24) {
    errors.push('Hours cannot exceed 24');
  } else if (hoursNum % 0.5 !== 0) {
    errors.push('Hours must be in increments of 0.5 (e.g., 0.5, 1.0, 1.5)');
  }

  // If there are errors, redirect back with error messages
  if (errors.length > 0) {
    req.session.errors = errors;
    return res.redirect('/tutor');
  }

  // Sanitize inputs
  req.body.location = location.trim();
  req.body.description = description.trim();
  req.body.hours = hoursNum;

  next();
}

/**
 * Validate admin review input
 */
function validateAdminReview(req, res, next) {
  const { action, note } = req.body;
  const errors = [];

  // Validate action
  if (!action || !['approved', 'rejected'].includes(action)) {
    errors.push('Invalid action. Must be "approved" or "rejected"');
  }

  // Validate note (optional, but if provided, must meet criteria)
  if (note && note.trim().length > 1000) {
    errors.push('Review note must not exceed 1000 characters');
  }

  // If there are errors, return them
  if (errors.length > 0) {
    req.session.errors = errors;
    return res.redirect('back');
  }

  // Sanitize note
  if (note) {
    req.body.note = note.trim();
  }

  next();
}

module.exports = {
  validateTutorSession,
  validateAdminReview
};
