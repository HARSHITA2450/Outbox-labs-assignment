import nodemailer, { Transporter } from 'nodemailer';
import { pool } from './db';
import { config } from './config';

export interface Sender {
  id: number; email: string; smtp_host: string; smtp_port: number; smtp_user: string; smtp_pass: string;
}

const transports = new Map<number, Transporter>();

/** Makes sure the user owns N Ethereal sender accounts and returns them. */
export async function ensureSenders(userId: number): Promise<Sender[]> {
  const load = () => pool.query<Sender>('SELECT * FROM senders WHERE user_id=$1 ORDER BY id', [userId]);
  let { rows } = await load();
  while (rows.length < config.sendersPerUser) {
    const acct = await nodemailer.createTestAccount();
    await pool.query(
      'INSERT INTO senders(user_id,email,smtp_host,smtp_port,smtp_user,smtp_pass) VALUES($1,$2,$3,$4,$5,$6)',
      [userId, acct.user, acct.smtp.host, acct.smtp.port, acct.user, acct.pass],
    );
    rows = (await load()).rows;
  }
  return rows;
}

function transportFor(s: Sender) {
  let t = transports.get(s.id);
  if (!t) {
    t = nodemailer.createTransport({
      host: s.smtp_host, port: s.smtp_port, secure: false, auth: { user: s.smtp_user, pass: s.smtp_pass },
    });
    transports.set(s.id, t);
  }
  return t;
}

export async function sendMail(s: Sender, to: string, subject: string, body: string) {
  const info = await transportFor(s).sendMail({ from: s.email, to, subject, text: body, html: body });
  return nodemailer.getTestMessageUrl(info) || null;
}
