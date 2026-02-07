/**
 * Database setup script for Open Training World
 *
 * Run with: node src/server/db-setup.js
 *
 * Prerequisites:
 *   - PostgreSQL installed and running
 *   - DATABASE_URL environment variable set, or defaults to:
 *     postgres://postgres:postgres@localhost:5432/open_training_world
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/open_training_world';

const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  token VARCHAR(255),
  total_distance DECIMAL(10, 2) DEFAULT 0,
  total_workouts INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workout sessions table
CREATE TABLE IF NOT EXISTS workout_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) UNIQUE NOT NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES users(user_id),
  workout_name VARCHAR(255),
  duration_seconds INTEGER,
  distance_km DECIMAL(10, 2),
  avg_power INTEGER,
  avg_cadence INTEGER,
  avg_heart_rate INTEGER,
  max_power INTEGER,
  max_heart_rate INTEGER,
  calories INTEGER,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Workout data points (for replay and analysis)
CREATE TABLE IF NOT EXISTS workout_data_points (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL REFERENCES workout_sessions(session_id),
  timestamp_ms BIGINT NOT NULL,
  power INTEGER,
  cadence INTEGER,
  heart_rate INTEGER,
  speed DECIMAL(5, 1),
  distance_km DECIMAL(10, 3),
  segment_name VARCHAR(100),
  segment_type VARCHAR(20)
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(user_id),
  achievement_key VARCHAR(100) NOT NULL,
  achievement_name VARCHAR(255) NOT NULL,
  description TEXT,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_key)
);

-- Connection tokens for external apps
CREATE TABLE IF NOT EXISTS connection_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(user_id),
  token VARCHAR(255) UNIQUE NOT NULL,
  app_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_data_points_session ON workout_data_points(session_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON connection_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON connection_tokens(token);
`;

async function setupDatabase() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected. Running schema setup...');

    await client.query(schema);
    console.log('Database schema created successfully.');

    // Insert sample achievements definitions
    const achievements = [
      ['first_1km', 'First 1 km', 'Complete your first kilometer'],
      ['first_5km', '5 km Milestone', 'Reach 5 kilometers total distance'],
      ['first_10km', '10 km Champion', 'Reach 10 kilometers total distance'],
      ['first_workout', 'First Workout', 'Complete your first workout session'],
      ['five_workouts', 'Regular Rider', 'Complete 5 workout sessions'],
      ['century', 'Century', 'Ride 100 kilometers total'],
      ['power_200', 'Power Up', 'Hold 200W for 5 minutes'],
      ['zone_explorer', 'Zone Explorer', 'Visit all 5 world zones'],
    ];

    console.log('Sample achievement definitions:');
    achievements.forEach(([key, name, desc]) => {
      console.log(`  - ${name}: ${desc}`);
    });

    client.release();
    console.log('\nDatabase setup complete.');
    console.log('You can now start the application with: npm run dev');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log('\nPostgreSQL is not running or not accessible.');
      console.log('The app works without a database using in-memory storage.');
      console.log('\nTo use PostgreSQL:');
      console.log('  1. Install and start PostgreSQL');
      console.log('  2. Create database: createdb open_training_world');
      console.log('  3. Set DATABASE_URL env var (or use default)');
      console.log('  4. Run this script again: npm run db:setup');
    } else {
      console.error('Database setup error:', err.message);
    }
  } finally {
    await pool.end();
  }
}

setupDatabase();
