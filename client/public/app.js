// ActionMeet Main Application JavaScript

// API Configuration
const API_BASE_URL = 'http://localhost:3004/api';

// Global state
let currentUser = null;
let meetings = [];
let authToken = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 ActionMeet app initializing...');
    checkAuthState();
    setDefaultDateTime();
});

// Authentication functions
function checkAuthState() {
    // Wait for Firebase to be available
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase SDK not loaded');
        setTimeout(checkAuthState, 1000); // Retry after 1 second
        return;
    }
    
    if (!window.auth) {
        console.error('❌ Firebase auth not initialized');
        setTimeout(checkAuthState, 1000); // Retry after 1 second
        return;
    }
    
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            console.log('✅ User authenticated:', user.email);
            showApp();
            loadMeetings();
        } else {
            console.log('🔐 No user authenticated');
            showLogin();
        }
    });
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';
    submitBtn.disabled = true;
    
    // Add timeout to handle slow responses
    const timeout = setTimeout(() => {
        showMessage('error-message', 'Sign in is taking longer than expected. Please check your connection and try again.');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }, 10000); // 10 second timeout
    
    try {
        console.log('🔍 Attempting login to:', `${API_BASE_URL}/auth/login`);
        console.log('📧 Email:', email);
        console.log('🔑 Password provided:', !!password);
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', response.headers);
        
        const data = await response.json();
        console.log('📊 Response data:', data);
        
        clearTimeout(timeout);
        
        if (data.success) {
            console.log('✅ Login successful:', data.data.user.email);
            currentUser = data.data.user;
            authToken = data.data.token;
            
            // Store in localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showMessage('success-message', 'Login successful!');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            setTimeout(() => {
                showApp();
                loadMeetings();
            }, 1000);
        } else {
            showMessage('error-message', data.message || 'Login failed');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        clearTimeout(timeout);
        console.error('Login error:', error);
        showMessage('error-message', 'Network error. Please try again.');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    meetings = [];
    
    showMessage('success-message', 'Logged out successfully!');
    
    setTimeout(() => {
        showLogin();
    }, 500);
}

// Show signup form
function showSignup() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.remove('hidden');
    document.getElementById('login-toggle-text').textContent = 'Already have an account? ';
    document.getElementById('signup-link').textContent = 'Sign In';
    document.getElementById('signup-toggle').classList.add('hidden');
}

// Show login form
function showLogin() {
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('login-toggle-text').textContent = "Don't have an account? ";
    document.getElementById('signup-link').textContent = 'Sign Up';
    document.getElementById('signup-toggle').classList.remove('hidden');
}

// Handle signup
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
    
    try {
        console.log('🔍 Attempting signup to:', `${API_BASE_URL}/auth/signup`);
        console.log('👤 Name:', name);
        console.log('📧 Email:', email);
        console.log('🔑 Password provided:', !!password);
        
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        console.log('📡 Signup response status:', response.status);
        
        const data = await response.json();
        console.log('📊 Signup response data:', data);
        
        if (data.success) {
            showMessage('success-message', 'Account created successfully!');
            showLogin();
        } else {
            showMessage('error-message', data.message || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('error-message', 'Network error. Please try again.');
    }
}

// Show message
function showMessage(elementId, message) {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.classList.remove('hidden');
        
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, 3000);
    }
}

// Load meetings from backend
async function loadMeetings() {
    try {
        const response = await fetch(`${API_BASE_URL}/meetings`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            meetings = data.data.meetings;
            currentUser = data.data.currentUser || currentUser;
            updateMeetingsGrid();
            
            // Update user info in UI
            if (currentUser) {
                updateUserProfile();
            }
        } else {
            showMessage('error-message', 'Failed to load meetings');
        }
    } catch (error) {
        console.error('Error loading meetings:', error);
        showMessage('error-message', 'Network error loading meetings');
    }
}

