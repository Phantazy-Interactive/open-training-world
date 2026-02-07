const express = require('express');
const http = require('http');
const { setupWebSocket } = require('./websocket');
const { setupAPI } = require('./api');

const PORT = process.env.WS_PORT || 3001;

const app = express();
app.use(express.json());

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Setup REST API routes
setupAPI(app);

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Open Training World server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/connect`);
  console.log(`REST API: http://localhost:${PORT}/api`);
});
