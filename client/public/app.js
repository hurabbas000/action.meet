// ActionMeet Main Application JavaScript

// API Configuration - Dynamic based on environment
const API_BASE_URL = window.location.hostname === 'actionmeet.up.railway.app'
    ? 'https://actionmeet-api.up.railway.app/api'
    : 'http://localhost:3001/api';

// Global state
let currentUser = null;
let meetings = [];
let authToken = null;
let currentFilter = 'all';
let selectedMeeting = null;

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 ActionMeet app initializing...');
    checkAuthState();
    setDefaultDateTime();
});

function checkAuthState() {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('currentUser');

    if (storedToken && storedUser) {
        authToken = storedToken;
        try {
            currentUser = JSON.parse(storedUser);
            showApp();
            loadMeetings();
        } catch (e) {
            handleLogout();
        }
    } else {
        showLogin();
    }
}

// ============================================================
// AUTH
// ============================================================
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.data.user;
            authToken = data.data.token;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMessage('success-message', 'Login successful!');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            setTimeout(() => { showApp(); loadMeetings(); }, 800);
        } else {
            showMessage('error-message', data.message || 'Login failed');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('error-message', 'Cannot connect to server. Is the backend running?');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        showMessage('error-message', 'Passwords do not match');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('success-message', 'Account created! Please sign in.');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            setTimeout(() => showLogin(), 1500);
        } else {
            showMessage('error-message', data.message || 'Signup failed');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('error-message', 'Cannot connect to server. Is the backend running?');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    meetings = [];
    showLogin();
}

// ============================================================
// PAGE TRANSITIONS
// ============================================================
function showApp() {
    const loginPage = document.getElementById('login-page');
    const appPage = document.getElementById('app-page');
    if (loginPage) loginPage.classList.add('hidden');
    if (appPage) appPage.classList.remove('hidden');
    updateUserProfile();
    showDashboard();
}

function showLogin() {
    const loginPage = document.getElementById('login-page');
    const appPage = document.getElementById('app-page');
    if (appPage) appPage.classList.add('hidden');
    if (loginPage) loginPage.classList.remove('hidden');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    if (loginForm) loginForm.classList.remove('hidden');
    if (signupForm) signupForm.classList.add('hidden');
}

function showSignup() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.remove('hidden');
}

// ============================================================
// NAV
// ============================================================
function showDashboard() {
    _updateNav('dashboard');
    _showPage('dashboard-page');
    setPageTitle('Dashboard');
}

function showMyTasks() {
    _updateNav('tasks');
    _showPage('tasks-page');
    setPageTitle('My Tasks');
    loadTasks();
}

function showNotifications() {
    _updateNav('notifications');
    _showPage('notifications-page');
    setPageTitle('Notifications');
    loadNotifications();
}

function showRecurring() {
    _updateNav('recurring');
    _showPage('recurring-page');
    setPageTitle('Recurring Meetings');
    loadRecurring();
}

function setPageTitle(title) {
    const el = document.getElementById('page-title');
    if (el) el.textContent = title;
}

function _updateNav(page) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const map = { 'dashboard': 0, 'tasks': 1, 'notifications': 2, 'recurring': 3 };
    const navEls = document.querySelectorAll('.nav-item');
    if (map[page] !== undefined && navEls[map[page]]) {
        navEls[map[page]].classList.add('active');
    }
}

function _showPage(pageId) {
    document.querySelectorAll('.content-area').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(pageId);
    if (target) target.classList.remove('hidden');
}

// ============================================================
// USER PROFILE
// ============================================================
function updateUserProfile() {
    if (!currentUser) return;
    const nameEl = document.getElementById('user-name');
    const roleEl = document.getElementById('user-role');
    if (nameEl) nameEl.textContent = currentUser.name || currentUser.email;
    if (roleEl) roleEl.textContent = (currentUser.role || 'member').charAt(0).toUpperCase() + (currentUser.role || 'member').slice(1);
}

// ============================================================
// MEETINGS
// ============================================================
async function loadMeetings() {
    try {
        const response = await fetch(`${API_BASE_URL}/meetings`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.status === 401) { handleLogout(); return; }

        const data = await response.json();

        if (data.success) {
            meetings = data.data.meetings;
            updateMeetingsGrid();
            updateUserProfile();
        } else {
            showMeetingsError('Failed to load meetings');
        }
    } catch (error) {
        console.error('Error loading meetings:', error);
        showMeetingsError('Cannot connect to server');
    }
}

function showMeetingsError(msg) {
    const grid = document.getElementById('meetings-grid');
    if (grid) grid.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle empty-icon" style="color:var(--danger)"></i><h3 class="empty-text">${msg}</h3></div>`;
}

