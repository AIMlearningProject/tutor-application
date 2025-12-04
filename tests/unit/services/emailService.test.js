const { sendEmailToAdmin, setTransporter } = require('../../../src/emailService');
const { email: emailLogger } = require('../../../src/config/logger');
const nodemailer = require('nodemailer');

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  email: {
    sent: jest.fn(),
    failed: jest.fn(),
  },
}));

// Mock nodemailer (note: it's createTransport, not createTransporter)
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('Email Service', () => {
  let sendMailMock;
  let mockTransporter;

  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();

    // Create mock transporter
    sendMailMock = jest.fn();
    mockTransporter = {
      sendMail: sendMailMock,
    };

    // Inject mock transporter
    setTransporter(mockTransporter);

    // Set environment variables
    process.env.ADMIN_NOTIFICATION_EMAIL = 'admin@example.com';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'test-password';
  });

  afterEach(() => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
  });

  describe('sendEmailToAdmin', () => {
    it('should send email with correct details', async () => {
      sendMailMock.mockResolvedValue({ messageId: 'test-message-id' });

      const sessionDetails = {
        tutorName: 'John Doe',
        date: '2024-01-15',
        location: 'Library',
        description: 'Math tutoring session',
        hours: 2,
      };

      await sendEmailToAdmin(sessionDetails);

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@example.com',
          to: 'admin@example.com',
          subject: 'New Tutor Session Logged',
        }),
      );
      expect(emailLogger.sent).toHaveBeenCalledWith(
        'admin@example.com',
        'New Tutor Session Logged',
      );
    });

    it('should throw error when admin email is not configured', async () => {
      delete process.env.ADMIN_NOTIFICATION_EMAIL;
      delete process.env.ADMIN_EMAIL;

      const sessionDetails = {
        tutorName: 'John Doe',
        date: '2024-01-15',
        location: 'Library',
        description: 'Math tutoring session',
        hours: 2,
      };

      await expect(sendEmailToAdmin(sessionDetails)).rejects.toThrow(
        'Admin notification email is not configured',
      );
      expect(emailLogger.failed).toHaveBeenCalled();
    });

    it('should log error when email sending fails', async () => {
      const error = new Error('SMTP connection failed');
      sendMailMock.mockRejectedValue(error);

      const sessionDetails = {
        tutorName: 'John Doe',
        date: '2024-01-15',
        location: 'Library',
        description: 'Math tutoring session',
        hours: 2,
      };

      await expect(sendEmailToAdmin(sessionDetails)).rejects.toThrow('SMTP connection failed');
      expect(emailLogger.failed).toHaveBeenCalledWith(
        'admin@example.com',
        'New Tutor Session Logged',
        error,
      );
    });

    it('should use ADMIN_EMAIL as fallback', async () => {
      delete process.env.ADMIN_NOTIFICATION_EMAIL;
      process.env.ADMIN_EMAIL = 'fallback@example.com';
      sendMailMock.mockResolvedValue({ messageId: 'test-message-id' });

      const sessionDetails = {
        tutorName: 'John Doe',
        date: '2024-01-15',
        location: 'Library',
        description: 'Math tutoring session',
        hours: 2,
      };

      await sendEmailToAdmin(sessionDetails);

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'fallback@example.com',
        }),
      );
    });

    it('should include all session details in email body', async () => {
      sendMailMock.mockResolvedValue({ messageId: 'test-message-id' });

      const sessionDetails = {
        tutorName: 'Jane Smith',
        date: '2024-02-20',
        location: 'Online',
        description: 'Physics tutoring',
        hours: 3.5,
      };

      await sendEmailToAdmin(sessionDetails);

      const emailOptions = sendMailMock.mock.calls[0][0];
      expect(emailOptions.text).toContain('Jane Smith');
      expect(emailOptions.text).toContain('2024-02-20');
      expect(emailOptions.text).toContain('Online');
      expect(emailOptions.text).toContain('Physics tutoring');
      expect(emailOptions.text).toContain('3.5');
    });
  });

  describe('getTransporter - lazy initialization', () => {
    it('should create transporter on first call when no transporter is set', async () => {
      // Mock nodemailer.createTransport to return a working transporter
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
      const mockCreateTransport = jest.fn().mockReturnValue({
        sendMail: mockSendMail,
      });

      // Override the module mock temporarily
      nodemailer.createTransport = mockCreateTransport;

      // Clear the transporter by setting it to null
      setTransporter(null);

      const sessionDetails = {
        tutorName: 'John Doe',
        date: '2024-01-15',
        location: 'Library',
        description: 'Math tutoring session',
        hours: 2,
      };

      await sendEmailToAdmin(sessionDetails);

      // Verify createTransport was called (line 10 coverage)
      expect(mockCreateTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Verify sendMail was called
      expect(mockSendMail).toHaveBeenCalled();
    });
  });
});
