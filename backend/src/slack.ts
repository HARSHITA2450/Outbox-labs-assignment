import { pool } from './db';

/** Posts to the user's connected Slack. Silently skips if Slack isn't connected. */
export async function notifyRateLimit(userId: number, senderEmail: string, limit: number, resumeAt: Date) {
  const { rows } = await pool.query('SELECT webhook_url FROM slack_connections WHERE user_id=$1', [userId]);
  if (!rows.length) return;
  try {
    const res = await fetch(rows[0].webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `:warning: Hourly limit of ${limit} reached for sender *${senderEmail}*. Remaining emails are rescheduled to ${resumeAt.toISOString()}.`,
      }),
    });
    if (!res.ok) console.warn('[slack] webhook responded', res.status);
  } catch (e) {
    console.warn('[slack] notify failed:', (e as Error).message);
  }
}