function updateDashboardStats() {
    const total = meetings.length;
    const upcoming = meetings.filter(m => ['upcoming', 'scheduled', 'open'].includes(m.status)).length;
    const completed = meetings.filter(m => m.status === 'completed').length;
    const hosting = meetings.filter(m => {
        const hostId = m.host && (m.host._id || m.host.id || m.host);
        const userId = currentUser && (currentUser._id || currentUser.id);
        return hostId && userId && String(hostId) === String(userId);
    }).length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('stat-total-meetings', total);
    set('stat-upcoming-meetings', upcoming);
    set('stat-completed-meetings', completed);
    set('stat-hosting-meetings', hosting);
}

function updateMeetingsGrid() {
    const meetingsGrid = document.getElementById('meetings-grid');
    if (!meetingsGrid) return;

    updateDashboardStats();

    // Apply current filter
    let filtered = meetings;
    if (currentFilter === 'upcoming') {
        filtered = meetings.filter(m => ['upcoming', 'scheduled', 'open'].includes(m.status));
    } else if (currentFilter === 'past') {
        filtered = meetings.filter(m => m.status === 'completed' || new Date(m.scheduledFor) < new Date());
    } else if (currentFilter === 'recurring') {
        filtered = meetings.filter(m => m.meetingType === 'recurring');
    }

    if (filtered.length === 0) {
        meetingsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar empty-icon"></i>
                <h3 class="empty-text">No meetings found</h3>
                <p class="empty-text">Click the <strong>+</strong> button to create your first meeting!</p>
            </div>`;
        return;
    }

    meetingsGrid.innerHTML = filtered.map(meeting => {
        const meetingId = meeting._id || meeting.id;
        const userId = currentUser && (currentUser._id || currentUser.id);
        const hostId = meeting.host && (meeting.host._id || meeting.host.id || meeting.host);
        const isHost = String(hostId) === String(userId);
        const participantCount = meeting.participants ? meeting.participants.length : 0;
        const participantNames = meeting.participants
            ? meeting.participants.slice(0, 3)
                .map(p => (p.user && p.user.name) ? p.user.name : 'Unknown')
                .join(', ') + (meeting.participants.length > 3 ? ` +${meeting.participants.length - 3} others` : '')
            : '';

        const statusClass = meeting.status || 'upcoming';

        return `
        <div class="meeting-card" onclick="viewMeetingDetails('${meetingId}')">
            <div class="meeting-header">
                <div>
                    <div class="meeting-title">${meeting.title}</div>
                    <div class="meeting-date">
                        <i class="fas fa-calendar"></i> ${formatDate(meeting.scheduledFor)}
                    </div>
                    <div class="meeting-participants" style="font-size:13px;color:#666;margin-top:4px;">
                        <i class="fas fa-users"></i> ${participantCount} participant${participantCount !== 1 ? 's' : ''}
                    </div>
                    ${participantNames ? `<div style="font-size:12px;color:#888;margin-top:2px;">${participantNames}</div>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                    <span class="role-badge ${isHost ? 'host' : 'participant'}" style="padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;background:${isHost ? '#dbeafe' : '#f3e8ff'};color:${isHost ? 'var(--blue)' : 'var(--purple)'};">${isHost ? 'Host' : 'Participant'}</span>
                    <span class="status-badge ${statusClass}">${statusClass.charAt(0).toUpperCase() + statusClass.slice(1)}</span>
                </div>
            </div>
            <div class="progress-section">
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${meeting.completionRate || 0}%;"></div>
                </div>
                <div class="progress-text">
                    <span>${meeting.completedTasks || 0} of ${meeting.totalTasks || 0} tasks done</span>
                    <span>${meeting.completionRate || 0}%</span>
                </div>
            </div>
            <div class="meeting-actions">
                <button class="btn-action primary" onclick="event.stopPropagation(); viewMeetingDetails('${meetingId}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn-action secondary" onclick="event.stopPropagation(); confirmDeleteMeeting('${meetingId}', '${meeting.title.replace(/'/g, "\\'")}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>`;
    }).join('');
}

function filterMeetings(filter, clickedEl) {
    currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    if (clickedEl) clickedEl.classList.add('active');
    updateMeetingsGrid();
}

