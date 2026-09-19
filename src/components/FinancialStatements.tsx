import React, { useState } from 'react';
import { Account, JournalEntry } from '../types';
import { calculateAccountBalance, getAccountingSummary } from '../utils';
import { formatRupiah } from '../initialData';
import { useLanguage } from '../context/LanguageContext';
import { Printer, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ExportReportModal } from './ReportModal/ExportReportModal';

interface FinancialStatementsProps {
  accounts: Account[];
  entries: JournalEntry[];
  onOpenExportModal?: () => void;
}

export default function FinancialStatements({ accounts, entries, onOpenExportModal }: FinancialStatementsProps) {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'income' | 'balance'>('income');
  const [localExportModalOpen, setLocalExportModalOpen] = useState(false);

  const summary = getAccountingSummary(accounts, entries);

  // Group accounts
  const assetAccounts = accounts.filter(a => a.type === 'asset');
  const liabilityAccounts = accounts.filter(a => a.type === 'liability');
  const equityAccounts = accounts.filter(a => a.type === 'equity');
  const revenueAccounts = accounts.filter(a => a.type === 'revenue');
  const expenseAccounts = accounts.filter(a => a.type === 'expense');

  // Trigger export modal
  const handleOpenExport = () => {
    if (onOpenExportModal) {
      onOpenExportModal();
    } else {
      setLocalExportModalOpen(true);
    }
  };

  return (
    <div className="space-y-4 print:p-6 print:bg-white print:text-black">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-xs font-bold font-sans tracking-tight text-slate-950 dark:text-white uppercase">{t('fsTitle')}</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('fsDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab selector */}
          <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-300 dark:border-slate-700 flex gap-0.5 shadow-2xs">
            <button
              onClick={() => setActiveTab('income')}
              className={`px-2.5 py-1 text-[10px] font-mono rounded transition-all cursor-pointer focus:outline-hidden ${
                activeTab === 'income' 
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white font-bold shadow-xs' 
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              {t('fsPL')}
            </button>
            <button
              onClick={() => setActiveTab('balance')}
              className={`px-2.5 py-1 text-[10px] font-mono rounded transition-all cursor-pointer focus:outline-hidden ${
                activeTab === 'balance' 
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white font-bold shadow-xs' 
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              {t('fsBS')}
            </button>
          </div>
          
          {/* Prominent Print / Export PDF Button */}
          <button
            onClick={handleOpenExport}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-mono font-bold rounded-md transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border border-transparent focus:outline-hidden focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
            title="Generate custom accounting reports and export to PDF"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{t('printExportPdf') || 'Print / Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Local Export Modal (if triggered locally) */}
      {!onOpenExportModal && (
        <ExportReportModal
          isOpen={localExportModalOpen}
          onClose={() => setLocalExportModalOpen(false)}
          accounts={accounts}
          entries={entries}
        />
      )}

      {/* Print-only Header */}
      <div className="hidden print:block text-center border-b pb-2 mb-4">
        <h1 className="text-lg font-bold uppercase tracking-wide text-slate-950">VAST ERP</h1>
        <p className="text-[10px] font-mono text-slate-600 mt-0.5">{t('fsPeriod')}</p>
        <p className="text-[9px] text-slate-500 font-mono">{t('ledgerSystemAuto')}</p>
      </div>

      {/* Dynamic Balance Check Bar */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2.5 flex items-center justify-between gap-3 text-[11px] font-mono">
        <div className="flex items-center gap-1.5">
          {summary.isBalanced ? (
            <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 h-3.5 w-3.5 shrink-0" />
          ) : (
            <ShieldAlert className="text-amber-600 dark:text-amber-400 h-3.5 w-3.5 shrink-0" />
          )}
          <span className="text-slate-700 dark:text-slate-300">
            {summary.isBalanced 
              ? t('fsBalancedMsg')
              : t('fsUnbalancedMsg')
            }
          </span>
        </div>
        <span className="font-bold text-slate-900 dark:text-white">
          {t('fsDiscrepancy')}: Rp {new Intl.NumberFormat('id-ID').format(summary.discrepancy)}
        </span>
      </div>

      {/* Main Report Containers */}
      {activeTab === 'income' ? (
        /* INCOME STATEMENT */
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded shadow-xs p-5 md:p-6 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-950 dark:bg-white"></div>
          
          <div className="text-center space-y-0.5">
            <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase block">{t('fsReport')}</span>
            <h3 className="text-xs font-bold font-sans tracking-tight text-slate-950 dark:text-white uppercase">{t('fsIncomeStatement')}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{t('fsPeriod')}</p>
          </div>

          <div className="space-y-4 pt-2">
            {/* Revenues Section */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-0.5">
                {t('fsRevenueSection')}
              </h4>
              <div className="space-y-1 pl-2">
                {revenueAccounts.map(acc => {
                  const balance = calculateAccountBalance(acc, entries);
                  return (
                    <div key={acc.code} className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-600 dark:text-slate-400">{acc.code} — {acc.name}</span>
                      <span className="text-slate-900 dark:text-slate-200 font-medium">{formatRupiah(balance)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] font-mono font-bold border-t border-dashed border-slate-300 dark:border-slate-700 pt-1 pl-2 text-slate-900 dark:text-white">
                <span>{t('fsTotalOperatingRevenue')}</span>
                <span className="border-b border-slate-900 dark:border-slate-100 pb-0.5">{formatRupiah(summary.totalRevenues)}</span>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-0.5">
                {t('fsExpenseSection')}
              </h4>
              <div className="space-y-1 pl-2">
                {expenseAccounts.map(acc => {
                  const balance = calculateAccountBalance(acc, entries);
                  return (
                    <div key={acc.code} className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-600 dark:text-slate-400">{acc.code} — {acc.name}</span>
                      <span className="text-slate-900 dark:text-slate-200 font-medium">{formatRupiah(balance)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] font-mono font-bold border-t border-dashed border-slate-300 dark:border-slate-700 pt-1 pl-2 text-slate-900 dark:text-white">
                <span>{t('fsTotalOperatingExpense')}</span>
                <span className="border-b border-slate-900 dark:border-slate-100 pb-0.5">{formatRupiah(summary.totalExpenses)}</span>
              </div>
            </div>

            {/* Net Income Summary Section */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white rounded p-3 mt-4 flex justify-between items-center border border-slate-800">
              <div>
                <h5 className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">
                  {t('fsNetProfit')}
                </h5>
                <p className="text-[9px] text-slate-400 mt-0.5 font-sans">
                  {t('fsNetProfitDesc')}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono text-emerald-400">
                  {formatRupiah(summary.netIncome)}
                </span>
              </div>
            </div>
          </div>
        </div>

      ) : (
        /* BALANCE SHEET (NERACA) */
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded shadow-xs p-5 md:p-6 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-950 dark:bg-white"></div>

          <div className="text-center space-y-0.5">
            <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase block">{t('fsReport')}</span>
            <h3 className="text-xs font-bold font-sans tracking-tight text-slate-950 dark:text-white uppercase">{t('fsBalanceSheetTitle')}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{t('fsFinancialPosition')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left Side: Assets (Aktiva) */}
            <div className="space-y-3">
              <div>
                <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-slate-200 border-b-2 border-slate-900 dark:border-slate-100 pb-0.5 flex justify-between">
                  <span>{t('fsAssetsTitle')}</span>
                  <span>{t('fsDebit')}</span>
                </h4>
                <div className="space-y-1 pl-1 mt-1.5">
                  {assetAccounts.map(acc => {
                    const balance = calculateAccountBalance(acc, entries);
                    return (
                      <div key={acc.code} className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-600 dark:text-slate-400">{acc.code} — {acc.name}</span>
                        <span className="text-slate-900 dark:text-slate-200 font-medium">{formatRupiah(balance)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between text-[11px] font-mono font-bold bg-slate-50 dark:bg-slate-800/60 p-1.5 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white">
                <span>{t('fsTotalAssetsLabel')}</span>
                <span>{formatRupiah(summary.totalAssets)}</span>
              </div>
            </div>

            {/* Right Side: Liabilities & Equity (Pasiva) */}
            <div className="space-y-3">
              <div>
                <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-slate-200 border-b-2 border-slate-900 dark:border-slate-100 pb-0.5 flex justify-between">
                  <span>{t('fsLiabEquityTitle')}</span>
                  <span>{t('fsCredit')}</span>
                </h4>
                
                {/* Liabilities List */}
                <div className="mt-1.5 pl-1 space-y-1">
                  <div className="text-[9px] font-mono text-slate-400 font-bold tracking-wider uppercase mb-0.5">
                    {t('fsCurrentLiabilities')}
                  </div>
                  {liabilityAccounts.map(acc => {
                    const balance = calculateAccountBalance(acc, entries);
                    return (
                      <div key={acc.code} className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-600 dark:text-slate-400">{acc.code} — {acc.name}</span>
                        <span className="text-slate-900 dark:text-slate-200 font-medium">{formatRupiah(balance)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Equity List */}
                <div className="mt-3 pl-1 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-1.5">
                  <div className="text-[9px] font-mono text-slate-400 font-bold tracking-wider uppercase mb-0.5">
                    {t('fsOwnersEquity')}
                  </div>
                  {equityAccounts.map(acc => {
                    const balance = calculateAccountBalance(acc, entries);
                    return (
                      <div key={acc.code} className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-600 dark:text-slate-400">{acc.code} — {acc.name}</span>
                        <span className="text-slate-900 dark:text-slate-200 font-medium">{formatRupiah(balance)}</span>
                      </div>
                    );
                  })}
                  {/* Append Net Income row as Retained Earnings for current period */}
                  <div className="flex justify-between text-[11px] font-mono text-emerald-600 dark:text-emerald-400 italic font-semibold">
                    <span>{t('fsCurrentNetProfit')}</span>
                    <span>{formatRupiah(summary.netIncome)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between text-[11px] font-mono font-bold bg-slate-50 dark:bg-slate-800/60 p-1.5 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white">
                <span>{t('fsTotalPasivaLabel')}</span>
                <span>{formatRupiah(summary.totalLiabilities + summary.totalEquity + summary.netIncome)}</span>
              </div>
            </div>
          </div>

          {/* Equation Match validation card */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-3 text-center">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">{t('fsIdentityFormula')}</span>
            <div className="text-[11px] font-semibold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
              {language === 'en' ? 'Assets' : 'Aktiva'} (Rp {new Intl.NumberFormat('id-ID').format(summary.totalAssets)}) 
              {' = '}
              {language === 'en' ? 'Liabilities & Equity' : 'Pasiva'} (Rp {new Intl.NumberFormat('id-ID').format(summary.totalLiabilities + summary.totalEquity + summary.netIncome)})
            </div>
            <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 font-semibold">
              {t('fsPerfectBalance')}
            </div>
          </div>
        </div>

      )}
    </div>
  );
}
