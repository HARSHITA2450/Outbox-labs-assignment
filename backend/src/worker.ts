import { DelayedError, Job, Worker } from 'bullmq';
import { config } from './config';
import { pool } from './db';
import { redis } from './redis';
import { QUEUE_NAME } from './queue';
import { Sender, sendMail } from './mailer';
import { notifyRateLimit } from './slack';
import { updateEmailDoc } from './search';

const HOUR = 3600_000;

async function processEmail(job: Job, token?: string) {
  // 1. Atomic claim: only one worker can move scheduled -> sending (idempotency).
  //    A 'sending' row is re-claimable only if its claim is stale (worker crashed mid-send).
  const claim = await pool.query(
    `UPDATE emails SET status='sending', claimed_at=now()
     WHERE id=$1 AND (status='scheduled' OR (status='sending' AND claimed_at < now() - interval '5 minutes'))
     RETURNING *`,
    [job.data.emailId],
  );
  if (!claim.rowCount) return; // already sent / failed / being handled
  const email = claim.rows[0];

  // 2. Hourly rate limit per sender: Redis counter shared by all workers/instances.
  const window = Math.floor(Date.now() / HOUR);
  const key = `rl:${email.sender_id}:${window}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 2 * 3600);

  if (count > email.hourly_limit) {
    await redis.decr(key);
    const resumeAt = new Date((window + 1) * HOUR + email.seq); // seq keeps original order in the next window
    await pool.query(`UPDATE emails SET status='scheduled', scheduled_at=$2 WHERE id=$1`, [email.id, resumeAt]);
    if ((await redis.set(`rl:notified:${email.sender_id}:${window}`, '1', 'EX', 3700, 'NX')) === 'OK') {
      const s = await pool.query('SELECT email FROM senders WHERE id=$1', [email.sender_id]);
      await notifyRateLimit(email.user_id, s.rows[0]?.email, email.hourly_limit, resumeAt);
    }
    await job.moveToDelayed(resumeAt.getTime(), token); // not dropped, not failed
    throw new DelayedError();
  }

  // 3. Send
  try {
    const sender = (await pool.query<Sender>('SELECT * FROM senders WHERE id=$1', [email.sender_id])).rows[0];
    const preview = await sendMail(sender, email.to_email, email.subject, email.body);
    const sentAt = new Date();
    await pool.query(`UPDATE emails SET status='sent', sent_at=$2, error=NULL WHERE id=$1`, [email.id, sentAt]);
    await updateEmailDoc(email.id, { status: 'sent', sent_at: sentAt });
    console.log(`[worker] sent ${email.to_email} ${preview ?? ''}`);
  } catch (err) {
    await redis.decr(key);
    const final = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    const status = final ? 'failed' : 'scheduled';
    await pool.query(`UPDATE emails SET status=$2, error=$3 WHERE id=$1`, [email.id, status, (err as Error).message]);
    if (final) await updateEmailDoc(email.id, { status: 'failed' });
    throw err; // lets BullMQ apply backoff / retries
  }
}

const worker = new Worker(QUEUE_NAME, processEmail, {
  connection: redis,
  concurrency: config.worker.concurrency,
  // Global throttle across all workers: at most 1 send per MIN_SEND_DELAY_MS.
  limiter: { max: 1, duration: config.worker.minDelayMs },
});

worker.on('failed', (job, err) => console.warn(`[worker] job ${job?.id} failed: ${err.message}`));
console.log(`[worker] started (concurrency=${config.worker.concurrency}, minDelay=${config.worker.minDelayMs}ms)`);

const stop = async () => {
  await worker.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
