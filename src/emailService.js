// src/emailService.js
const nodemailer = require('nodemailer');
const { email: emailLogger } = require('./config/logger');

// Lazy-load transporter to allow for mocking in tests
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

// Define the email sending function
async function sendEmailToAdmin(sessionDetails) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    emailLogger.failed(
      'admin',
      'New Tutor Session Logged',
      new Error('Admin email not configured'),
    );
    throw new Error('Admin notification email is not configured');
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: 'New Tutor Session Logged',
    text: `A new tutor session has been logged. Here are the details:\n\n
           Tutor: ${sessionDetails.tutorName}\n
           Date: ${sessionDetails.date}\n
           Location: ${sessionDetails.location}\n
           Description: ${sessionDetails.description}\n
           Duration: ${sessionDetails.hours} hours\n`,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    emailLogger.sent(adminEmail, 'New Tutor Session Logged');
    return info;
  } catch (error) {
    emailLogger.failed(adminEmail, 'New Tutor Session Logged', error);
    throw error;
  }
}

// Export the function and allow transporter override for testing
module.exports = {
  sendEmailToAdmin,
  setTransporter: (t) => {
    transporter = t;
  },
};
