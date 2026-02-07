const crypto = require('crypto');

// In-memory storage for POC (would be PostgreSQL in production)
const users = new Map();
const sessions = new Map();

function setupAPI(app) {
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Register a new user (simple for POC)
  app.post('/api/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (users.has(username)) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const userId = 'user_' + crypto.randomBytes(8).toString('hex');
    const token = crypto.randomBytes(32).toString('hex');

    users.set(username, {
      user_id: userId,
      username,
      password_hash: password, // In production: use bcrypt
      token,
      created_at: Date.now(),
      total_distance: 0,
      total_workouts: 0,
      achievements: [],
    });

    res.json({
      user_id: userId,
      token,
      message: 'Registration successful',
    });
  });

  // Login
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const user = users.get(username);
    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    user.token = token;
    users.set(username, user);

    res.json({
      user_id: user.user_id,
      token,
      total_distance: user.total_distance,
      total_workouts: user.total_workouts,
      achievements: user.achievements,
    });
  });

  // Generate connection token for external apps
  app.post('/api/token', (req, res) => {
    const { user_id } = req.body;
    const token = crypto.randomBytes(32).toString('hex');

    res.json({
      token,
      websocket_url: `ws://localhost:3001/connect?token=${token}`,
      expires_in: 86400,
      message: 'Use this token to connect from your training app',
    });
  });

  // Get user progress
  app.get('/api/progress/:userId', (req, res) => {
    const { userId } = req.params;

    let foundUser = null;
    users.forEach(u => {
      if (u.user_id === userId) foundUser = u;
    });

    if (!foundUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user_id: foundUser.user_id,
      username: foundUser.username,
      total_distance: foundUser.total_distance,
      total_workouts: foundUser.total_workouts,
      achievements: foundUser.achievements,
    });
  });

  // Save workout session
  app.post('/api/sessions', (req, res) => {
    const { user_id, workout_name, duration, distance, avg_power, avg_hr } = req.body;

    const sessionId = 'session_' + crypto.randomBytes(8).toString('hex');

    sessions.set(sessionId, {
      session_id: sessionId,
      user_id,
      workout_name,
      duration,
      distance,
      avg_power,
      avg_hr,
      created_at: Date.now(),
    });

    // Update user stats
    users.forEach((u, key) => {
      if (u.user_id === user_id) {
        u.total_distance += distance || 0;
        u.total_workouts += 1;
        users.set(key, u);
      }
    });

    res.json({ session_id: sessionId, message: 'Workout saved' });
  });

  // Get active riders (for leaderboard)
  app.get('/api/riders', (req, res) => {
    const riders = [];
    users.forEach(u => {
      riders.push({
        user_id: u.user_id,
        username: u.username,
        total_distance: u.total_distance,
        total_workouts: u.total_workouts,
      });
    });
    res.json({ riders });
  });
}

module.exports = { setupAPI };
