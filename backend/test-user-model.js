const express = require('express');
const { User } = require('./src/models');

async function testUserCreation() {
  try {
    console.log('🧪 Testing User model creation...');
    
    // Test simple user creation
    const testUser = await User.create({
      employeeId: 'TEST123',
      firstName: 'Test',
      lastName: 'User',
      cin: 'TESTCIN123',
      email: 'test@example.com',
      password: 'hashedpassword',
      phone: '+212600000000',
      role: 'agent',
      status: 'active'
    });
    
    console.log('✅ User created successfully:', testUser.id);
    
    // Clean up
    await testUser.destroy();
    console.log('✅ Test user deleted');
    
  } catch (error) {
    console.log('❌ Error creating user:');
    console.log('Message:', error.message);
    console.log('Stack:', error.stack);
  }
}

testUserCreation();