import React from 'react';
import { Account, JournalEntry } from '../types';
import { getAccountingSummary, calculateAccountBalance } from '../utils';
import { formatRupiah } from '../initialData';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  TrendingUp, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Building2, 
  Users 
} from 'lucide-react';

interface DashboardViewProps {
  accounts: Account[];
  entries: JournalEntry[];
  onNavigate: (view: 'dashboard' | 'journal' | 'ledger' | 'statements') => void;
  onSelectAccount?: (accountCode: string) => void;
  isDarkMode?: boolean;
}

export default function DashboardView({ accounts, entries, onNavigate, onSelectAccount, isDarkMode: propDarkMode }: DashboardViewProps) {
  const summary = getAccountingSummary(accounts, entries);
  const { language, t } = useLanguage();
  const { isDark } = useTheme();
  const isDarkMode = propDarkMode !== undefined ? propDarkMode : isDark;

  // Prepare chart data for Revenue vs Expenses
  // Let's group by date to show daily totals
  const dailyDataMap: { [date: string]: { date: string; revenue: number; expense: number } } = {};
  
  // Initialize with some dates from entries to keep it clean
  const sortedDates = [...new Set(entries.map(e => e.date))].sort();
  sortedDates.forEach(d => {
    dailyDataMap[d] = { date: d, revenue: 0, expense: 0 };
  });

  entries.forEach(entry => {
    const date = entry.date;
    if (!dailyDataMap[date]) {
      dailyDataMap[date] = { date, revenue: 0, expense: 0 };
    }

    entry.lines.forEach(line => {
      const acc = accounts.find(a => a.code === line.accountCode);
      if (acc) {
        if (acc.type === 'revenue') {
          dailyDataMap[date].revenue += line.credit - line.debit;
        } else if (acc.type === 'expense') {
          dailyDataMap[date].expense += line.debit - line.credit;
        }
      }
    });
  });

  const chartData = Object.values(dailyDataMap).sort((a, b) => a.date.localeCompare(b.date));

  // Prepare Asset Allocation Chart
  const assetAccounts = accounts.filter(a => a.type === 'asset');
  const assetAllocData = assetAccounts
    .map(acc => ({
      name: acc.name,
      code: acc.code,
      value: calculateAccountBalance(acc, entries)
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Format short date for chart (e.g. 2026-07-01 -> 01 Jul)
  const formatChartDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const day = parts[2];
        const monthNamesID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const monthNamesEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthNames = language === 'en' ? monthNamesEN : monthNamesID;
        const monthIdx = parseInt(parts[1], 10) - 1;
        return `${day} ${monthNames[monthIdx] || parts[1]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formattedChartData = chartData.map(d => ({
    ...d,
    formattedDate: formatChartDate(d.date)
  }));

  // Get recent 4 entries
  const recentEntries = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Top Banner with Balance Integrity */}
      <div id="balance-integrity-banner" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase">Vast ERP Modern Suite</span>
          <h2 className="text-xl font-bold font-sans tracking-tight mt-0.5">{t('dashTitle')}</h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 max-w-xl">
            {t('dashDesc')}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 min-w-[240px]">
          {summary.isBalanced ? (
            <CheckCircle2 className="text-emerald-500 dark:text-emerald-400 h-5 w-5 shrink-0" id="balanced-icon" />
          ) : (
            <AlertCircle className="text-amber-500 dark:text-amber-400 h-5 w-5 shrink-0" id="unbalanced-icon" />
          )}
          <div className="flex-1">
            <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase">{t('dashEquationStatus')}</div>
            <div className="text-xs font-semibold tracking-wide text-slate-900 dark:text-white">
              {summary.isBalanced ? t('dashBalanced') : t('dashUnbalanced')}
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              {t('dashEquationFormula')}
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div id="kpi-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Laba Bersih */}
        <div id="kpi-net-income" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">{t('dashNetIncome')}</span>
            <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-sans tracking-tight text-slate-900 dark:text-white">
              {formatRupiah(summary.netIncome)}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              {t('dashNetIncomeDesc')}
            </p>
          </div>
        </div>

        {/* KPI: Posisi Kas */}
        <div id="kpi-cash" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">{t('dashCashBank')}</span>
            <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-sans tracking-tight text-slate-900 dark:text-white">
              {formatRupiah(summary.cashPosition)}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              {t('dashCashBankDesc')}
            </p>
          </div>
        </div>

        {/* KPI: Total Aset */}
        <div id="kpi-assets" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">{t('dashTotalAssets')}</span>
            <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
              <Building2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-sans tracking-tight text-slate-900 dark:text-white">
              {formatRupiah(summary.totalAssets)}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              {t('dashTotalAssetsDesc')}
            </p>
          </div>
        </div>

        {/* KPI: Kewajiban & Ekuitas */}
        <div id="kpi-liabilities-equity" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">{t('dashLiabEquity')}</span>
            <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-sans tracking-tight text-slate-900 dark:text-white">
              {formatRupiah(summary.totalLiabilities + summary.totalEquity)}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              {t('dashLiabEquityDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div id="dashboard-charts-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Trend Chart - Revenue vs Expense */}
        <div id="trend-chart-card" className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col shadow-xs">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-xs font-bold font-sans text-slate-950 dark:text-white uppercase tracking-wider">{t('dashTrendTitle')}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('dashTrendDesc')}</p>
            </div>
            <div className="flex gap-3 text-[10px] font-mono">
              <div className="flex items-center gap-1">
                <span className={`inline-block w-2.5 h-2.5 ${isDarkMode ? 'bg-blue-500' : 'bg-slate-900'} rounded-xs`}></span>
                <span className="text-slate-700 dark:text-slate-300">{t('dashRevenue')}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`inline-block w-2.5 h-2.5 ${isDarkMode ? 'bg-rose-500' : 'bg-slate-400'} rounded-xs`}></span>
                <span className="text-slate-700 dark:text-slate-300">{t('dashExpense')}</span>
              </div>
            </div>
          </div>
          
          <div className="h-64 w-full mt-1">
            {formattedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={formattedChartData}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isDarkMode ? '#3b82f6' : '#0f172a'} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={isDarkMode ? '#3b82f6' : '#0f172a'} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isDarkMode ? '#f43f5e' : '#64748b'} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={isDarkMode ? '#f43f5e' : '#64748b'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                  <XAxis 
                    dataKey="formattedDate" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9, fontFamily: 'monospace' }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9, fontFamily: 'monospace' }}
                    tickFormatter={(value) => `Rp ${(value / 1000000).toFixed(0)}Jt`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#0f172a' : '#0f172a', 
                      borderColor: isDarkMode ? '#334155' : '#1e293b', 
                      color: '#ffffff',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#e2e8f0' }}
                    formatter={(value: any) => [formatRupiah(Number(value)), '']}
                  />
                  <Area 
                    name={t('dashRevenue')} 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke={isDarkMode ? '#3b82f6' : '#0f172a'} 
                    strokeWidth={1.5}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                  <Area 
                    name={t('dashExpense')} 
                    type="monotone" 
                    dataKey="expense" 
                    stroke={isDarkMode ? '#f43f5e' : '#64748b'} 
                    strokeWidth={1.25}
                    strokeDasharray="4 4"
                    fillOpacity={1} 
                    fill="url(#colorExpense)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-mono">
                {t('dashNoRevenueExpense')}
              </div>
            )}
          </div>
        </div>

        {/* Asset Distribution Breakdown */}
        <div id="asset-breakdown-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col justify-between shadow-xs">
          <div>
            <h3 className="text-xs font-bold font-sans text-slate-950 dark:text-white uppercase tracking-wider">{t('dashAssetBreakdown')}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">{t('dashAssetBreakdownDesc')}</p>
            
            <div className="space-y-2.5 mt-2">
              {assetAllocData.slice(0, 5).map((asset) => {
                const totalAssetsValue = summary?.totalAssets || 0;
                const accountBalance = asset.value || 0;
                const percentage = totalAssetsValue > 0 ? (accountBalance / totalAssetsValue) * 100 : 0;
                
                return (
                  <div key={asset.code} className="space-y-0.5">
                    <div className="flex justify-between text-[11px]">
                      <button 
                        onClick={() => onSelectAccount && onSelectAccount(asset.code)}
                        className="font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-left hover:underline focus:outline-hidden cursor-pointer"
                      >
                        {asset.code} - {asset.name}
                      </button>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono">{formatRupiah(asset.value)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-slate-900 dark:bg-blue-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                      ></div>
                    </div>
                    <div className="text-[9px] text-right text-slate-400 dark:text-slate-500 font-mono">
                      {percentage.toFixed(1)}% {t('dashTotalAssets').toLowerCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">
            <button 
              onClick={() => onNavigate('statements')}
              className="w-full py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white rounded transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              {t('dashViewFullBalance')}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Lower Grid: Recent Journal Activity & Account Snapshot */}
      <div id="lower-dashboard-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Entries */}
        <div id="recent-entries-card" className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold font-sans text-slate-950 dark:text-white uppercase tracking-wider">{t('dashRecentJournal')}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('dashRecentJournalDesc')}</p>
            </div>
            <button 
              onClick={() => onNavigate('journal')}
              className="text-[10px] font-mono text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              {t('dashManageJournal')}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="py-2 px-2">{t('dashDate')}</th>
                  <th className="py-2 px-2">{t('dashJournalNo')}</th>
                  <th className="py-2 px-2">{t('dashDescription')}</th>
                  <th className="py-2 px-2 text-right">{t('dashTotalTransaction')}</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((entry) => {
                  const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
                  
                  return (
                    <tr 
                      key={entry.id} 
                      className="border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] transition-colors"
                    >
                      <td className="py-2 px-2 font-mono text-slate-500 dark:text-slate-400">{entry.date}</td>
                      <td className="py-2 px-2 font-mono font-medium text-slate-900 dark:text-white">{entry.reference}</td>
                      <td className="py-2 px-2 text-slate-700 dark:text-slate-300 font-sans max-w-xs truncate">
                        {entry.description}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold font-mono text-slate-900 dark:text-white">
                        {formatRupiah(totalDebit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Account Types Mini Card */}
        <div id="account-snapshot-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col justify-between shadow-xs">
          <div>
            <h3 className="text-xs font-bold font-sans text-slate-950 dark:text-white uppercase tracking-wider">{t('dashClassSummary')}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">{t('dashClassSummaryDesc')}</p>

            <div className="space-y-2.5 mt-2 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('dashAssets')}</span>
                <span className="font-semibold text-slate-950 dark:text-white">{formatRupiah(summary.totalAssets)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('dashLiabilities')}</span>
                <span className="font-semibold text-slate-950 dark:text-white">{formatRupiah(summary.totalLiabilities)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('dashEquity')}</span>
                <span className="font-semibold text-slate-950 dark:text-white">{formatRupiah(summary.totalEquity)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('dashOperatingRevenue')}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatRupiah(summary.totalRevenues)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('dashOperatingExpense')}</span>
                <span className="font-semibold text-slate-600 dark:text-slate-400">-{formatRupiah(summary.totalExpenses)}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">
            <button 
              onClick={() => onNavigate('ledger')}
              className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-mono rounded transition-all flex items-center justify-center gap-1 cursor-pointer font-bold"
            >
              {t('dashOpenLedger')}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
