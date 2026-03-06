const axios = require('axios');

async function testAuth() {
    try {
        console.log('Registering user...');
        const regRes = await axios.post('http://localhost:3001/api/auth/register', {
            name: 'Test Name',
            email: 'test' + Date.now() + '@example.com',
            password: 'password123'
        });
        console.log('Register success:', regRes.data.success);
        
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            email: regRes.data.data.user.email,
            password: 'password123'
        });
        console.log('Login success:', loginRes.data.success);
    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}

testAuth();
