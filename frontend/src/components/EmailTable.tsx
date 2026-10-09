import type { ReactNode } from 'react';
import type { EmailRow, EmailStatus } from '../types';
import { Spinner } from './ui';

export interface Column { header: string; render: (row: EmailRow) => ReactNode }

const badge: Record<EmailStatus, string> = {
  scheduled: 'bg-amber-100 text-amber-800',
  sending: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export const StatusBadge = ({ status }: { status: EmailStatus }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${badge[status]}`}>{status}</span>
);

interface Props { rows: EmailRow[]; columns: Column[]; loading: boolean; emptyTitle: string; emptyHint: string }

export function EmailTable({ rows, columns, loading, emptyTitle, emptyHint }: Props) {
  if (loading) {
    return <div className="flex justify-center py-20 text-gray-400"><Spinner /></div>;
  }
  if (!rows.length) {
    return (
      <div className="py-20 text-center">
        <p className="font-medium">{emptyTitle}</p>
        <p className="mt-1 text-sm text-gray-500">{emptyHint}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-gray-500">
          <tr>{columns.map((c) => <th key={c.header} className="px-4 py-3 font-medium">{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              {columns.map((c) => <td key={c.header} className="px-4 py-3">{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
