export type ReportSource = 'explanation' | 'summary' | 'chat' | 'problem' | 'quiz' | 'flashcard';

export type ReportDeliveryStatus = 'sent' | 'pending'; // 'Фиристода шуд' | 'Интизор'

export interface ErrorReport {
  id: string;
  date: string; // ISO string
  formattedDate: string; // Readable Tajik format
  subject: string;
  topicTitle: string;
  exactText: string;
  reason: string;
  comment?: string;
  source: ReportSource;
  status: ReportDeliveryStatus;
  appVersion?: string;
}

export const REPORT_REASONS = [
  'Ҷавоб нодуруст аст',
  'Забон хато аст',
  'Савол нофаҳмост',
  'Тест ҷавоби дуруст надорад',
  'Дигар',
] as const;

export type ReportReason = typeof REPORT_REASONS[number];
