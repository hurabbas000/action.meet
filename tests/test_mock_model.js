const MockModel = require('../server/src/db/MockModel');
const store = require('../server/src/db/mockStore');

class TestModel extends MockModel {
    constructor(collectionName) {
        super(collectionName);
    }
}

async function runTests() {
    console.log('🚀 Running MockModel Tests...');
    console.log(`Initial store state: ${Object.keys(store).map(k=>`${k}:${store[k].length}`).join(', ')}`);

    const User = new TestModel('users');
    const Team = new TestModel('teams');
    const Meeting = new TestModel('meetings');
    const Agenda = new TestModel('agendas');

    try {
        // Test 1: findById
        console.log('\nTest 1: findById');
        const alice = await User.findById('user_alice_admin_123');
        if (alice && alice.name === 'Alice Admin') {
            console.log('✅ findById passed');
        } else {
            console.error('❌ findById failed', alice);
        }

        // Test 2: findByIdAndUpdate with $push
        console.log('\nTest 2: findByIdAndUpdate with $push');
        const meeting = await Meeting.findById('meeting_ui_sync_123');
        const initialCount = meeting.participants.length;
        await Meeting.findByIdAndUpdate('meeting_ui_sync_123', { 
            $push: { participants: { user: 'u5', status: 'invited' } } 
        });
        const updatedMeeting = await Meeting.findById('meeting_ui_sync_123');
        if (updatedMeeting.participants.length === initialCount + 1) {
            console.log('✅ findByIdAndUpdate $push passed');
        } else {
            console.error('❌ findByIdAndUpdate $push failed', updatedMeeting.participants.length);
        }

        // Test 3: Custom method addParticipant
        console.log('\nTest 3: Custom method addParticipant');
        await updatedMeeting.addParticipant('u6');
        const finalMeeting = await Meeting.findById('meeting_ui_sync_123');
        const hasU6 = finalMeeting.participants.some(p => (p.user?._id || p.user) === 'u6');
        if (hasU6) {
            console.log('✅ addParticipant passed');
        } else {
            console.error('❌ addParticipant failed', finalMeeting.participants);
        }

        // Test 4: Agenda markAsCompleted
        console.log('\nTest 4: Agenda markAsCompleted');
        const agenda = await Agenda.findById('a1');
        await agenda.markAsCompleted('user_alice_admin_123');
        const updatedAgenda = await Agenda.findById('a1');
        if (updatedAgenda.status === 'completed') {
            console.log('✅ markAsCompleted passed');
        } else {
            console.error('❌ markAsCompleted failed', updatedAgenda.status);
        }

        // Test 5: Nested Populate
        console.log('\nTest 5: Nested Populate');
        const meetingWithAgenda = await Meeting.findById('meeting_ui_sync_123')
            .populate({
                path: 'agenda',
                populate: { path: 'responsiblePerson.user' }
            });
        
        const firstAgenda = meetingWithAgenda.agenda[0];
        if (firstAgenda && firstAgenda.responsiblePerson && firstAgenda.responsiblePerson.user && firstAgenda.responsiblePerson.user.name) {
            console.log('✅ Nested populate passed:', firstAgenda.responsiblePerson.user.name);
        } else {
            console.error('❌ Nested populate failed', firstAgenda?.responsiblePerson);
        }

        console.log('\n🎉 All tests completed!');
    } catch (error) {
        console.error('\n💥 Tests failed with error:', error);
    }
}

runTests();
