# Open Training World

A gamified 2D cycling game world that connects to indoor training apps. Riders from different training platforms can connect and see their progress visualized in a shared Scandinavian-themed landscape.

## Features

- **2D Game World**: Phaser 3 side-scrolling landscape with 5 visual zones (Village, Forest, Lakeside, Mountains, Summit)
- **Real-time Data Visualization**: Power, cadence, heart rate, and speed drive the game avatar
- **WebSocket API**: Standardized connection protocol for any training app
- **Built-in Emulator**: Test without real hardware using manual controls or pre-built workouts
- **Multi-rider Support**: See other connected riders as ghost avatars in the same world
- **Workout Structure**: Visual workout graph with interval tracking
- **Achievement System**: Milestones for distance and workout completion

## Tech Stack

- **Frontend**: Next.js (React) + Phaser 3 game engine
- **Backend**: Node.js + Express + WebSocket (ws)
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL (optional, falls back to in-memory storage)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Phantazy-Interactive/open-training-world.git
cd open-training-world

# Install dependencies
npm install

# Start the development server (frontend + backend)
npm run dev
```

The application starts two servers:
- **Frontend**: http://localhost:3000 (Next.js)
- **Backend/WebSocket**: http://localhost:3001 (Express + WS)

### Database Setup (Optional)

PostgreSQL is optional. The app uses in-memory storage by default.

```bash
# Create the database
createdb open_training_world

# Run schema setup
npm run db:setup
```

Set the `DATABASE_URL` environment variable if not using the default connection string:

```bash
export DATABASE_URL=postgres://user:password@localhost:5432/open_training_world
```

## Usage

### Using the Built-in Emulator

1. Open http://localhost:3000
2. In the right sidebar, toggle the **Emulator** to ON
3. Choose **Manual** mode for slider controls, or **Workout** mode for structured sessions
4. Click **Start** to begin the simulation
5. Watch the cyclist move through the game world

### Connecting an External Training App

See [INTEGRATION.md](./INTEGRATION.md) for the full API specification and sample code.

Quick version:

```javascript
const ws = new WebSocket('ws://localhost:3001/connect?token=YOUR_TOKEN');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'register',
    user_id: 'your_id',
    session_id: 'session_123',
    username: 'YourName'
  }));
};

// Send metrics every second
setInterval(() => {
  ws.send(JSON.stringify({
    type: 'workout_data',
    timestamp: Date.now(),
    user_id: 'your_id',
    session_id: 'session_123',
    metrics: {
      power: 180,
      cadence: 85,
      heart_rate: 142,
      speed: 28.5,
      distance: 1.5,
      time_elapsed: 120,
      time_remaining: 1680
    },
    segment: {
      name: 'Warmup',
      type: 'warmup',
      duration: 240,
      ftp_percentage: 53
    }
  }));
}, 1000);
```

## Project Structure

```
/src
  /app
    layout.js          # Next.js root layout
    page.js            # Main application page
    globals.css        # Global styles (Tailwind)
  /game
    GameScene.js       # Main Phaser 3 scene (world rendering, avatar, zones)
    config.js          # Game configuration constants
  /components
    GameCanvas.jsx     # React wrapper for Phaser canvas
    Dashboard.jsx      # Live metrics display panel
    Emulator.jsx       # Development simulator with sliders and workouts
    ConnectionPanel.jsx # WebSocket connection status
  /server
    index.js           # Express + WebSocket server entry
    websocket.js       # WebSocket message handling and world state
    api.js             # REST API endpoints
    db-setup.js        # PostgreSQL schema setup script
  /lib
    database.js        # Database connection and queries
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run dev:client` | Start only the Next.js frontend |
| `npm run dev:server` | Start only the WebSocket/API server |
| `npm run build` | Build the Next.js frontend for production |
| `npm run start` | Start both servers in production mode |
| `npm run db:setup` | Initialize the PostgreSQL database schema |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/register` | Create new user |
| POST | `/api/login` | User login |
| POST | `/api/token` | Generate WebSocket connection token |
| POST | `/api/sessions` | Save a workout session |
| GET | `/api/progress/:userId` | Get user progress and stats |
| GET | `/api/riders` | List active riders |

## Game World Zones

| Zone | Theme | Features |
|------|-------|----------|
| Village | Scandinavian village | Houses, birch trees, gentle terrain |
| Forest | Dense pine forest | Tall pines, dappled light |
| Lakeside | Lake shore | Water reflections, wave animations |
| Mountains | Mountain pass | Rocky terrain, mountain backdrop |
| Summit | Alpine peak | Snow-capped peaks, sparse vegetation |

## License

ISC