// Update meetings grid
function updateMeetingsGrid() {
    const meetingsGrid = document.querySelector('#dashboard-page .meetings-grid');
    if (!meetingsGrid) return;
    
    if (meetings.length === 0) {
        meetingsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar empty-icon"></i>
                <h3 class="empty-text">No meetings yet</h3>
                <p class="empty-text">Create your first meeting to get started!</p>
            </div>
        `;
        return;
    }
    
    meetingsGrid.innerHTML = meetings.map(meeting => {
        const isHost = meeting.host && currentUser && meeting.host.id === currentUser.id;
        const participantCount = meeting.participants ? meeting.participants.length : 0;
        const participantNames = meeting.participants ? 
            meeting.participants.slice(0, 3).map(p => p.user.name).join(', ') + 
            (meeting.participants.length > 3 ? ` +${meeting.participants.length - 3} others` : '') : '';
        
        return `
        <div class="meeting-card" onclick="openMeeting('${meeting.id}')">
            <div class="meeting-header">
                <div>
                    <div class="meeting-title">${meeting.title}</div>
                    <div class="meeting-date">
                        <i class="fas fa-calendar"></i> ${formatDate(meeting.scheduledFor)}
                    </div>
                    <div class="meeting-participants" style="font-size: 14px; color: #666; margin-top: 4px;">
                        <i class="fas fa-users"></i> ${participantCount} participants
                    </div>
                    ${participantNames ? `<div class="participant-names" style="font-size: 12px; color: #888; margin-top: 2px;">${participantNames}</div>` : ''}
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    ${isHost ? '<span class="role-badge host">Host</span>' : '<span class="role-badge participant">Participant</span>'}
                    <span class="status-badge ${meeting.status}">${meeting.status}</span>
                </div>
            </div>
            <div class="progress-section">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${meeting.completionRate || 0}%;"></div>
                </div>
                <div class="progress-text">
                    <span>${meeting.completedTasks || 0} of ${meeting.totalTasks || 0} tasks completed</span>
                    <span>${meeting.completionRate || 0}%</span>
                </div>
            </div>
            <div class="meeting-actions">
                <button class="btn-action primary" onclick="event.stopPropagation(); openMeeting('${meeting.id}')">
                    <i class="fas fa-video"></i> Join
                </button>
                <button class="btn-action secondary" onclick="event.stopPropagation(); viewDetails('${meeting.id}')">
                    <i class="fas fa-info-circle"></i> Details
                </button>
            </div>
        </div>`;
    }).join('');
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// Open meeting
function openMeeting(meetingId) {
    console.log('📂 Opening meeting:', meetingId);
    alert(`Opening meeting: ${meetingId}`);
}

// View meeting details
function viewDetails(meetingId) {
    console.log('📋 Viewing details for:', meetingId);
    alert(`Viewing details for meeting: ${meetingId}`);
}

// Filter meetings
function filterMeetings(filter) {
    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter logic would go here
    console.log('Filtering meetings by:', filter);
    
    // For now, just reload all meetings
    updateMeetingsGrid();
}

// Page navigation
function showDashboard() {
    currentPage = 'dashboard';
    updateActiveNavItem('dashboard');
    showPage('dashboard-page');
    document.getElementById('page-title').textContent = 'Dashboard';
}

function showMyTasks() {
    currentPage = 'tasks';
    updateActiveNavItem('tasks');
    showPage('tasks-page');
    document.getElementById('page-title').textContent = 'My Tasks';
    loadTasks();
}

function showNotifications() {
    currentPage = 'notifications';
    updateActiveNavItem('notifications');
    showPage('notifications-page');
    document.getElementById('page-title').textContent = 'Notifications';
}

function showRecurring() {
    currentPage = 'recurring';
    updateActiveNavItem('recurring');
    showPage('recurring-page');
    document.getElementById('page-title').textContent = 'Recurring Meetings';
}

// Update active navigation item
function updateActiveNavItem(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const navItems = {
        'dashboard': 0,
        'tasks': 1,
        'notifications': 2,
        'recurring': 3
    };
    
    if (navItems[page] !== undefined) {
        document.querySelectorAll('.nav-item')[navItems[page]].classList.add('active');
    }
}

// Show specific page
function showPage(pageId) {
    document.querySelectorAll('.content-area > div').forEach(page => {
        page.classList.add('hidden');
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }
}

// Load tasks
async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateTasksDisplay(data.data.tasks);
        } else {
            console.error('Failed to load tasks');
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Update tasks display
function updateTasksDisplay(tasks) {
    const tasksContainer = document.getElementById('tasks-container');
    if (!tasksContainer) return;
    
    if (!tasks || tasks.length === 0) {
        tasksContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks empty-icon"></i>
                <h3 class="empty-text">No tasks assigned yet</h3>
                <p class="empty-text">Tasks assigned to you will appear here</p>
            </div>
        `;
        return;
    }
    
    // Task display logic would go here
    tasksContainer.innerHTML = '<p>Tasks will be displayed here</p>';
}

