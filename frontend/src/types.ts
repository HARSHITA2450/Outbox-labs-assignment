export interface User { id: number; email: string; name: string; avatar: string }
export type EmailStatus = 'scheduled' | 'sending' | 'sent' | 'failed';
export type EmailTab = 'scheduled' | 'sent';

export interface EmailRow {
  id: string;
  to_email: string;
  subject: string;
  status: EmailStatus;
  scheduled_at: string;
  sent_at: string | null;
}

export interface ScheduleInput {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delaySeconds: number;
  hourlyLimit: number;
}

export interface SlackStatus { connected: boolean; channel?: string; team?: string }
