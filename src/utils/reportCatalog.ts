import { ReportDefinition } from '../types/reportTypes';

export const REPORT_CATALOG: ReportDefinition[] = [
  // 1. Accounting History / Transaction History
  {
    id: 'all_transactions',
    category: 'history',
    name: 'All Transactions Log',
    nameId: 'Semua Riwayat Transaksi',
    description: 'Complete chronological sequence of all journal entries with dual-line ledger impact.',
    descriptionId: 'Daftar kronologis lengkap semua transaksi jurnal dengan dampak debit dan kredit.',
    recommendedOrientation: 'portrait'
  },
  {
    id: 'income_only',
    category: 'history',
    name: 'Income Transactions',
    nameId: 'Transaksi Pendapatan Saja',
    description: 'All revenue-generating sales, service contracts, and cash inflow journals.',
    descriptionId: 'Seluruh transaksi penjualan jasa, barang, dan pemasukan kas.',
    recommendedOrientation: 'portrait'
  },
  {
    id: 'expenses_only',
    category: 'history',
    name: 'Expense Transactions',
    nameId: 'Transaksi Beban & Pengeluaran Saja',
    description: 'Operational, administrative, payroll, and vendor payment disbursements.',
    descriptionId: 'Seluruh pengeluaran operasional, utilitas, sewa, dan beban usaha.',
    recommendedOrientation: 'portrait'
  },
  {
    id: 'transfers',
    category: 'history',
    name: 'Bank & Cash Transfers',
    nameId: 'Transfer Kas & Mutasi Rekening',
    description: 'Internal cash movements between petty cash, savings, and corporate bank accounts.',
    descriptionId: 'Perpindahan saldo kas fisik ke rekening bank atau antar rekening aset lancar.',
    recommendedOrientation: 'portrait'
  },
  {
    id: 'adjustments',
    category: 'history',
    name: 'Adjustment & Accrual Entries',
    nameId: 'Jurnal Penyesuaian & Akrual',
    description: 'Period-end adjustments, prepaid amortization, depreciation, and corrections.',
    descriptionId: 'Jurnal penyesuaian akhir periode, penyusutan, dan akrual.',
    recommendedOrientation: 'portrait'
  },
  {
    id: 'custom_transactions',
    category: 'history',
    name: 'Custom Filtered Journals',
    nameId: 'Jurnal Khusus (Filter Kustom)',
    description: 'Transactions filtered by custom search criteria, project codes, or reference tags.',
    descriptionId: 'Transaksi terpilih berdasarkan kata kunci referensi atau proyek tertentu.',
    recommendedOrientation: 'landscape'
  },

  // 2. Official Financial Statements
  {
    id: 'balance_sheet',
    category: 'statements',
    name: 'Balance Sheet (Statement of Financial Position)',
    nameId: 'Neraca Keuangan (Posisi Finansial)',
    description: 'Comprehensive assets, liabilities, and owners equity balancing identity statement.',
    descriptionId: 'Laporan posisi keuangan resmi: Aset (Aktiva) = Kewajiban + Ekuitas (Pasiva).',
    recommendedOrientation: 'portrait'
  },
  {
    id: 'income_statement',
    category: 'statements',
    name: 'Income Statement (Profit & Loss)',
    nameId: 'Laporan Laba Rugi (P&L)',
    description: 'Summary of operating revenues, direct costs, operational expenses, and net profit.',
    descriptionId: 'Ringkasan performa usaha: total pendapatan dikurangi beban menghasilkan laba bersih.',
    recommendedOrientation: 'portrait'
  },
  {
    id: 'cash_flow',
    category: 'statements',
    name: 'Statement of Cash Flows',
    nameId: 'Laporan Arus Kas (Cash Flow)',
    description: 'Cash inflows & outflows segmented into Operating, Investing, and Financing activities.',
    descriptionId: 'Arus masuk & keluar kas dari aktivitas Operasi, Investasi, dan Pendanaan.',
    recommendedOrientation: 'portrait'
  },
  {
    id: 'equity_changes',
    category: 'statements',
    name: 'Statement of Changes in Equity',
    nameId: 'Laporan Perubahan Modal / Ekuitas',
    description: 'Tracks starting capital, retained earnings additions, net income, and closing equity.',
    descriptionId: 'Melacak saldo modal awal, penambahan laba periode berjalan, dan modal akhir.',
    recommendedOrientation: 'portrait'
  },
  {
    id: 'trial_balance',
    category: 'statements',
    name: 'Trial Balance (Neraca Saldo)',
    nameId: 'Neraca Saldo (Trial Balance)',
    description: 'Summary of all account debit and credit mutations proving ledger equilibrium.',
    descriptionId: 'Daftar semua saldo akun debit & kredit untuk membuktikan keseimbangan buku besar.',
    recommendedOrientation: 'landscape'
  },

  // 3. Other Reports
  {
    id: 'general_ledger',
    category: 'other',
    name: 'General Ledger Detail',
    nameId: 'Buku Besar Lengkap (General Ledger)',
    description: 'Full account-by-account transaction history with running balances.',
    descriptionId: 'Rincian transaksi per akun buku besar dilengkapi saldo berjalan real-time.',
    recommendedOrientation: 'landscape'
  },
  {
    id: 'accounts_receivable',
    category: 'other',
    name: 'Accounts Receivable (Piutang Usaha)',
    nameId: 'Laporan Piutang Usaha (AR)',
    description: 'Customer invoices, credit sales, incoming payments, and outstanding receivables.',
    descriptionId: 'Daftar tagihan ke klien/pelanggan, pembayaran diterima, dan sisa saldo piutang.',
    recommendedOrientation: 'portrait'
  },
  {
    id: 'accounts_payable',
    category: 'other',
    name: 'Accounts Payable (Utang Usaha)',
    nameId: 'Laporan Utang Usaha (AP)',
    description: 'Vendor bills, supplier invoices, payments made, and outstanding payables.',
    descriptionId: 'Daftar kewajiban kepada pemasok/vendor, pembayaran, dan sisa saldo utang.',
    recommendedOrientation: 'portrait'
  },
  {
    id: 'account_summary',
    category: 'other',
    name: 'Chart of Accounts Summary',
    nameId: 'Ringkasan Daftar Akun (COA)',
    description: 'Master list of all ledger accounts with codes, categories, and current balances.',
    descriptionId: 'Daftar seluruh nomor akun, kategori, posisi normal, dan saldo saat ini.',
    recommendedOrientation: 'portrait'
  },
  {
    id: 'expense_summary',
    category: 'other',
    name: 'Expense Category Breakdown',
    nameId: 'Ringkasan Analisis Beban Usaha',
    description: 'Detailed analysis of operating expenses categorized with percentage shares.',
    descriptionId: 'Rincian beban operasional dengan proporsi persentase terhadap total beban.',
    recommendedOrientation: 'portrait'
  },
  {
    id: 'income_summary',
    category: 'other',
    name: 'Revenue & Income Breakdown',
    nameId: 'Ringkasan Sumber Pendapatan',
    description: 'Detailed breakdown of consulting and product sales streams with percentage shares.',
    descriptionId: 'Rincian seluruh pos pendapatan usaha beserta kontribusi persentasenya.',
    recommendedOrientation: 'portrait'
  },
  {
    id: 'tax_summary',
    category: 'other',
    name: 'Tax & Compliance Summary',
    nameId: 'Ringkasan Pajak & Kepatuhan',
    description: 'Overview of VAT (PPN), income tax accruals, and tax liabilities.',
    descriptionId: 'Ringkasan kewajiban pajak, PPN, dan utang pajak yang belum disetorkan.',
    recommendedOrientation: 'portrait'
  }
];
