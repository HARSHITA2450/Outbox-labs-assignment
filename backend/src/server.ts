import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { config } from './config';
import { initDb, pool } from './db';
import { initSearch } from './search';
import { addEmailJobs, emailQueue } from './queue';
import { authRouter, requireAuth } from './auth';
import { apiRouter } from './routes';

/**
 * DB is the source of truth. On boot, re-enqueue every unsent email.
 * Jobs that already exist in Redis are ignored (same jobId), so nothing is duplicated;
 * jobs lost with Redis are restored.
 */
async function reconcile() {
  const { rows } = await pool.query(`SELECT id, scheduled_at FROM emails WHERE status IN ('scheduled','sending')`);
  for (let i = 0; i < rows.length; i += 1000) await addEmailJobs(rows.slice(i, i + 1000));
  console.log(`[boot] reconciled ${rows.length} pending emails`);
}

async function main() {
  await initDb();
  await initSearch();
  await reconcile();

  const app = express();
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '5mb' }));

  const board = new ExpressAdapter();
  board.setBasePath('/admin/queues');
  createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter: board });
  app.use('/admin/queues', requireAuth, board.getRouter());

  app.use(authRouter);
  app.use(apiRouter);
  app.listen(config.port, () => console.log(`[server] http://localhost:${config.port}`));
}

main().catch((e) => { console.error(e); process.exit(1); });
