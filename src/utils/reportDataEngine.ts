import { Account, JournalEntry, AccountType } from '../types';
import { 
  ReportId, 
  ReportFilterOptions, 
  ReportDocumentConfig, 
  GeneratedReport, 
  ReportTableColumn, 
  ReportTableRow 
} from '../types/reportTypes';
import { calculateAccountBalance, getAccountingSummary } from '../utils';

/**
 * Currency Formatter conforming strictly to professional accounting standards
 * Negative values are presented in parentheses e.g. (Rp 15.000.000) or ($ 1,500)
 */
export function formatAccountingCurrency(amount: number, currency: string = 'IDR', rate: number = 1): string {
  const converted = amount / (rate > 0 ? rate : 1);
  const isNegative = converted < 0;
  const absVal = Math.abs(converted);

  let formatted = '';
  if (currency === 'USD') {
    formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absVal);
  } else if (currency === 'EUR') {
    formatted = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absVal);
  } else {
    // Default to IDR
    formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(absVal);
  }

  return isNegative ? `(${formatted})` : formatted;
}

/**
 * Filter journal entries according to user selected criteria
 */
export function filterJournalEntries(entries: JournalEntry[], filters: ReportFilterOptions): JournalEntry[] {
  return entries.filter(entry => {
    // 1. Date Range Filter
    if (filters.startDate && entry.date < filters.startDate) return false;
    if (filters.endDate && entry.date > filters.endDate) return false;

    // 2. Specific Accounts Filter
    if (filters.selectedAccounts && !filters.selectedAccounts.includes('all')) {
      const touchesSelectedAccount = entry.lines.some(l => filters.selectedAccounts.includes(l.accountCode));
      if (!touchesSelectedAccount) return false;
    }

    // 3. Custom Search Filter
    if (filters.customSearchText && filters.customSearchText.trim() !== '') {
      const q = filters.customSearchText.toLowerCase();
      const matchRef = entry.reference.toLowerCase().includes(q);
      const matchDesc = entry.description.toLowerCase().includes(q);
      const matchAccount = entry.lines.some(l => l.accountCode.toLowerCase().includes(q));
      if (!matchRef && !matchDesc && !matchAccount) return false;
    }

    // 4. Transaction Type Filter
    if (filters.transactionType !== 'all') {
      const hasRevenue = entry.lines.some(l => l.accountCode.startsWith('4-'));
      const hasExpense = entry.lines.some(l => l.accountCode.startsWith('5-'));
      const hasCash = entry.lines.some(l => l.accountCode.startsWith('1-10') || l.accountCode.startsWith('1-11'));
      const isTransfer = hasCash && entry.lines.filter(l => l.accountCode.startsWith('1-')).length >= 2 && !hasRevenue && !hasExpense;
      const isAdjustment = entry.reference.toLowerCase().includes('adj') || 
                           entry.description.toLowerCase().includes('penyesuaian') || 
                           entry.description.toLowerCase().includes('penyusutan');

      if (filters.transactionType === 'income' && !hasRevenue) return false;
      if (filters.transactionType === 'expense' && !hasExpense) return false;
      if (filters.transactionType === 'transfer' && !isTransfer) return false;
      if (filters.transactionType === 'adjustment' && !isAdjustment) return false;
    }

    return true;
  });
}

/**
 * Determine human-readable period description string
 */
export function getReportPeriodText(filters: ReportFilterOptions): string {
  if (!filters.startDate && !filters.endDate) {
    return 'All Recorded Transactions (Cumulative to Present)';
  }
  if (filters.startDate && filters.endDate) {
    return `Period: ${filters.startDate} to ${filters.endDate}`;
  }
  if (filters.startDate) {
    return `Period: From ${filters.startDate} onwards`;
  }
  return `Period: Up to ${filters.endDate}`;
}

/**
 * Master generator function for a given report
 */
