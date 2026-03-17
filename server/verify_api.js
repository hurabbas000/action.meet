const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

async function runTests() {
    console.log('🧪 Starting API Verification Tests...');
    
    let authToken = '';
    
    // 1. Login Test
    try {
        console.log('📡 Testing Login...');
        const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'alice@test.com', password: 'password123' })
        });
        const loginData = await loginRes.json();
        
        if (loginRes.ok && loginData.success) {
            console.log('✅ Login Successful');
            authToken = loginData.data.token;
        } else {
            console.error('❌ Login Failed:', loginData.message);
            return;
        }
    } catch (err) {
        console.error('❌ Login Connection Error:', err.message);
        return;
    }
    
    // 2. Meetings List Test
    try {
        console.log('📡 Testing Meetings List (Population Check)...');
        const meetingRes = await fetch(`${API_BASE_URL}/meetings`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const meetingData = await meetingRes.json();
        
        if (meetingRes.ok && meetingData.success) {
            const meetings = meetingData.data.meetings;
            console.log(`✅ Meetings Loaded: ${meetings.length}`);
            
            // Check population
            meetings.forEach(m => {
                if (m.host && m.host.name) {
                    console.log(`   - Meeting: "${m.title}", Host: ${m.host.name} (Populated: OK)`);
                } else {
                    console.warn(`   - Meeting: "${m.title}" (Host NOT Populated)`);
                }
                
                if (m.agendaPoints && m.agendaPoints.length > 0) {
                    console.log(`   - Agenda Points count: ${m.agendaPoints.length} (Mapped: OK)`);
                    m.agendaPoints.forEach(ap => {
                        console.log(`     * Point: "${ap.text}"`);
                    });
                }
            });
        } else {
            console.error('❌ Meetings List Failed:', meetingData.message);
        }
    } catch (err) {
        console.error('❌ Meetings List Error:', err.message);
    }
    
    // 3. Create Meeting Test
    try {
        console.log('📡 Testing Meeting Creation...');
        const createRes = await fetch(`${API_BASE_URL}/meetings`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                title: 'Test Meeting ' + Date.now(),
                scheduledFor: new Date(Date.now() + 3600000).toISOString(),
                description: 'Verification test meeting'
            })
        });
        const createData = await createRes.json();
        
        if (createRes.ok && createData.success) {
            console.log('✅ Meeting Created Successfully:', createData.data.meeting.title);
        } else {
            console.error('❌ Meeting Creation Failed:', createData.message);
        }
    } catch (err) {
        console.error('❌ Meeting Creation Error:', err.message);
    }

    console.log('🏁 Verification tests complete.');
}

runTests();
