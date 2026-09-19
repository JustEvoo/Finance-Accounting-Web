import { Account, JournalEntry, AccountType } from '../types';

export type ReportId =
  // Accounting History
  | 'all_transactions'
  | 'income_only'
  | 'expenses_only'
  | 'transfers'
  | 'adjustments'
  | 'custom_transactions'
  // Official Financial Statements
  | 'balance_sheet'
  | 'income_statement'
  | 'cash_flow'
  | 'equity_changes'
  | 'trial_balance'
  // Other Reports
  | 'general_ledger'
  | 'accounts_receivable'
  | 'accounts_payable'
  | 'account_summary'
  | 'expense_summary'
  | 'income_summary'
  | 'tax_summary';

export type ReportCategory = 'history' | 'statements' | 'other';

export interface ReportDefinition {
  id: ReportId;
  category: ReportCategory;
  name: string;
  nameId: string;
  description: string;
  descriptionId: string;
  recommendedOrientation: 'portrait' | 'landscape';
}

export type DatePreset = 'all' | 'this_month' | 'last_month' | 'this_quarter' | 'ytd' | 'custom';

export type TransactionFilterType = 'all' | 'income' | 'expense' | 'transfer' | 'adjustment' | 'custom';

export type CategoryFilterType = 'all' | AccountType;

export type CurrencyCode = 'IDR' | 'USD' | 'EUR';

export interface ReportFilterOptions {
  datePreset: DatePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  selectedAccounts: string[]; // ['all'] or list of account codes
  transactionType: TransactionFilterType;
  category: CategoryFilterType;
  department: string; // 'all' | 'main' | 'consulting' | 'it'
  currency: CurrencyCode;
  currencyRate: number; // Conversion rate to IDR (1 for IDR)
  statusFilter: 'all' | 'posted' | 'unposted';
  customSearchText?: string;
}

export interface ReportDocumentConfig {
  companyName: string;
  companyAddress?: string;
  reportSubtitle: string;
  showLogo: boolean;
  showConfidentialityNotice: boolean;
  confidentialityText: string;
  showPrintedTimestamp: boolean;
  showPageNumbers: boolean;
  orientation: 'portrait' | 'landscape' | 'auto';
  combineMultipleReports: boolean;
}

export interface ReportTableColumn {
  header: string;
  dataKey: string;
  align?: 'left' | 'center' | 'right';
  width?: number;
}

export interface ReportTableRow {
  [key: string]: any;
  isHeader?: boolean;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  indent?: number;
}

export interface GeneratedReport {
  id: ReportId;
  title: string;
  subtitle?: string;
  periodText: string;
  columns: ReportTableColumn[];
  rows: ReportTableRow[];
  summaryItems?: { label: string; value: string; isBold?: boolean }[];
  notes?: string[];
  orientation: 'portrait' | 'landscape';
}
