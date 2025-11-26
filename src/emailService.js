// src/emailService.js
const nodemailer = require('nodemailer');
// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Define the email sending function
function sendEmailToAdmin(sessionDetails) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'bisolaadigun6@gmail.com', // Replace with the admin's email address
    subject: 'New Tutor Session Logged',
    text: `A new tutor session has been logged. Here are the details:\n\n
           Tutor: ${sessionDetails.tutorName}\n
           Date: ${sessionDetails.date}\n
           Location: ${sessionDetails.location}\n
           Description: ${sessionDetails.description}\n
           Duration: ${sessionDetails.duration} hours\n`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

// Export the function
module.exports = { sendEmailToAdmin };
