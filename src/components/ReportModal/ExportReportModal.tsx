import React, { useState, useEffect, useMemo } from 'react';
import { Account, JournalEntry } from '../../types';
import { 
  ReportId, 
  ReportFilterOptions, 
  ReportDocumentConfig, 
  GeneratedReport, 
  DatePreset,
  TransactionFilterType,
  CategoryFilterType,
  CurrencyCode 
} from '../../types/reportTypes';
import { REPORT_CATALOG } from '../../utils/reportCatalog';
import { generateSingleReport } from '../../utils/reportDataEngine';
import { exportCombinedReportsPDF, exportSingleReportPDF, downloadPdfBlob } from '../../utils/pdfExportEngine';
import { PrintableReportDocument } from './PrintableReportDocument';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Printer, 
  FileDown, 
  CheckSquare, 
  Square, 
  Filter, 
  Eye, 
  Calendar, 
  Coins, 
  Layers, 
  Building2, 
  X, 
  Check, 
  Sparkles, 
  FileSpreadsheet, 
  BookOpen, 
  TrendingUp, 
  ShieldAlert, 
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Settings2,
  ZoomIn,
  ZoomOut,
  FileText
} from 'lucide-react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  entries: JournalEntry[];
  defaultCompanyName?: string;
}

const STORAGE_KEY = 'vasterp_export_preferences_v2';

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  accounts,
  entries,
  defaultCompanyName = 'PT VAST ERP INDONESIA'
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'reports' | 'filters' | 'preview' | 'export'>('reports');

  // 1. Report Selection State
  const [selectedReportIds, setSelectedReportIds] = useState<ReportId[]>([
    'balance_sheet',
    'income_statement'
  ]);

  // 2. Filters State
  const [filters, setFilters] = useState<ReportFilterOptions>({
    datePreset: 'all',
    startDate: '',
    endDate: '',
    selectedAccounts: ['all'],
    transactionType: 'all',
    category: 'all',
    department: 'all',
    currency: 'IDR',
    currencyRate: 1,
    statusFilter: 'all',
    customSearchText: ''
  });

  // 3. Document Configurations
  const [config, setConfig] = useState<ReportDocumentConfig>({
    companyName: defaultCompanyName,
    reportSubtitle: 'Official General Ledger & Financial Accounting Statement',
    showLogo: true,
    showConfidentialityNotice: true,
    confidentialityText: 'CONFIDENTIAL - For Internal Management & Regulatory Use Only',
    showPrintedTimestamp: true,
    showPageNumbers: true,
    orientation: 'auto',
    combineMultipleReports: true
  });

  // 4. Preview State
  const [activePreviewId, setActivePreviewId] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedReportIds && Array.isArray(parsed.selectedReportIds) && parsed.selectedReportIds.length > 0) {
          setSelectedReportIds(parsed.selectedReportIds);
        }
        if (parsed.filters) {
          setFilters(prev => ({ ...prev, ...parsed.filters }));
        }
        if (parsed.config) {
          setConfig(prev => ({ ...prev, ...parsed.config, companyName: defaultCompanyName || parsed.config.companyName }));
        }
      }
    } catch (e) {
      console.warn('Could not load report preferences from localStorage:', e);
    }
  }, [defaultCompanyName]);

  // Save preferences on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        selectedReportIds,
        filters,
        config
      }));
    } catch (e) {
      // ignore
    }
  }, [selectedReportIds, filters, config]);

  // Handle Quick Date Presets
  const handleDatePresetChange = (preset: DatePreset) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    let start = '';
    let end = todayStr;

    if (preset === 'this_month') {
      start = `${y}-${m}-01`;
    } else if (preset === 'last_month') {
      const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const py = prevMonthDate.getFullYear();
      const pm = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
      const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      start = `${py}-${pm}-01`;
      end = `${py}-${pm}-${String(lastDayPrevMonth).padStart(2, '0')}`;
    } else if (preset === 'this_quarter') {
      const qMonth = Math.floor(today.getMonth() / 3) * 3 + 1;
      start = `${y}-${String(qMonth).padStart(2, '0')}-01`;
    } else if (preset === 'ytd') {
      start = `${y}-01-01`;
    } else if (preset === 'all') {
      start = '';
      end = '';
    }

    setFilters(prev => ({
      ...prev,
      datePreset: preset,
      startDate: start,
      endDate: end
    }));
  };

  // Toggle report selection
  const handleToggleReport = (id: ReportId) => {
    setSelectedReportIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(r => r !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Select all in a category
  const handleSelectCategoryAll = (cat: 'history' | 'statements' | 'other') => {
    const catIds = REPORT_CATALOG.filter(r => r.category === cat).map(r => r.id);
    setSelectedReportIds(prev => Array.from(new Set([...prev, ...catIds])));
  };

  // Clear all in a category
  const handleClearCategory = (cat: 'history' | 'statements' | 'other') => {
    const catIds = new Set(REPORT_CATALOG.filter(r => r.category === cat).map(r => r.id));
    setSelectedReportIds(prev => {
      const remaining = prev.filter(id => !catIds.has(id));
      return remaining.length > 0 ? remaining : ['balance_sheet'];
    });
  };

  // Generate Reports Data directly from real app state
  const generatedReports: GeneratedReport[] = useMemo(() => {
    if (selectedReportIds.length === 0) return [];
    return selectedReportIds.map(id => generateSingleReport(id, accounts, entries, filters, config));
  }, [selectedReportIds, accounts, entries, filters, config]);

  // Reports to display in preview
  const previewReports = useMemo(() => {
    if (activePreviewId === 'all') return generatedReports;
    return generatedReports.filter(r => r.id === activePreviewId);
  }, [generatedReports, activePreviewId]);

  // Execute Native Print Dialog
  const handlePrint = () => {
    setIsExporting(true);
    setExportMessage('Opening system print dialog...');

    const isLandscape = config.orientation === 'landscape' || 
      (config.orientation === 'auto' && generatedReports.some(r => r.orientation === 'landscape'));

    document.body.classList.add('printing-report');
    if (isLandscape) {
      document.body.classList.add('print-landscape');
    } else {
      document.body.classList.add('print-portrait');
    }

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-report', 'print-landscape', 'print-portrait');
        setIsExporting(false);
        setExportMessage(null);
      }, 500);
    }, 200);
  };

  // Execute PDF Export
  const handleExportPDF = async () => {
    if (generatedReports.length === 0) return;
    setIsExporting(true);
    setExportMessage('Generating professional vector PDF...');

    try {
      if (config.combineMultipleReports || generatedReports.length === 1) {
        const blob = await exportCombinedReportsPDF(generatedReports, config, filters.currency);
        const timestamp = new Date().toISOString().slice(0, 10);
        const fileName = `VastERP_Financial_Statements_${timestamp}.pdf`;
        downloadPdfBlob(blob, fileName);
        setExportMessage('PDF downloaded successfully!');
      } else {
        // Export separate files
        for (let i = 0; i < generatedReports.length; i++) {
          const report = generatedReports[i];
          const blob = await exportSingleReportPDF(report, config, filters.currency);
          const safeTitle = report.title.replace(/[^a-zA-Z0-9]/g, '_');
          downloadPdfBlob(blob, `VastERP_${safeTitle}.pdf`);
          // Brief throttle for browser downloads
          await new Promise(res => setTimeout(res, 300));
        }
        setExportMessage(`${generatedReports.length} separate PDF files generated & downloaded!`);
      }
    } catch (err: any) {
      console.error('PDF generation error:', err);
      setExportMessage(`Failed to generate PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
      }, 1500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden font-sans">
        
        {/* MODAL TOP HEADER */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs font-mono shadow-xs">
              <Printer className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <span>{t('fsPrint') || 'Print / Export PDF'}</span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono px-2 py-0.5 rounded font-semibold">
                  Accounting Reports Studio
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Generate, customize, preview, and export official financial statements & accounting logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close window"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* STEP / TAB NAVIGATION BAR */}
        <div className="px-5 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 text-xs font-mono">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0.5">
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-slate-900 text-white font-bold dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>1. Select Reports ({selectedReportIds.length})</span>
            </button>

            <span className="text-slate-300 dark:text-slate-700">/</span>

            <button
              onClick={() => setActiveTab('filters')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'filters'
                  ? 'bg-slate-900 text-white font-bold dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>2. Filters & Style</span>
            </button>

            <span className="text-slate-300 dark:text-slate-700">/</span>

            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-slate-900 text-white font-bold dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>3. Live Preview</span>
            </button>

            <span className="text-slate-300 dark:text-slate-700">/</span>

            <button
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-slate-900 text-white font-bold dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>4. Print & Export</span>
            </button>
          </div>

          {/* Quick Direct Actions from the top bar */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isExporting}
              className="px-2.5 py-1 text-xs font-mono font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              <span>Print</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-3 py-1 text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* MODAL MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 dark:bg-slate-950/40">
          
          {/* TAB 1: SELECT REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center justify-between">
                  <span>Select Financial & Accounting Reports</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {selectedReportIds.length} of {REPORT_CATALOG.length} selected
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                  Choose one or multiple reports to include in your exported document bundle.
                </p>
              </div>

              {/* Category 1: Official Financial Statements */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                      Official Financial Statements
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <button
                      onClick={() => handleSelectCategoryAll('statements')}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => handleClearCategory('statements')}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {REPORT_CATALOG.filter(r => r.category === 'statements').map(report => {
                    const isSelected = selectedReportIds.includes(report.id);
                    return (
                      <div
                        key={report.id}
                        onClick={() => handleToggleReport(report.id)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-400 dark:border-slate-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 text-slate-900 dark:text-white shrink-0">
                          {isSelected ? <CheckSquare className="h-4 w-4 text-slate-900 dark:text-white" /> : <Square className="h-4 w-4 text-slate-400" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white font-sans">
                            {report.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans mt-0.5 line-clamp-2">
                            {report.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category 2: Accounting History / Transaction History */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                      Accounting History & Transaction Logs
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <button
                      onClick={() => handleSelectCategoryAll('history')}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => handleClearCategory('history')}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {REPORT_CATALOG.filter(r => r.category === 'history').map(report => {
                    const isSelected = selectedReportIds.includes(report.id);
                    return (
                      <div
                        key={report.id}
                        onClick={() => handleToggleReport(report.id)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-400 dark:border-slate-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 text-slate-900 dark:text-white shrink-0">
                          {isSelected ? <CheckSquare className="h-4 w-4 text-slate-900 dark:text-white" /> : <Square className="h-4 w-4 text-slate-400" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white font-sans">
                            {report.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans mt-0.5 line-clamp-2">
                            {report.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category 3: Other Ledgers & Analysis Reports */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                      General Ledger & Subsidiary Analysis
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <button
                      onClick={() => handleSelectCategoryAll('other')}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => handleClearCategory('other')}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {REPORT_CATALOG.filter(r => r.category === 'other').map(report => {
                    const isSelected = selectedReportIds.includes(report.id);
                    return (
                      <div
                        key={report.id}
                        onClick={() => handleToggleReport(report.id)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-400 dark:border-slate-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 text-slate-900 dark:text-white shrink-0">
                          {isSelected ? <CheckSquare className="h-4 w-4 text-slate-900 dark:text-white" /> : <Square className="h-4 w-4 text-slate-400" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white font-sans">
                            {report.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans mt-0.5 line-clamp-2">
                            {report.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Next Step Bar */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setActiveTab('filters')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <span>Next: Configure Filters & Layout</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: FILTERS & STYLE CONFIGURATION */}
          {activeTab === 'filters' && (
            <div className="space-y-6 max-w-4xl mx-auto font-mono text-xs">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                  Accounting Report Filters & Document Styling
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                  Filter transactions by date, accounts, category, currency, and configure corporate header and footer parameters.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* 1. Date Range Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <h4 className="font-bold uppercase text-slate-900 dark:text-white text-xs">
                      1. Date Range
                    </h4>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                        Preset Timeframe
                      </label>
                      <div className="grid grid-cols-3 gap-1 text-[10px]">
                        {(['all', 'this_month', 'last_month', 'this_quarter', 'ytd', 'custom'] as DatePreset[]).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleDatePresetChange(p)}
                            className={`py-1 px-1.5 rounded text-center border uppercase transition-colors cursor-pointer ${
                              filters.datePreset === p
                                ? 'bg-slate-900 text-white font-bold border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                                : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            {p.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, datePreset: 'custom' }))}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, datePreset: 'custom' }))}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Specific Accounts & Classification Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Layers className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <h4 className="font-bold uppercase text-slate-900 dark:text-white text-xs">
                      2. Accounts & Classification
                    </h4>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                        Specific Account(s)
                      </label>
                      <select
                        value={filters.selectedAccounts[0] || 'all'}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          selectedAccounts: e.target.value === 'all' ? ['all'] : [e.target.value]
                        }))}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white font-medium"
                      >
                        <option value="all">All Accounts (Complete Ledger)</option>
                        {accounts.map(acc => (
                          <option key={acc.code} value={acc.code}>
                            {acc.code} — {acc.name} ({acc.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                          Account Category
                        </label>
                        <select
                          value={filters.category}
                          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as CategoryFilterType }))}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white"
                        >
                          <option value="all">All Categories</option>
                          <option value="asset">Assets (1-xxxx)</option>
                          <option value="liability">Liabilities (2-xxxx)</option>
                          <option value="equity">Equity (3-xxxx)</option>
                          <option value="revenue">Revenues (4-xxxx)</option>
                          <option value="expense">Expenses (5-xxxx)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                          Transaction Type
                        </label>
                        <select
                          value={filters.transactionType}
                          onChange={(e) => setFilters(prev => ({ ...prev, transactionType: e.target.value as TransactionFilterType }))}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white"
                        >
                          <option value="all">All Transactions</option>
                          <option value="income">Income Only</option>
                          <option value="expense">Expense Only</option>
                          <option value="transfer">Bank/Cash Transfers</option>
                          <option value="adjustment">Adjustments</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                        Keyword / Voucher Memo Search
                      </label>
                      <input
                        type="text"
                        placeholder="Search ref # or description (e.g. Konsultasi, JV-2026)"
                        value={filters.customSearchText}
                        onChange={(e) => setFilters(prev => ({ ...prev, customSearchText: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Department, Project & Currency Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Coins className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <h4 className="font-bold uppercase text-slate-900 dark:text-white text-xs">
                      3. Currency & Department
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                        Display Currency
                      </label>
                      <select
                        value={filters.currency}
                        onChange={(e) => {
                          const c = e.target.value as CurrencyCode;
                          let r = 1;
                          if (c === 'USD') r = 16000;
                          if (c === 'EUR') r = 17500;
                          setFilters(prev => ({ ...prev, currency: c, currencyRate: r }));
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white font-semibold"
                      >
                        <option value="IDR">IDR (Rp - Rupiah)</option>
                        <option value="USD">USD ($ - US Dollar)</option>
                        <option value="EUR">EUR (€ - Euro)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                        Department / Cost Center
                      </label>
                      <select
                        value={filters.department}
                        onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white"
                      >
                        <option value="all">All Departments</option>
                        <option value="main">Headquarters / Operations</option>
                        <option value="consulting">Consulting Division</option>
                        <option value="it">IT & Development</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                      Posting Status
                    </label>
                    <select
                      value={filters.statusFilter}
                      onChange={(e) => setFilters(prev => ({ ...prev, statusFilter: e.target.value as any }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white"
                    >
                      <option value="all">All Transactions (Standard Double-Entry)</option>
                      <option value="posted">Posted Journals Only</option>
                      <option value="unposted">Draft / Unposted</option>
                    </select>
                  </div>
                </div>

                {/* 4. Document Header & Footer Branding */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <h4 className="font-bold uppercase text-slate-900 dark:text-white text-xs">
                      4. Corporate Branding & Footer
                    </h4>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                        Company / Business Name
                      </label>
                      <input
                        type="text"
                        value={config.companyName}
                        onChange={(e) => setConfig(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={config.showLogo}
                          onChange={(e) => setConfig(prev => ({ ...prev, showLogo: e.target.checked }))}
                          className="rounded text-slate-900"
                        />
                        <span>Company Emblem Logo</span>
                      </label>

                      <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={config.showPageNumbers}
                          onChange={(e) => setConfig(prev => ({ ...prev, showPageNumbers: e.target.checked }))}
                          className="rounded text-slate-900"
                        />
                        <span>Page Numbers</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={config.showConfidentialityNotice}
                          onChange={(e) => setConfig(prev => ({ ...prev, showConfidentialityNotice: e.target.checked }))}
                          className="rounded text-slate-900"
                        />
                        <span>Confidentiality Notice</span>
                      </label>

                      <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={config.combineMultipleReports}
                          onChange={(e) => setConfig(prev => ({ ...prev, combineMultipleReports: e.target.checked }))}
                          className="rounded text-slate-900"
                        />
                        <span>Combine into One Document</span>
                      </label>
                    </div>

                    <div className="pt-1">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                        Page Orientation
                      </label>
                      <select
                        value={config.orientation}
                        onChange={(e) => setConfig(prev => ({ ...prev, orientation: e.target.value as any }))}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white"
                      >
                        <option value="auto">Auto (Recommended per report type)</option>
                        <option value="portrait">Portrait Only</option>
                        <option value="landscape">Landscape Only</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setActiveTab('reports')}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Reports</span>
                </button>

                <button
                  onClick={() => setActiveTab('preview')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <span>Next: View Live Preview</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE REPORT PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* Preview Controls Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Preview Report:</span>
                  <select
                    value={activePreviewId}
                    onChange={(e) => setActivePreviewId(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white font-medium"
                  >
                    <option value="all">All Selected Reports ({generatedReports.length})</option>
                    {generatedReports.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[10px]">ZOOM:</span>
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-0.5">
                    <button
                      onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
                      className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-2 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {zoomLevel}%
                    </span>
                    <button
                      onClick={() => setZoomLevel(prev => Math.min(150, prev + 15))}
                      className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setZoomLevel(100)}
                    className="px-2 py-1 text-[10px] border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
                  >
                    100%
                  </button>
                </div>
              </div>

              {/* Preview Paper Display Container */}
              <div className="bg-slate-200/80 dark:bg-slate-950/80 p-4 sm:p-8 rounded-xl overflow-x-auto min-h-[500px] flex justify-center shadow-inner">
                <div 
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
                  className="w-full max-w-4xl"
                >
                  <PrintableReportDocument
                    reports={previewReports}
                    config={config}
                    currency={filters.currency}
                    isPrintPreview={true}
                  />
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between pt-2 font-mono">
                <button
                  onClick={() => setActiveTab('filters')}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Adjust Filters</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    disabled={isExporting}
                    className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Document</span>
                  </button>

                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRINT & EXPORT OPTIONS OVERVIEW */}
          {activeTab === 'export' && (
            <div className="space-y-6 max-w-3xl mx-auto font-sans">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                  Ready to Print & Export
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Confirm your options below to initiate printing or download official PDF files.
                </p>
              </div>

              {exportMessage && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs font-mono flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{exportMessage}</span>
                </div>
              )}

              {/* Summary Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4 font-mono text-xs">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase">
                    Report Generation Summary
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Selected Reports</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{generatedReports.length} Reports</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Timeframe</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {filters.startDate && filters.endDate ? `${filters.startDate} to ${filters.endDate}` : 'All Time'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Currency</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{filters.currency}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Company Name</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{config.companyName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Format</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">A4 ISO 216 Standard</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Output Method</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {config.combineMultipleReports ? 'Combined (1 Document)' : 'Separate Files'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Report Items List */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Reports in Bundle:</span>
                  <div className="space-y-1">
                    {generatedReports.map((r, idx) => (
                      <div key={r.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {idx + 1}. {r.title}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {r.rows.length} rows | {r.orientation}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button
                  onClick={handlePrint}
                  disabled={isExporting}
                  className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border-2 border-slate-900 dark:border-white text-slate-900 dark:text-white rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-sm"
                >
                  <Printer className="h-6 w-6 text-slate-900 dark:text-white group-hover:scale-110 transition-transform" />
                  <span className="font-mono font-bold text-sm uppercase">Print Document</span>
                  <span className="text-[10px] text-slate-500 font-sans text-center">
                    Open system print dialog formatted for physical A4 printing
                  </span>
                </button>

                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="p-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-md"
                >
                  <FileDown className="h-6 w-6 text-white dark:text-slate-900 group-hover:scale-110 transition-transform" />
                  <span className="font-mono font-bold text-sm uppercase">Export PDF Document</span>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600 font-sans text-center">
                    Download professional, publication-ready vector PDF files
                  </span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* HIDDEN PRINTABLE CONTAINER FOR BROWSER PRINT (WINDOW.PRINT) */}
        <div id="printable-report-area" className="hidden">
          <PrintableReportDocument
            reports={generatedReports}
            config={config}
            currency={filters.currency}
            isPrintPreview={false}
          />
        </div>

      </div>
    </div>
  );
};
