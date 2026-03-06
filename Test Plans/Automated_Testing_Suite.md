# ActionMeet - Automated Testing Suite

## 🤖 Overview
This document provides comprehensive automated testing strategies for the ActionMeet application using modern testing frameworks and tools.

---

## 🧪 Testing Stack

### Frontend Testing
- **Cypress**: End-to-end testing
- **Jest**: Unit testing
- **Testing Library**: Component testing
- **Lighthouse**: Performance and accessibility testing

### Backend Testing
- **Firebase Emulator Suite**: Local testing
- **Jest**: Database operations testing
- **Custom scripts**: API endpoint testing

---

## 📁 Test Structure

```
tests/
├── e2e/
│   ├── auth/
│   ├── meetings/
│   ├── agenda/
│   └── integration/
├── unit/
│   ├── components/
│   ├── utils/
│   └── services/
├── integration/
│   ├── firebase/
│   └── workflows/
└── performance/
    ├── lighthouse/
    └── load-testing/
```

---

## 🔐 Authentication Tests

### Cypress E2E Tests
```javascript
// cypress/e2e/auth/login.cy.js
describe('User Authentication', () => {
  beforeEach(() => {
    cy.visit('index.html');
  });

  it('should register new user successfully', () => {
    cy.get('#show-signup').click();
    cy.get('#signup-email').type('test@example.com');
    cy.get('#signup-password').type('TestPass123!');
    cy.get('#signupForm').submit();
    cy.url().should('include', 'dashboard.html');
    cy.get('#user-email').should('contain', 'test@example.com');
  });

  it('should login existing user', () => {
    cy.get('#email').type('test@example.com');
    cy.get('#password').type('TestPass123!');
    cy.get('#loginForm').submit();
    cy.url().should('include', 'dashboard.html');
  });

  it('should reject invalid credentials', () => {
    cy.get('#email').type('test@example.com');
    cy.get('#password').type('wrongpassword');
    cy.get('#loginForm').submit();
    cy.get('#login-error').should('be.visible');
  });

  it('should logout successfully', () => {
    // Login first
    cy.login('test@example.com', 'TestPass123!');
    cy.get('#logout-btn').click();
    cy.url().should('include', 'index.html');
  });
});
```

### Unit Tests
```javascript
// tests/unit/auth/auth.service.test.js
describe('AuthService', () => {
  beforeEach(() => {
    cy.visit('index.html', {
      onBeforeLoad(win) {
        win.firebase = {
          auth: () => ({
            signInWithEmailAndPassword: cy.stub(),
            createUserWithEmailAndPassword: cy.stub(),
            signOut: cy.stub()
          })
        };
      }
    });
  });

  it('should validate email format', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'user+tag@example.org'
    ];
    
    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'user@.com'
    ];

    validEmails.forEach(email => {
      expect(validateEmail(email)).to.be.true;
    });

    invalidEmails.forEach(email => {
      expect(validateEmail(email)).to.be.false;
    });
  });
});
```

---

## 📅 Meeting Management Tests

### Cypress E2E Tests
```javascript
// cypress/e2e/meetings/meeting-management.cy.js
describe('Meeting Management', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'TestPass123!');
    cy.visit('dashboard.html');
  });

  it('should create new meeting', () => {
    cy.get('#create-meeting-btn').click();
    cy.get('#meeting-title').type('Weekly Standup');
    cy.get('#meeting-date').type('2026-03-10T10:00');
    cy.get('#create-meeting-form').submit();
    
    cy.get('.meeting-card').should('contain', 'Weekly Standup');
    cy.get('.meeting-card').should('contain', 'Mar 10, 2026');
  });

  it('should display meetings in chronological order', () => {
    // Create multiple meetings
    const meetings = [
      { title: 'Old Meeting', date: '2026-03-01T10:00' },
      { title: 'New Meeting', date: '2026-03-15T10:00' },
      { title: 'Recent Meeting', date: '2026-03-08T10:00' }
    ];

    meetings.forEach(meeting => {
      cy.createMeeting(meeting.title, meeting.date);
    });

    cy.get('.meeting-card').eq(0).should('contain', 'New Meeting');
    cy.get('.meeting-card').eq(1).should('contain', 'Recent Meeting');
    cy.get('.meeting-card').eq(2).should('contain', 'Old Meeting');
  });

  it('should navigate to meeting details', () => {
    cy.createMeeting('Test Meeting', '2026-03-10T10:00');
    cy.get('.meeting-card').first().click();
    cy.url().should('include', 'meeting.html');
    cy.get('#meeting-title').should('contain', 'Test Meeting');
  });
});
```

