/**
 * Test de création d'agent minimal pour identifier l'erreur 500
 */
const { default: fetch } = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testMinimalAgentCreation() {
  console.log('🧪 Testing minimal agent creation...');
  
  try {
    // 1. Get supervisor token
    console.log('1. Logging in as supervisor...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cin: 'BK517312',
        password: '123456'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.log('❌ Login failed:', loginData.message);
      return;
    }
    console.log('✅ Login successful');
    
    const token = loginData.token;
    
    // 2. Create minimal test files
    console.log('2. Creating test files...');
    const testDir = __dirname;
    const cinPhotoPath = path.join(testDir, 'minimal-cin.jpg');
    const facialPhotoPath = path.join(testDir, 'minimal-facial.jpg');
    
    // Create minimal test images (1x1 pixel)
    const minimalImageBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00,
      0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11,
      0x01, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF,
      0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00,
      0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x00,
      0xFF, 0xD9
    ]);
    
    fs.writeFileSync(cinPhotoPath, minimalImageBuffer);
    fs.writeFileSync(facialPhotoPath, minimalImageBuffer);
    console.log('✅ Test files created');
    
    // 3. Prepare FormData
    console.log('3. Preparing form data...');
    const form = new FormData();
    
    // Required fields from the supervisor route
    form.append('nom', 'TestAgent');
    form.append('prenom', 'Debug');
    form.append('telephone', '+21200000123');
    form.append('cin', 'DEBUGTEST1');
    form.append('email', 'debug.test@agent.local');
    
    // Zone and event data (matching the logs)
    form.append('selectedZones', JSON.stringify(['c589b870-39db-4848-84eb-e8f5fe032c11']));
    form.append('eventId', 'bccfbbe6-24de-4a66-ab75-a83681e37bc0');
    form.append('autoAssign', 'true');
    
    // Face descriptor (minimal 128-element array)
    form.append('faceDescriptor', JSON.stringify(Array(128).fill(0.1)));
    
    // Files
    form.append('cinPhoto', fs.createReadStream(cinPhotoPath));
    form.append('facialPhoto', fs.createReadStream(facialPhotoPath));
    
    console.log('✅ Form data prepared');
    
    // 4. Make the request
    console.log('4. Sending creation request...');
    const response = await fetch('http://localhost:5000/api/supervisor/create-agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });
    
    console.log('Response status:', response.status);
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Agent created successfully!');
    } else {
      console.log('❌ Agent creation failed');
      
      // Try to parse as JSON
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', errorData);
      } catch (parseError) {
        console.log('Could not parse error as JSON');
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Cleanup
    const cinPhotoPath = path.join(__dirname, 'minimal-cin.jpg');
    const facialPhotoPath = path.join(__dirname, 'minimal-facial.jpg');
    
    if (fs.existsSync(cinPhotoPath)) fs.unlinkSync(cinPhotoPath);
    if (fs.existsSync(facialPhotoPath)) fs.unlinkSync(facialPhotoPath);
  }
}

testMinimalAgentCreation();