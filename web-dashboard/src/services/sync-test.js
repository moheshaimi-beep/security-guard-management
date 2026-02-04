import axios from 'axios';

/**
 * Real-Time Synchronization Test Utility
 * Tests API connectivity and real-time data flow
 * 
 * Usage in React Component:
 * import syncTest from './sync-test';
 * const result = await syncTest.testConnection();
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Test results storage
const results = {
  timestamp: null,
  tests: {},
  summary: {}
};

/**
 * Test backend connectivity
 */
export const testBackendConnection = async () => {
  try {
    console.log('🔍 Testing backend connection...');
    const startTime = Date.now();
    
    const response = await axios.get(`${API_URL}/health`, {
      timeout: 5000
    });
    
    const duration = Date.now() - startTime;
    const success = response.status === 200 && response.data.success;
    
    results.tests.backend = {
      success,
      status: response.status,
      duration,
      message: response.data.message,
      timestamp: new Date().toISOString()
    };
    
    if (success) {
      console.log(`✅ Backend Connected (${duration}ms)`);
    } else {
      console.error(`❌ Backend returned unexpected response`);
    }
    
    return success;
  } catch (error) {
    console.error(`❌ Backend Connection Failed: ${error.message}`);
    results.tests.backend = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    return false;
  }
};

/**
 * Test API response time
 */
export const testResponseTime = async () => {
  try {
    console.log('⏱️  Testing API response time...');
    const times = [];
    
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      await axios.get(`${API_URL}/health`, { timeout: 5000 });
      times.push(Date.now() - start);
    }
    
    const average = times.reduce((a, b) => a + b) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    results.tests.responseTime = {
      success: average < 500,
      average: Math.round(average),
      min,
      max,
      samples: times,
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ Response Times - Avg: ${Math.round(average)}ms, Min: ${min}ms, Max: ${max}ms`);
    return true;
  } catch (error) {
    console.error(`❌ Response Time Test Failed: ${error.message}`);
    results.tests.responseTime = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    return false;
  }
};

/**
 * Test authentication token handling
 */
export const testTokenHandling = () => {
  try {
    console.log('🔐 Testing token handling...');
    
    const accessToken = localStorage.getItem('accessToken');
    const checkInToken = localStorage.getItem('checkInToken');
    
    const hasToken = !!(accessToken || checkInToken);
    
    results.tests.tokens = {
      success: true,
      hasAccessToken: !!accessToken,
      hasCheckInToken: !!checkInToken,
      tokenPresent: hasToken,
      timestamp: new Date().toISOString()
    };
    
    if (hasToken) {
      console.log(`✅ Authentication tokens found`);
    } else {
      console.warn(`⚠️  No authentication tokens found - you may not be logged in`);
    }
    
    return hasToken;
  } catch (error) {
    console.error(`❌ Token Test Failed: ${error.message}`);
    results.tests.tokens = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    return false;
  }
};

/**
 * Test API with authentication
 */
export const testAuthenticatedRequest = async () => {
  try {
    console.log('🔑 Testing authenticated request...');
    
    const token = localStorage.getItem('accessToken') || localStorage.getItem('checkInToken');
    
    if (!token) {
      console.warn('⚠️  No token available - skipping authenticated request test');
      results.tests.authenticatedRequest = {
        success: false,
        error: 'No authentication token available',
        timestamp: new Date().toISOString()
      };
      return false;
    }
    
    const config = {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000
    };
    
    try {
      const response = await axios.get(`${API_URL}/auth/me`, config);
      
      results.tests.authenticatedRequest = {
        success: true,
        status: response.status,
        userId: response.data?.userId,
        username: response.data?.username,
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ Authenticated Request Successful`);
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        console.warn(`⚠️  Token expired - user needs to re-login`);
      } else {
        console.error(`❌ Request failed: ${error.message}`);
      }
      
      results.tests.authenticatedRequest = {
        success: false,
        status: error.response?.status,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      return false;
    }
  } catch (error) {
    console.error(`❌ Auth Test Failed: ${error.message}`);
    results.tests.authenticatedRequest = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    return false;
  }
};

/**
 * Test Socket.IO connection
 */
