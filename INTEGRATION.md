# Open Training World - Integration Guide

Connect your indoor cycling training app to the Open Training World game platform.

## Overview

Open Training World provides a WebSocket API that accepts real-time cycling metrics and visualizes them in a shared 2D game world. Any training app can connect by sending standardized JSON messages.

## Quick Start

### 1. Get a Connection Token

```bash
curl -X POST http://localhost:3001/api/token \
  -H "Content-Type: application/json" \
  -d '{"user_id": "your_user_id"}'
```

Response:
```json
{
  "token": "abc123...",
  "websocket_url": "ws://localhost:3001/connect?token=abc123...",
  "expires_in": 86400
}
```

### 2. Connect via WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3001/connect?token=YOUR_TOKEN');
```

### 3. Register Your Rider

```javascript
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'register',
    user_id: 'unique_user_id',
    session_id: 'workout_session_id',
    username: 'RiderName'
  }));
};
```

### 4. Send Workout Data (every 1-2 seconds)

```javascript
ws.send(JSON.stringify({
  type: 'workout_data',
  timestamp: Date.now(),
  user_id: 'unique_user_id',
  session_id: 'workout_session_id',
  metrics: {
    power: 185,
    power_target: 200,
    cadence: 88,
    cadence_target: 90,
    heart_rate: 145,
    speed: 28.5,
    distance: 2.34,
    time_elapsed: 342,
    time_remaining: 1458
  },
  segment: {
    name: 'Interval 3 ON',
    type: 'interval_on',
    duration: 60,
    ftp_percentage: 105
  }
}));
```

## WebSocket API Reference

### Endpoint

```
ws://[host]:3001/connect?token=[TOKEN]
```

### Message Types

#### Client → Server

| Type | Description |
|------|-------------|
| `register` | Register rider in the game world |
| `workout_data` | Send real-time cycling metrics |
| `ping` | Keep-alive ping |

#### Server → Client

| Type | Description |
|------|-------------|
| `registered` | Registration confirmation |
| `world_state` | Current state of all riders |
| `pong` | Ping response |
| `error` | Error message |

### Register Message

```json
{
  "type": "register",
  "user_id": "string",
  "session_id": "string",
  "username": "string"
}
```

### Workout Data Message

```json
{
  "type": "workout_data",
  "timestamp": 1234567890,
  "user_id": "string",
  "session_id": "string",
  "metrics": {
    "power": 185,
    "power_target": 200,
    "cadence": 88,
    "cadence_target": 90,
    "heart_rate": 145,
    "speed": 28.5,
    "distance": 2.34,
    "time_elapsed": 342,
    "time_remaining": 1458
  },
  "segment": {
    "name": "Interval 3 ON",
    "type": "interval_on",
    "duration": 60,
    "ftp_percentage": 105
  }
}
```

### Metrics Fields

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `power` | integer | watts | Current power output |
| `power_target` | integer | watts | Target power for current segment |
| `cadence` | integer | rpm | Pedaling cadence |
| `cadence_target` | integer | rpm | Target cadence |
| `heart_rate` | integer | bpm | Current heart rate |
| `speed` | float | km/h | Current speed |
| `distance` | float | km | Cumulative distance |
| `time_elapsed` | integer | seconds | Total workout time |
| `time_remaining` | integer | seconds | Remaining workout time |

### Segment Types

| Type | Description | Visual Effect |
|------|-------------|---------------|
| `warmup` | Warmup period | Yellow jersey |
| `interval_on` | High-intensity interval | Red jersey, speed burst |
| `interval_off` | Rest between intervals | Green jersey |
| `recovery` | Active recovery | Blue jersey |

### World State Message (Server → Client)

Received every 2 seconds with positions of all connected riders:

```json
{
  "type": "world_state",
  "timestamp": 1234567890,
  "rider_count": 3,
  "riders": [
    {
      "user_id": "user_abc",
      "username": "Rider1",
      "position": 2340,
      "metrics": {
        "power": 185,
        "speed": 28.5,
        "distance": 2.34
      },
      "segment": {
        "name": "Interval 3 ON",
        "type": "interval_on"
      }
    }
  ]
}
```

## REST API Reference

### Health Check

```
GET /api/health
```

### Register User

```
POST /api/register
Content-Type: application/json

{
  "username": "rider_name",
  "password": "secure_password"
}
```

### Login

```
POST /api/login
Content-Type: application/json

{
  "username": "rider_name",
  "password": "secure_password"
}
```

### Generate Connection Token

```
POST /api/token
Content-Type: application/json

{
  "user_id": "user_abc123"
}
```

### Save Workout Session

```
POST /api/sessions
Content-Type: application/json

