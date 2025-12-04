const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const TutorSession = require('../src/models/TutorSession');
const AdminReviewLog = require('../src/models/AdminReviewLog');

async function seedDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await TutorSession.deleteMany({});
    await AdminReviewLog.deleteMany({});

    // Create admin user
    console.log('Creating admin user...');
    const admin = await User.create({
      googleId: 'seed-admin-123',
      name: 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      role: 'admin',
      language_preference: 'en',
    });

    // Create tutor users
    console.log('Creating tutor users...');
    const tutor1 = await User.create({
      googleId: 'seed-tutor-456',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'tutor',
      language_preference: 'en',
    });

    const tutor2 = await User.create({
      googleId: 'seed-tutor-789',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: 'tutor',
      language_preference: 'fi',
    });

    // Create tutor sessions
    console.log('Creating tutor sessions...');

    // Draft sessions
    await TutorSession.create({
      user_id: tutor1._id,
      date: new Date('2024-01-15'),
      location: 'Main Library',
      description:
        'Helped student with algebra homework. Covered quadratic equations and factoring. Student showed good understanding.',
      hours: 2.0,
      status: 'draft',
    });

    // Submitted sessions
    await TutorSession.create({
      user_id: tutor1._id,
      date: new Date('2024-01-16'),
      location: 'Online - Zoom',
      description:
        'Chemistry tutoring session. Reviewed atomic structure and periodic table. Student struggled with electron configuration.',
      hours: 1.5,
      status: 'submitted',
    });

    await TutorSession.create({
      user_id: tutor2._id,
      date: new Date('2024-01-17'),
      location: 'Science Building Room 201',
      description:
        'Physics problem-solving session. Focused on kinematics and forces. Worked through several practice problems together.',
      hours: 2.5,
      status: 'submitted',
    });

    // Approved sessions
    const approvedSession1 = await TutorSession.create({
      user_id: tutor1._id,
      date: new Date('2024-01-10'),
      location: 'Main Library',
      description:
        'Mathematics tutoring. Helped with calculus derivatives and limits. Student made significant progress.',
      hours: 3.0,
      status: 'approved',
      admin_review_notes: 'Excellent session. Good detail in description.',
      reviewed_by: admin._id,
      reviewed_at: new Date(),
    });

    const approvedSession2 = await TutorSession.create({
      user_id: tutor2._id,
      date: new Date('2024-01-12'),
      location: 'Online - Teams',
      description:
        'Programming tutoring. Covered JavaScript basics including variables, functions, and loops. Student completed several exercises.',
      hours: 2.0,
      status: 'approved',
      admin_review_notes: 'Well documented session.',
      reviewed_by: admin._id,
      reviewed_at: new Date(),
    });

    // Rejected session
    const rejectedSession = await TutorSession.create({
      user_id: tutor1._id,
      date: new Date('2024-01-14'),
      location: 'Library',
      description: 'Helped with homework.',
      hours: 1.0,
      status: 'rejected',
      admin_review_notes: 'Description too brief. Please provide more detail about topics covered.',
      reviewed_by: admin._id,
      reviewed_at: new Date(),
    });

    // Create admin review logs
    console.log('Creating admin review logs...');
    await AdminReviewLog.create({
      session_id: approvedSession1._id,
      admin_id: admin._id,
      action: 'approved',
      notes: 'Excellent session. Good detail in description.',
    });

    await AdminReviewLog.create({
      session_id: approvedSession2._id,
      admin_id: admin._id,
      action: 'approved',
      notes: 'Well documented session.',
    });

    await AdminReviewLog.create({
      session_id: rejectedSession._id,
      admin_id: admin._id,
      action: 'rejected',
      notes: 'Description too brief. Please provide more detail about topics covered.',
    });

    console.log('Database seeded successfully!');
    console.log(`\nCreated users:
    - Admin: ${admin.email}
    - Tutor 1: ${tutor1.email}
    - Tutor 2: ${tutor2.email}

Created tutor sessions:
    - 1 draft
    - 2 submitted
    - 2 approved
    - 1 rejected

Created review logs: 3`);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
