import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { ComposeModal } from '../components/ComposeModal';
import { Column, EmailTable, StatusBadge } from '../components/EmailTable';
import { Button, useToast } from '../components/ui';
import { formatDate } from '../lib/format';
import type { EmailRow, EmailTab, SlackStatus } from '../types';

const common: Column[] = [
  { header: 'Email', render: (r) => r.to_email },
  { header: 'Subject', render: (r) => <span className="line-clamp-1">{r.subject}</span> },
];
const status: Column = { header: 'Status', render: (r) => <StatusBadge status={r.status} /> };

const tabs: Record<EmailTab, { label: string; columns: Column[]; emptyTitle: string; emptyHint: string }> = {
  scheduled: {
    label: 'Scheduled emails',
    columns: [...common, { header: 'Scheduled time', render: (r) => formatDate(r.scheduled_at) }, status],
    emptyTitle: 'No scheduled emails',
    emptyHint: 'Compose a new email to schedule your first batch.',
  },
  sent: {
    label: 'Sent emails',
    columns: [...common, { header: 'Sent time', render: (r) => formatDate(r.sent_at) }, status],
    emptyTitle: 'No sent emails yet',
    emptyHint: 'Emails appear here once they have been delivered.',
  },
};

export function Dashboard() {
  const toast = useToast();
  const [tab, setTab] = useState<EmailTab>('scheduled');
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [slack, setSlack] = useState<SlackStatus>({ connected: false });

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      setRows(await api.emails(tab));
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    load(true);
    const t = setInterval(() => load(), 10_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    api.slack().then(setSlack).catch(() => {});
    const flag = new URLSearchParams(window.location.search).get('slack');
    if (flag) toast(flag === 'connected' ? 'Slack connected' : 'Slack connection failed', flag === 'connected' ? 'success' : 'error');
  }, [toast]);

  const disconnectSlack = async () => {
    await api.slackDisconnect();
    setSlack({ connected: false });
    toast('Slack disconnected');
  };

  const { columns, emptyTitle, emptyHint } = tabs[tab];

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-gray-200 p-1">
          {(Object.keys(tabs) as EmailTab[]).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${tab === key ? 'bg-white shadow-sm' : 'text-gray-600'}`}
            >
              {tabs[key].label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {slack.connected ? (
            <Button variant="ghost" onClick={disconnectSlack}>Disconnect Slack{slack.channel ? ` (${slack.channel})` : ''}</Button>
          ) : (
            <a href="/auth/slack" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100">Connect Slack</a>
          )}
          <Button onClick={() => setComposing(true)}>Compose new email</Button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white">
        <EmailTable rows={rows} columns={columns} loading={loading} emptyTitle={emptyTitle} emptyHint={emptyHint} />
      </div>

      {composing && <ComposeModal onClose={() => setComposing(false)} onScheduled={() => load(true)} />}
    </main>
  );
}