function formatDate(dateString) {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short',
        day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

// ============================================================
// MEETING DETAIL MODAL
// ============================================================
function viewMeetingDetails(meetingId) {
    const meeting = meetings.find(m => (m._id || m.id) === meetingId);
    if (!meeting) return alert('Meeting not found');

    selectedMeeting = meeting;

    const userId = currentUser && (currentUser._id || currentUser.id);
    const hostId = meeting.host && (meeting.host._id || meeting.host.id || meeting.host);
    const isHost = String(hostId) === String(userId);
    const hostName = meeting.host && meeting.host.name ? meeting.host.name : 'Unknown';

    const participants = (meeting.participants || []).map(p => {
        const name = p.user && p.user.name ? p.user.name : 'Unknown';
        const email = p.user && p.user.email ? p.user.email : '';
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:#f8fafc;border-radius:8px;margin-bottom:6px;">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--indigo),var(--purple));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px;">${name.charAt(0)}</div>
            <div><div style="font-weight:600;font-size:13px;">${name}</div><div style="font-size:12px;color:#666;">${email}</div></div>
            <span style="margin-left:auto;font-size:11px;padding:2px 8px;border-radius:4px;background:#e2e8f0;">${p.status || 'invited'}</span>
        </div>`;
    }).join('') || '<p style="color:#666;font-size:14px;">No participants added yet.</p>';

    const modalHTML = `
    <div id="meeting-detail-modal" class="modal" style="display:flex;">
        <div class="modal-content" style="max-width:580px;">
            <span class="close" onclick="closeDetailModal()">&times;</span>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
                <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,var(--indigo),var(--purple));display:flex;align-items:center;justify-content:center;color:white;font-size:20px;">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div>
                    <h2 style="color:var(--navy);margin:0;">${meeting.title}</h2>
                    <span class="status-badge ${meeting.status || 'upcoming'}" style="margin-top:4px;display:inline-block;">${(meeting.status || 'upcoming').charAt(0).toUpperCase() + (meeting.status || 'upcoming').slice(1)}</span>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                <div style="background:#f8fafc;padding:14px;border-radius:10px;">
                    <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Date & Time</div>
                    <div style="font-weight:600;margin-top:4px;">${formatDate(meeting.scheduledFor)}</div>
                </div>
                <div style="background:#f8fafc;padding:14px;border-radius:10px;">
                    <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Duration</div>
                    <div style="font-weight:600;margin-top:4px;">${meeting.duration || 60} minutes</div>
                </div>
                <div style="background:#f8fafc;padding:14px;border-radius:10px;">
                    <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Host</div>
                    <div style="font-weight:600;margin-top:4px;">${hostName} ${isHost ? '(You)' : ''}</div>
                </div>
                <div style="background:#f8fafc;padding:14px;border-radius:10px;">
                    <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Location</div>
                    <div style="font-weight:600;margin-top:4px;">${meeting.location || 'Not specified'}</div>
                </div>
            </div>

            ${meeting.description ? `<div style="background:#f8fafc;padding:14px;border-radius:10px;margin-bottom:20px;"><div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Description</div><p style="margin:0;color:var(--text-primary);">${meeting.description}</p></div>` : ''}

            <div style="margin-bottom:20px;">
                <h4 style="margin-bottom:12px;color:var(--navy);">Participants (${(meeting.participants || []).length})</h4>
                ${participants}
            </div>

            ${isHost ? `
            <div style="display:flex;gap:10px;border-top:1px solid #e2e8f0;padding-top:16px;">
                <button class="btn-action secondary" style="flex:1;" onclick="closeDetailModal()">Close</button>
                <button class="btn-action primary" style="flex:1;background:var(--danger);" onclick="closeDetailModal(); confirmDeleteMeeting('${meetingId}', '${meeting.title.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i> Delete Meeting</button>
            </div>` : `<button class="btn-action secondary" style="width:100%;" onclick="closeDetailModal()">Close</button>`}
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeDetailModal() {
    const modal = document.getElementById('meeting-detail-modal');
    if (modal) modal.remove();
}

async function confirmDeleteMeeting(meetingId, title) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await deleteMeeting(meetingId);
}

async function deleteMeeting(meetingId) {
    try {
        const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (data.success) {
            meetings = meetings.filter(m => (m._id || m.id) !== meetingId);
            updateMeetingsGrid();
            showMessage('success-message', 'Meeting deleted successfully');
        } else {
            alert(data.message || 'Could not delete meeting');
        }
    } catch (err) {
        alert('Network error deleting meeting');
    }
}

// ============================================================
// CREATE MEETING
// ============================================================
function openCreateMeetingModal() {
    const modal = document.getElementById('create-meeting-modal');
    if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

async function handleCreateMeeting(event) {
    event.preventDefault();

    const title = document.getElementById('meeting-title-input').value.trim();
    const date = document.getElementById('meeting-date-input').value;
    const description = document.getElementById('meeting-description-input').value.trim();

    if (!title || !date) {
        alert('Please fill in the meeting title and date.');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/meetings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ title, description, scheduledFor: new Date(date).toISOString() })
        });

        const data = await response.json();

        if (data.success) {
            closeModal('create-meeting-modal');
            event.target.reset();
            setDefaultDateTime();
            showMessage('success-message', '✅ Meeting created successfully!');
            await loadMeetings();
        } else {
            alert(data.message || 'Failed to create meeting');
        }
    } catch (error) {
        console.error('Error creating meeting:', error);
        alert('Network error. Is the backend running?');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ============================================================
// TASKS
// ============================================================
async function loadTasks() {
    const container = document.getElementById('tasks-container');
    if (container) container.innerHTML = '<p style="text-align:center;padding:32px;color:#64748b;">Loading tasks...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/my`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.status === 401) { handleLogout(); return; }

        const data = await response.json();

        if (data.success) {
            renderTasks(data.data.tasks);
        } else {
            if (container) container.innerHTML = '<div class="empty-state"><i class="fas fa-tasks empty-icon"></i><h3 class="empty-text">No tasks yet</h3></div>';
        }
    } catch (error) {
        if (container) container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle empty-icon" style="color:var(--danger)"></i><h3 class="empty-text">Cannot connect to server</h3></div>';
    }
}

