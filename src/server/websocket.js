const { WebSocketServer } = require('ws');
const url = require('url');

// In-memory state for connected riders
const connectedRiders = new Map();

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/connect' });

  console.log('WebSocket server initialized');

  wss.on('connection', (ws, req) => {
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const token = params.get('token');
    let userId = null;

    console.log(`New WebSocket connection (token: ${token})`);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    ws.on('close', () => {
      if (userId) {
        console.log(`Rider disconnected: ${userId}`);
        connectedRiders.delete(userId);
        broadcastWorldState(wss);
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });

    function handleMessage(ws, message) {
      switch (message.type) {
        case 'register':
          userId = message.user_id;
          connectedRiders.set(userId, {
            ws,
            user_id: userId,
            username: message.username || 'Anonymous',
            session_id: message.session_id,
            position: 100,
            metrics: {},
            segment: {},
            connected_at: Date.now(),
          });
          console.log(`Rider registered: ${userId} (${message.username})`);
          ws.send(JSON.stringify({
            type: 'registered',
            user_id: userId,
            message: 'Welcome to Open Training World!',
          }));
          broadcastWorldState(wss);
          break;

        case 'workout_data':
          if (userId && connectedRiders.has(userId)) {
            const rider = connectedRiders.get(userId);
            rider.metrics = message.metrics || {};
            rider.segment = message.segment || {};

            // Calculate position from distance
            // 1 km = 500 pixels in game world
            const distance = message.metrics?.distance || 0;
            rider.position = 100 + distance * 500;

            connectedRiders.set(userId, rider);
            broadcastWorldState(wss);
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        default:
          ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${message.type}` }));
      }
    }
  });

  // Periodic world state broadcast
  setInterval(() => {
    if (connectedRiders.size > 0) {
      broadcastWorldState(wss);
    }
  }, 2000);

  return wss;
}

function broadcastWorldState(wss) {
  const riders = [];
  connectedRiders.forEach((rider) => {
    riders.push({
      user_id: rider.user_id,
      username: rider.username,
      position: rider.position,
      metrics: {
        power: rider.metrics?.power || 0,
        speed: rider.metrics?.speed || 0,
        distance: rider.metrics?.distance || 0,
      },
      segment: rider.segment,
    });
  });

  const worldState = JSON.stringify({
    type: 'world_state',
    timestamp: Date.now(),
    rider_count: riders.length,
    riders,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(worldState);
    }
  });
}

module.exports = { setupWebSocket };
