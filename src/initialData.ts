import { Account, JournalEntry } from './types';

export const initialAccounts: Account[] = [
  // 1-xxxx: Aset (Assets)
  { code: '1-1000', name: 'Kas dan Setara Kas', type: 'asset', normalBalance: 'debit', initialBalance: 125000000 },
  { code: '1-1100', name: 'Rekening Bank Mandiri', type: 'asset', normalBalance: 'debit', initialBalance: 250000000 },
  { code: '1-1200', name: 'Piutang Usaha', type: 'asset', normalBalance: 'debit', initialBalance: 45000000 },
  { code: '1-1300', name: 'Persediaan Barang Dagang', type: 'asset', normalBalance: 'debit', initialBalance: 85000000 },
  { code: '1-2000', name: 'Peralatan Kantor', type: 'asset', normalBalance: 'debit', initialBalance: 40000000 },
  { code: '1-2100', name: 'Akumulasi Penyusutan Peralatan', type: 'asset', normalBalance: 'credit', initialBalance: -5000000 },

  // 2-xxxx: Kewajiban (Liabilities)
  { code: '2-1000', name: 'Utang Usaha', type: 'liability', normalBalance: 'credit', initialBalance: 35000000 },
  { code: '2-1200', name: 'Pendapatan Diterima Di Muka', type: 'liability', normalBalance: 'credit', initialBalance: 12000000 },
  { code: '2-2000', name: 'Utang Gaji & Pajak', type: 'liability', normalBalance: 'credit', initialBalance: 8500000 },

  // 3-xxxx: Ekuitas (Equity)
  { code: '3-1000', name: 'Modal Saham', type: 'equity', normalBalance: 'credit', initialBalance: 450000000 },
  { code: '3-2000', name: 'Saldo Laba (Retained Earnings)', type: 'equity', normalBalance: 'credit', initialBalance: 39500000 },

  // 4-xxxx: Pendapatan (Revenue)
  { code: '4-1000', name: 'Pendapatan Jasa Konsultasi', type: 'revenue', normalBalance: 'credit', initialBalance: 0 },
  { code: '4-1100', name: 'Pendapatan Penjualan Produk', type: 'revenue', normalBalance: 'credit', initialBalance: 0 },

  // 5-xxxx: Beban (Expenses)
  { code: '5-1000', name: 'Beban Gaji Karyawan', type: 'expense', normalBalance: 'debit', initialBalance: 0 },
  { code: '5-1100', name: 'Beban Sewa Kantor', type: 'expense', normalBalance: 'debit', initialBalance: 0 },
  { code: '5-1200', name: 'Beban Utilitas & Internet', type: 'expense', normalBalance: 'debit', initialBalance: 0 },
  { code: '5-1300', name: 'Beban Pemasaran & Iklan', type: 'expense', normalBalance: 'debit', initialBalance: 0 },
  { code: '5-1400', name: 'Beban Perlengkapan', type: 'expense', normalBalance: 'debit', initialBalance: 0 }
];

export const initialJournalEntries: JournalEntry[] = [
  {
    id: 'TX-1001',
    date: '2026-07-01',
    reference: 'JV-2026-001',
    description: 'Penerimaan Pendapatan Jasa Konsultasi ERP',
    lines: [
      { id: 'L-001', accountCode: '1-1000', debit: 18500000, credit: 0 }, // Kas (+)
      { id: 'L-002', accountCode: '4-1000', debit: 0, credit: 18500000 }  // Pendapatan Jasa (+)
    ]
  },
  {
    id: 'TX-1002',
    date: '2026-07-02',
    reference: 'JV-2026-002',
    description: 'Pembayaran Sewa Co-working Space Bulanan',
    lines: [
      { id: 'L-003', accountCode: '5-1100', debit: 6000000, credit: 0 },  // Beban Sewa (+)
      { id: 'L-004', accountCode: '1-1100', debit: 0, credit: 6000000 }   // Bank Mandiri (-)
    ]
  },
  {
    id: 'TX-1003',
    date: '2026-07-03',
    reference: 'JV-2026-003',
    description: 'Pembelian Laptop Developer Tambahan secara Kredit',
    lines: [
      { id: 'L-005', accountCode: '1-2000', debit: 12500000, credit: 0 }, // Peralatan (+)
      { id: 'L-006', accountCode: '2-1000', debit: 0, credit: 12500000 }  // Utang Usaha (+)
    ]
  },
  {
    id: 'TX-1004',
    date: '2026-07-04',
    reference: 'JV-2026-004',
    description: 'Penyelesaian Proyek Integrasi Sistem & Pengiriman Invoice',
    lines: [
      { id: 'L-007', accountCode: '1-1200', debit: 35000000, credit: 0 }, // Piutang Usaha (+)
      { id: 'L-008', accountCode: '4-1000', debit: 0, credit: 35000000 }  // Pendapatan Jasa (+)
    ]
  },
  {
    id: 'TX-1005',
    date: '2026-07-05',
    reference: 'JV-2026-005',
    description: 'Pembayaran Beban Internet & Listrik Kantor',
    lines: [
      { id: 'L-009', accountCode: '5-1200', debit: 2800000, credit: 0 },  // Beban Utilitas (+)
      { id: 'L-010', accountCode: '1-1000', debit: 0, credit: 2800000 }   // Kas (-)
    ]
  },
  {
    id: 'TX-1006',
    date: '2026-07-06',
    reference: 'JV-2026-006',
    description: 'Pelunasan Sebagian Piutang Usaha oleh Klien',
    lines: [
      { id: 'L-011', accountCode: '1-1100', debit: 15000000, credit: 0 }, // Bank Mandiri (+)
      { id: 'L-012', accountCode: '1-1200', debit: 0, credit: 15000000 }  // Piutang Usaha (-)
    ]
  },
  {
    id: 'TX-1007',
    date: '2026-07-07',
    reference: 'JV-2026-007',
    description: 'Pembayaran Gaji Mingguan Staff Magang',
    lines: [
      { id: 'L-013', accountCode: '5-1000', debit: 4500000, credit: 0 },  // Beban Gaji (+)
      { id: 'L-014', accountCode: '1-1000', debit: 0, credit: 4500000 }   // Kas (-)
    ]
  }
];

export function formatRupiah(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absVal);
  
  return isNegative ? `(${formatted})` : formatted;
}
