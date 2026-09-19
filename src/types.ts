export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  code: string;       // e.g., "1-1000"
  name: string;       // e.g., "Kas dan Setara Kas"
  type: AccountType;  // Account classification
  normalBalance: 'debit' | 'credit';
  initialBalance: number; // For opening balances if any
}

export interface JournalLine {
  id: string;         // Unique line identifier
  accountCode: string;
  debit: number;      // 0 if none
  credit: number;     // 0 if none
}

export interface JournalEntry {
  id: string;
  date: string;       // YYYY-MM-DD
  reference: string;  // e.g., "JV-2026-001"
  description: string;
  lines: JournalLine[];
}

export interface FinancialMetric {
  title: string;
  value: number;
  changePercent?: number;
  isPositive?: boolean;
  prefix?: string;
}
