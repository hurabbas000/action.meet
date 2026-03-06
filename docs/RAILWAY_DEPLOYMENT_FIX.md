# Railway Deployment - Error Resolution Guide

## 🔥 Common Railway Build Errors & Solutions

### **Error 1: Missing package.json**
```
Error: No package.json found
```
**Solution**: Create proper package.json in root
```json
{
  "name": "actionmeet",
  "version": "1.0.0",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "start": "cd client && npm start",
    "build": "echo 'Build complete'"
  }
}
```

### **Error 2: Port Binding Issues**
```
Error: Port 3000 already in use
Error: EADDRINUSE
```
**Solution**: Use Railway's PORT environment variable
```javascript
// In server/src/app.js
const PORT = process.env.PORT || 3001;

// In client code
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-app.railway.app' 
  : 'http://localhost:3001';
```

### **Error 3: Firebase Configuration Issues**
```
Error: Firebase initialization failed
Error: Invalid Firebase configuration
```
**Solution**: Use environment variables
```javascript
// In client/public/firebase-config.js
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "your-key",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "actionmeet-63273.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "actionmeet-63273",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "actionmeet-63273.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "511256922245",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:511256922245:web:1d5ac7f5439c2bb43f81ec"
};
```

### **Error 4: Build Process Failures**
```
Error: npm install failed
Error: Build script not found
```
**Solution**: Fix package.json scripts
```json
{
  "scripts": {
    "start": "serve -s client/public -p $PORT",
    "build": "echo 'Static build complete'",
    "install-client": "cd client && npm install",
    "install-server": "cd server && npm install",
    "postinstall": "npm run install-client && npm run install-server"
  }
}
```

---

## 🛠️ Complete Railway Setup

### **Step 1: Root package.json**
Create this in your project root:
```json
{
  "name": "actionmeet",
  "version": "1.0.0",
  "description": "AI-powered meeting agenda and task tracking system",
  "main": "client/public/index.html",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "start": "serve -s client/public -p $PORT",
    "build": "echo 'Static build complete'",
    "install-deps": "npm install serve"
  },
  "dependencies": {
    "serve": "^14.2.1"
  },
  "devDependencies": {},
  "keywords": ["meeting", "agenda", "task", "firebase", "railway"],
  "author": "ActionMeet Team",
  "license": "MIT"
}
```

### **Step 2: Update Firebase Config**
Replace `client/public/firebase-config.js`:
```javascript
// Use Railway environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBInxnda18rzrTEzYdo0PL2Q0-ThmrsXrI",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "actionmeet-63273.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "actionmeet-63273",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "actionmeet-63273.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "511256922245",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:511256922245:web:1d5ac7f5439c2bb43f81ec"
};
```

### **Step 3: Railway Environment Variables**
Set these in Railway dashboard:
```
NODE_ENV=production
PORT=3000
REACT_APP_FIREBASE_API_KEY=AIzaSyBInxnda18rzrTEzYdo0PL2Q0-ThmrsXrI
REACT_APP_FIREBASE_AUTH_DOMAIN=actionmeet-63273.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=actionmeet-63273
REACT_APP_FIREBASE_STORAGE_BUCKET=actionmeet-63273.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=511256922245
REACT_APP_FIREBASE_APP_ID=1:511256922245:web:1d5ac7f5439c2bb43f81ec
```

### **Step 4: Railway Service Configuration**
In Railway dashboard:
1. **Service Type**: Web Service
2. **Build Command**: `npm install && npm start`
3. **Start Command**: `npm start`
4. **Root Directory**: `/`
5. **Port**: 3000

---

## 🔧 Alternative: Static File Serving

### **Option 1: Use Express Server**
Create `server.js` in root:
```javascript
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'client/public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/public/index.html'));
});

app.listen(PORT, () => {
    console.log(`ActionMeet running on port ${PORT}`);
});
```

### **Option 2: Use Nginx/CDN**
Serve static files directly without Node.js:
```json
{
  "scripts": {
    "start": "npx serve -s client/public -l 3000"
  }
}
```

---

## 🚀 Railway Deployment Steps

### **1. Connect GitHub to Railway**
1. Go to Railway dashboard
2. Click "New Project"
3. Connect GitHub repository
4. Select `actionmeet` repository

### **2. Configure Service**
1. **Service Type**: Web Service
2. **Root Directory**: `/`
3. **Build Command**: `npm install && npm start`
4. **Start Command**: `npm start`

### **3. Set Environment Variables**
Add all Firebase variables from Step 3

### **4. Deploy**
1. Click "Deploy"
2. Monitor build logs
3. Fix any errors that appear

---

## 🔍 Debugging Railway Issues

### **Check Build Logs**
1. Go to Railway dashboard
2. Click on your service
3. View "Logs" tab
4. Look for specific error messages

### **Common Issues & Fixes**

#### **Issue: "Cannot find module"**
```
Error: Cannot find module 'express'
```
**Fix**: Add to package.json dependencies
```json
{
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

#### **Issue: "Permission denied"**
```
Error: EACCES: permission denied
```
**Fix**: Use Railway's PORT variable
```javascript
const PORT = process.env.PORT || 3000;
```

#### **Issue: "Firebase not defined"**
```
Error: firebase is not defined
```
**Fix**: Check script loading order
```html
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="firebase-config.js"></script>
```

#### **Issue: "Port already in use"**
```
Error: listen EADDRINUSE :::3000
```
**Fix**: Use Railway's dynamic port
```javascript
app.listen(process.env.PORT || 3000);
```

---

## 🎯 Success Indicators

### **✅ Successful Deployment**
- Railway shows "Running" status
- Build logs show "Build successful"
- Application loads at Railway URL
- Firebase connection works
- No console errors

### **🔧 If Still Failing**
1. **Check Railway logs** for specific errors
2. **Verify environment variables** are set correctly
3. **Test locally** with Railway's environment
4. **Simplify build** - remove complex steps
5. **Use static serving** instead of Node.js

---

## 🆘 Railway Support

### **Documentation**
- Railway Docs: https://docs.railway.app/
- Static Sites: https://docs.railway.app/deploy/static-sites
- Environment Variables: https://docs.railway.app/deploy/environment-variables

### **Community**
- Railway Discord: https://discord.gg/railway
- GitHub Issues: https://github.com/railwayapp/railway/issues

---

**Follow these steps to resolve your Railway deployment issues!** 🚀
