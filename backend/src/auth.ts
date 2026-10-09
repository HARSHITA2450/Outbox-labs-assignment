import { Router, RequestHandler } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { pool } from './db';

export const authRouter = Router();

const googleClient = () =>
  new OAuth2Client(config.google.clientId, config.google.clientSecret, `${config.backendUrl}/auth/google/callback`);

export const requireAuth: RequestHandler = (req, res, next) => {
  try {
    const { uid } = jwt.verify(req.cookies.token, config.jwtSecret) as { uid: number };
    res.locals.userId = uid;
    next();
  } catch {
    res.status(401).json({ error: 'Not signed in' });
  }
};

authRouter.get('/auth/google', (_req, res) => {
  res.redirect(googleClient().generateAuthUrl({ scope: ['openid', 'email', 'profile'], prompt: 'select_account' }));
});

authRouter.get('/auth/google/callback', async (req, res) => {
  try {
    const client = googleClient();
    const { tokens } = await client.getToken(String(req.query.code));
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token!, audience: config.google.clientId });
    const p = ticket.getPayload()!;
    const { rows } = await pool.query(
      `INSERT INTO users(google_id,email,name,avatar) VALUES($1,$2,$3,$4)
       ON CONFLICT(google_id) DO UPDATE SET email=EXCLUDED.email, name=EXCLUDED.name, avatar=EXCLUDED.avatar
       RETURNING id`,
      [p.sub, p.email, p.name, p.picture],
    );
    const token = jwt.sign({ uid: rows[0].id }, config.jwtSecret, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
    res.redirect(config.frontendUrl);
  } catch (e) {
    console.error('[auth] google login failed', e);
    res.redirect(`${config.frontendUrl}/?error=login_failed`);
  }
});

authRouter.post('/auth/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// ---- Slack OAuth (incoming-webhook scope) ----
const slackRedirect = `${config.backendUrl}/auth/slack/callback`;

authRouter.get('/auth/slack', requireAuth, (_req, res) => {
  const state = jwt.sign({ uid: res.locals.userId }, config.jwtSecret, { expiresIn: '10m' });
  const url = new URL('https://slack.com/oauth/v2/authorize');
  url.search = new URLSearchParams({
    client_id: config.slack.clientId, scope: 'incoming-webhook', redirect_uri: slackRedirect, state,
  }).toString();
  res.redirect(url.toString());
});

authRouter.get('/auth/slack/callback', async (req, res) => {
  try {
    const { uid } = jwt.verify(String(req.query.state), config.jwtSecret) as { uid: number };
    const r = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.slack.clientId, client_secret: config.slack.clientSecret,
        code: String(req.query.code), redirect_uri: slackRedirect,
      }),
    });
    const j: any = await r.json();
    if (!j.ok) throw new Error(j.error);
    await pool.query(
      `INSERT INTO slack_connections(user_id,webhook_url,channel,team) VALUES($1,$2,$3,$4)
       ON CONFLICT(user_id) DO UPDATE SET webhook_url=EXCLUDED.webhook_url, channel=EXCLUDED.channel, team=EXCLUDED.team`,
      [uid, j.incoming_webhook.url, j.incoming_webhook.channel, j.team?.name],
    );
    res.redirect(`${config.frontendUrl}/?slack=connected`);
  } catch (e) {
    console.error('[auth] slack connect failed', e);
    res.redirect(`${config.frontendUrl}/?slack=failed`);
  }
});
