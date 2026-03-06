# ActionMeet Backend API

## 🚀 Complete Meeting Management System Backend

This backend supports all ActionMeet features including user authentication, team management, meeting scheduling, agenda management, recurring meetings, and notifications.

## 📋 Features Supported

### ✅ **Feature 1: User Access & Team Management**
- User registration/login with JWT authentication
- Team creation and member management
- Role-based access control (admin, member, viewer)
- User profile management

### ✅ **Feature 2: Meeting Scheduling & Dashboard**
- Create, update, and delete meetings
- Meeting dashboard with statistics
- Participant management
- Meeting status tracking

### ✅ **Feature 3: Agenda & Task Management**
- Create and manage agenda items
- Assign responsible persons
- Track task status (open, in-progress, completed)
- Action items with due dates

### ✅ **Feature 4: Task Continuity & Reminder System**
- Carry forward open tasks to next meetings
- WhatsApp reminder system (Twilio integration)
- Email notifications
- Task deadline tracking

### ✅ **Feature 5: Recurring & Follow-up Meetings**
- Parent meeting creation
- Recurrence patterns (daily, weekly, monthly)
- Follow-up meeting management
- Automatic task carry-forward

## 🛠️ Technology Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication tokens
- **Twilio** - WhatsApp integration
- **Nodemailer** - Email notifications
- **Node-cron** - Scheduled tasks

## 📦 Installation

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start MongoDB
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo

# Or install MongoDB locally
# Follow MongoDB installation guide
```

### 4. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

## 🔗 API Endpoints

### **Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### **Teams**
- `GET /api/team` - Get user teams
- `POST /api/team` - Create team
- `GET /api/team/:id` - Get team details
- `PUT /api/team/:id` - Update team
- `POST /api/team/:id/members` - Add member
- `DELETE /api/team/:id/members/:userId` - Remove member

### **Meetings**
- `GET /api/meetings` - Get user meetings
- `POST /api/meetings` - Create meeting
- `GET /api/meetings/:id` - Get meeting details
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting
- `POST /api/meetings/:id/participants` - Add participant
- `PUT /api/meetings/:id/participants/:userId` - Update participant status

### **Agenda**
- `GET /api/agenda/meeting/:meetingId` - Get meeting agenda
- `POST /api/agenda` - Create agenda item
- `PUT /api/agenda/:id` - Update agenda item
- `DELETE /api/agenda/:id` - Delete agenda item

### **Tasks**
- `GET /api/tasks/my` - Get user tasks

### **Notifications**
- `GET /api/notifications` - Get user notifications

### **Recurring Meetings**
- `GET /api/recurring` - Get recurring meetings

## 🔧 Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/actionmeet

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## 🗄️ Database Schema

### **Users Collection**
```javascript
{
  name: String,
  email: String,
  password: String (hashed),
  role: String,
  phone: String,
  preferences: Object,
  isActive: Boolean,
  lastLogin: Date
}
```

### **Teams Collection**
```javascript
{
  name: String,
  description: String,
  createdBy: ObjectId,
  members: [{
    user: ObjectId,
    role: String,
    joinedAt: Date
  }],
  settings: Object
}
```

### **Meetings Collection**
```javascript
{
  title: String,
  description: String,
  scheduledFor: Date,
  duration: Number,
  host: ObjectId,
  participants: [{
    user: ObjectId,
    status: String
  }],
  team: ObjectId,
  meetingType: String,
  status: String,
  agenda: [ObjectId]
}
```

### **Agenda Collection**
```javascript
{
  title: String,
  description: String,
  meeting: ObjectId,
  status: String,
  priority: String,
  responsiblePerson: {
    user: ObjectId,
    assignedAt: Date
  },
  actionItems: [{
    description: String,
    assignedTo: ObjectId,
    dueDate: Date,
    status: String
  }]
}
```

## 🚀 Deployment

### **Railway**
1. Connect GitHub repository to Railway
2. Set environment variables
3. Deploy automatically

### **Heroku**
```bash
# Install Heroku CLI
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
git push heroku main
```

### **Docker**
```bash
# Build image
docker build -t actionmeet-backend .

# Run container
docker run -p 3001:3001 actionmeet-backend
```

## 📊 API Usage Examples

### **Register User**
```javascript
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890"
}
```

### **Create Meeting**
```javascript
POST /api/meetings
Headers: Authorization: Bearer <token>
{
  "title": "Team Standup",
  "description": "Daily team sync",
  "scheduledFor": "2024-01-15T10:00:00Z",
  "duration": 60,
  "participants": ["userId1", "userId2"]
}
```

### **Create Agenda Item**
```javascript
POST /api/agenda
Headers: Authorization: Bearer <token>
{
  "title": "Discuss project timeline",
  "description": "Review project milestones",
  "meeting": "meetingId",
  "priority": "high",
  "responsiblePerson": "userId"
}
```

## 🔒 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Input validation
- MongoDB injection protection
- XSS protection
- Helmet security headers

## 📝 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📞 Support

For issues and questions:
- Create GitHub issue
- Check documentation
- Review API examples

---

**ActionMeet Backend - Complete Meeting Management Solution** 🚀