### Integration Tests
```javascript
// tests/integration/meetings/meeting.service.test.js
describe('Meeting Service Integration', () => {
  let testDb;

  before(async () => {
    testDb = await initializeTestFirestore();
  });

  afterEach(async () => {
    await testDb.clear();
  });

  it('should save meeting to Firestore', async () => {
    const meetingData = {
      title: 'Test Meeting',
      date: new Date('2026-03-10T10:00:00'),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await testDb.collection('meetings').add(meetingData);
    const doc = await docRef.get();

    expect(doc.exists).to.be.true;
    expect(doc.data().title).to.equal('Test Meeting');
  });

  it('should retrieve meetings in correct order', async () => {
    const meetings = [
      { title: 'Meeting 1', date: new Date('2026-03-01') },
      { title: 'Meeting 2', date: new Date('2026-03-15') },
      { title: 'Meeting 3', date: new Date('2026-03-08') }
    ];

    for (const meeting of meetings) {
      await testDb.collection('meetings').add(meeting);
    }

    const snapshot = await testDb
      .collection('meetings')
      .orderBy('date', 'desc')
      .get();

    const titles = snapshot.docs.map(doc => doc.data().title);
    expect(titles).to.deep.equal(['Meeting 2', 'Meeting 3', 'Meeting 1']);
  });
});
```

---

## 📝 Agenda Management Tests

### Cypress E2E Tests
```javascript
// cypress/e2e/agenda/agenda-management.cy.js
describe('Agenda Management', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'TestPass123!');
    cy.createMeeting('Test Meeting', '2026-03-10T10:00');
    cy.visit('meeting.html?id=test-meeting-id');
  });

  it('should add agenda point', () => {
    cy.get('#add-agenda-btn').click();
    cy.get('#agenda-text').type('Review project timeline');
    cy.get('#responsible-name').type('John Doe');
    cy.get('#responsible-phone').type('1234567890');
    cy.get('#agenda-status').select('open');
    cy.get('#agenda-form').submit();

    cy.get('.agenda-item').should('contain', 'Review project timeline');
    cy.get('.agenda-item').should('contain', 'John Doe');
    cy.get('.agenda-item').should('contain', '1234567890');
    cy.get('#open-count').should('contain', '1');
  });

  it('should edit agenda point', () => {
    cy.createAgendaPoint('Original task', 'Jane Doe', '9876543210');
    cy.get('.btn-edit').click();
    cy.get('#agenda-text').clear().type('Updated task');
    cy.get('#agenda-form').submit();

    cy.get('.agenda-item').should('contain', 'Updated task');
  });

  it('should mark agenda point as closed', () => {
    cy.createAgendaPoint('Open task', 'John Doe', '1234567890');
    cy.get('.btn-close').click();
    
    cy.get('.agenda-item').should('have.class', 'closed');
    cy.get('#closed-count').should('contain', '1');
    cy.get('#open-count').should('contain', '0');
  });

  it('should delete agenda point', () => {
    cy.createAgendaPoint('Task to delete', 'John Doe', '1234567890');
    cy.get('.btn-delete').click();
    cy.on('window:confirm', () => true);
    
    cy.get('.agenda-item').should('not.exist');
  });
});
```

---

## 🔄 Task Continuity Tests

