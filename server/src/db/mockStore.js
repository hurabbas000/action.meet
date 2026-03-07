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
        { _id: 'u4', name: 'Diana Design', email: 'diana@test.com', password: pwd, role: 'member', isActive: true }
    ];
    store.notifications = [
        { _id: 'n1', user: 'u1', text: 'Welcome to ActionMeet!', type: 'info', createdAt: new Date(), isRead: false },
        { _id: 'n2', user: 'u1', text: 'New meeting scheduled: Weekly Sync', type: 'success', createdAt: new Date(), isRead: false }
    ];
    console.log('🌱 Mock Store seeded with initial users and notifications.');
};

seed();

module.exports = store;
