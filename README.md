# ActionMeet - Meeting Agenda & Task Tracking System

A full-stack web application for managing meeting agendas and tracking tasks with team members.

## Features

- **User Authentication**: Email/password login with Firebase Authentication
- **Meeting Management**: Create, view, and manage meetings
- **Agenda Tracking**: Add, edit, and delete agenda points
- **Task Assignment**: Assign responsibilities to team members with contact information
- **Status Tracking**: Mark tasks as open or closed
- **Automatic Carry Forward**: Open tasks from previous meetings automatically carry forward
- **Contact Database**: Store and manage team member contact information
- **WhatsApp Reminders**: Structure for Twilio-based WhatsApp reminders (backend implementation required)

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Hosting**: Firebase Hosting
- **Firebase SDK**: Version 10.7.1 (modular)

## Project Structure

```
actionmeet/
├── index.html              # Login/Signup page
├── dashboard.html          # Main dashboard
├── meeting.html            # Meeting details and agenda management
├── style.css              # Global styles
├── firebase.js            # Firebase configuration
├── app.js                 # Main application logic
├── firebase.json          # Firebase deployment configuration
├── firestore.rules        # Firestore security rules
├── firestore.indexes.json # Firestore database indexes
└── README.md              # This file
```

## Setup Instructions

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project named "ActionMeet"
3. Enable Authentication (Email/Password method)
4. Enable Firestore Database
5. Enable Firebase Hosting

### 2. Configure Firebase

1. Open `firebase.js`
2. Replace the placeholder configuration with your Firebase project config:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key-here",
     authDomain: "your-project-id.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id-here"
   };
   ```

### 3. Deploy Security Rules

1. In Firebase Console, go to Firestore Database → Rules
2. Replace the default rules with the content from `firestore.rules`
3. Publish the rules

### 4. Create Database Indexes

1. In Firebase Console, go to Firestore Database → Indexes
2. Create the indexes defined in `firestore.indexes.json`
3. Alternatively, deploy using Firebase CLI: `firebase deploy --only firestore:indexes`

### 5. Local Development

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Initialize Firebase in project: `firebase init`
4. Serve locally: `firebase serve`

### 6. Deployment

1. Deploy to Firebase Hosting: `firebase deploy`

## Data Structure

### Collections

#### users
```javascript
{
  name: string,
  phone: string,
  createdAt: timestamp
}
```

#### meetings
```javascript
{
  title: string,
  date: timestamp,
  createdAt: timestamp
}
```

#### agendaPoints
```javascript
{
  meetingId: string,
  text: string,
  responsiblePerson: string,
  phone: string,
  status: 'open' | 'closed',
  createdAt: timestamp,
  carriedForward: boolean (optional)
}
```

## Features Implementation

### Authentication
- Email/password signup and login
- Session management
- Protected routes

### Dashboard
- List of all meetings
- Meeting statistics (open/closed tasks)
- Create new meeting functionality
- Navigation to meeting details

### Meeting Management
- Create meetings with title and date
- Automatic carry forward of open agenda points
- Meeting details display

### Agenda Management
- Add agenda points with responsible person
- Edit and delete agenda points
- Status tracking (open/closed)
- Responsible person contact information

### Contact Database
- Automatic storage of responsible persons
- Phone number management
- Integration with agenda assignment

### WhatsApp Reminders (Structure)
- Placeholder for Twilio integration
- Reminder logic for open tasks
- Message templates

## Security

- Firebase Authentication for user access
- Firestore security rules for data protection
- Input validation and sanitization
- No sensitive data exposed on frontend

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please create an issue in the repository.

## Future Enhancements

- Real-time collaboration
- File attachments for agenda points
- Meeting minutes generation
- Calendar integration
- Advanced reporting and analytics
- Mobile app development
- Email notifications
- Advanced user roles and permissions
