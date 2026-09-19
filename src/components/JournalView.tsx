import React, { useState } from 'react';
import { Account, JournalEntry, JournalLine } from '../types';
import { validateJournalEntry } from '../utils';
import { formatRupiah } from '../initialData';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Trash2, Calendar, FileText, Check, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface JournalViewProps {
  accounts: Account[];
  entries: JournalEntry[];
  onAddEntry: (entry: JournalEntry) => void;
  onRemoveEntry?: (entryId: string) => void;
  onResetData: () => void;
}

interface NewLineState {
  accountCode: string;
  debit: string;
  credit: string;
}

export default function JournalView({ accounts, entries, onAddEntry, onRemoveEntry, onResetData }: JournalViewProps) {
  const { t, language } = useLanguage();
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Delete Confirmation state
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);

  // Form states for custom entry
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<NewLineState[]>([
    { accountCode: '', debit: '', credit: '' },
    { accountCode: '', debit: '', credit: '' }
  ]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto-generate reference code based on current entry count
  const generateRef = () => {
    const nextNum = entries.length + 1;
    return `JV-2026-${String(nextNum).padStart(3, '0')}`;
  };

  // Open form with pre-generated reference
  const handleOpenForm = () => {
    setReference(generateRef());
    setLines([
      { accountCode: '', debit: '', credit: '' },
      { accountCode: '', debit: '', credit: '' }
    ]);
    setDescription('');
    setValidationError(null);
    setShowForm(true);
  };

  // Add line to journal builder
  const addLine = () => {
    setLines([...lines, { accountCode: '', debit: '', credit: '' }]);
  };

  // Remove line from journal builder
  const removeLine = (index: number) => {
    if (lines.length <= 2) return; // Minimum 2 lines
    const newLines = [...lines];
    newLines.splice(index, 1);
    setLines(newLines);
  };

  // Update line field
  const updateLine = (index: number, field: keyof NewLineState, value: string) => {
    const newLines = [...lines];
    
    if (field === 'debit') {
      newLines[index].debit = value;
      // If debit is typed, clear credit on this line to enforce accounting logic
      if (value) newLines[index].credit = '';
    } else if (field === 'credit') {
      newLines[index].credit = value;
      // If credit is typed, clear debit on this line
      if (value) newLines[index].debit = '';
    } else {
      newLines[index][field] = value;
    }

    setLines(newLines);
  };

  // Calculate live debit/credit totals
  const totalDebits = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredits = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const discrepancy = Math.abs(totalDebits - totalCredits);
  const isBalanced = totalDebits > 0 && discrepancy < 0.01;

  // Save the custom journal entry
  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();

    // Map string values to numbers
    const mappedLines = lines.map((l) => ({
      accountCode: l.accountCode,
      debit: parseFloat(l.debit) || 0,
      credit: parseFloat(l.credit) || 0
    }));

    // Validate the entry
    const validation = validateJournalEntry(mappedLines);
    if (!validation.isValid) {
      setValidationError(validation.error || (language === 'en' ? 'Validation error.' : 'Terjadi kesalahan validasi.'));
      return;
    }

    // Format new entry
    const newEntry: JournalEntry = {
      id: `TX-${Date.now()}`,
      date,
      reference,
      description,
      lines: mappedLines.map((l, idx) => ({
        id: `L-${Date.now()}-${idx}`,
        accountCode: l.accountCode,
        debit: l.debit,
        credit: l.credit
      }))
    };

    onAddEntry(newEntry);
    setShowForm(false);
    setValidationError(null);
  };

  // Quick templates for instant entry
  const applyTemplate = (type: 'revenue' | 'expense' | 'capital') => {
    const templateRef = generateRef();
    let templateDesc = '';
    let templateLines: NewLineState[] = [];

    switch (type) {
      case 'revenue':
        templateDesc = language === 'en' ? 'Sales Revenue from Product Services' : 'Penerimaan Pendapatan Jasa Penjualan Produk';
        templateLines = [
          { accountCode: '1-1000', debit: '15000000', credit: '' }, // Debit: Kas
          { accountCode: '4-1100', debit: '', credit: '15000000' }  // Credit: Pendapatan Produk
        ];
        break;
      case 'expense':
        templateDesc = language === 'en' ? 'Monthly Utility & Internet Expenses' : 'Pembayaran Tagihan Listrik & Internet Bulanan';
        templateLines = [
          { accountCode: '5-1200', debit: '3500000', credit: '' },  // Debit: Beban Utilitas
          { accountCode: '1-1100', debit: '', credit: '3500000' }   // Credit: Bank Mandiri
        ];
        break;
      case 'capital':
        templateDesc = language === 'en' ? 'Additional Working Capital Investment' : 'Suntikan Modal Kerja Tambahan Investor';
        templateLines = [
          { accountCode: '1-1100', debit: '50000000', credit: '' }, // Debit: Bank Mandiri
          { accountCode: '3-1000', debit: '', credit: '50000000' }  // Credit: Modal Saham
        ];
        break;
    }

    setDate(new Date().toISOString().split('T')[0]);
    setReference(templateRef);
    setDescription(templateDesc);
    setLines(templateLines);
    setShowForm(true);
    setValidationError(null);
  };

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    // Search Term matching
    const matchesSearch = 
      entry.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.lines.some(l => {
        const acc = accounts.find(a => a.code === l.accountCode);
        return l.accountCode.includes(searchTerm) || (acc && acc.name.toLowerCase().includes(searchTerm.toLowerCase()));
      });

    // Date Filters
    const matchesStartDate = startDate ? entry.date >= startDate : true;
    const matchesEndDate = endDate ? entry.date <= endDate : true;

    return matchesSearch && matchesStartDate && matchesEndDate;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold font-sans tracking-tight text-slate-950 dark:text-white uppercase">{t('journalTitle')}</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('journalDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onResetData}
            title="Reset"
            className="p-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded transition-all flex items-center justify-center cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleOpenForm}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-mono rounded shadow-xs transition-all flex items-center gap-1.5 cursor-pointer font-bold"
          >
            <Plus className="h-3 w-3" />
            {t('journalNewRecord')}
          </button>
        </div>
      </div>

      {/* Dynamic Journal Entry Builder Modal/Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded shadow-xs p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-950 dark:bg-white"></div>
          
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-xs text-slate-900 dark:text-white font-sans uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              {t('journalEntryBuilder')}
            </h3>
            <button 
              onClick={() => setShowForm(false)}
              className="text-[10px] text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-mono cursor-pointer"
            >
              {t('journalClose')}
            </button>
          </div>

          {/* Quick templates inside builder */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-950/60 p-2 rounded border border-slate-200 dark:border-slate-800">
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">{t('journalQuickTemplate')}</span>
            <button 
              type="button"
              onClick={() => applyTemplate('revenue')}
              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 border border-slate-700 text-[9px] font-mono text-white rounded-sm transition-all cursor-pointer shadow-xs"
            >
              {t('journalTemplateRevenue')}
            </button>
            <button 
              type="button"
              onClick={() => applyTemplate('expense')}
              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 border border-slate-700 text-[9px] font-mono text-white rounded-sm transition-all cursor-pointer shadow-xs"
            >
              {t('journalTemplateExpense')}
            </button>
            <button 
              type="button"
              onClick={() => applyTemplate('capital')}
              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 border border-slate-700 text-[9px] font-mono text-white rounded-sm transition-all cursor-pointer shadow-xs"
            >
              {t('journalTemplateCapital')}
            </button>
          </div>

          <form onSubmit={handleSubmitEntry} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-0.5">{t('journalTransDate')}</label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-slate-500 focus:outline-hidden"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-0.5">{t('journalVoucherNo')}</label>
                <div className="relative">
                  <FileText className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="JV-YYYY-XXX"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-slate-500 focus:outline-hidden"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-0.5">{t('journalMemo')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('journMemoPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-slate-500 focus:outline-hidden font-sans"
                />
              </div>
            </div>

            {/* Dynamic ledger lines list */}
            <div className="space-y-1.5 mt-3">
              <div className="grid grid-cols-12 gap-2 text-[9px] font-mono text-slate-400 uppercase tracking-wider pb-0.5 px-1">
                <div className="col-span-6 md:col-span-5">{t('journalSelectAccount')}</div>
                <div className="col-span-3 md:col-span-3 text-right">{t('journalDebitLabel')}</div>
                <div className="col-span-3 md:col-span-3 text-right">{t('journalCreditLabel')}</div>
                <div className="hidden md:block md:col-span-1"></div>
              </div>

              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  {/* Account Selector */}
                  <div className="col-span-12 md:col-span-5">
                    <select
                      required
                      value={line.accountCode}
                      onChange={(e) => updateLine(index, 'accountCode', e.target.value)}
                      className="w-full px-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-slate-500 focus:outline-hidden"
                    >
                      <option value="">-- {t('journalSelectAccount')} --</option>

                      {accounts.map(acc => (
                        <option key={acc.code} value={acc.code}>
                          {acc.code} - {acc.name} ({acc.type.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Debit Input */}
                  <div className="col-span-5 md:col-span-3 relative">
                    <span className="absolute left-2 top-1.5 text-[9px] font-mono text-slate-400">Rp</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      disabled={!!line.credit}
                      value={line.debit}
                      onChange={(e) => updateLine(index, 'debit', e.target.value)}
                      className="w-full pl-6 pr-1.5 py-1 text-right bg-white dark:bg-slate-950 disabled:bg-slate-50 dark:disabled:bg-slate-900/50 border border-slate-300 dark:border-slate-800 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-slate-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Credit Input */}
                  <div className="col-span-5 md:col-span-3 relative">
                    <span className="absolute left-2 top-1.5 text-[9px] font-mono text-slate-400">Rp</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      disabled={!!line.debit}
                      value={line.credit}
                      onChange={(e) => updateLine(index, 'credit', e.target.value)}
                      className="w-full pl-6 pr-1.5 py-1 text-right bg-white dark:bg-slate-950 disabled:bg-slate-50 dark:disabled:bg-slate-900/50 border border-slate-300 dark:border-slate-800 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-slate-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Delete button */}
                  <div className="col-span-2 md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={lines.length <= 2}
                      onClick={() => removeLine(index)}
                      className="p-1 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addLine}
              className="mt-1.5 text-[10px] font-mono text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:underline flex items-center gap-1 focus:outline-hidden cursor-pointer"
            >
              {t('journalAddLine')}
            </button>

            {/* Validation Display & Action Buttons */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Balances Status */}
              <div className="flex gap-4 font-mono text-[10px]">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[8px] uppercase">{t('journalTotalDebits')}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">{formatRupiah(totalDebits)}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[8px] uppercase">{t('journalTotalCredits')}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">{formatRupiah(totalCredits)}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[8px] uppercase">{t('journalDiscrepancy')}</span>
                  <span className={`font-semibold ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {discrepancy === 0 ? 'Rp 0 (Balanced)' : `Rp ${new Intl.NumberFormat('id-ID').format(discrepancy)}`}
                  </span>
                </div>
              </div>

              {/* Action and Alert Area */}
              <div className="flex items-center gap-2">
                {validationError && (
                  <div className="text-[10px] text-red-500 flex items-center gap-1 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 px-2.5 py-0.5 rounded-sm">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}
                {isBalanced && !validationError && (
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 px-2.5 py-0.5 rounded-sm font-mono">
                    <Check className="h-3 w-3" />
                    <span>{t('journalBalancedReady')}</span>
                  </div>
                )}
                
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-mono rounded transition-all cursor-pointer"
                  >
                    {t('journalCancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={!isBalanced}
                    className="px-4 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white dark:text-slate-900 text-[11px] font-mono rounded shadow-xs transition-all cursor-pointer active:scale-95 font-bold"
                  >
                    {t('journalSave')}
                  </button>
                </div>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* Filtering and Search Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[9px] font-mono text-slate-400 uppercase mb-0.5">{t('journalFilterKeyword')}</label>
            <input
              type="text"
              placeholder={t('journSearchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[11px] text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[9px] font-mono text-slate-400 uppercase mb-0.5">{t('journalFilterStartDate')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[9px] font-mono text-slate-400 uppercase mb-0.5">{t('journalFilterEndDate')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Journal Table List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
            {t('journalListTitle')} ({filteredEntries.length} {t('statusEntri')})
          </span>
          {searchTerm || startDate || endDate ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-[9px] font-mono text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:underline cursor-pointer"
            >
              {t('journResetFilter') || 'Reset Filter'}
            </button>
          ) : null}
        </div>

        {filteredEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[9px] font-mono text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/50">
                  <th className="py-2 px-3 w-28">{t('journColDate') || 'Tanggal'}</th>
                  <th className="py-2 px-3 w-28">{t('journColVoucher') || 'No. Voucher'}</th>
                  <th className="py-2 px-3">{t('journColDescription') || 'Keterangan / Akun Rekening'}</th>
                  <th className="py-2 px-3 text-right w-36">{t('journColDebit') || 'Debet (Rp)'}</th>
                  <th className="py-2 px-3 text-right w-36">{t('journColCredit') || 'Kredit (Rp)'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    {/* Header Row */}
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 font-sans text-[11px]">
                      <td className="py-1.5 px-3 font-mono text-slate-500 dark:text-slate-400 font-medium">
                        {entry.date}
                      </td>
                      <td className="py-1.5 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                        {entry.reference}
                      </td>
                      <td className="py-1.5 px-3 text-slate-900 dark:text-slate-200 font-medium font-sans">
                        {entry.description}
                      </td>
                      <td className="py-1.5 px-3 text-right" colSpan={2}>
                        {onRemoveEntry && (
                          <button
                            onClick={() => setEntryToDelete(entry)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-900/50 hover:border-red-300 text-red-600 dark:text-red-400 rounded text-[9px] font-mono transition-colors cursor-pointer"
                            title={t('journDelete')}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>{t('journDelete')}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Line Items Rows */}
                    {entry.lines.map((line) => {
                      const acc = accounts.find(a => a.code === line.accountCode);
                      return (
                        <tr 
                          key={line.id} 
                          className="border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 text-[11px] transition-colors"
                        >
                          <td className="py-1 px-3"></td>
                          <td className="py-1 px-3"></td>
                          <td className="py-1 px-3">
                            <div className={`flex items-center gap-2 ${line.credit > 0 ? 'pl-6' : ''}`}>
                              <span className="font-mono text-slate-400 text-[10px]">{line.accountCode}</span>
                              <span className={line.credit > 0 ? 'text-slate-500 dark:text-slate-400 italic' : 'text-slate-800 dark:text-slate-200 font-medium'}>
                                {acc ? acc.name : (t('journAccountNotFound') || 'Akun Tidak Ditemukan')}
                              </span>
                            </div>
                          </td>
                          <td className="py-1 px-3 text-right font-mono text-slate-800 dark:text-slate-200">
                            {line.debit > 0 ? formatRupiah(line.debit) : '—'}
                          </td>
                          <td className="py-1 px-3 text-right font-mono text-slate-800 dark:text-slate-200">
                            {line.credit > 0 ? formatRupiah(line.credit) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-[10px] font-mono text-slate-400">
            {t('journalNoEntries')}
          </div>
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {entryToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex gap-3 items-start text-red-600 dark:text-red-400">
                <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-full border border-red-200/50">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    {t('journDelete') || 'Hapus Entri'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t('journConfirmDelete') || 'Apakah Anda yakin ingin menghapus entri jurnal ini?'}
                  </p>
                  <div className="mt-2 bg-slate-50 dark:bg-slate-950 p-2 rounded text-[10px] font-mono text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 space-y-0.5">
                    <div><strong>Voucher:</strong> {entryToDelete.reference}</div>
                    <div><strong>{language === 'en' ? 'Description:' : 'Keterangan:'}</strong> {entryToDelete.description}</div>
                    <div><strong>{language === 'en' ? 'Date:' : 'Tanggal:'}</strong> {entryToDelete.date}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEntryToDelete(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded text-xs font-semibold cursor-pointer"
                >
                  {t('resetCancel') || 'Batal'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onRemoveEntry) {
                      onRemoveEntry(entryToDelete.id);
                    }
                    setEntryToDelete(null);
                  }}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold cursor-pointer"
                >
                  {t('journDelete') || 'Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
