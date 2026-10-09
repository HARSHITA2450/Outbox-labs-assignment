import { FormEvent, useState } from 'react';
import { api } from '../api';
import { parseEmails, toLocalInput } from '../lib/format';
import { Button, Field, Input, Modal, Textarea, useToast } from './ui';

export function ComposeModal({ onClose, onScheduled }: { onClose: () => void; onScheduled: () => void }) {
  const toast = useToast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [start, setStart] = useState(toLocalInput(new Date(Date.now() + 5 * 60000)));
  const [delay, setDelay] = useState(2);
  const [limit, setLimit] = useState(50);
  const [saving, setSaving] = useState(false);

  const onFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setRecipients(parseEmails(await file.text()));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!recipients.length) return toast('Upload a file with at least one email address', 'error');
    setSaving(true);
    try {
      const { scheduled } = await api.schedule({
        subject, body, recipients, delaySeconds: delay, hourlyLimit: limit,
        startTime: new Date(start).toISOString(),
      });
      toast(`${scheduled} emails scheduled`);
      onScheduled();
      onClose();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Compose new email" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Subject"><Input required value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Body"><Textarea required rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <Field label="Leads (CSV or text file)">
          <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => onFile(e.target.files?.[0])}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm" />
        </Field>
        {fileName && (
          <p className="text-sm text-gray-600">
            {recipients.length} email address{recipients.length === 1 ? '' : 'es'} detected in {fileName}
          </p>
        )}
        <Field label="Start time">
          <Input type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Delay between emails (seconds)">
            <Input type="number" min={0} value={delay} onChange={(e) => setDelay(Number(e.target.value))} />
          </Field>
          <Field label="Hourly limit (per sender)">
            <Input type="number" min={1} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Schedule</Button>
        </div>
      </form>
    </Modal>
  );
}
