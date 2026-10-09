import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { pool } from './db';
import { requireAuth } from './auth';
import { ensureSenders } from './mailer';
import { addEmailJobs } from './queue';
import { indexEmails, searchEmails } from './search';
import { config } from './config';

export const apiRouter = Router();
apiRouter.use('/api', requireAuth);

apiRouter.get('/api/me', async (_req, res) => {
  const { rows } = await pool.query('SELECT id,email,name,avatar FROM users WHERE id=$1', [res.locals.userId]);
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'User not found' });
});

const scheduleSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  recipients: z.array(z.string().email()).min(1).max(5000),
  startTime: z.string().datetime({ offset: true }),
  delaySeconds: z.number().min(0).default(0),
  hourlyLimit: z.number().int().min(1).default(config.defaultHourlyLimit),
});

apiRouter.post('/api/emails/schedule', async (req, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data;
  const userId: number = res.locals.userId;

  const senders = await ensureSenders(userId);
  const base = Math.max(new Date(d.startTime).getTime(), Date.now());
  const n = d.recipients.length;

  // Spread emails across senders (round-robin) and space them by the requested delay.
  const { rows } = await pool.query(
    `INSERT INTO emails(id,user_id,sender_id,to_email,subject,body,scheduled_at,hourly_limit,seq)
     SELECT t.id,$1,t.sender_id,t.to_email,$2,$3,t.at,$4,t.seq
     FROM unnest($5::uuid[],$6::int[],$7::text[],$8::timestamptz[],$9::int[]) AS t(id,sender_id,to_email,at,seq)
     RETURNING *`,
    [
      userId, d.subject, d.body, d.hourlyLimit,
      Array.from({ length: n }, () => randomUUID()),
      d.recipients.map((_, i) => senders[i % senders.length].id),
      d.recipients,
      d.recipients.map((_, i) => new Date(base + i * d.delaySeconds * 1000).toISOString()),
      d.recipients.map((_, i) => i),
    ],
  );

  await addEmailJobs(rows);
  await indexEmails(rows);
  res.status(201).json({ scheduled: rows.length });
});

apiRouter.get('/api/emails', async (req, res) => {
  const sent = req.query.status === 'sent';
  const { rows } = await pool.query(
    `SELECT id,to_email,subject,status,scheduled_at,sent_at FROM emails
     WHERE user_id=$1 AND status = ANY($2) ORDER BY ${sent ? 'sent_at DESC NULLS LAST' : 'scheduled_at ASC'} LIMIT 500`,
    [res.locals.userId, sent ? ['sent', 'failed'] : ['scheduled', 'sending']],
  );
  res.json(rows);
});

apiRouter.get('/api/emails/search', async (req, res) => {
  try {
    res.json(await searchEmails(res.locals.userId, String(req.query.q ?? '')));
  } catch {
    res.status(503).json({ error: 'Search is unavailable' });
  }
});

apiRouter.get('/api/slack', async (_req, res) => {
  const { rows } = await pool.query('SELECT channel,team FROM slack_connections WHERE user_id=$1', [res.locals.userId]);
  res.json({ connected: rows.length > 0, channel: rows[0]?.channel, team: rows[0]?.team });
});

apiRouter.delete('/api/slack', async (_req, res) => {
  await pool.query('DELETE FROM slack_connections WHERE user_id=$1', [res.locals.userId]);
  res.json({ ok: true });
});