export const testSocketIOConnection = (socket) => {
  try {
    console.log('📡 Testing Socket.IO connection...');
    
    if (!socket) {
      console.warn('⚠️  Socket.IO instance not provided');
      results.tests.socketIO = {
        success: false,
        error: 'Socket.IO instance not available',
        timestamp: new Date().toISOString()
      };
      return false;
    }
    
    const connected = socket.connected;
    const id = socket.id;
    
    results.tests.socketIO = {
      success: connected,
      connected,
      socketId: id,
      timestamp: new Date().toISOString()
    };
    
    if (connected) {
      console.log(`✅ Socket.IO Connected (ID: ${id})`);
    } else {
      console.warn(`⚠️  Socket.IO Not Connected`);
    }
    
    return connected;
  } catch (error) {
    console.error(`❌ Socket.IO Test Failed: ${error.message}`);
    results.tests.socketIO = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    return false;
  }
};

/**
 * Run complete sync diagnostic
 */
export const runCompleteDiagnostic = async (socket = null) => {
  console.clear();
  console.log('%c═════════════════════════════════════════', 'color: #0066cc; font-weight: bold;');
  console.log('%c  Frontend-Backend Sync Diagnostics', 'color: #0066cc; font-weight: bold;');
  console.log('%c═════════════════════════════════════════', 'color: #0066cc; font-weight: bold;');
  console.log('');
  
  results.timestamp = new Date().toISOString();
  
  // Run all tests
  const tests = [
    { name: 'Backend Connection', fn: testBackendConnection },
    { name: 'Response Time', fn: testResponseTime },
    { name: 'Token Handling', fn: testTokenHandling },
    { name: 'Authenticated Request', fn: testAuthenticatedRequest },
  ];
  
  const testResults = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      testResults.push({ name: test.name, passed: result });
    } catch (error) {
      console.error(`Error in ${test.name}: ${error.message}`);
      testResults.push({ name: test.name, passed: false });
    }
  }
  
  // Test Socket.IO if provided
  if (socket) {
    const socketResult = testSocketIOConnection(socket);
    testResults.push({ name: 'Socket.IO', passed: socketResult });
  }
  
  // Print summary
  console.log('');
  console.log('%c═════════════════════════════════════════', 'color: #0066cc; font-weight: bold;');
  console.log('%c  Summary', 'color: #0066cc; font-weight: bold;');
  console.log('%c═════════════════════════════════════════', 'color: #0066cc; font-weight: bold;');
  
  let allPassed = true;
  testResults.forEach(result => {
    const symbol = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    console.log(`%c${symbol} ${result.name}`, `color: ${color};`);
    if (!result.passed) allPassed = false;
  });
  
  console.log('');
  
  if (allPassed) {
    console.log('%c🎉 All systems operational!', 'color: green; font-weight: bold; font-size: 14px;');
  } else {
    console.log('%c⚠️  Some issues detected - check above', 'color: orange; font-weight: bold; font-size: 14px;');
  }
  
  console.log('');
  console.log('%cFull Results:', 'font-weight: bold;');
  console.table(results.tests);
  
  return {
    passed: allPassed,
    results: results.tests,
    timestamp: results.timestamp
  };
};

/**
 * Monitor real-time data sync
 */
export const monitorDataSync = async (endpoint, interval = 3000) => {
  console.log(`📊 Monitoring ${endpoint} every ${interval}ms...`);
  
  let count = 0;
  const startTime = Date.now();
  
  const monitor = setInterval(async () => {
    try {
      const requestTime = Date.now();
      const response = await axios.get(`${API_URL}${endpoint}`, {
        timeout: 5000
      });
      const duration = Date.now() - requestTime;
      
      count++;
      const elapsed = Date.now() - startTime;
      
      console.log(`[${count}] ${endpoint} - Status: ${response.status}, Duration: ${duration}ms, Elapsed: ${Math.round(elapsed / 1000)}s`);
      
      return { success: true, status: response.status, duration };
    } catch (error) {
      count++;
      console.error(`[${count}] ${endpoint} - Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }, interval);
  
  // Stop monitoring after 1 minute
  setTimeout(() => {
    clearInterval(monitor);
    console.log(`📊 Monitoring completed - ${count} requests in ${Math.round((Date.now() - startTime) / 1000)}s`);
  }, 60000);
  
  return monitor;
};

export default {
  testBackendConnection,
  testResponseTime,
  testTokenHandling,
  testAuthenticatedRequest,
  testSocketIOConnection,
  runCompleteDiagnostic,
  monitorDataSync
};
