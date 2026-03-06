# ActionMeet Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- Docker and Docker Compose installed
- OpenAI API key (get from https://platform.openai.com/)

---

## 📋 Step 1: Environment Setup

1. **Clone and navigate to project**
```bash
cd windsurf-project
```

2. **Copy environment file**
```bash
cp .env.example .env
```

3. **Edit .env file with your OpenAI API key**
```env
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

---

## 🐳 Step 2: Start Docker Services

1. **Start MongoDB and Redis**
```bash
docker-compose up mongodb redis -d
```

2. **Wait for services to be ready** (30 seconds)

3. **Verify MongoDB is running**
```bash
docker exec -it actionmeet-mongodb mongosh
# You should see MongoDB shell prompt
```

---

## 🔧 Step 3: Backend Setup (Iteration 1)

1. **Create server directory and basic structure**
```bash
mkdir -p server/src/{controllers,models,routes,middleware,services,utils}
```

2. **Initialize Node.js project**
```bash
cd server
npm init -y
```

3. **Install dependencies**
```bash
npm install express mongoose redis cors dotenv jsonwebtoken bcryptjs openai
npm install -D nodemon concurrently
```

4. **Create basic server file** (server/src/app.js)
```javascript
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Redis Connection
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect()
  .then(() => console.log('✅ Redis connected'))
  .catch(err => console.error('❌ Redis connection error:', err));

// Basic Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'ActionMeet API is running' });
});

// Import routes (will be created next)
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/meetings', require('./routes/meetings'));
// app.use('/api/ai', require('./routes/ai'));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

5. **Update package.json scripts**
```json
{
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js"
  }
}
```

---

## ⚛️ Step 4: Frontend Setup (Iteration 1)

1. **Create React app**
```bash
cd ../
npx create-react-app client --template typescript
cd client
```

2. **Install additional dependencies**
```bash
npm install axios react-router-dom @types/react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

3. **Configure Tailwind** (tailwind.config.js)
```javascript
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

4. **Add Tailwind to CSS** (src/index.css)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 🤖 Step 5: OpenAI Integration

1. **Create AI service** (server/src/services/aiService.js)
```javascript
const OpenAI = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateMeetingSummary(meetingData) {
    const prompt = `
      Generate a comprehensive summary for the following meeting:
      
      Title: ${meetingData.title}
      Date: ${meetingData.date}
      Agenda Points: ${meetingData.agendaPoints?.map(point => point.text).join(', ') || 'None'}
      
      Please provide:
      1. Executive summary (2-3 sentences)
      2. Key decisions made
      3. Action items with priorities
      4. Recommendations for next meeting
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return 'AI summary unavailable';
    }
  }

  async suggestAgendaPoints(meetingTitle, previousAgendas = []) {
    const prompt = `
      Based on the meeting title "${meetingTitle}" and previous agenda points,
      suggest 5 relevant agenda points for the upcoming meeting.
      
      Previous agenda points: ${previousAgendas.map(a => a.text).join(', ')}
      
      Format as a JSON array of objects with text and estimatedDuration fields.
      Example: [{"text": "Review Q4 metrics", "estimatedDuration": "15 minutes"}]
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.6
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return [];
    }
  }
}

module.exports = new AIService();
```

2. **Create AI route** (server/src/routes/ai.js)
```javascript
const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

// Generate meeting summary
router.post('/summary', async (req, res) => {
  try {
    const { meetingData } = req.body;
    const summary = await aiService.generateMeetingSummary(meetingData);
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suggest agenda points
router.post('/suggest-agenda', async (req, res) => {
  try {
    const { meetingTitle, previousAgendas } = req.body;
    const suggestions = await aiService.suggestAgendaPoints(meetingTitle, previousAgendas);
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

3. **Add AI route to main app** (add to server/src/app.js)
```javascript
app.use('/api/ai', require('./routes/ai'));
```

---

## 🎯 Step 6: Test Everything

1. **Start the backend server**
```bash
cd server
npm run dev
```

2. **In another terminal, start the frontend**
```bash
cd client
npm start
```

3. **Test the API**
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test AI summary (replace with your data)
curl -X POST http://localhost:3000/api/ai/summary \
  -H "Content-Type: application/json" \
  -d '{"meetingData": {"title": "Team Standup", "date": "2026-03-06"}}'
```

4. **Open your browser**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api/health

---

## ✅ Success Indicators

You should see:
- ✅ MongoDB connection established
- ✅ Redis connection established
- ✅ Server running on port 3000
- ✅ React app running on port 5173
- ✅ OpenAI API responding to requests

---

## 🛠️ Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB container is running
docker ps | grep mongodb

# Check MongoDB logs
docker logs actionmeet-mongodb

# Restart MongoDB
docker restart actionmeet-mongodb
```

### OpenAI API Issues
- Verify your API key is correct
- Check if you have credits in your OpenAI account
- Ensure the API key has proper permissions

### Port Conflicts
- If ports 3000 or 5173 are in use, modify docker-compose.yml
- Change ports to 3001 and 5174 respectively

---

## 📋 What's Next?

After completing this quick start:

1. **Explore the AI features**: Try the AI summary and agenda suggestions
2. **Build the UI**: Create meeting management interface
3. **Add authentication**: Implement user login/registration
4. **Run tests**: Execute the test plans from the Test Plans folder

---

## 📞 Need Help?

- Check the full [Development Plan](./DEVELOPMENT_PLAN.md)
- Review the [Test Plans](./Test Plans/)
- Check the [Features](./Features/) documentation

---

**Quick Start Version**: 1.0
**Last Updated**: 2026-03-06
