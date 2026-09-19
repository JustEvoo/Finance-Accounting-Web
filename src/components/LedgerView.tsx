import React, { useState, useEffect } from 'react';
import { Account, JournalEntry, AccountType } from '../types';
import { formatRupiah } from '../initialData';
import { useLanguage } from '../context/LanguageContext';
import { BookOpen, Calendar, ArrowUpRight, ArrowDownRight, Search, Plus, Trash2, Lock, X, AlertCircle, Edit } from 'lucide-react';

interface LedgerViewProps {
  accounts: Account[];
  entries: JournalEntry[];
  selectedAccountCode?: string;
  onSelectAccount?: (code: string) => void;
  onAddAccount?: (newAccount: Account) => Promise<void>;
  onDeleteAccount?: (accountCode: string) => Promise<void>;
  onUpdateAccount?: (accountCode: string, updatedAccount: Account) => Promise<void>;
}

interface LedgerLine {
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export default function LedgerView({ 
  accounts, 
  entries, 
  selectedAccountCode, 
  onSelectAccount,
  onAddAccount,
  onDeleteAccount,
  onUpdateAccount
}: LedgerViewProps) {
  const { t, language } = useLanguage();
  const [activeAccountCode, setActiveAccountCode] = useState<string>(accounts[0]?.code || '');
  
  // Modal states for adding account
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AccountType>('asset');
  const [newNormalBalance, setNewNormalBalance] = useState<'debit' | 'credit'>('debit');
  const [newInitialBalance, setNewInitialBalance] = useState<number>(0);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states for editing account
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<AccountType>('asset');
  const [editNormalBalance, setEditNormalBalance] = useState<'debit' | 'credit'>('debit');
  const [editInitialBalance, setEditInitialBalance] = useState<number>(0);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Synchronize with external selection if available (e.g. from Dashboard click)
  useEffect(() => {
    if (selectedAccountCode) {
      setActiveAccountCode(selectedAccountCode);
    }
  }, [selectedAccountCode]);

  // Handle active account falling out of existing accounts (e.g. after deletion)
  useEffect(() => {
    if (accounts.length > 0) {
      const exists = accounts.some(a => a.code === activeAccountCode);
      if (!exists) {
        setActiveAccountCode(accounts[0].code);
        if (onSelectAccount) onSelectAccount(accounts[0].code);
      }
    }
  }, [accounts, activeAccountCode, onSelectAccount]);

  const activeAccount = accounts.find(a => a.code === activeAccountCode) || accounts[0];
  const isAccountInUse = activeAccount ? entries.some(entry => entry.lines.some(line => line.accountCode === activeAccount.code)) : false;

  // Automated field helper when Account Type is changed
  const handleTypeChange = (type: AccountType) => {
    setNewType(type);
    
    // Set default normal balance based on account type
    const defaultBalance = (type === 'asset' || type === 'expense') ? 'debit' : 'credit';
    setNewNormalBalance(defaultBalance);

    // Auto-prefill the code prefix if empty or matching another prefix
    const prefixes: Record<AccountType, string> = {
      asset: '1-',
      liability: '2-',
      equity: '3-',
      revenue: '4-',
      expense: '5-'
    };
    
    const currentPrefixes = ['1-', '2-', '3-', '4-', '5-'];
    if (!newCode || currentPrefixes.some(p => newCode.startsWith(p) && newCode.length <= 2)) {
      setNewCode(prefixes[type]);
    }
  };

  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const codeTrimmed = newCode.trim();
    const nameTrimmed = newName.trim();

    if (!codeTrimmed || !nameTrimmed) {
      setModalError(t('profileUID').includes('User') ? 'Please fill in all required fields.' : 'Harap lengkapi semua bidang yang wajib diisi.');
      return;
    }

    // Validation: Check if code already exists
    if (accounts.some(a => a.code.toLowerCase() === codeTrimmed.toLowerCase())) {
      setModalError(t('profileUID').includes('User') ? 'Account code already exists!' : 'Kode akun sudah digunakan!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onAddAccount) {
        await onAddAccount({
          code: codeTrimmed,
          name: nameTrimmed,
          type: newType,
          normalBalance: newNormalBalance,
          initialBalance: newInitialBalance
        });
      }
      
      // Select the newly added account
      setActiveAccountCode(codeTrimmed);
      if (onSelectAccount) onSelectAccount(codeTrimmed);
      
      // Reset form & close modal
      setNewCode('');
      setNewName('');
      setNewType('asset');
      setNewNormalBalance('debit');
      setNewInitialBalance(0);
      setIsAddModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!activeAccount) return;

    // Check if account is in use
    const isUsed = entries.some(entry => entry.lines.some(line => line.accountCode === activeAccount.code));
    if (isUsed) {
      alert(language === 'en' 
        ? "This account cannot be deleted because it is currently used in journal entries." 
        : "Akun ini tidak dapat dihapus karena sedang digunakan dalam transaksi jurnal.");
      return;
    }

    const confirmMsg = language === 'en'
      ? `Are you sure you want to delete the account "${activeAccount.code} - ${activeAccount.name}"?`
      : `Apakah Anda yakin ingin menghapus akun "${activeAccount.code} - ${activeAccount.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (onDeleteAccount) {
        await onDeleteAccount(activeAccount.code);
      }
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleEditTypeChange = (type: AccountType) => {
    setEditType(type);
    const defaultBalance = (type === 'asset' || type === 'expense') ? 'debit' : 'credit';
    setEditNormalBalance(defaultBalance);

    // Only auto-prefill the prefix if the account is NOT in use (code is editable)
    if (!isAccountInUse) {
      const prefixes: Record<AccountType, string> = {
        asset: '1-',
        liability: '2-',
        equity: '3-',
        revenue: '4-',
        expense: '5-'
      };
      const currentPrefixes = ['1-', '2-', '3-', '4-', '5-'];
      if (!editCode || currentPrefixes.some(p => editCode.startsWith(p) && editCode.length <= 2)) {
        setEditCode(prefixes[type]);
      }
    }
  };

  const handleEditAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditModalError(null);

    const codeTrimmed = editCode.trim();
    const nameTrimmed = editName.trim();

    if (!codeTrimmed || !nameTrimmed) {
      setEditModalError(language === 'en' ? 'Please fill in all required fields.' : 'Harap lengkapi semua bidang yang wajib diisi.');
      return;
    }

    // Validation: Check if code already exists (only if changing the code)
    if (codeTrimmed.toLowerCase() !== activeAccount.code.toLowerCase()) {
      if (accounts.some(a => a.code.toLowerCase() === codeTrimmed.toLowerCase())) {
        setEditModalError(language === 'en' ? 'Account code already exists!' : 'Kode akun sudah digunakan!');
        return;
      }
    }

    setIsEditSubmitting(true);
    try {
      if (onUpdateAccount) {
        await onUpdateAccount(activeAccount.code, {
          code: codeTrimmed,
          name: nameTrimmed,
          type: editType,
          normalBalance: editNormalBalance,
          initialBalance: editInitialBalance
        });
      }
      
      // Select the updated account (in case code changed)
      setActiveAccountCode(codeTrimmed);
      if (onSelectAccount) onSelectAccount(codeTrimmed);
      
      setIsEditModalOpen(false);
    } catch (err: any) {
      setEditModalError(err.message || 'Failed to update account');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  if (!activeAccount) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2 animate-pulse" />
        <p className="text-xs font-mono text-slate-500">
          {language === 'en' ? 'No accounts defined in the system.' : 'Belum ada akun terdefinisi di sistem.'}
        </p>
        <button
          onClick={() => {
            setNewCode('1-');
            setIsAddModalOpen(true);
          }}
          className="mt-4 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-mono flex items-center gap-1.5 mx-auto cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          {language === 'en' ? 'Create First Account' : 'Buat Akun Pertama'}
        </button>
      </div>
    );
  }

  // Find all journal transactions affecting the active account, sorted chronologically
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const ledgerLines: LedgerLine[] = [];
  let currentBalance = activeAccount.initialBalance;

  // Track summary details
  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of sortedEntries) {
    for (const line of entry.lines) {
      if (line.accountCode === activeAccount.code) {
        // Adjust current balance based on account classification and normal balance rules
        if (activeAccount.normalBalance === 'debit') {
          currentBalance += line.debit - line.credit;
        } else {
          currentBalance += line.credit - line.debit;
        }

        totalDebit += line.debit;
        totalCredit += line.credit;

        ledgerLines.push({
          date: entry.date,
          reference: entry.reference,
          description: entry.description,
          debit: line.debit,
          credit: line.credit,
          runningBalance: currentBalance
        });
      }
    }
  }
  return (
    <div className="space-y-4">
      {/* View Header with Add Account action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold font-sans tracking-tight text-slate-950 dark:text-white uppercase">{t('ledgerTitle')}</h2>
          <p className="text-[11px] text-slate-500">{t('ledgerDesc')}</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap justify-end w-full sm:w-auto">
          {/* Account selector dropdown */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2.5 py-1.5 shadow-2xs max-w-full shrink-0">
            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase shrink-0">{t('ledgerSelect')}</span>
            <select
              value={activeAccountCode}
              onChange={(e) => {
                setActiveAccountCode(e.target.value);
                if (onSelectAccount) onSelectAccount(e.target.value);
              }}
              className="bg-transparent border-0 p-0 text-[11px] font-mono font-semibold text-slate-900 dark:text-white focus:ring-0 focus:outline-hidden cursor-pointer max-w-[150px] sm:max-w-[220px] truncate"
            >
              {accounts.map(acc => (
                <option key={acc.code} value={acc.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Add Account Button */}
          {onAddAccount && (
            <button
              onClick={() => {
                setNewCode('1-');
                setIsAddModalOpen(true);
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-md text-[11px] font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-transparent shrink-0 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('profileUID').includes('User') ? 'Add Account' : 'Tambah Akun'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Account Profile Card */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 relative overflow-hidden shadow-xs">
        <div className="md:col-span-2 space-y-1 relative z-10">
          <div className="text-[9px] font-mono tracking-wider text-slate-500 dark:text-slate-400 uppercase">{t('ledgerAccountInfo')}</div>
          <h3 className="text-sm font-bold font-sans text-slate-900 dark:text-white flex items-center gap-2">
            {activeAccount.name}
          </h3>
          <div className="flex items-center gap-3 text-[10px] font-mono mt-1">
            <span className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 font-medium">
              {t('profileUID').includes('User') ? 'CODE' : 'KODE'}: {activeAccount.code}
            </span>
            <span className="text-slate-500 dark:text-slate-400 uppercase">
              {t('profileUID').includes('User') ? 'TYPE' : 'TIPE'}: {activeAccount.type}
            </span>
          </div>

          {/* Edit & Delete Action display within account details */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            {onUpdateAccount && (
              <button
                onClick={() => {
                  setEditCode(activeAccount.code);
                  setEditName(activeAccount.name);
                  setEditType(activeAccount.type);
                  setEditNormalBalance(activeAccount.normalBalance);
                  setEditInitialBalance(activeAccount.initialBalance);
                  setIsEditModalOpen(true);
                }}
                className="text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 text-[10px] font-mono flex items-center gap-1.5 cursor-pointer transition-all font-semibold shadow-2xs"
                title="Edit Akun"
              >
                <Edit className="h-3.5 w-3.5 text-slate-500" />
                <span>{t('profileUID').includes('User') ? 'Edit Account' : 'Edit Akun'}</span>
              </button>
            )}

            {onDeleteAccount && (
              <>
                {isAccountInUse ? (
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[10px] font-mono bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 px-2.5 py-1.5 rounded" title={t('profileUID').includes('User') ? 'Locked (Has Transactions)' : 'Terkunci (Memiliki Transaksi)'}>
                    <Lock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                    <span>{t('profileUID').includes('User') ? 'Locked (Has Transactions)' : 'Terkunci (Memiliki Transaksi)'}</span>
                  </div>
                ) : (
                  <button
                    onClick={handleDeleteAccount}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5 py-1.5 rounded border border-red-200 dark:border-red-950/40 text-[10px] font-mono flex items-center gap-1.5 cursor-pointer transition-all"
                    title="Hapus Akun"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t('profileUID').includes('User') ? 'Delete Account' : 'Hapus Akun'}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-3 md:pt-0 md:pl-4 flex flex-col justify-between relative z-10">
          <div className="text-[9px] font-mono tracking-wider text-slate-500 dark:text-slate-400 uppercase">{t('ledgerOpening')}</div>
          <div className="text-sm font-semibold font-mono tracking-tight text-slate-800 dark:text-slate-200 mt-1">
            {formatRupiah(activeAccount.initialBalance)}
          </div>
          <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
            {t('ledgerOpeningDesc')}
          </div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-3 md:pt-0 md:pl-4 flex flex-col justify-between relative z-10">
          <div className="text-[9px] font-mono tracking-wider text-slate-500 dark:text-slate-400 uppercase">{t('ledgerCurrent')}</div>
          <div className="text-sm font-bold font-mono tracking-tight text-slate-900 dark:text-white mt-1">
            {formatRupiah(activeAccount.initialBalance + (activeAccount.normalBalance === 'debit' ? (totalDebit - totalCredit) : (totalCredit - totalDebit)))}
          </div>
          <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono uppercase">
            {t('ledgerNormal')}: {activeAccount.normalBalance}
          </div>
        </div>
      </div>

      {/* Ledger Table - Always show structured template, with mutations or placeholder template rows */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-between items-center">
          <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            {t('ledgerCardTitle')} ({ledgerLines.length} {t('profileUID').includes('User') ? 'Mutations' : 'Mutasi'})
          </span>
          <span className="text-[9px] font-mono text-slate-400 uppercase">
            {t('ledgerSystemAuto')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                <th className="py-2 px-3 w-28">{t('dashDate') || 'Tanggal'}</th>
                <th className="py-2 px-3 w-28">{t('journColVoucher') || 'No. Voucher'}</th>
                <th className="py-2 px-3">{t('journalMemo') || 'Deskripsi / Memo Jurnal'}</th>
                <th className="py-2 px-3 text-right w-32">{t('journColDebit') || 'Debet (Rp)'}</th>
                <th className="py-2 px-3 text-right w-32">{t('journColCredit') || 'Kredit (Rp)'}</th>
                <th className="py-2 px-3 text-right w-40">{t('ledgerRunningBalance')} (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {/* Core opening balance template row - always present */}
              <tr className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-950/10 text-[11px] font-mono">
                <td className="py-1.5 px-3 text-slate-400 dark:text-slate-600">—</td>
                <td className="py-1.5 px-3 text-slate-400 dark:text-slate-500 font-semibold">{t('ledgerOpeningRow')}</td>
                <td className="py-1.5 px-3 text-slate-500 dark:text-slate-400 italic font-sans">{t('ledgerOpeningDesc')}</td>
                <td className="py-1.5 px-3 text-right text-slate-400 dark:text-slate-600">—</td>
                <td className="py-1.5 px-3 text-right text-slate-400 dark:text-slate-600">—</td>
                <td className="py-1.5 px-3 text-right font-medium text-slate-900 dark:text-slate-200">
                  {formatRupiah(activeAccount.initialBalance)}
                </td>
              </tr>

              {/* Mutation entries */}
              {ledgerLines.length > 0 ? (
                ledgerLines.map((line, idx) => (
                  <tr 
                    key={idx} 
                    className="border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 text-[11px] transition-colors font-mono"
                  >
                    <td className="py-1.5 px-3 text-slate-500 dark:text-slate-400">{line.date}</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-900 dark:text-white">{line.reference}</td>
                    <td className="py-1.5 px-3 font-sans text-slate-700 dark:text-slate-300">{line.description}</td>
                    <td className="py-1.5 px-3 text-right text-slate-800 dark:text-slate-300">
                      {line.debit > 0 ? formatRupiah(line.debit) : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-800 dark:text-slate-300">
                      {line.credit > 0 ? formatRupiah(line.credit) : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-950 dark:text-white">
                      {formatRupiah(line.runningBalance)}
                    </td>
                  </tr>
                ))
              ) : (
                <>
                  {/* Empty Template Placeholder Rows so the ledger layout looks complete */}
                  <tr className="border-b border-slate-50 dark:border-slate-800/20 text-[11px] font-mono text-slate-300 dark:text-slate-700 italic">
                    <td className="py-2 px-3">—</td>
                    <td className="py-2 px-3">—</td>
                    <td className="py-2 px-3 font-sans text-slate-400 dark:text-slate-500">
                      {t('profileUID').includes('User') ? '(No transaction mutations recorded for this ledger template)' : '(Belum ada mutasi transaksi untuk template ledger ini)'}
                    </td>
                    <td className="py-2 px-3 text-right">—</td>
                    <td className="py-2 px-3 text-right">—</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-400 dark:text-slate-600">
                      {formatRupiah(activeAccount.initialBalance)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-50/40 dark:border-slate-800/10 text-[11px] font-mono text-slate-200 dark:text-slate-800">
                    <td className="py-2 px-3">—</td>
                    <td className="py-2 px-3">—</td>
                    <td className="py-2 px-3 font-sans text-slate-300 dark:text-slate-800/50">—</td>
                    <td className="py-2 px-3 text-right">—</td>
                    <td className="py-2 px-3 text-right">—</td>
                    <td className="py-2 px-3 text-right font-medium">—</td>
                  </tr>
                </>
              )}

              {/* Aggregation Summary Footer */}
              <tr className="bg-slate-50 dark:bg-slate-950/40 text-[11px] font-mono font-semibold border-t border-slate-200 dark:border-slate-800">
                <td className="py-2 px-3" colSpan={3}>
                  {t('ledgerTotalMutation') || 'Total Mutasi'}
                </td>
                <td className="py-2 px-3 text-right text-slate-950 dark:text-slate-200">{formatRupiah(totalDebit)}</td>
                <td className="py-2 px-3 text-right text-slate-950 dark:text-slate-200">{formatRupiah(totalCredit)}</td>
                <td className="py-2 px-3 text-right text-slate-900 dark:text-white font-bold">
                  Net: {formatRupiah(activeAccount.normalBalance === 'debit' ? (totalDebit - totalCredit) : (totalCredit - totalDebit))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Account Modal Form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <h3 className="text-sm font-bold font-sans text-slate-900 dark:text-white flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                {language === 'en' ? 'Add New Account' : 'Tambah Akun Baru'}
              </h3>
              <button 
                onClick={() => {
                  setModalError(null);
                  setIsAddModalOpen(false);
                }} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddAccountSubmit} className="p-5 space-y-4 font-mono text-xs">
              {modalError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Account Type */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold uppercase">
                  {language === 'en' ? 'Account Category' : 'Kategori / Golongan Akun'}
                </label>
                <select
                  value={newType}
                  onChange={(e) => handleTypeChange(e.target.value as AccountType)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-hidden"
                >
                  <option value="asset">{language === 'en' ? 'Asset (1-xxxx)' : 'Aset / Harta (1-xxxx)'}</option>
                  <option value="liability">{language === 'en' ? 'Liability (2-xxxx)' : 'Kewajiban / Utang (2-xxxx)'}</option>
                  <option value="equity">{language === 'en' ? 'Equity (3-xxxx)' : 'Ekuitas / Modal (3-xxxx)'}</option>
                  <option value="revenue">{language === 'en' ? 'Revenue (4-xxxx)' : 'Pendapatan (4-xxxx)'}</option>
                  <option value="expense">{language === 'en' ? 'Expense (5-xxxx)' : 'Beban / Biaya (5-xxxx)'}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Account Code */}
                <div className="space-y-1.5">
                  <label className="block text-slate-500 font-semibold uppercase">
                    {language === 'en' ? 'Account Code' : 'Kode Akun'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1-1050"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white font-bold placeholder-slate-400 focus:ring-1 focus:ring-slate-950 focus:outline-hidden"
                  />
                </div>

                {/* Normal Balance */}
                <div className="space-y-1.5">
                  <label className="block text-slate-500 font-semibold uppercase">
                    {language === 'en' ? 'Normal Balance' : 'Saldo Normal'}
                  </label>
                  <select
                    value={newNormalBalance}
                    onChange={(e) => setNewNormalBalance(e.target.value as 'debit' | 'credit')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white font-semibold focus:ring-1 focus:ring-slate-950 focus:outline-hidden"
                  >
                    <option value="debit">DEBIT (DEBET)</option>
                    <option value="credit">CREDIT (KREDIT)</option>
                  </select>
                </div>
              </div>

              {/* Account Name */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold uppercase">
                  {language === 'en' ? 'Account Name' : 'Nama Akun'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'en' ? 'e.g. Petty Cash Office' : 'Contoh: Kas Kecil Kantor'}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white font-sans placeholder-slate-400 focus:ring-1 focus:ring-slate-950 focus:outline-hidden"
                />
              </div>

              {/* Initial Balance Input */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold uppercase">
                  {language === 'en' ? 'Opening Balance (Rp)' : 'Saldo Awal (Rp)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={newInitialBalance || ''}
                  onChange={(e) => setNewInitialBalance(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white font-mono font-semibold focus:ring-1 focus:ring-slate-950 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-sans">
                  {language === 'en' 
                    ? "Specify the starting balance for this ledger account. This value will be added to mutations for the running balance."
                    : "Tentukan saldo awal untuk akun buku besar ini. Nilai ini akan ditambahkan ke mutasi untuk saldo berjalan."}
                </p>
              </div>

              {/* Actions footer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg text-slate-700 dark:text-slate-300 transition-all font-semibold cursor-pointer"
                >
                  {language === 'en' ? 'Cancel' : 'Batal'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  {isSubmitting ? (
                    <span>...</span>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>{language === 'en' ? 'Create Account' : 'Buat Akun'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal Form */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden font-mono">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <h3 className="text-sm font-bold font-sans text-slate-900 dark:text-white flex items-center gap-1.5">
                <Edit className="h-4 w-4 text-slate-500" />
                {language === 'en' ? 'Edit Account Info' : 'Ubah Informasi Akun'}
              </h3>
              <button 
                onClick={() => {
                  setEditModalError(null);
                  setIsEditModalOpen(false);
                }} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditAccountSubmit} className="p-5 space-y-4 text-xs">
              {editModalError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{editModalError}</span>
                </div>
              )}

              {/* Account Type / Category */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-slate-500 font-semibold uppercase">
                    {language === 'en' ? 'Account Category' : 'Kategori / Golongan Akun'}
                  </label>
                  {isAccountInUse && (
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase font-bold select-none">
                      <Lock className="h-2.5 w-2.5 text-slate-400" />
                      {language === 'en' ? 'Locked' : 'Terkunci'}
                    </span>
                  )}
                </div>
                <select
                  value={editType}
                  onChange={(e) => handleEditTypeChange(e.target.value as AccountType)}
                  disabled={isAccountInUse}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-slate-950 focus:border-slate-950 focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="asset">{language === 'en' ? 'Asset (1-xxxx)' : 'Aset / Harta (1-xxxx)'}</option>
                  <option value="liability">{language === 'en' ? 'Liability (2-xxxx)' : 'Kewajiban / Utang (2-xxxx)'}</option>
                  <option value="equity">{language === 'en' ? 'Equity (3-xxxx)' : 'Ekuitas / Modal (3-xxxx)'}</option>
                  <option value="revenue">{language === 'en' ? 'Revenue (4-xxxx)' : 'Pendapatan (4-xxxx)'}</option>
                  <option value="expense">{language === 'en' ? 'Expense (5-xxxx)' : 'Beban / Biaya (5-xxxx)'}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Account Code */}
                <div className="space-y-1.5">
                  <label className="block text-slate-500 font-semibold uppercase">
                    {language === 'en' ? 'Account Code' : 'Kode Akun'}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isAccountInUse}
                    placeholder="e.g. 1-1050"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white font-bold placeholder-slate-400 focus:ring-1 focus:ring-slate-950 focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Normal Balance */}
                <div className="space-y-1.5">
                  <label className="block text-slate-500 font-semibold uppercase">
                    {language === 'en' ? 'Normal Balance' : 'Saldo Normal'}
                  </label>
                  <select
                    value={editNormalBalance}
                    onChange={(e) => setEditNormalBalance(e.target.value as 'debit' | 'credit')}
                    disabled={isAccountInUse}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white font-semibold focus:ring-1 focus:ring-slate-950 focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="debit">DEBIT (DEBET)</option>
                    <option value="credit">CREDIT (KREDIT)</option>
                  </select>
                </div>
              </div>

              {/* Account Name */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold uppercase">
                  {language === 'en' ? 'Account Name' : 'Nama Akun'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'en' ? 'e.g. Petty Cash Office' : 'Contoh: Kas Kecil Kantor'}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white font-sans placeholder-slate-400 focus:ring-1 focus:ring-slate-950 focus:outline-hidden"
                />
              </div>

              {/* Initial Balance Input */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold uppercase">
                  {language === 'en' ? 'Opening Balance (Rp)' : 'Saldo Awal (Rp)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={editInitialBalance || ''}
                  onChange={(e) => setEditInitialBalance(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white font-mono font-semibold focus:ring-1 focus:ring-slate-950 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-sans">
                  {language === 'en' 
                    ? "Specify the starting balance for this ledger account. This value will be added to mutations for the running balance."
                    : "Tentukan saldo awal untuk akun buku besar ini. Nilai ini akan ditambahkan ke mutasi untuk saldo berjalan."}
                </p>
              </div>

              {isAccountInUse && (
                <p className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-md border border-slate-200/60 dark:border-slate-800/40 leading-normal font-sans flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {language === 'en' 
                      ? "Because this account has active journal transactions, the Account Code, Category, and Normal Balance cannot be modified to protect ledger integrity. You may still rename the account or adjust the opening balance."
                      : "Karena akun ini memiliki transaksi aktif, Kode Akun, Kategori, dan Saldo Normal tidak dapat diubah untuk melindungi integritas buku besar. Anda masih dapat mengubah nama akun atau saldo awal."}
                  </span>
                </p>
              )}

              {/* Actions footer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg text-slate-700 dark:text-slate-300 transition-all font-semibold cursor-pointer"
                >
                  {language === 'en' ? 'Cancel' : 'Batal'}
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  {isEditSubmitting ? (
                    <span>...</span>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 animate-pulse" />
                      <span>{language === 'en' ? 'Save Changes' : 'Simpan Perubahan'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
