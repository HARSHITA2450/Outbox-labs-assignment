import 'dotenv/config';

const num = (key: string, fallback: number) => Number(process.env[key] ?? fallback);
const str = (key: string, fallback = '') => process.env[key] ?? fallback;

export const config = {
  port: num('PORT', 4000),
  frontendUrl: str('FRONTEND_URL', 'http://localhost:5173'),
  backendUrl: str('BACKEND_URL', 'http://localhost:4000'),
  databaseUrl: str('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/reachinbox'),
  redisUrl: str('REDIS_URL', 'redis://localhost:6379'),
  esUrl: str('ELASTICSEARCH_URL', 'http://localhost:9200'),
  jwtSecret: str('JWT_SECRET', 'dev-secret'),
  google: { clientId: str('GOOGLE_CLIENT_ID'), clientSecret: str('GOOGLE_CLIENT_SECRET') },
  slack: { clientId: str('SLACK_CLIENT_ID'), clientSecret: str('SLACK_CLIENT_SECRET') },
  worker: { concurrency: num('WORKER_CONCURRENCY', 5), minDelayMs: num('MIN_SEND_DELAY_MS', 2000) },
  defaultHourlyLimit: num('DEFAULT_HOURLY_LIMIT', 100),
  sendersPerUser: num('SENDERS_PER_USER', 3),
};
