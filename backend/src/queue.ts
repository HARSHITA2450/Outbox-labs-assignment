import { Queue } from 'bullmq';
import { redis } from './redis';

export const QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

interface JobRow { id: string; scheduled_at: Date | string }

/** jobId === email id, so adding the same email twice is a no-op (idempotent). */
export const addEmailJobs = (rows: JobRow[]) =>
  emailQueue.addBulk(
    rows.map((r) => ({
      name: 'send',
      data: { emailId: r.id },
      opts: { jobId: r.id, delay: Math.max(0, new Date(r.scheduled_at).getTime() - Date.now()) },
    })),
  );
