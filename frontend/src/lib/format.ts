export const parseEmails = (text: string): string[] => {
  const found = text.match(/[^\s,;"'<>]+@[^\s,;"'<>]+\.[^\s,;"'<>]+/g) ?? [];
  return [...new Set(found.map((e) => e.toLowerCase()))];
};

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** Value for <input type="datetime-local"> in local time. */
export const toLocalInput = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
