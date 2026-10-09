import IORedis from 'ioredis';
import { config } from './config';

// BullMQ requires maxRetriesPerRequest: null for blocking connections.
export const redis = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
