import { Account, JournalEntry, AccountType } from './types';

export interface AccountingSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenues: number;
  totalExpenses: number;
  netIncome: number;
  cashPosition: number;
  isBalanced: boolean;
  discrepancy: number;
}

/**
 * Calculates the current balance for an individual account.
 */
export function calculateAccountBalance(account: Account, entries: JournalEntry[]): number {
  let debits = 0;
  let credits = 0;

  // Add debits and credits from journal entries
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.accountCode === account.code) {
        debits += line.debit;
        credits += line.credit;
      }
    }
  }

  // Calculate final balance based on normal balance
  if (account.normalBalance === 'debit') {
    return account.initialBalance + debits - credits;
  } else {
    return account.initialBalance + credits - debits;
  }
}

/**
 * Generates an aggregated financial summary of all accounts.
 */
export function getAccountingSummary(accounts: Account[], entries: JournalEntry[]): AccountingSummary {
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let totalRevenues = 0;
  let totalExpenses = 0;
  let cashPosition = 0;

  for (const account of accounts) {
    const balance = calculateAccountBalance(account, entries);

    switch (account.type) {
      case 'asset':
        totalAssets += balance;
        // Specifically track cash accounts for quick liquidity view
        if (account.code === '1-1000' || account.code === '1-1100') {
          cashPosition += balance;
        }
        break;
      case 'liability':
        totalLiabilities += balance;
        break;
      case 'equity':
        totalEquity += balance;
        break;
      case 'revenue':
        totalRevenues += balance;
        break;
      case 'expense':
        totalExpenses += balance;
        break;
    }
  }

  const netIncome = totalRevenues - totalExpenses;
  
  // Accounting Equation: Assets = Liabilities + Equity + Net Income
  const leftSide = totalAssets;
  const rightSide = totalLiabilities + totalEquity + netIncome;
  const discrepancy = Math.abs(leftSide - rightSide);
  const isBalanced = discrepancy < 0.01; // Avoid floating point issues

  return {
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalRevenues,
    totalExpenses,
    netIncome,
    cashPosition,
    isBalanced,
    discrepancy
  };
}

/**
 * Validates that a journal entry is perfectly balanced (Total Debits = Total Credits)
 * and has valid inputs.
 */
export function validateJournalEntry(lines: { accountCode: string; debit: number; credit: number }[]): {
  isValid: boolean;
  totalDebits: number;
  totalCredits: number;
  error?: string;
} {
  if (lines.length < 2) {
    return { isValid: false, totalDebits: 0, totalCredits: 0, error: 'Jurnal minimal harus memiliki 2 baris transaksi.' };
  }

  let totalDebits = 0;
  let totalCredits = 0;
  let hasEmptyAccount = false;

  for (const line of lines) {
    if (!line.accountCode) {
      hasEmptyAccount = true;
    }
    totalDebits += line.debit;
    totalCredits += line.credit;
  }

  if (hasEmptyAccount) {
    return { isValid: false, totalDebits, totalCredits, error: 'Semua baris transaksi harus memilih akun.' };
  }

  if (totalDebits === 0 && totalCredits === 0) {
    return { isValid: false, totalDebits, totalCredits, error: 'Nilai transaksi tidak boleh kosong.' };
  }

  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  if (!isBalanced) {
    return {
      isValid: false,
      totalDebits,
      totalCredits,
      error: `Jurnal tidak seimbang. Selisih: Rp ${new Intl.NumberFormat('id-ID').format(Math.abs(totalDebits - totalCredits))}`
    };
  }

  return { isValid: true, totalDebits, totalCredits };
}
