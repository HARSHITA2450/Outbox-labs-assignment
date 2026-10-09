import type { EmailRow, EmailTab, ScheduleInput, SlackStatus, User } from './types';

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? res.statusText);
  }
  return res.json();
}

export const api = {
  me: () => request<User>('/api/me'),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  emails: (tab: EmailTab) => request<EmailRow[]>(`/api/emails?status=${tab}`),
  schedule: (input: ScheduleInput) =>
    request<{ scheduled: number }>('/api/emails/schedule', { method: 'POST', body: JSON.stringify(input) }),
  slack: () => request<SlackStatus>('/api/slack'),
  slackDisconnect: () => request<{ ok: true }>('/api/slack', { method: 'DELETE' }),
};
