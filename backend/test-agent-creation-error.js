const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testAgentCreation() {
  try {
    console.log('🧪 Testing agent creation...');
    
    // First get the login token for supervisor
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      cin: 'BK517312',
      password: '123456'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Create test photos
    const cinPhotoPath = path.join(__dirname, 'test-cin.jpg');
    const facialPhotoPath = path.join(__dirname, 'test-facial.jpg');
    
    // Create dummy image files (just copy existing ones)
    const existingCin = path.join(__dirname, 'uploads/cin/1769314442395-852816803.jpg');
    const existingFacial = path.join(__dirname, 'uploads/facial/1769314442404-724281020.jpg');
    
    if (fs.existsSync(existingCin)) {
      fs.copyFileSync(existingCin, cinPhotoPath);
      console.log('✅ CIN photo created');
    }
    
    if (fs.existsSync(existingFacial)) {
      fs.copyFileSync(existingFacial, facialPhotoPath);
      console.log('✅ Facial photo created');
    }
    
    // Prepare form data
    const form = new FormData();
    form.append('nom', 'TestAgent');
    form.append('prenom', 'Debug');
    form.append('telephone', '+21200000001');
    form.append('cin', 'TEST123456');
    form.append('email', 'debug.agent@test.com');
    form.append('selectedZones', JSON.stringify(['c589b870-39db-4848-84eb-e8f5fe032c11']));
    form.append('eventId', 'bccfbbe6-24de-4a66-ab75-a83681e37bc0');
    form.append('autoAssign', 'true');
    form.append('faceDescriptor', JSON.stringify(Array(128).fill(0.1)));
    
    if (fs.existsSync(cinPhotoPath)) {
      form.append('cinPhoto', fs.createReadStream(cinPhotoPath));
    }
    
    if (fs.existsSync(facialPhotoPath)) {
      form.append('facialPhoto', fs.createReadStream(facialPhotoPath));
    }
    
    // Make the agent creation request
    console.log('🚀 Sending agent creation request...');
    const response = await axios.post('http://localhost:5000/api/supervisor/create-agent', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Agent created successfully:', response.data);
    
  } catch (error) {
    console.log('❌ Error creating agent:');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
      console.log('Headers:', error.response.headers);
    } else if (error.request) {
      console.log('Request made but no response:', error.request);
    } else {
      console.log('Error:', error.message);
    }
    
    console.log('Stack:', error.stack);
  } finally {
    // Cleanup test files
    const cinPhotoPath = path.join(__dirname, 'test-cin.jpg');
    const facialPhotoPath = path.join(__dirname, 'test-facial.jpg');
    
    if (fs.existsSync(cinPhotoPath)) fs.unlinkSync(cinPhotoPath);
    if (fs.existsSync(facialPhotoPath)) fs.unlinkSync(facialPhotoPath);
  }
}

testAgentCreation();