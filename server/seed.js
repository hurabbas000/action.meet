require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./src/models/User');
const Team = require('./src/models/Team');
const Meeting = require('./src/models/Meeting');
const Agenda = require('./src/models/Agenda');

async function seed() {
  console.log('🌱 Starting dummy data seeding...');
  
  // Connect to persistent MongoDB Memory Server like app.js
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const path = require('path');
  const fs = require('fs');
  const dbPath = path.join(__dirname, '../.mongo-data');
  if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

  const mongoServer = await MongoMemoryServer.create({
    instance: {
      dbPath,
      storageEngine: 'wiredTiger'
    }
  });
  const dbUri = mongoServer.getUri();
  
  await mongoose.connect(dbUri);
  console.log('✅ Connected to MongoDB Memory Server at ' + dbUri);

  // Clear existing data for a fresh state
  await Promise.all([
    User.deleteMany({}),
    Team.deleteMany({}),
    Meeting.deleteMany({}),
    Agenda.deleteMany({})
  ]);
  console.log('🗑️  Cleared existing DB collections (Users, Teams, Meetings, Agenda)');

  // 1. Create Users
  const pwd = await bcrypt.hash('password123', 10);
  const users = await User.insertMany([
    { name: 'Alice Admin', email: 'alice@test.com', password: pwd, role: 'admin', isActive: true },
    { name: 'Bob Builder', email: 'bob@test.com', password: pwd, role: 'member', isActive: true },
    { name: 'Charlie CEO', email: 'charlie@test.com', password: pwd, role: 'admin', isActive: true },
    { name: 'Diana Design', email: 'diana@test.com', password: pwd, role: 'member', isActive: true }
  ]);
  console.log('👥 Created 4 test users (Alice, Bob, Charlie, Diana)');

  // 2. Create Teams
  const team1 = await Team.create({
    name: 'Frontend Engineering',
    description: 'The team building the ActionMeet web app.',
    createdBy: users[0]._id, // Alice
    members: [
      { user: users[0]._id, role: 'admin', joinedAt: new Date(), isActive: true },
      { user: users[1]._id, role: 'member', joinedAt: new Date(), isActive: true }
    ]
  });
  
  const team2 = await Team.create({
    name: 'Executive Leadership',
    description: 'High-level strategy planning.',
    createdBy: users[2]._id, // Charlie
    members: [
      { user: users[2]._id, role: 'admin', joinedAt: new Date(), isActive: true },
      { user: users[0]._id, role: 'member', joinedAt: new Date(), isActive: true }
    ]
  });
  console.log('🏢 Created 2 Teams (Frontend, Executive)');

  // 3. Create Meetings
  const now = new Date();
  const pastMeetingDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const futureMeetingDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now

  const m1 = await Meeting.create({
    title: 'Weekly UI Sync',
    description: 'Sync on the latest dashboard redesign.',
    host: users[0]._id, // Alice
    team: team1._id,
    participants: [{ user: users[1]._id, status: 'confirmed' }, { user: users[3]._id, status: 'invited' }],
    scheduledFor: futureMeetingDate,
    meetingType: 'recurring',
    status: 'scheduled',
    statistics: { totalAgendaItems: 2, completedAgendaItems: 0, completionRate: 0, openAgendaItems: 2 }
  });

  const m2 = await Meeting.create({
    title: 'Q1 Kickoff Review',
    description: 'Past meeting to review Q1 metrics.',
    host: users[2]._id, // Charlie
    participants: [{ user: users[0]._id, status: 'attended' }],
    scheduledFor: pastMeetingDate,
    meetingType: 'single',
    status: 'completed',
    statistics: { totalAgendaItems: 3, completedAgendaItems: 2, completionRate: 66, openAgendaItems: 1 }
  });
  console.log('📅 Created 2 Meetings (1 Future/Recurring, 1 Past/Completed)');

  // 4. Create Agenda Points (Tasks)
  await Agenda.insertMany([
    // M1 Agendas
    { meeting: m1._id, title: 'Finalize Dark Mode CSS', description: 'Ensure the new color palette is accessible.', status: 'open', responsiblePerson: { user: users[0]._id }, order: 1 },
    { meeting: m1._id, title: 'Add Member API Integration', description: 'Hook up the Add Member modal.', status: 'open', responsiblePerson: { user: users[1]._id }, order: 2 },
    // M2 Agendas
    { meeting: m2._id, title: 'Review Revenue Numbers', description: 'Check MRR growth.', status: 'completed', responsiblePerson: { user: users[2]._id }, order: 1 },
    { meeting: m2._id, title: 'Hire new engineer', description: 'We need more hands on frontend.', status: 'completed', responsiblePerson: { user: users[2]._id }, order: 2 },
    { meeting: m2._id, title: 'Investigate server crash', description: 'Port 3001 kept hanging.', status: 'open', responsiblePerson: { user: users[0]._id }, order: 3 }
  ]);
  
  // Link agenda points to meetings
  const m1Agendas = await Agenda.find({ meeting: m1._id });
  m1.agenda = m1Agendas.map(a => a._id);
  await m1.save();
  
  const m2Agendas = await Agenda.find({ meeting: m2._id });
  m2.agenda = m2Agendas.map(a => a._id);
  await m2.save();
  console.log('🎯 Created 5 Agenda Points/Tasks');

  console.log('\\n✅ SEEDING COMPLETE! You can now log in with:');
  console.log('Email: alice@test.com  | Password: password123');
  console.log('Email: bob@test.com    | Password: password123');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding Failed:', err);
  process.exit(1);
});
