const axios = require('axios');

axios.get('http://localhost:5000/api/health')
  .then(res => {
    console.log('✅ Health check:', res.status);
    console.log('Data:', res.data);
  })
  .catch(err => {
    console.log('❌ Error:', err.code, err.errno);
    console.log('Message:', err.message);
  });