{
  "user_id": "user_abc123",
  "workout_name": "30 Minutes to Burn",
  "duration": 1800,
  "distance": 15.2,
  "avg_power": 185,
  "avg_hr": 148
}
```

### Get User Progress

```
GET /api/progress/:userId
```

### Get Active Riders

```
GET /api/riders
```

## Sample Integration Code

### JavaScript / Browser

```javascript
class TrainingWorldClient {
  constructor(serverUrl, userId, username) {
    this.serverUrl = serverUrl;
    this.userId = userId;
    this.username = username;
    this.ws = null;
    this.sessionId = 'session_' + Date.now();
  }

  connect(token) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${this.serverUrl}/connect?token=${token}`);

      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({
          type: 'register',
          user_id: this.userId,
          session_id: this.sessionId,
          username: this.username,
        }));
        resolve();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'world_state') {
          this.onWorldUpdate(data);
        }
      };

      this.ws.onerror = (err) => reject(err);
    });
  }

  sendMetrics(metrics, segment) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'workout_data',
        timestamp: Date.now(),
        user_id: this.userId,
        session_id: this.sessionId,
        metrics,
        segment,
      }));
    }
  }

  onWorldUpdate(data) {
    // Override this to handle world state updates
    console.log(`${data.rider_count} riders in world`);
  }

  disconnect() {
    if (this.ws) this.ws.close();
  }
}

// Usage:
const client = new TrainingWorldClient(
  'ws://localhost:3001',
  'my_user_id',
  'MyRiderName'
);

await client.connect('my_token');

// Send data every second during workout
setInterval(() => {
  client.sendMetrics({
    power: getCurrentPower(),
    cadence: getCurrentCadence(),
    heart_rate: getCurrentHR(),
    speed: getCurrentSpeed(),
    distance: getTotalDistance(),
    time_elapsed: getElapsedTime(),
    time_remaining: getRemainingTime(),
  }, {
    name: 'Interval 1',
    type: 'interval_on',
    duration: 60,
    ftp_percentage: 105,
  });
}, 1000);
```

### Node.js

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001/connect?token=YOUR_TOKEN');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'register',
    user_id: 'node_rider_1',
    session_id: 'session_' + Date.now(),
    username: 'NodeRider',
  }));

  // Simulate riding
  let distance = 0;
  setInterval(() => {
    const power = 150 + Math.random() * 50;
    const speed = power * 0.12 + 8;
    distance += speed / 3600;

    ws.send(JSON.stringify({
      type: 'workout_data',
      timestamp: Date.now(),
      user_id: 'node_rider_1',
      session_id: 'session_123',
      metrics: {
        power: Math.round(power),
        cadence: Math.round(80 + Math.random() * 10),
        heart_rate: Math.round(130 + Math.random() * 15),
        speed: Math.round(speed * 10) / 10,
        distance: Math.round(distance * 100) / 100,
        time_elapsed: Math.floor(Date.now() / 1000),
        time_remaining: 0,
      },
      segment: {
        name: 'Free Ride',
        type: 'recovery',
        duration: 0,
        ftp_percentage: 75,
      },
    }));
  }, 1000);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'world_state') {
    console.log(`Riders online: ${msg.rider_count}`);
  }
});
```

## Testing with the Built-in Emulator

The application includes a built-in emulator for testing without a real training app:

1. Start the application: `npm run dev`
2. Open `http://localhost:3000` in your browser
3. In the right sidebar, find the **Emulator** section
4. Click **ON** to enable the emulator
5. Choose mode:
   - **Manual**: Use sliders to set power, cadence, HR, and speed
   - **Workout**: Select a pre-built workout structure
6. Click **Start** to begin the simulation
7. Watch the cyclist avatar move through the game world

### Emulator Features

- **Quick Presets**: Easy, Moderate, Hard, Sprint
- **Manual Sliders**: Fine-tune each metric independently
- **Workout Mode**: Run structured workouts with automatic segment transitions
- **Sample Workouts**: "30 Minutes to Burn", "Easy Ride", "Threshold Builder"
- **Workout Graph**: Visual representation of the workout structure with progress indicator

## Game World Zones

The 2D world consists of 5 visual zones that the rider progresses through:

| Zone | Distance | Visual Theme |
|------|----------|-------------|
| Village | 0-8 km | Scandinavian village with houses and birch trees |
| Forest | 8-16 km | Dense pine forest |
| Lakeside | 16-24 km | Lake with reflections and gentle terrain |
| Mountains | 24-32 km | Mountain backdrop with rocky terrain |
| Summit | 32-40 km | Snow-capped peaks and alpine landscape |

## Position Mapping

Distance is mapped to game world position:
- **1 km = 500 pixels** in the game world
- Total world width: 20,000 pixels (40 km)
- Rider avatar starts at position 100
