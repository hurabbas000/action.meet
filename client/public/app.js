// ActionMeet Main Application JavaScript

// API Configuration
const API_BASE_URL = 'http://localhost:3003/api';

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
            loadUserData();
            loadMeetings();
        } else {
            console.log('🔐 No user authenticated');
            showLogin();
        }
    });
}

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    submitBtn.disabled = true;
    
    showMessage('success-message', 'Signing in...');
    
    // Add timeout to handle slow responses
    const timeout = setTimeout(() => {
        showMessage('error-message', 'Sign in is taking longer than expected. Please check your connection and try again.');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }, 10000); // 10 second timeout
    
    // Use backend API instead of Firebase
    fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
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
                showMessage('success-message', '');
                showApp();
                loadMeetings();
            }, 1000);
        } else {
            showMessage('error-message', data.message);
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    })
    .catch((error) => {
        clearTimeout(timeout);
        console.error('❌ Login error:', error);
        showMessage('error-message', 'Network error. Please check your connection.');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

function handleSignup(event) {
    event.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validation
    if (password !== confirmPassword) {
        showMessage('signup-error', 'Passwords do not match. Please try again.');
        return;
    }
    
    if (password.length < 6) {
        showMessage('signup-error', 'Password must be at least 6 characters long.');
        return;
    }
    
    showMessage('signup-success', 'Creating account...');
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('✅ Account created:', userCredential.user.email);
            showMessage('signup-success', 'Account created successfully!');
            setTimeout(() => {
                showLogin();
                showMessage('signup-success', 'Please sign in with your new account.');
            }, 2000);
        })
        .catch((error) => {
            console.error('❌ Signup error:', error);
            let errorMessage = error.message;
            
            // Provide user-friendly error messages
            switch(error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'An account with this email already exists.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Please enter a valid email address.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak. Please choose a stronger password.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
            }
            
            showMessage('signup-error', errorMessage);
        });
}

function handleLogout() {
    auth.signOut().then(() => {
        console.log('✅ User logged out');
        showLogin();
    });
}

// UI functions
function showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('form-title').textContent = 'Welcome Back';
    document.getElementById('form-subtitle').textContent = 'Sign in to access your meetings';
    clearMessages();
}

function showSignup() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
    document.getElementById('form-title').textContent = 'Create Account';
    document.getElementById('form-subtitle').textContent = 'Join ActionMeet to manage your meetings';
    clearMessages();
}

function showApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
}

function clearMessages() {
    showMessage('error-message', '');
    showMessage('success-message', '');
    showMessage('signup-error', '');
    showMessage('signup-success', '');
}

function showMessage(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = message ? 'block' : 'none';
    }
}

function loadUserData() {
    if (currentUser) {
        const userName = document.getElementById('user-name');
        const userRole = document.getElementById('user-role');
        
        if (userName) {
            userName.textContent = currentUser.displayName || currentUser.email;
        }
        if (userRole) {
            userRole.textContent = 'Host'; // Default role
        }
    }
}

function loadMeetings() {
    if (!currentUser || !window.db) {
        console.error('❌ Cannot load meetings: user not authenticated or db not initialized');
        return;
    }
    
    console.log('📅 Loading meetings for user:', currentUser.uid);
    
    db.collection('meetings')
        .where('participants', 'array-contains', currentUser.uid)
        .orderBy('scheduledFor', 'desc')
        .get()
        .then((querySnapshot) => {
            meetings = [];
            querySnapshot.forEach((doc) => {
                meetings.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            console.log('✅ Meetings loaded:', meetings.length, 'meetings');
            updateMeetingsGrid();
        })
        .catch((error) => {
            console.error('❌ Error loading meetings:', error);
        });
}

function updateMeetingsGrid() {
    const meetingsGrid = document.querySelector('#dashboard-page .meetings-grid');
    if (!meetingsGrid) return;
    
    if (meetings.length === 0) {
        meetingsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px;">
                <i class="fas fa-calendar" style="font-size: 64px; color: var(--gray); margin-bottom: 16px;"></i>
                <p style="font-size: 16px; color: var(--text-secondary);">No meetings yet. Create your first meeting!</p>
            </div>
        `;
        return;
    }
    
    meetingsGrid.innerHTML = meetings.map(meeting => `
        <div class="meeting-card" onclick="openMeeting('${meeting.id}')">
            <div class="meeting-header">
                <div>
                    <div class="meeting-title">${meeting.title || 'Untitled Meeting'}</div>
                    <div class="meeting-date">
                        <i class="fas fa-calendar"></i> ${formatDate(meeting.scheduledFor)}
                    </div>
                </div>
                <span class="status-badge upcoming">Upcoming</span>
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
        </div>
    `).join('');
}

function openMeeting(meetingId) {
    console.log('📂 Opening meeting:', meetingId);
    // In a real app, this would navigate to meeting detail page
    alert(`Opening meeting: ${meetingId}`);
}

// Modal functions
function openCreateMeetingModal() {
    const modal = document.getElementById('create-meeting-modal');
    if (modal) {
        modal.style.display = 'block';
        setDefaultDateTime();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function handleCreateMeeting(event) {
    event.preventDefault();
    
    const title = document.getElementById('meeting-title-input').value;
    const date = document.getElementById('meeting-date-input').value;
    
    if (!currentUser || !window.db) {
        console.error('❌ Cannot create meeting: user not authenticated or db not initialized');
        return;
    }
    
    const meetingData = {
        title: title,
        scheduledFor: new Date(date),
        createdAt: new Date(),
        host: currentUser.uid,
        participants: [currentUser.uid],
        status: 'scheduled',
        totalTasks: 0,
        completedTasks: 0,
        completionRate: 0
    };
    
    console.log('📝 Creating meeting:', meetingData);
    
    db.collection('meetings').add(meetingData)
        .then((docRef) => {
            console.log('✅ Meeting created with ID:', docRef.id);
            closeModal('create-meeting-modal');
            document.getElementById('create-meeting-form').reset();
            loadMeetings(); // Reload meetings
        })
        .catch((error) => {
            console.error('❌ Error creating meeting:', error);
            alert('Error creating meeting: ' + error.message);
        });
}

function setDefaultDateTime() {
    const dateInput = document.getElementById('meeting-date-input');
    if (dateInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInput.value = now.toISOString().slice(0, 16);
    }
}

function formatDate(date) {
    if (!date) return 'No date';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Page navigation
function showPage(page) {
    // Hide all pages
    document.querySelectorAll('[id$="-page"]').forEach(p => {
        p.style.display = 'none';
    });
    
    // Show selected page
    const pageElement = document.getElementById(page + '-page');
    if (pageElement) {
        pageElement.style.display = 'block';
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