export function generateSingleReport(
  reportId: ReportId,
  accounts: Account[],
  allEntries: JournalEntry[],
  filters: ReportFilterOptions,
  config: ReportDocumentConfig
): GeneratedReport {
  const filteredEntries = filterJournalEntries(allEntries, filters);
  const periodText = getReportPeriodText(filters);
  const cur = filters.currency;
  const rate = filters.currencyRate;
  const fmt = (val: number) => formatAccountingCurrency(val, cur, rate);

  switch (reportId) {
    // -------------------------------------------------------------
    // 1. BALANCE SHEET
    // -------------------------------------------------------------
    case 'balance_sheet': {
      const summary = getAccountingSummary(accounts, filteredEntries);
      const assetAccounts = accounts.filter(a => a.type === 'asset');
      const liabilityAccounts = accounts.filter(a => a.type === 'liability');
      const equityAccounts = accounts.filter(a => a.type === 'equity');

      const columns: ReportTableColumn[] = [
        { header: 'Account Code & Title', dataKey: 'account', align: 'left', width: 60 },
        { header: 'Amount', dataKey: 'amount', align: 'right', width: 40 }
      ];

      const rows: ReportTableRow[] = [];

      // Assets Header
      rows.push({ account: 'ASSETS (AKTIVA)', amount: '', isHeader: true });
      rows.push({ account: 'Current & Fixed Assets', amount: '', isHeader: true, indent: 1 });
      
      let calculatedAssets = 0;
      assetAccounts.forEach(acc => {
        const bal = calculateAccountBalance(acc, filteredEntries);
        calculatedAssets += bal;
        rows.push({
          account: `${acc.code} — ${acc.name}`,
          amount: fmt(bal),
          indent: 2
        });
      });

      rows.push({
        account: 'TOTAL ASSETS',
        amount: fmt(summary.totalAssets),
        isSubtotal: true
      });

      // Blank separator
      rows.push({ account: '', amount: '' });

      // Liabilities Header
      rows.push({ account: 'LIABILITIES (KEWAJIBAN)', amount: '', isHeader: true });
      rows.push({ account: 'Current & Long-Term Liabilities', amount: '', isHeader: true, indent: 1 });
      liabilityAccounts.forEach(acc => {
        const bal = calculateAccountBalance(acc, filteredEntries);
        rows.push({
          account: `${acc.code} — ${acc.name}`,
          amount: fmt(bal),
          indent: 2
        });
      });
      rows.push({
        account: 'TOTAL LIABILITIES',
        amount: fmt(summary.totalLiabilities),
        isSubtotal: true
      });

      // Blank separator
      rows.push({ account: '', amount: '' });

      // Equity Header
      rows.push({ account: 'EQUITY (EKUITAS & MODAL)', amount: '', isHeader: true });
      rows.push({ account: 'Paid-in Capital & Retained Earnings', amount: '', isHeader: true, indent: 1 });
      equityAccounts.forEach(acc => {
        const bal = calculateAccountBalance(acc, filteredEntries);
        rows.push({
          account: `${acc.code} — ${acc.name}`,
          amount: fmt(bal),
          indent: 2
        });
      });
      // Add current period net profit
      rows.push({
        account: 'Net Profit for Current Period (Laba Berjalan)',
        amount: fmt(summary.netIncome),
        indent: 2
      });
      rows.push({
        account: 'TOTAL EQUITY',
        amount: fmt(summary.totalEquity + summary.netIncome),
        isSubtotal: true
      });

      // Grand total Pasiva
      const totalPasiva = summary.totalLiabilities + summary.totalEquity + summary.netIncome;
      rows.push({
        account: 'TOTAL LIABILITIES & EQUITY',
        amount: fmt(totalPasiva),
        isGrandTotal: true
      });

      const discrepancy = Math.abs(summary.totalAssets - totalPasiva);
      const isBalanced = discrepancy < 0.01;

      return {
        id: reportId,
        title: 'BALANCE SHEET',
        subtitle: 'Statement of Financial Position',
        periodText,
        columns,
        rows,
        summaryItems: [
          { label: 'Total Assets', value: fmt(summary.totalAssets), isBold: true },
          { label: 'Total Liabilities & Equity', value: fmt(totalPasiva), isBold: true },
          { label: 'Balancing Status', value: isBalanced ? 'PERFECTLY BALANCED (0.00 Discrepancy)' : `UNBALANCED (${fmt(discrepancy)})`, isBold: true }
        ],
        notes: [
          'Prepared in compliance with General Indonesian Financial Accounting Standards (SAK ETAP / IFRS).',
          'Asset values include initial balances plus net period journal movements.'
        ],
        orientation: 'portrait'
      };
    }

    // -------------------------------------------------------------
    // 2. INCOME STATEMENT
    // -------------------------------------------------------------
    case 'income_statement': {
      const summary = getAccountingSummary(accounts, filteredEntries);
      const revenueAccounts = accounts.filter(a => a.type === 'revenue');
      const expenseAccounts = accounts.filter(a => a.type === 'expense');

      const columns: ReportTableColumn[] = [
        { header: 'Revenue & Expense Items', dataKey: 'account', align: 'left', width: 65 },
        { header: 'Amount', dataKey: 'amount', align: 'right', width: 35 }
      ];

      const rows: ReportTableRow[] = [];

      // Revenues
      rows.push({ account: 'OPERATING REVENUES (PENDAPATAN USAHA)', amount: '', isHeader: true });
      revenueAccounts.forEach(acc => {
        const bal = calculateAccountBalance(acc, filteredEntries);
        rows.push({
          account: `${acc.code} — ${acc.name}`,
          amount: fmt(bal),
          indent: 2
        });
      });
      rows.push({
        account: 'TOTAL OPERATING REVENUE',
        amount: fmt(summary.totalRevenues),
        isSubtotal: true
      });

      // Space
      rows.push({ account: '', amount: '' });

      // Expenses
      rows.push({ account: 'OPERATING EXPENSES (BEBAN USAHA)', amount: '', isHeader: true });
      expenseAccounts.forEach(acc => {
        const bal = calculateAccountBalance(acc, filteredEntries);
        rows.push({
          account: `${acc.code} — ${acc.name}`,
          amount: fmt(bal),
          indent: 2
        });
      });
      rows.push({
        account: 'TOTAL OPERATING EXPENSES',
        amount: fmt(summary.totalExpenses),
        isSubtotal: true
      });

      // Space
      rows.push({ account: '', amount: '' });

      // Net Income
      rows.push({
        account: summary.netIncome >= 0 ? 'NET INCOME / PROFIT (LABA BERSIH)' : 'NET LOSS (RUGI BERSIH)',
        amount: fmt(summary.netIncome),
        isGrandTotal: true
      });

      return {
        id: reportId,
        title: 'INCOME STATEMENT',
        subtitle: 'Statement of Profit and Loss',
        periodText,
        columns,
        rows,
        summaryItems: [
          { label: 'Gross Operating Revenue', value: fmt(summary.totalRevenues) },
          { label: 'Total Operating Expenses', value: fmt(summary.totalExpenses) },
          { label: 'Net Income (EBIT)', value: fmt(summary.netIncome), isBold: true }
        ],
        notes: [
          'Revenues and expenses represent transactions recognized in the selected timeframe.',
          'Net profit flows directly into the Balance Sheet under Owners Equity.'
        ],
        orientation: 'portrait'
      };
    }

    // -------------------------------------------------------------
    // 3. CASH FLOW STATEMENT
    // -------------------------------------------------------------
    case 'cash_flow': {
      // Direct Cash Flow calculation from journal lines interacting with cash/bank accounts (1-1000, 1-1100)
      const cashAccounts = accounts.filter(a => a.code === '1-1000' || a.code === '1-1100' || a.name.toLowerCase().includes('kas') || a.name.toLowerCase().includes('bank'));
      const cashCodes = new Set(cashAccounts.map(a => a.code));

      let beginningCash = 0;
      cashAccounts.forEach(a => { beginningCash += a.initialBalance; });

      let operatingInflow = 0;
      let operatingOutflow = 0;
      let investingOutflow = 0;
      let financingInflow = 0;

      filteredEntries.forEach(entry => {
        const touchesCashDebit = entry.lines.some(l => cashCodes.has(l.accountCode) && l.debit > 0);
        const touchesCashCredit = entry.lines.some(l => cashCodes.has(l.accountCode) && l.credit > 0);

        if (touchesCashDebit || touchesCashCredit) {
          entry.lines.forEach(l => {
            if (!cashCodes.has(l.accountCode)) {
              if (l.accountCode.startsWith('4-')) {
                operatingInflow += l.credit;
              } else if (l.accountCode.startsWith('5-')) {
                operatingOutflow += l.debit;
              } else if (l.accountCode.startsWith('1-2')) {
                // Fixed assets
                investingOutflow += l.debit;
              } else if (l.accountCode.startsWith('3-')) {
                // Equity
                financingInflow += l.credit;
              } else if (l.accountCode === '1-1200' && touchesCashDebit) {
                // AR collection
                operatingInflow += l.credit;
              } else if (l.accountCode === '2-1000' && touchesCashCredit) {
                // AP payment
                operatingOutflow += l.debit;
              }
            }
          });
        }
      });

      const netOperating = operatingInflow - operatingOutflow;
      const netInvesting = -investingOutflow;
      const netFinancing = financingInflow;
      const netChangeInCash = netOperating + netInvesting + netFinancing;

      let endingCash = 0;
      cashAccounts.forEach(a => {
        endingCash += calculateAccountBalance(a, filteredEntries);
      });

      const columns: ReportTableColumn[] = [
        { header: 'Cash Flow Component', dataKey: 'item', align: 'left', width: 65 },
        { header: 'Amount', dataKey: 'amount', align: 'right', width: 35 }
      ];

      const rows: ReportTableRow[] = [
        { item: 'CASH FLOWS FROM OPERATING ACTIVITIES', amount: '', isHeader: true },
        { item: 'Cash receipts from clients and customer sales', amount: fmt(operatingInflow), indent: 2 },
        { item: 'Cash paid to suppliers, utilities, and operating expenses', amount: fmt(-operatingOutflow), indent: 2 },
        { item: 'Net Cash Provided by (Used in) Operating Activities', amount: fmt(netOperating), isSubtotal: true },
        
        { item: '', amount: '' },
        { item: 'CASH FLOWS FROM INVESTING ACTIVITIES', amount: '', isHeader: true },
        { item: 'Acquisition of office equipment & physical capital assets', amount: fmt(netInvesting), indent: 2 },
        { item: 'Net Cash Used in Investing Activities', amount: fmt(netInvesting), isSubtotal: true },

        { item: '', amount: '' },
        { item: 'CASH FLOWS FROM FINANCING ACTIVITIES', amount: '', isHeader: true },
        { item: 'Owner capital contributions & equity financing', amount: fmt(netFinancing), indent: 2 },
        { item: 'Net Cash Provided by Financing Activities', amount: fmt(netFinancing), isSubtotal: true },

        { item: '', amount: '' },
        { item: 'NET INCREASE / (DECREASE) IN CASH & EQUIVALENTS', amount: fmt(netChangeInCash), isGrandTotal: true },
        { item: 'Cash and Cash Equivalents at Beginning of Period', amount: fmt(beginningCash), indent: 1 },
        { item: 'Cash and Cash Equivalents at End of Period', amount: fmt(endingCash), isGrandTotal: true }
      ];

      return {
        id: reportId,
        title: 'STATEMENT OF CASH FLOWS',
        subtitle: 'Direct Method Cash Liquidity Analysis',
        periodText,
        columns,
        rows,
        summaryItems: [
          { label: 'Beginning Cash Balance', value: fmt(beginningCash) },
          { label: 'Net Cash Movement', value: fmt(netChangeInCash) },
          { label: 'Ending Cash Position', value: fmt(endingCash), isBold: true }
        ],
        notes: [
          'Calculated from physical cash and bank account transactions across journal vouchers.',
          'Ending cash strictly equals the sum of Kas dan Setara Kas & Bank Mandiri.'
        ],
        orientation: 'portrait'
      };
    }

    // -------------------------------------------------------------
    // 4. STATEMENT OF CHANGES IN EQUITY
    // -------------------------------------------------------------
    case 'equity_changes': {
      const summary = getAccountingSummary(accounts, filteredEntries);
      const equityAccounts = accounts.filter(a => a.type === 'equity');

      let beginningEquity = 0;
      equityAccounts.forEach(a => { beginningEquity += a.initialBalance; });

      const netProfit = summary.netIncome;
      const endingEquity = beginningEquity + netProfit;

      const columns: ReportTableColumn[] = [
        { header: 'Equity Component', dataKey: 'item', align: 'left', width: 65 },
        { header: 'Amount', dataKey: 'amount', align: 'right', width: 35 }
      ];

      const rows: ReportTableRow[] = [
        { item: 'OWNERS EQUITY AT BEGINNING OF PERIOD', amount: '', isHeader: true },
        ...equityAccounts.map(acc => ({
          item: `${acc.code} — ${acc.name} (Opening Balance)`,
          amount: fmt(acc.initialBalance),
          indent: 2
        })),
        { item: 'Total Beginning Equity', amount: fmt(beginningEquity), isSubtotal: true },

        { item: '', amount: '' },
        { item: 'CHANGES IN EQUITY DURING PERIOD', amount: '', isHeader: true },
        { item: 'Add: Net Profit / (Loss) for the period', amount: fmt(netProfit), indent: 2 },
        { item: 'Less: Dividends & Owner Withdrawals (Prive)', amount: fmt(0), indent: 2 },
        { item: 'Net Comprehensive Period Addition', amount: fmt(netProfit), isSubtotal: true },

        { item: '', amount: '' },
        { item: 'TOTAL CLOSING EQUITY AT END OF PERIOD', amount: fmt(endingEquity), isGrandTotal: true }
      ];

      return {
        id: reportId,
        title: 'STATEMENT OF CHANGES IN EQUITY',
        subtitle: 'Analysis of Capital & Retained Earnings Movement',
        periodText,
        columns,
        rows,
        summaryItems: [
          { label: 'Opening Equity', value: fmt(beginningEquity) },
          { label: 'Current Net Income Addition', value: fmt(netProfit) },
          { label: 'Closing Equity Balance', value: fmt(endingEquity), isBold: true }
        ],
        orientation: 'portrait'
      };
    }

    // -------------------------------------------------------------
    // 5. TRIAL BALANCE (NERACA SALDO)
    // -------------------------------------------------------------
    case 'trial_balance': {
      const columns: ReportTableColumn[] = [
        { header: 'Code', dataKey: 'code', align: 'left', width: 15 },
        { header: 'Account Name', dataKey: 'name', align: 'left', width: 35 },
        { header: 'Type', dataKey: 'type', align: 'center', width: 12 },
        { header: 'Debit Mutation', dataKey: 'debit', align: 'right', width: 19 },
        { header: 'Credit Mutation', dataKey: 'credit', align: 'right', width: 19 }
      ];

      let totalDebits = 0;
      let totalCredits = 0;

      const rows: ReportTableRow[] = accounts.map(acc => {
        // Calculate account movements in selected entries
        let accDebit = 0;
        let accCredit = 0;

        filteredEntries.forEach(entry => {
          entry.lines.forEach(l => {
            if (l.accountCode === acc.code) {
              accDebit += l.debit;
              accCredit += l.credit;
            }
          });
        });

        // Current closing balance
        const balance = calculateAccountBalance(acc, filteredEntries);
        let displayDebit = 0;
        let displayCredit = 0;

        if (acc.normalBalance === 'debit') {
          if (balance >= 0) displayDebit = balance;
          else displayCredit = Math.abs(balance);
        } else {
          if (balance >= 0) displayCredit = balance;
          else displayDebit = Math.abs(balance);
        }

        totalDebits += displayDebit;
        totalCredits += displayCredit;

        return {
          code: acc.code,
          name: acc.name,
          type: acc.type.toUpperCase(),
          debit: displayDebit !== 0 ? fmt(displayDebit) : '-',
          credit: displayCredit !== 0 ? fmt(displayCredit) : '-'
        };
      });

      rows.push({
        code: 'TOTAL',
        name: 'SUMMARY TRIAL BALANCE',
        type: '',
        debit: fmt(totalDebits),
        credit: fmt(totalCredits),
        isGrandTotal: true
      });

      const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

      return {
        id: reportId,
        title: 'TRIAL BALANCE (NERACA SALDO)',
        subtitle: 'General Ledger Balances & Debit/Credit Reconciliation',
        periodText,
        columns,
        rows,
        summaryItems: [
          { label: 'Total Debits', value: fmt(totalDebits), isBold: true },
          { label: 'Total Credits', value: fmt(totalCredits), isBold: true },
          { label: 'Equilibrium', value: isBalanced ? 'BALANCED' : 'OUT OF BALANCE', isBold: true }
        ],
        notes: [
          'Proves arithmetic equality of all general ledger accounts prior to closing entries.'
        ],
        orientation: 'landscape'
      };
    }

    // -------------------------------------------------------------
    // 6. GENERAL LEDGER (DETAIL)
    // -------------------------------------------------------------
    case 'general_ledger': {
      const columns: ReportTableColumn[] = [
        { header: 'Date', dataKey: 'date', align: 'left', width: 14 },
        { header: 'Ref #', dataKey: 'ref', align: 'left', width: 16 },
        { header: 'Description / Memo', dataKey: 'desc', align: 'left', width: 34 },
        { header: 'Debit', dataKey: 'debit', align: 'right', width: 18 },
        { header: 'Credit', dataKey: 'credit', align: 'right', width: 18 }
      ];

      const rows: ReportTableRow[] = [];

      accounts.forEach(acc => {
        // Collect transactions for this account
        const accEntries: { date: string; ref: string; desc: string; debit: number; credit: number }[] = [];
        filteredEntries.forEach(entry => {
          entry.lines.forEach(l => {
            if (l.accountCode === acc.code) {
              accEntries.push({
                date: entry.date,
                ref: entry.reference,
                desc: entry.description,
                debit: l.debit,
                credit: l.credit
              });
            }
          });
        });

        if (accEntries.length > 0 || acc.initialBalance !== 0) {
          // Account Header Banner
          rows.push({
            date: `ACCOUNT: ${acc.code} — ${acc.name.toUpperCase()} [${acc.type.toUpperCase()}]`,
            ref: '',
            desc: `Normal Position: ${acc.normalBalance.toUpperCase()}`,
            debit: '',
            credit: '',
            isHeader: true
          });

          // Opening Balance Line
          rows.push({
            date: '-',
            ref: 'OPENING',
            desc: 'Beginning Account Balance (Saldo Awal)',
            debit: acc.normalBalance === 'debit' && acc.initialBalance > 0 ? fmt(acc.initialBalance) : '-',
            credit: acc.normalBalance === 'credit' && acc.initialBalance > 0 ? fmt(acc.initialBalance) : '-',
            indent: 1
          });

          let subDebit = 0;
          let subCredit = 0;

          accEntries.forEach(entry => {
            subDebit += entry.debit;
            subCredit += entry.credit;
            rows.push({
              date: entry.date,
              ref: entry.ref,
              desc: entry.desc,
              debit: entry.debit > 0 ? fmt(entry.debit) : '-',
              credit: entry.credit > 0 ? fmt(entry.credit) : '-',
              indent: 1
            });
          });

          const finalBal = calculateAccountBalance(acc, filteredEntries);
          rows.push({
            date: '',
            ref: 'CLOSING BALANCE',
            desc: `Ending Balance: ${fmt(finalBal)}`,
            debit: fmt(subDebit),
            credit: fmt(subCredit),
            isSubtotal: true
          });

          rows.push({ date: '', ref: '', desc: '', debit: '', credit: '' });
        }
      });

      return {
        id: reportId,
        title: 'GENERAL LEDGER REPORT',
        subtitle: 'Chronological Account Activity & Running Balance',
        periodText,
        columns,
        rows,
        summaryItems: [
          { label: 'Accounts Analyzed', value: `${accounts.length} active ledger accounts` },
          { label: 'Transactions Processed', value: `${filteredEntries.length} vouchers` }
        ],
        orientation: 'landscape'
      };
    }

    // -------------------------------------------------------------
    // 7. ACCOUNTS RECEIVABLE (PIUTANG USAHA)
    // -------------------------------------------------------------
    case 'accounts_receivable': {
      const arAccount = accounts.find(a => a.code === '1-1200' || a.name.toLowerCase().includes('piutang')) || accounts[2];
      const initialBal = arAccount ? arAccount.initialBalance : 0;

      const columns: ReportTableColumn[] = [
        { header: 'Date', dataKey: 'date', align: 'left', width: 15 },
        { header: 'Voucher Ref', dataKey: 'ref', align: 'left', width: 18 },
        { header: 'Debtor / Transaction Memo', dataKey: 'desc', align: 'left', width: 33 },
        { header: 'Invoiced (Debit)', dataKey: 'invoiced', align: 'right', width: 17 },
        { header: 'Collected (Credit)', dataKey: 'collected', align: 'right', width: 17 }
      ];

      const rows: ReportTableRow[] = [
        {
          date: '-',
          ref: 'BEGINNING',
          desc: 'Opening Accounts Receivable Balance',
          invoiced: fmt(initialBal),
          collected: '-',
          isHeader: true
        }
      ];

      let totalInvoiced = initialBal;
      let totalCollected = 0;

      filteredEntries.forEach(entry => {
        entry.lines.forEach(l => {
          if (l.accountCode === arAccount.code) {
            totalInvoiced += l.debit;
            totalCollected += l.credit;
            rows.push({
              date: entry.date,
              ref: entry.reference,
              desc: entry.description,
              invoiced: l.debit > 0 ? fmt(l.debit) : '-',
              collected: l.credit > 0 ? fmt(l.credit) : '-'
            });
          }
        });
      });

      const outstanding = totalInvoiced - totalCollected;

      rows.push({
        date: 'TOTAL',
        ref: '',
        desc: 'Net Outstanding Receivables',
        invoiced: fmt(totalInvoiced),
        collected: fmt(totalCollected),
        isSubtotal: true
      });

      rows.push({
        date: '',
        ref: '',
        desc: 'TOTAL OUTSTANDING RECEIVABLE BALANCE',
        invoiced: '',
        collected: fmt(outstanding),
        isGrandTotal: true
      });

      return {
        id: reportId,
        title: 'ACCOUNTS RECEIVABLE SUMMARY',
        subtitle: 'Customer Credit Billing & Collection Aging Statement',
        periodText,
        columns,
        rows,
        summaryItems: [
          { label: 'Total Invoiced & Opening', value: fmt(totalInvoiced) },
          { label: 'Total Cash Collected', value: fmt(totalCollected) },
          { label: 'Current Receivables Due', value: fmt(outstanding), isBold: true }
        ],
        orientation: 'portrait'
      };
    }

    // -------------------------------------------------------------
    // 8. ACCOUNTS PAYABLE (UTANG USAHA)
    // -------------------------------------------------------------
    case 'accounts_payable': {
      const apAccount = accounts.find(a => a.code === '2-1000' || a.name.toLowerCase().includes('utang usaha')) || accounts[6];
      const initialBal = apAccount ? apAccount.initialBalance : 0;

      const columns: ReportTableColumn[] = [
        { header: 'Date', dataKey: 'date', align: 'left', width: 15 },
        { header: 'Voucher Ref', dataKey: 'ref', align: 'left', width: 18 },
        { header: 'Creditor / Vendor Bill Details', dataKey: 'desc', align: 'left', width: 33 },
        { header: 'Settled (Debit)', dataKey: 'settled', align: 'right', width: 17 },
        { header: 'Billed (Credit)', dataKey: 'billed', align: 'right', width: 17 }
      ];

      const rows: ReportTableRow[] = [
        {
          date: '-',
          ref: 'BEGINNING',
          desc: 'Opening Accounts Payable Balance',
          settled: '-',
          billed: fmt(initialBal),
          isHeader: true
        }
      ];

      let totalSettled = 0;
      let totalBilled = initialBal;

      filteredEntries.forEach(entry => {
        entry.lines.forEach(l => {
          if (l.accountCode === apAccount.code) {
            totalSettled += l.debit;
            totalBilled += l.credit;
            rows.push({
              date: entry.date,
              ref: entry.reference,
              desc: entry.description,
              settled: l.debit > 0 ? fmt(l.debit) : '-',
              billed: l.credit > 0 ? fmt(l.credit) : '-'
            });
          }
        });
      });

      const netPayable = totalBilled - totalSettled;

      rows.push({
        date: 'TOTAL',
        ref: '',
        desc: 'Net Outstanding Payables',
        settled: fmt(totalSettled),
        billed: fmt(totalBilled),
        isSubtotal: true
      });

      rows.push({
        date: '',
        ref: '',
        desc: 'TOTAL OUTSTANDING PAYABLE BALANCE',
        settled: '',
        billed: fmt(netPayable),
        isGrandTotal: true
      });

      return {
        id: reportId,
        title: 'ACCOUNTS PAYABLE STATEMENT',
        subtitle: 'Vendor Obligations & Supplier Credit Aging',
        periodText,
        columns,
        rows,
        summaryItems: [
          { label: 'Total Billed & Opening', value: fmt(totalBilled) },
          { label: 'Total Settled & Paid', value: fmt(totalSettled) },
          { label: 'Current Payables Due', value: fmt(netPayable), isBold: true }
        ],
        orientation: 'portrait'
      };
    }

    // -------------------------------------------------------------
    // 9. ACCOUNT SUMMARY (CHART OF ACCOUNTS)
    // -------------------------------------------------------------
    case 'account_summary': {
      const columns: ReportTableColumn[] = [
        { header: 'Code', dataKey: 'code', align: 'left', width: 15 },
        { header: 'Account Title', dataKey: 'name', align: 'left', width: 35 },
        { header: 'Category', dataKey: 'category', align: 'center', width: 16 },
        { header: 'Normal', dataKey: 'normal', align: 'center', width: 14 },
        { header: 'Current Balance', dataKey: 'balance', align: 'right', width: 20 }
      ];

      let grandTotal = 0;
      const rows: ReportTableRow[] = accounts.map(acc => {
        const bal = calculateAccountBalance(acc, filteredEntries);
        grandTotal += bal;
        return {
          code: acc.code,
          name: acc.name,
          category: acc.type.toUpperCase(),
          normal: acc.normalBalance.toUpperCase(),
          balance: fmt(bal)
        };
      });

      rows.push({
        code: 'TOTAL',
        name: `${accounts.length} Active Master Accounts`,
        category: '',
        normal: '',
        balance: fmt(grandTotal),
        isGrandTotal: true
      });

      return {
        id: reportId,
        title: 'CHART OF ACCOUNTS MASTER SUMMARY',
        subtitle: 'Classification Directory & Account Balances',
        periodText,
        columns,
        rows,
        summaryItems: [
          { label: 'Total Accounts in Registry', value: `${accounts.length}` },
          { label: 'Active Journalized Accounts', value: `${accounts.filter(a => filteredEntries.some(e => e.lines.some(l => l.accountCode === a.code))).length}` }
        ],
        orientation: 'portrait'
      };
    }

    // -------------------------------------------------------------
    // 10. EXPENSE SUMMARY
    // -------------------------------------------------------------
    case 'expense_summary': {
      const expenseAccounts = accounts.filter(a => a.type === 'expense');
      const totalExpenses = expenseAccounts.reduce((sum, a) => sum + calculateAccountBalance(a, filteredEntries), 0);

      const columns: ReportTableColumn[] = [
        { header: 'Expense Code & Classification', dataKey: 'name', align: 'left', width: 50 },
        { header: 'Amount Expensed', dataKey: 'amount', align: 'right', width: 25 },
        { header: '% of Total', dataKey: 'percent', align: 'right', width: 25 }
      ];

      const rows: ReportTableRow[] = expenseAccounts
        .map(acc => {
          const bal = calculateAccountBalance(acc, filteredEntries);
          const pct = totalExpenses > 0 ? ((bal / totalExpenses) * 100).toFixed(1) : '0.0';
          return {
            name: `${acc.code} — ${acc.name}`,
            amount: fmt(bal),
            percent: `${pct}%`,
            rawBal: bal
          };
        })
        .sort((a, b) => b.rawBal - a.rawBal);

      rows.push({
        name: 'TOTAL OPERATIONAL EXPENSES',
        amount: fmt(totalExpenses),
        percent: '100.0%',
        isGrandTotal: true
      });

      return {
        id: reportId,
        title: 'EXPENSE CATEGORY BREAKDOWN',
        subtitle: 'Cost Centers & Operational Spending Distribution',
        periodText,
        columns,
        rows,
        summaryItems: [
          { label: 'Total Operating Expenses', value: fmt(totalExpenses), isBold: true },
          { label: 'Largest Expense Center', value: rows[0]?.name || 'None' }
        ],
        orientation: 'portrait'
      };
    }

    // -------------------------------------------------------------
    // 11. INCOME SUMMARY
    // -------------------------------------------------------------
    case 'income_summary': {
      const revenueAccounts = accounts.filter(a => a.type === 'revenue');
      const totalRevenue = revenueAccounts.reduce((sum, a) => sum + calculateAccountBalance(a, filteredEntries), 0);

      const columns: ReportTableColumn[] = [
        { header: 'Revenue Stream & Account', dataKey: 'name', align: 'left', width: 50 },
        { header: 'Revenue Generated', dataKey: 'amount', align: 'right', width: 25 },
        { header: '% of Total', dataKey: 'percent', align: 'right', width: 25 }
      ];

      const rows: ReportTableRow[] = revenueAccounts
        .map(acc => {
          const bal = calculateAccountBalance(acc, filteredEntries);
          const pct = totalRevenue > 0 ? ((bal / totalRevenue) * 100).toFixed(1) : '0.0';
          return {
            name: `${acc.code} — ${acc.name}`,
            amount: fmt(bal),
            percent: `${pct}%`,
            rawBal: bal
          };
        })
        .sort((a, b) => b.rawBal - a.rawBal);

      rows.push({
        name: 'TOTAL EARNED REVENUE',
        amount: fmt(totalRevenue),
        percent: '100.0%',
        isGrandTotal: true
      });

      return {
        id: reportId,
        title: 'REVENUE & INCOME BREAKDOWN',
        subtitle: 'Top Revenue Streams & Service Sales Contribution',
        periodText,
        columns,
        rows,
        summaryItems: [
          { label: 'Total Earned Revenue', value: fmt(totalRevenue), isBold: true },
          { label: 'Top Earning Channel', value: rows[0]?.name || 'None' }
        ],
        orientation: 'portrait'
      };
    }

    // -------------------------------------------------------------
    // 12. TAX-RELATED SUMMARY
    // -------------------------------------------------------------
    case 'tax_summary': {
      const summary = getAccountingSummary(accounts, filteredEntries);
      const taxLiabilityAccount = accounts.find(a => a.code === '2-2000' || a.name.toLowerCase().includes('pajak'));
      const recordedTaxPayable = taxLiabilityAccount ? calculateAccountBalance(taxLiabilityAccount, filteredEntries) : 0;

      // Estimated statutory Indonesian VAT (PPN 11%) on gross service revenue
      const estimatedPPN = summary.totalRevenues * 0.11;
      const estimatedCorporateTax = Math.max(0, summary.netIncome * 0.22); // PPh Badan 22%

      const columns: ReportTableColumn[] = [
        { header: 'Tax Obligation Item', dataKey: 'item', align: 'left', width: 65 },
        { header: 'Amount', dataKey: 'amount', align: 'right', width: 35 }
      ];

      const rows: ReportTableRow[] = [
        { item: 'RECORDED TAX LIABILITIES (NERACA)', amount: '', isHeader: true },
        {
          item: `${taxLiabilityAccount?.code || '2-2000'} — ${taxLiabilityAccount?.name || 'Utang Gaji & Pajak'}`,
          amount: fmt(recordedTaxPayable),
          indent: 2
        },
        { item: 'Total Accrued Tax Payable', amount: fmt(recordedTaxPayable), isSubtotal: true },

        { item: '', amount: '' },
        { item: 'ESTIMATED TAX COMPLIANCE SIMULATION', amount: '', isHeader: true },
        { item: 'Total Recognized Gross Revenue Base', amount: fmt(summary.totalRevenues), indent: 2 },
        { item: 'Estimated Output VAT / PPN (11% on taxable service turnover)', amount: fmt(estimatedPPN), indent: 2 },
        { item: 'Taxable Corporate Net Profit Base (EBT)', amount: fmt(summary.netIncome), indent: 2 },
        { item: 'Estimated Corporate Income Tax (PPh Badan 22%)', amount: fmt(estimatedCorporateTax), indent: 2 },

        { item: '', amount: '' },
        {
          item: 'ESTIMATED TOTAL TAX COMPLIANCE OBLIGATION',
          amount: fmt(recordedTaxPayable + estimatedPPN),
          isGrandTotal: true
        }
      ];

      return {
        id: reportId,
        title: 'TAX & FISCAL COMPLIANCE SUMMARY',
        subtitle: 'Tax Liabilities, PPN (VAT), and Withholding Overview',
        periodText,
        columns,
        rows,
        summaryItems: [
          { label: 'Recorded Tax Liabilities', value: fmt(recordedTaxPayable) },
          { label: 'Estimated VAT (PPN 11%)', value: fmt(estimatedPPN) },
          { label: 'Net Income Tax Base', value: fmt(summary.netIncome), isBold: true }
        ],
        notes: [
          'Estimated tax numbers are illustrative based on current Indonesian taxation laws (UU HPP).',
          'Consult your certified public tax accountant (Konsultan Pajak) for official SPT filing.'
        ],
        orientation: 'portrait'
      };
    }

    // -------------------------------------------------------------
    // 13. TRANSACTION HISTORY / ACCOUNTING HISTORY
    // -------------------------------------------------------------
    default: {
      // Handles: all_transactions, income_only, expenses_only, transfers, adjustments, custom_transactions
      let title = 'ACCOUNTING TRANSACTION HISTORY';
      let subtitle = 'Chronological Journal Entries & Vouchers';

      if (reportId === 'income_only') {
        title = 'INCOME TRANSACTIONS LOG';
        subtitle = 'Revenue & Cash Inflow Journal Entries';
      } else if (reportId === 'expenses_only') {
        title = 'EXPENSE TRANSACTIONS LOG';
        subtitle = 'Operational & Cost Disbursement Vouchers';
      } else if (reportId === 'transfers') {
        title = 'BANK & CASH TRANSFERS LOG';
        subtitle = 'Inter-Account Liquidity Movement Vouchers';
      } else if (reportId === 'adjustments') {
        title = 'ADJUSTMENT ENTRIES LOG';
        subtitle = 'Period-End Accruals & Corrections';
      } else if (reportId === 'custom_transactions') {
        title = 'CUSTOM FILTERED JOURNALS';
        subtitle = `Custom Query Criteria: ${filters.customSearchText || 'Selective'}`;
      }

      const columns: ReportTableColumn[] = [
        { header: 'Date', dataKey: 'date', align: 'left', width: 12 },
        { header: 'Ref #', dataKey: 'ref', align: 'left', width: 14 },
        { header: 'Description / Account Line Items', dataKey: 'desc', align: 'left', width: 44 },
        { header: 'Debit', dataKey: 'debit', align: 'right', width: 15 },
        { header: 'Credit', dataKey: 'credit', align: 'right', width: 15 }
      ];

      const rows: ReportTableRow[] = [];
      let grandDebit = 0;
      let grandCredit = 0;

      filteredEntries.forEach(entry => {
        // Master transaction row
        rows.push({
          date: entry.date,
          ref: entry.reference,
          desc: entry.description,
          debit: '',
          credit: '',
          isHeader: true
        });

        entry.lines.forEach(l => {
          grandDebit += l.debit;
          grandCredit += l.credit;
          const acc = accounts.find(a => a.code === l.accountCode);
          rows.push({
            date: '',
            ref: '',
            desc: `${l.accountCode} — ${acc ? acc.name : ''}`,
            debit: l.debit > 0 ? fmt(l.debit) : '-',
            credit: l.credit > 0 ? fmt(l.credit) : '-',
            indent: 2
          });
        });
      });

      rows.push({
        date: 'TOTAL',
        ref: `${filteredEntries.length} Journals`,
        desc: 'Grand Total Transaction Flow',
        debit: fmt(grandDebit),
        credit: fmt(grandCredit),
        isGrandTotal: true
      });

      return {
        id: reportId,
        title,
        subtitle,
        periodText,
        columns,
        rows,
        summaryItems: [
          { label: 'Journal Count', value: `${filteredEntries.length} transactions` },
          { label: 'Total Volume Debited', value: fmt(grandDebit), isBold: true },
          { label: 'Total Volume Credited', value: fmt(grandCredit), isBold: true }
        ],
        notes: [
          'All vouchers maintain strict double-entry ledger balance.'
        ],
        orientation: 'portrait'
      };
    }
  }
}
