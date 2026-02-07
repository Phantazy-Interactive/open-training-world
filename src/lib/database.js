const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/open_training_world';

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
    });

    pool.on('error', (err) => {
      console.error('Database pool error:', err.message);
    });
  }
  return pool;
}

async function query(text, params) {
  const pool = getPool();
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('Database query error:', err.message);
    throw err;
  }
}

async function getUser(userId) {
  const result = await query('SELECT * FROM users WHERE user_id = $1', [userId]);
  return result.rows[0] || null;
}

async function createUser(userId, username, passwordHash) {
  const result = await query(
    'INSERT INTO users (user_id, username, password_hash) VALUES ($1, $2, $3) RETURNING *',
    [userId, username, passwordHash]
  );
  return result.rows[0];
}

async function updateUserStats(userId, distance, duration) {
  await query(
    `UPDATE users
     SET total_distance = total_distance + $2,
         total_workouts = total_workouts + 1,
         total_time_seconds = total_time_seconds + $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [userId, distance, duration]
  );
}

async function saveWorkoutSession(session) {
  const result = await query(
    `INSERT INTO workout_sessions
     (session_id, user_id, workout_name, duration_seconds, distance_km, avg_power, avg_cadence, avg_heart_rate, max_power, max_heart_rate)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      session.session_id, session.user_id, session.workout_name,
      session.duration, session.distance, session.avg_power,
      session.avg_cadence, session.avg_hr, session.max_power, session.max_hr,
    ]
  );
  return result.rows[0];
}

async function saveAchievement(userId, key, name, description) {
  try {
    await query(
      'INSERT INTO achievements (user_id, achievement_key, achievement_name, description) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [userId, key, name, description]
    );
  } catch (err) {
    // Achievement may already exist
  }
}

module.exports = {
  query,
  getPool,
  getUser,
  createUser,
  updateUserStats,
  saveWorkoutSession,
  saveAchievement,
};