// Modal functions
function openCreateMeetingModal() {
    const modal = document.getElementById('create-meeting-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle create meeting
async function handleCreateMeeting(event) {
    event.preventDefault();
    
    const title = document.getElementById('meeting-title-input').value;
    const date = document.getElementById('meeting-date-input').value;
    const description = document.getElementById('meeting-description-input').value;
    
    // Get selected participants
    const selectedParticipants = Array.from(document.querySelectorAll('.participant-checkbox:checked'))
        .map(checkbox => checkbox.value);
    
    const meetingData = {
        title: title,
        description: description,
        scheduledFor: new Date(date),
        participants: selectedParticipants
    };
    
    showMessage('success-message', 'Creating meeting...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/meetings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(meetingData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('success-message', 'Meeting created successfully!');
            closeModal('create-meeting-modal');
            loadMeetings(); // Refresh meetings list
        } else {
            showMessage('error-message', data.message);
        }
    } catch (error) {
        console.error('Error creating meeting:', error);
        showMessage('error-message', 'Network error creating meeting');
    }
}

// Search and display participants
async function searchParticipants() {
    const searchQuery = document.getElementById('participant-search').value;
    const checkboxesContainer = document.getElementById('participants-checkboxes');
    
    if (searchQuery.length < 2) {
        checkboxesContainer.innerHTML = '<p style="color: #666; font-style: italic;">Enter at least 2 characters to search</p>';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        
        if (data.success) {
            const users = data.data.users.filter(user => user.id !== currentUser.id); // Don't show current user
            
            checkboxesContainer.innerHTML = users.map(user => `
                <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
                    <input type="checkbox" id="participant-${user.id}" value="${user.id}" class="participant-checkbox" style="margin-right: 12px;">
                    <label for="participant-${user.id}" style="flex: 1; cursor: pointer;">
                        <div style="font-weight: 500; color: var(--navy);">${user.name}</div>
                        <div style="font-size: 14px; color: #666;">${user.email}</div>
                    </label>
                </div>
            `).join('');
        } else {
            checkboxesContainer.innerHTML = '<p style="color: #d32f2f;">No users found</p>';
        }
    } catch (error) {
        console.error('Error searching participants:', error);
        checkboxesContainer.innerHTML = '<p style="color: #d32f2f;">Error searching users</p>';
    }
}

// Set default date time
function setDefaultDateTime() {
    const dateInput = document.getElementById('meeting-date-input');
    if (dateInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInput.value = now.toISOString().slice(0, 16);
    }
}

// Show specific page
function showPage(pageId) {
    document.querySelectorAll('.content-area > div').forEach(page => {
        page.classList.add('hidden');
    });
    
    const pageElement = document.getElementById(pageId);
    if (pageElement) {
        pageElement.classList.remove('hidden');
    }
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'meetings': 'All Meetings',
        'my-tasks': 'My Tasks',
        'notifications': 'Notifications',
        'settings': 'Settings'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = titles[page] || 'Dashboard';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

console.log('✅ ActionMeet app.js loaded successfully!');