function renderTasks(tasks) {
    const container = document.getElementById('tasks-container');
    if (!container) return;

    if (!tasks || tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks empty-icon"></i>
                <h3 class="empty-text">No tasks assigned yet</h3>
                <p class="empty-text">Tasks assigned to you from meetings will appear here.</p>
            </div>`;
        return;
    }

    container.innerHTML = tasks.map(task => {
        const meetingTitle = task.meeting && task.meeting.title ? task.meeting.title : 'Unknown meeting';
        const dueDate = task.actionItems && task.actionItems[0] && task.actionItems[0].dueDate
            ? formatDate(task.actionItems[0].dueDate) : 'No due date';

        return `
        <div style="background:white;border-radius:12px;padding:20px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.04);border-left:4px solid var(--indigo);">
            <div style="font-weight:600;color:var(--navy);margin-bottom:6px;">${task.title || 'Untitled Task'}</div>
            <div style="font-size:13px;color:#64748b;margin-bottom:4px;"><i class="fas fa-calendar"></i> ${dueDate}</div>
            <div style="font-size:13px;color:#94a3b8;"><i class="fas fa-video"></i> From: ${meetingTitle}</div>
        </div>`;
    }).join('');
}

// ============================================================
// NOTIFICATIONS
// ============================================================
async function loadNotifications() {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        // Notifications endpoint returns placeholder data, which is fine
    } catch (err) {
        console.log('Notifications: server unreachable');
    }
}

// ============================================================
// RECURRING MEETINGS
// ============================================================
async function loadRecurring() {
    try {
        const response = await fetch(`${API_BASE_URL}/recurring`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) return;
        const data = await response.json();
        // Render recurring meetings if any
        const container = document.getElementById('recurring-page');
        if (data.success && data.data.recurringMeetings.length > 0) {
            // Recurring data is available, the existing HTML template shows sample data
        }
    } catch (err) {
        console.log('Recurring: server unreachable');
    }
}

// ============================================================
// PARTICIPANT SEARCH
// ============================================================
async function searchParticipants() {
    const searchQuery = document.getElementById('participant-search').value;
    const checkboxesContainer = document.getElementById('participants-checkboxes');

    if (searchQuery.length < 2) {
        checkboxesContainer.innerHTML = '<p style="color:#666;font-style:italic;">Enter at least 2 characters</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(searchQuery)}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        if (data.success && data.data.users.length > 0) {
            const filteredUsers = data.data.users.filter(u => {
                const uid = u._id || u.id;
                const myId = currentUser._id || currentUser.id;
                return String(uid) !== String(myId);
            });

            checkboxesContainer.innerHTML = filteredUsers.map(user => {
                const uid = user._id || user.id;
                return `<div style="display:flex;align-items:center;padding:8px;border-bottom:1px solid #eee;">
                    <input type="checkbox" id="p-${uid}" value="${uid}" class="participant-checkbox" style="margin-right:12px;">
                    <label for="p-${uid}" style="flex:1;cursor:pointer;">
                        <div style="font-weight:500;">${user.name}</div>
                        <div style="font-size:13px;color:#666;">${user.email}</div>
                    </label>
                </div>`;
            }).join('') || '<p style="color:#666;">No other users found.</p>';
        } else {
            checkboxesContainer.innerHTML = '<p style="color:#666;">No users found.</p>';
        }
    } catch (error) {
        checkboxesContainer.innerHTML = '<p style="color:var(--danger);">Error searching users.</p>';
    }
}

// ============================================================
// UTILITIES
// ============================================================
function showMessage(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 4000);
    }
}

function setDefaultDateTime() {
    const dateInput = document.getElementById('meeting-date-input');
    if (dateInput) {
        const now = new Date();
        now.setHours(now.getHours() + 1, 0, 0, 0);
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInput.value = now.toISOString().slice(0, 16);
    }
}

// Close modals on outside click
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
    if (event.target.id === 'meeting-detail-modal') {
        closeDetailModal();
    }
};

console.log('✅ ActionMeet app.js loaded successfully!');
