// ActionMeet - Meeting Agenda & Task Tracking System
// Main application logic

// Global variables
let currentUser = null;
let currentMeetingId = null;
let meetings = [];
let agendaPoints = [];

// DOM elements
const elements = {
    // Login page
    loginForm: null,
    signupForm: null,
    loginError: null,
    signupError: null,
    showLoginBtn: null,
    showSignupBtn: null,
    
    // Dashboard
    userEmail: null,
    logoutBtn: null,
    meetingsList: null,
    noMeetings: null,
    createMeetingBtn: null,
    createMeetingModal: null,
    createMeetingForm: null,
    
    // Meeting page
    meetingTitle: null,
    meetingDate: null,
    agendaList: null,
    noAgenda: null,
    addAgendaBtn: null,
    agendaModal: null,
    agendaForm: null,
    openCount: null,
    closedCount: null,
    modalTitle: null,
    
    // Common
    backToDashboard: null
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    setupEventListeners();
    checkAuthState();
});

// Initialize DOM elements
function initializeElements() {
    const page = getCurrentPage();
    
    // Login page elements
    if (page === 'login') {
        elements.loginForm = document.getElementById('loginForm');
        elements.signupForm = document.getElementById('signupForm');
        elements.loginError = document.getElementById('login-error');
        elements.signupError = document.getElementById('signup-error');
        elements.showLoginBtn = document.getElementById('show-login');
        elements.showSignupBtn = document.getElementById('show-signup');
    }
    
    // Dashboard elements
    if (page === 'dashboard') {
        elements.userEmail = document.getElementById('user-email');
        elements.logoutBtn = document.getElementById('logout-btn');
        elements.meetingsList = document.getElementById('meetings-list');
        elements.noMeetings = document.getElementById('no-meetings');
        elements.createMeetingBtn = document.getElementById('create-meeting-btn');
        elements.createMeetingModal = document.getElementById('create-meeting-modal');
        elements.createMeetingForm = document.getElementById('create-meeting-form');
    }
    
    // Meeting page elements
    if (page === 'meeting') {
        elements.userEmail = document.getElementById('user-email');
        elements.logoutBtn = document.getElementById('logout-btn');
        elements.meetingTitle = document.getElementById('meeting-title');
        elements.meetingDate = document.getElementById('meeting-date');
        elements.agendaList = document.getElementById('agenda-list');
        elements.noAgenda = document.getElementById('no-agenda');
        elements.addAgendaBtn = document.getElementById('add-agenda-btn');
        elements.agendaModal = document.getElementById('agenda-modal');
        elements.agendaForm = document.getElementById('agenda-form');
        elements.openCount = document.getElementById('open-count');
        elements.closedCount = document.getElementById('closed-count');
        elements.modalTitle = document.getElementById('modal-title');
        elements.backToDashboard = document.getElementById('back-to-dashboard');
    }
}

// Setup event listeners
function setupEventListeners() {
    const page = getCurrentPage();
    
    // Login page events
    if (page === 'login') {
        elements.loginForm?.addEventListener('submit', handleLogin);
        elements.signupForm?.addEventListener('submit', handleSignup);
        elements.showLoginBtn?.addEventListener('click', showLoginForm);
        elements.showSignupBtn?.addEventListener('click', showSignupForm);
    }
    
    // Dashboard events
    if (page === 'dashboard') {
        elements.logoutBtn?.addEventListener('click', handleLogout);
        elements.createMeetingBtn?.addEventListener('click', showCreateMeetingModal);
        elements.createMeetingForm?.addEventListener('submit', handleCreateMeeting);
        
        // Modal close events
        const closeBtn = elements.createMeetingModal?.querySelector('.close');
        const cancelBtn = document.getElementById('cancel-meeting');
        closeBtn?.addEventListener('click', () => hideModal('create-meeting-modal'));
        cancelBtn?.addEventListener('click', () => hideModal('create-meeting-modal'));
    }
    
    // Meeting page events
    if (page === 'meeting') {
        elements.logoutBtn?.addEventListener('click', handleLogout);
        elements.addAgendaBtn?.addEventListener('click', showAddAgendaModal);
        elements.agendaForm?.addEventListener('submit', handleSaveAgenda);
        elements.backToDashboard?.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
        
        // Modal close events
        const closeBtn = elements.agendaModal?.querySelector('.close');
        const cancelBtn = document.getElementById('cancel-agenda');
        closeBtn?.addEventListener('click', () => hideModal('agenda-modal'));
        cancelBtn?.addEventListener('click', () => hideModal('agenda-modal'));
    }
}

