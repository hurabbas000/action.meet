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
const seed = async () => {
    const pwd = await bcrypt.hash('password123', 10);
    store.users = [
        { _id: 'u1', name: 'Alice Admin', email: 'alice@test.com', password: pwd, role: 'admin', isActive: true },
        { _id: 'u2', name: 'Bob Builder', email: 'bob@test.com', password: pwd, role: 'member', isActive: true },
        { _id: 'u3', name: 'Charlie CEO', email: 'charlie@test.com', password: pwd, role: 'admin', isActive: true },
        { _id: 'u4', name: 'Diana Design', email: 'diana@test.com', password: pwd, role: 'member', isActive: true },
        { _id: 'u5', name: 'Eddie Engineer', email: 'eddie@test.com', password: pwd, role: 'member', isActive: true },
        { _id: 'u6', name: 'Fiona Finance', email: 'fiona@test.com', password: pwd, role: 'member', isActive: true },
        { _id: 'u7', name: 'George Growth', email: 'george@test.com', password: pwd, role: 'member', isActive: true },
        { _id: 'u8', name: 'Hannah HR', email: 'hannah@test.com', password: pwd, role: 'member', isActive: true }
    ];
    store.teams = [
        { _id: 't1', name: 'Frontend Engineering', description: 'The team building the ActionMeet web app.', createdBy: 'u1', members: [{ user: 'u1', role: 'admin' }, { user: 'u2', role: 'member' }], isActive: true },
        { _id: 't2', name: 'Executive Leadership', description: 'High-level strategy planning.', createdBy: 'u3', members: [{ user: 'u3', role: 'admin' }, { user: 'u1', role: 'member' }], isActive: true }
    ];
    store.meetings = [
        { _id: 'm1', title: 'Weekly UI Sync', description: 'Sync on the latest dashboard redesign.', host: 'u1', team: 't1', participants: [{ user: 'u2', status: 'confirmed' }, { user: 'u4', status: 'invited' }], scheduledFor: new Date(Date.now() + 86400000), status: 'scheduled' }
    ];
    store.notifications = [
        { _id: 'n1', user: 'u1', text: 'Welcome to ActionMeet!', type: 'info', createdAt: new Date(), isRead: false },
        { _id: 'n2', user: 'u1', text: 'New meeting scheduled: Weekly Sync', type: 'success', createdAt: new Date(), isRead: false }
    ];
    console.log('🌱 Mock Store seeded with initial users, teams, and meetings.');
};

seed();

module.exports = store;
