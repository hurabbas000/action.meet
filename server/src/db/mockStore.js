/**
 * mockStore.js
 * In-memory data store to allow the app to run without MongoDB.
 */
const bcrypt = require('bcryptjs');

const store = {
    users: [],
    teams: [],
    meetings: [],
    agendas: [],
    notifications: []
};

// Helper to seed initial data
const seed = () => {
    const pwd = bcrypt.hashSync('password123', 10);
    const AliceId = 'user_alice_admin_123';
    const BobId = 'user_bob_builder_456';
    const CharlieId = 'user_charlie_ceo_789';
    const DianaId = 'user_diana_design_012';

    store.users = [
        { _id: AliceId, name: 'Alice Admin', email: 'alice@test.com', password: pwd, role: 'admin', isActive: true },
        { _id: BobId, name: 'Bob Builder', email: 'bob@test.com', password: pwd, role: 'member', isActive: true },
        { _id: CharlieId, name: 'Charlie CEO', email: 'charlie@test.com', password: pwd, role: 'admin', isActive: true },
        { _id: DianaId, name: 'Diana Design', email: 'diana@test.com', password: pwd, role: 'member', isActive: true },
        { _id: 'u5', name: 'Eddie Engineer', email: 'eddie@test.com', password: pwd, role: 'member', isActive: true },
        { _id: 'u6', name: 'Fiona Finance', email: 'fiona@test.com', password: pwd, role: 'member', isActive: true },
        { _id: 'u7', name: 'George Growth', email: 'george@test.com', password: pwd, role: 'member', isActive: true },
        { _id: 'u8', name: 'Hannah HR', email: 'hannah@test.com', password: pwd, role: 'member', isActive: true }
    ];
    store.teams = [
        { _id: 'team_frontend_123', name: 'Frontend Engineering', description: 'The team building the ActionMeet web app.', createdBy: AliceId, members: [{ user: AliceId, role: 'admin', joinedAt: new Date(), isActive: true }, { user: BobId, role: 'member', joinedAt: new Date(), isActive: true }], isActive: true },
        { _id: 'team_leadership_456', name: 'Executive Leadership', description: 'High-level strategy planning.', createdBy: CharlieId, members: [{ user: CharlieId, role: 'admin', joinedAt: new Date(), isActive: true }, { user: AliceId, role: 'member', joinedAt: new Date(), isActive: true }], isActive: true }
    ];

    const now = new Date();
    const futureDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    store.meetings = [
        { _id: 'meeting_ui_sync_123', title: 'Weekly UI Sync', description: 'Sync on the latest dashboard redesign.', host: AliceId, team: 'team_frontend_123', participants: [{ user: BobId, status: 'confirmed' }, { user: DianaId, status: 'invited' }], scheduledFor: futureDate, meetingType: 'recurring', status: 'scheduled' },
        { _id: 'meeting_kickoff_456', title: 'Q1 Kickoff Review', description: 'Past meeting to review Q1 metrics.', host: CharlieId, participants: [{ user: AliceId, status: 'attended' }], scheduledFor: pastDate, meetingType: 'regular', status: 'completed' }
    ];
    store.agendas = [
        { _id: 'a1', meeting: 'meeting_ui_sync_123', title: 'Finalize Dark Mode CSS', description: 'Check color palette.', status: 'open', responsiblePerson: { user: AliceId }, order: 1, createdBy: AliceId },
        { _id: 'a2', meeting: 'meeting_ui_sync_123', title: 'Add Member API Integration', description: 'Hook up modal.', status: 'open', responsiblePerson: { user: BobId }, order: 2, createdBy: AliceId },
        { _id: 'a3', meeting: 'meeting_kickoff_456', title: 'Review Revenue Numbers', description: 'Check MRR.', status: 'completed', responsiblePerson: { user: CharlieId }, order: 1, createdBy: CharlieId },
        { _id: 'a4', meeting: 'meeting_kickoff_456', title: 'Investigate server crash', description: 'Port 3001.', status: 'open', responsiblePerson: { user: AliceId }, order: 2, createdBy: CharlieId }
    ];
    store.meetings[0].agenda = ['a1', 'a2'];
    store.meetings[1].agenda = ['a3', 'a4'];
    console.log(`🌱 Mock Store seeded with ${store.users.length} users, ${store.teams.length} teams, and ${store.meetings.length} meetings.`);
};

seed();

module.exports = store;