### Cypress E2E Tests
```javascript
// cypress/e2e/continuity/task-carry-forward.cy.js
describe('Task Carry Forward', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'TestPass123!');
  });

  it('should carry forward open tasks to new meeting', () => {
    // Create first meeting with agenda points
    cy.createMeeting('Meeting 1', '2026-03-01T10:00');
    cy.visit('meeting.html?id=meeting-1-id');
    
    // Create agenda points
    cy.createAgendaPoint('Open task 1', 'John Doe', '1234567890');
    cy.createAgendaPoint('Open task 2', 'Jane Doe', '9876543210');
    cy.createAgendaPoint('Closed task', 'Bob Smith', '5555555555');
    
    // Mark one task as closed
    cy.get('.agenda-item').eq(2).find('.btn-close').click();
    
    // Create new meeting
    cy.visit('dashboard.html');
    cy.createMeeting('Meeting 2', '2026-03-08T10:00');
    cy.visit('meeting.html?id=meeting-2-id');
    
    // Verify carry forward
    cy.get('.agenda-item').should('have.length', 2);
    cy.get('.agenda-item').should('contain', 'Open task 1');
    cy.get('.agenda-item').should('contain', 'Open task 2');
    cy.get('.agenda-item').should('not.contain', 'Closed task');
  });
});
```

---

## 📱 Responsive Design Tests

### Cypress Tests
```javascript
// cypress/e2e/responsive/responsive-design.cy.js
describe('Responsive Design', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1200, height: 800 }
  ];

  viewports.forEach(viewport => {
    describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      beforeEach(() => {
        cy.viewport(viewport.width, viewport.height);
        cy.login('test@example.com', 'TestPass123!');
      });

      it('should display dashboard correctly', () => {
        cy.visit('dashboard.html');
        cy.get('.container').should('be.visible');
        
        if (viewport.width < 768) {
          cy.get('.dashboard-header').should('have.css', 'flex-direction', 'column');
        }
      });

      it('should handle modals correctly', () => {
        cy.visit('dashboard.html');
        cy.get('#create-meeting-btn').click();
        cy.get('.modal-content').should('be.visible');
        
        // Check modal fits viewport
        cy.get('.modal-content').then($modal => {
          const modalWidth = $modal.width();
          expect(modalWidth).to.be.lte(viewport.width - 40);
        });
      });
    });
  });
});
```

---

## ⚡ Performance Tests

### Lighthouse CI
```javascript
// tests/performance/lighthouse/performance.test.js
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

describe('Performance Tests', () => {
  let chrome;

  before(async () => {
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  });

  after(async () => {
    await chrome.kill();
  });

  it('should meet performance thresholds', async () => {
    const options = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance'],
      port: chrome.port
    };

    const runnerResult = await lighthouse('http://localhost:3000', options);
    const { lhr } = runnerResult;

    expect(lhr.categories.performance.score).to.be.gte(0.9);
    expect(lhr.audits['first-contentful-paint'].numericValue).to.be.lte(2000);
    expect(lhr.audits['largest-contentful-paint'].numericValue).to.be.lte(2500);
  });
});
```

### Load Testing
```javascript
// tests/performance/load/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  let response = http.get('http://localhost:3000/dashboard.html');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

---

## 🔧 Test Configuration

### Cypress Configuration
```javascript
// cypress.config.js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    env: {
      firebaseProjectId: 'actionmeet-63273',
      testEmail: 'test@example.com',
      testPassword: 'TestPass123!'
    }
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack'
    }
  }
});
```

### Package.json Scripts
```json
{
  "scripts": {
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:unit": "jest",
    "test:performance": "lighthouse http://localhost:3000 --output=reports",
    "test:load": "k6 run tests/performance/load/load-test.js",
    "test:all": "npm run test:unit && npm run test:e2e && npm run test:performance"
  }
}
```

---

## 🚀 Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Start application
      run: npm start &
    
    - name: Wait for app to start
      run: sleep 30
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Run performance tests
      run: npm run test:performance
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

---

## 📊 Test Reports

### Coverage Reports
```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### HTML Reports
```javascript
// cypress.config.js
module.exports = {
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: 'cypress/reports',
    charts: true,
    reportPageTitle: 'ActionMeet Test Report'
  }
};
```

---

## 📋 Test Execution Checklist

### Pre-Test Setup
- [ ] Firebase emulator running
- [ ] Test database cleaned
- [ ] Application server running
- [ ] Test data prepared

### Test Execution
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance tests within thresholds
- [ ] Security tests passing

### Post-Test Analysis
- [ ] Coverage reports generated
- [ ] Performance reports reviewed
- [ ] Test artifacts archived
- [ ] Results documented

---

**Automated Testing Suite Version**: 1.0
**Last Updated**: 2026-03-06
**Compatible With**: ActionMeet v1.0