// Get current page
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('meeting')) return 'meeting';
    return 'login';
}

// Authentication functions
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        const page = getCurrentPage();
        
        if (user) {
            // User is authenticated
            if (page === 'login') {
                window.location.href = 'dashboard.html';
            } else {
                updateUserEmail(user.email);
                if (page === 'dashboard') {
                    loadMeetings();
                } else if (page === 'meeting') {
                    loadMeetingDetails();
                }
            }
        } else {
            // User is not authenticated
            if (page !== 'login') {
                window.location.href = 'index.html';
            }
        }
    });
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // Login successful, redirect will happen in checkAuthState
        })
        .catch((error) => {
            elements.loginError.textContent = error.message;
        });
}

function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            // Signup successful, redirect will happen in checkAuthState
        })
        .catch((error) => {
            elements.signupError.textContent = error.message;
        });
}

function handleLogout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
}

function showSignupForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
}

function updateUserEmail(email) {
    if (elements.userEmail) {
        elements.userEmail.textContent = email;
    }
}

// Dashboard functions
async function loadMeetings() {
    try {
        const snapshot = await db.collection('meetings')
            .orderBy('date', 'desc')
            .get();
        
        meetings = [];
        snapshot.forEach((doc) => {
            meetings.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get agenda counts for each meeting
        for (let meeting of meetings) {
            const agendaSnapshot = await db.collection('agendaPoints')
                .where('meetingId', '==', meeting.id)
                .get();
            
            meeting.openCount = 0;
            meeting.closedCount = 0;
            
            agendaSnapshot.forEach((doc) => {
                const agenda = doc.data();
                if (agenda.status === 'open') {
                    meeting.openCount++;
                } else {
                    meeting.closedCount++;
                }
            });
        }
        
        renderMeetings();
    } catch (error) {
        console.error('Error loading meetings:', error);
    }
}

function renderMeetings() {
    if (!elements.meetingsList) return;
    
    if (meetings.length === 0) {
        elements.meetingsList.style.display = 'none';
        if (elements.noMeetings) {
            elements.noMeetings.style.display = 'block';
        }
        return;
    }
    
    elements.meetingsList.style.display = 'grid';
    if (elements.noMeetings) {
        elements.noMeetings.style.display = 'none';
    }
    
    elements.meetingsList.innerHTML = meetings.map(meeting => `
        <div class="meeting-card" onclick="goToMeeting('${meeting.id}')">
            <h3>${meeting.title}</h3>
            <p class="meeting-date">${formatDate(meeting.date)}</p>
            <div class="meeting-stats">
                <span class="stat open">${meeting.openCount} Open</span>
                <span class="stat closed">${meeting.closedCount} Closed</span>
            </div>
        </div>
    `).join('');
}

function goToMeeting(meetingId) {
    window.location.href = `meeting.html?id=${meetingId}`;
}

function showCreateMeetingModal() {
    if (elements.createMeetingModal) {
        elements.createMeetingModal.style.display = 'block';
        // Set default date to current datetime
        const dateInput = document.getElementById('meeting-date');
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInput.value = now.toISOString().slice(0, 16);
    }
}

async function handleCreateMeeting(e) {
    e.preventDefault();
    
    const title = document.getElementById('meeting-title').value;
    const date = document.getElementById('meeting-date').value;
    
    try {
        // Create meeting
        const meetingRef = await db.collection('meetings').add({
            title: title,
            date: new Date(date),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Carry forward open agenda points from previous meetings
        await carryForwardOpenAgenda(meetingRef.id);
        
        // Reset form and hide modal
        elements.createMeetingForm.reset();
        hideModal('create-meeting-modal');
        
        // Reload meetings
        await loadMeetings();
        
        // Go to new meeting
        goToMeeting(meetingRef.id);
    } catch (error) {
        console.error('Error creating meeting:', error);
    }
}

async function carryForwardOpenAgenda(newMeetingId) {
    try {
        // Get all open agenda points from previous meetings
        const snapshot = await db.collection('agendaPoints')
            .where('status', '==', 'open')
            .get();
        
        // Add them to the new meeting
        const batch = db.batch();
        snapshot.forEach((doc) => {
            const agendaData = doc.data();
            const newAgendaRef = db.collection('agendaPoints').doc();
            batch.set(newAgendaRef, {
                meetingId: newMeetingId,
                text: agendaData.text,
                responsiblePerson: agendaData.responsiblePerson,
                phone: agendaData.phone,
                status: 'open',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                carriedForward: true
            });
        });
        
        await batch.commit();
    } catch (error) {
        console.error('Error carrying forward agenda:', error);
    }
}

// Meeting page functions
async function loadMeetingDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    currentMeetingId = urlParams.get('id');
    
    if (!currentMeetingId) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    try {
        // Load meeting details
        const meetingDoc = await db.collection('meetings').doc(currentMeetingId).get();
        
        if (!meetingDoc.exists) {
            window.location.href = 'dashboard.html';
            return;
        }
        
        const meeting = meetingDoc.data();
        elements.meetingTitle.textContent = meeting.title;
        elements.meetingDate.textContent = formatDate(meeting.date);
        
        // Load agenda points
        await loadAgendaPoints();
    } catch (error) {
        console.error('Error loading meeting details:', error);
    }
}

async function loadAgendaPoints() {
    try {
        const snapshot = await db.collection('agendaPoints')
            .where('meetingId', '==', currentMeetingId)
            .orderBy('createdAt', 'asc')
            .get();
        
        agendaPoints = [];
        snapshot.forEach((doc) => {
            agendaPoints.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderAgendaPoints();
        updateAgendaStats();
    } catch (error) {
        console.error('Error loading agenda points:', error);
    }
}

function renderAgendaPoints() {
    if (!elements.agendaList) return;
    
    if (agendaPoints.length === 0) {
        elements.agendaList.style.display = 'none';
        if (elements.noAgenda) {
            elements.noAgenda.style.display = 'block';
        }
        return;
    }
    
    elements.agendaList.style.display = 'block';
    if (elements.noAgenda) {
        elements.noAgenda.style.display = 'none';
    }
    
    elements.agendaList.innerHTML = agendaPoints.map(agenda => `
        <div class="agenda-item ${agenda.status}">
            <div class="agenda-content">
                <h4>${agenda.text}</h4>
                <div class="agenda-meta">
                    <span class="responsible">
                        <strong>Responsible:</strong> ${agenda.responsiblePerson}
                    </span>
                    <span class="phone">
                        <strong>Phone:</strong> ${agenda.phone}
                    </span>
                    <span class="status ${agenda.status}">
                        ${agenda.status === 'open' ? '🔴 Open' : '🟢 Closed'}
                    </span>
                </div>
            </div>
            <div class="agenda-actions">
                ${agenda.status === 'open' ? `
                    <button class="btn-close" onclick="closeAgendaPoint('${agenda.id}')">
                        Mark as Closed
                    </button>
                ` : ''}
                <button class="btn-edit" onclick="editAgendaPoint('${agenda.id}')">
                    Edit
                </button>
                <button class="btn-delete" onclick="deleteAgendaPoint('${agenda.id}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

function updateAgendaStats() {
    const openCount = agendaPoints.filter(a => a.status === 'open').length;
    const closedCount = agendaPoints.filter(a => a.status === 'closed').length;
    
    if (elements.openCount) elements.openCount.textContent = openCount;
    if (elements.closedCount) elements.closedCount.textContent = closedCount;
}

function showAddAgendaModal() {
    if (elements.agendaModal) {
        elements.modalTitle.textContent = 'Add Agenda Point';
        elements.agendaForm.reset();
        document.getElementById('agenda-status').value = 'open';
        elements.agendaModal.style.display = 'block';
        elements.agendaForm.dataset.editing = 'false';
    }
}

function editAgendaPoint(agendaId) {
    const agenda = agendaPoints.find(a => a.id === agendaId);
    if (!agenda) return;
    
    if (elements.agendaModal) {
        elements.modalTitle.textContent = 'Edit Agenda Point';
        document.getElementById('agenda-text').value = agenda.text;
        document.getElementById('responsible-name').value = agenda.responsiblePerson;
        document.getElementById('responsible-phone').value = agenda.phone;
        document.getElementById('agenda-status').value = agenda.status;
        elements.agendaModal.style.display = 'block';
        elements.agendaForm.dataset.editing = 'true';
        elements.agendaForm.dataset.agendaId = agendaId;
    }
}

async function handleSaveAgenda(e) {
    e.preventDefault();
    
    const isEditing = elements.agendaForm.dataset.editing === 'true';
    const agendaId = elements.agendaForm.dataset.agendaId;
    
    const agendaData = {
        text: document.getElementById('agenda-text').value,
        responsiblePerson: document.getElementById('responsible-name').value,
        phone: document.getElementById('responsible-phone').value,
        status: document.getElementById('agenda-status').value
    };
    
    try {
        if (isEditing) {
            // Update existing agenda point
            await db.collection('agendaPoints').doc(agendaId).update(agendaData);
        } else {
            // Create new agenda point
            await db.collection('agendaPoints').add({
                meetingId: currentMeetingId,
                ...agendaData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Save responsible person to users collection
            await saveResponsiblePerson(agendaData.responsiblePerson, agendaData.phone);
        }
        
        // Reset form and hide modal
        elements.agendaForm.reset();
        hideModal('agenda-modal');
        
        // Reload agenda points
        await loadAgendaPoints();
    } catch (error) {
        console.error('Error saving agenda point:', error);
    }
}

async function saveResponsiblePerson(name, phone) {
    try {
        // Check if person already exists
        const snapshot = await db.collection('users')
            .where('phone', '==', phone)
            .get();
        
        if (snapshot.empty) {
            // Add new person to users collection
            await db.collection('users').add({
                name: name,
                phone: phone,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error saving responsible person:', error);
    }
}

async function closeAgendaPoint(agendaId) {
    try {
        await db.collection('agendaPoints').doc(agendaId).update({
            status: 'closed'
        });
        
        await loadAgendaPoints();
    } catch (error) {
        console.error('Error closing agenda point:', error);
    }
}

async function deleteAgendaPoint(agendaId) {
    if (!confirm('Are you sure you want to delete this agenda point?')) {
        return;
    }
    
    try {
        await db.collection('agendaPoints').doc(agendaId).delete();
        await loadAgendaPoints();
    } catch (error) {
        console.error('Error deleting agenda point:', error);
    }
}

// Utility functions
function formatDate(date) {
    if (!date) return 'No date set';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// WhatsApp Reminder System (Structure for Twilio integration)
class WhatsAppReminder {
    constructor() {
        // This would be configured with your Twilio credentials
        this.twilioAccountSid = 'your-twilio-account-sid';
        this.twilioAuthToken = 'your-twilio-auth-token';
        this.twilioPhoneNumber = 'your-twilio-phone-number';
    }
    
    async sendReminder(phoneNumber, agendaText, meetingDate) {
        // This is a placeholder for the actual Twilio implementation
        // You would need to implement this on the backend using Firebase Functions
        
        const message = `Reminder: Your assigned agenda task "${agendaText}" is still open. Please complete it before the upcoming meeting on ${formatDate(meetingDate)}.`;
        
        console.log('WhatsApp reminder would be sent:', {
            to: phoneNumber,
            message: message
        });
        
        // Actual implementation would use Twilio API:
        /*
        const twilio = require('twilio')(this.twilioAccountSid, this.twilioAuthToken);
        
        await twilio.messages.create({
            body: message,
            from: `whatsapp:${this.twilioPhoneNumber}`,
            to: `whatsapp:${phoneNumber}`
        });
        */
    }
    
    async checkAndSendReminders() {
        // This function would be called periodically (e.g., daily)
        // to check for upcoming meetings and send reminders
        
        try {
            // Get upcoming meetings (next 24 hours)
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            
            const meetingsSnapshot = await db.collection('meetings')
                .where('date', '>=', now)
                .where('date', '<=', tomorrow)
                .get();
            
            const reminder = new WhatsAppReminder();
            
            for (const meetingDoc of meetingsSnapshot.docs) {
                const meeting = meetingDoc.data();
                
                // Get open agenda points for this meeting
                const agendaSnapshot = await db.collection('agendaPoints')
                    .where('meetingId', '==', meetingDoc.id)
                    .where('status', '==', 'open')
                    .get();
                
                // Send reminders for each open agenda point
                for (const agendaDoc of agendaSnapshot.docs) {
                    const agenda = agendaDoc.data();
                    await reminder.sendReminder(agenda.phone, agenda.text, meeting.date);
                }
            }
        } catch (error) {
            console.error('Error sending reminders:', error);
        }
    }
}

// Export for global access
window.goToMeeting = goToMeeting;
window.closeAgendaPoint = closeAgendaPoint;
window.editAgendaPoint = editAgendaPoint;
window.deleteAgendaPoint = deleteAgendaPoint;
