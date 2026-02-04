const axios = require('axios');

// Test assignment creation
const testAssignmentCreation = async () => {
  try {
    // First, we need to login to get a token
    console.log('Step 1: Logging in with CIN...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login-cin', {
      cin: 'BK517312'
    });
    
    const token = loginRes.data.data.accessToken;
    console.log('Token:', token.substring(0, 20) + '...');
    
    // Get an event to use
    console.log('\nStep 2: Fetching events...');
    const eventsRes = await axios.get('http://localhost:5000/api/events', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Events response:', JSON.stringify(eventsRes.data, null, 2));
    
    if (!eventsRes.data.data.events || eventsRes.data.data.events.length === 0) {
      console.log('No events found. Please create an event first.');
      return;
    }
    
    const eventId = eventsRes.data.data.events[0].id;
    console.log('Using eventId:', eventId);
    
    // Get an agent to use
    console.log('\nStep 3: Fetching users...');
    const usersRes = await axios.get('http://localhost:5000/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const users = usersRes.data.data.users || usersRes.data.data;
    const agent = users.find(u => u.role === 'agent' && u.status === 'active');
    if (!agent) {
      console.log('No active agent found.');
      console.log('Available users:', JSON.stringify(users.slice(0, 3), null, 2));
      return;
    }
    
    const agentId = agent.id;
    const currentUserRole = usersRes.data.data.users?.find(u => u.cin === 'BK517312')?.role || 'unknown';
    console.log('Current user role:', currentUserRole);
    console.log('Using agentId:', agentId);
    
    // Now try to create an assignment
    console.log('\nStep 4: Creating assignment...');
    const assignmentData = {
      eventId: eventId,
      agentId: agentId,
      zoneId: null,
      role: 'primary',
      notes: 'Test assignment'
    };
    
    console.log('Sending:', JSON.stringify(assignmentData, null, 2));
    
    const assignmentRes = await axios.post('http://localhost:5000/api/assignments', assignmentData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Success! Response:', JSON.stringify(assignmentRes.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
  }
};

testAssignmentCreation();
