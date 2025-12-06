const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    message: 'Server is working!',
    timestamp: new Date().toISOString()
  }));
});

server.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
