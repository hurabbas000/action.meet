# ActionMeet Firebase Setup Guide

## ✅ Configuration Updated
Your Firebase configuration has been successfully added to `firebase.js`.

## 🔧 Next Steps - Complete Setup

### 1. Enable Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `actionmeet-63273`
3. Navigate to **Authentication** → **Sign-in method**
4. Click **Add new provider**
5. Select **Email/Password**
6. Enable it and click **Save**

### 2. Create Firestore Database
1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (we'll secure it later)
4. Select a location (choose closest to your users)
5. Click **Enable**

### 3. Update Security Rules
1. Go to **Firestore Database** → **Rules**
2. Replace the existing rules with this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    match /meetings/{meetingId} {
      allow read, write: if request.auth != null;
    }
    match /agendaPoints/{agendaId} {
      allow read, write: if request.auth != null;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

### 4. Create Database Indexes
1. Go to **Firestore Database** → **Indexes**
2. Click **Add index** and create these indexes:

**Index 1:**
- Collection: `agendaPoints`
- Fields: `meetingId` (Ascending), `createdAt` (Ascending)

**Index 2:**
- Collection: `agendaPoints`  
- Fields: `meetingId` (Ascending), `status` (Ascending)

**Index 3:**
- Collection: `meetings`
- Fields: `date` (Descending)

**Index 4:**
- Collection: `users`
- Fields: `phone` (Ascending)

### 5. Test Your Application
1. Open `index.html` in your browser
2. Try to create a new user account
3. Login and test creating meetings and agenda points

## 🚀 Deployment (Optional)
To deploy to Firebase Hosting:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy
firebase deploy
```

## 🔍 Troubleshooting

### Common Issues:
1. **"Firebase not defined"** - Make sure you're connected to internet
2. **"Permission denied"** - Check that security rules are published
3. **"Missing or insufficient permissions"** - Ensure Authentication is enabled

### Console Check:
Open browser console (F12) and look for:
- ✅ "Firestore offline persistence enabled"
- ❌ Any error messages

## 📱 Testing Checklist
- [ ] User can sign up with email/password
- [ ] User can login
- [ ] Dashboard shows meetings list
- [ ] Can create new meeting
- [ ] Can add agenda points
- [ ] Can mark tasks as closed
- [ ] Open tasks carry forward to new meetings

Your ActionMeet application is now ready to use!
