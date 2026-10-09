import { Pool } from 'pg';
import { config } from './config';

export const pool = new Pool({ connectionString: config.databaseUrl });

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, google_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL, name TEXT, avatar TEXT
    );
    CREATE TABLE IF NOT EXISTS senders (
      id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL, smtp_host TEXT NOT NULL, smtp_port INT NOT NULL,
      smtp_user TEXT NOT NULL, smtp_pass TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS emails (
      id UUID PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE CASCADE,
      sender_id INT REFERENCES senders(id), to_email TEXT NOT NULL,
      subject TEXT NOT NULL, body TEXT NOT NULL, scheduled_at TIMESTAMPTZ NOT NULL,
      hourly_limit INT NOT NULL, seq INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'scheduled', sent_at TIMESTAMPTZ,
      claimed_at TIMESTAMPTZ, error TEXT, created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS emails_user_status ON emails (user_id, status);
    CREATE TABLE IF NOT EXISTS slack_connections (
      user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      webhook_url TEXT NOT NULL, channel TEXT, team TEXT
    );
  `);
}
