import React, { useState, useEffect, useRef } from 'react';
import { useAccountingData } from './hooks/useAccountingData';
import { getAccountingSummary } from './utils';
import DashboardView from './components/DashboardView';
import JournalView from './components/JournalView';
import LedgerView from './components/LedgerView';
import FinancialStatements from './components/FinancialStatements';
import LoginView from './components/LoginView';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import { ExportReportModal } from './components/ReportModal/ExportReportModal';
import { useLanguage } from './context/LanguageContext';
import { useTheme } from './context/ThemeContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  Layers, 
  FileSpreadsheet, 
  RefreshCw, 
  Activity,
  Menu,
  X,
  LogOut,
  LogIn,
  Cloud,
  Database,
  User as UserIcon,
  Settings,
  AlertTriangle,
  Printer,
  Sun,
  Moon,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState<'dashboard' | 'journal' | 'ledger' | 'statements' | 'profile' | 'settings'>('dashboard');
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isExportReportModalOpen, setIsExportReportModalOpen] = useState(false);

  // Global Contexts
  const { language, setLanguage, toggleLanguage, t } = useLanguage();
  const { theme, setTheme, toggleTheme, isDark } = useTheme();

  // Core Accounting Database State & Auth from Firestore Hook
  const {
    user,
    profile,
    accounts,
    entries,
    loading,
    isCloud,
    addEntry,
    deleteEntry,
    addAccount,
    deleteAccount,
    updateAccount,
    resetData,
    login,
    logout,
    updateBio,
    updateSettings,
    resetCloudAccount
  } = useAccountingData();

  // One-time sync from Firestore profile on initial user load (if saved on cloud)
  const hasSyncedProfile = useRef(false);
  useEffect(() => {
    if (profile && !hasSyncedProfile.current) {
      hasSyncedProfile.current = true;
      if (profile.theme === 'light' || profile.theme === 'dark') {
        setTheme(profile.theme as 'light' | 'dark');
      }
      if (profile.language === 'id' || profile.language === 'en') {
        setLanguage(profile.language as 'id' | 'en');
      }
    }
  }, [profile, setTheme, setLanguage]);

  // Quick toggle handlers that sync to cloud when authenticated
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    toggleTheme();
    if (isCloud) {
      updateSettings(nextTheme, language).catch(console.error);
    }
  };

  const handleToggleLanguage = () => {
    const nextLang = language === 'id' ? 'en' : 'id';
    toggleLanguage();
    if (isCloud) {
      updateSettings(theme, nextLang).catch(console.error);
    }
  };

  const handleResetCloudAccount = async () => {
    try {
      await resetCloudAccount();
      setResetSuccessMessage(language === 'en' 
        ? "Your cloud account has been successfully reset. All transaction histories, ledgers, and journals have been permanently deleted."
        : "Akun cloud Anda telah berhasil direset. Semua riwayat transaksi, buku besar, dan jurnal telah dihapus secara permanen."
      );
      setCurrentView('dashboard');
    } catch (err: any) {
      console.error("Reset account failed:", err);
      alert("Reset account failed: " + err.message);
    }
  };

  // Reset core data to defaults
  const handleResetData = () => {
    setShowResetModal(true);
  };

  const executeResetData = async (clearAllToZero: boolean) => {
    await resetData({ clearAllToZero });
    setShowResetModal(false);
    setCurrentView('dashboard');
  };

  // Redirect to Ledger from Dashboard
  const handleSelectAccountFromDashboard = (accountCode: string) => {
    setSelectedLedgerAccount(accountCode);
    setCurrentView('ledger');
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center font-mono text-xs text-slate-400">
        <Activity className="h-6 w-6 animate-pulse text-slate-900 dark:text-white mb-2" />
        {t('resetLoadingMsg')}
      </div>
    );
  }

  // Handle unauthenticated state (and not in guest mode)
  if (!user && !isGuestMode) {
    return (
      <LoginView 
        onLogin={() => {
          setResetSuccessMessage(null);
          login();
        }} 
        onContinueOffline={() => {
          setResetSuccessMessage(null);
          setIsGuestMode(true);
        }} 
        loading={loading} 
        resetSuccessMessage={resetSuccessMessage}
      />
    );
  }

  const summary = getAccountingSummary(accounts, entries);

  // Navigation Items definition
  const navItems = [
    { id: 'dashboard', name: t('menuDashboard'), icon: LayoutDashboard },
    { id: 'journal', name: t('menuJournal'), icon: BookOpen },
    { id: 'ledger', name: t('menuLedger'), icon: Layers },
    { id: 'statements', name: t('menuStatements'), icon: FileSpreadsheet },
    { id: 'profile', name: t('menuProfile'), icon: UserIcon },
    { id: 'settings', name: t('menuSettings'), icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans overflow-hidden transition-colors">
      
      {/* Sidebar - Desktop Layout */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded flex items-center justify-center text-white dark:text-slate-900 font-mono font-bold tracking-tight text-sm shadow-xs">
            VE
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-950 dark:text-white tracking-tight">
              VAST ERP
            </h1>
            <p className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
              Modern ERP Suite
            </p>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-2">
            {t('menuUtama')}
          </div>
          
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  if (item.id !== 'ledger') {
                    setSelectedLedgerAccount(undefined);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs transition-colors font-mono cursor-pointer ${
                  isActive 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs border border-slate-200 dark:border-slate-700' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </button>
            );
          })}

          {/* Core Engine Status Display */}
          <div className="pt-6">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-2">
              {t('statusSistem')}
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 rounded-md p-3 space-y-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 mx-1">
              <div className="flex justify-between items-center">
                <span>{t('statusJurnal')}</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">{entries.length} {t('statusEntri')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{t('statusPersamaan')}</span>
                <span className={`font-bold flex items-center gap-1 ${summary.isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${summary.isBalanced ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-amber-500'}`}></span>
                  {summary.isBalanced ? 'MATCH' : t('statusSelisih')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>{t('statusPenyimpanan')}</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  {isCloud ? (
                    <>
                      <Cloud className="h-3 w-3 text-emerald-500" />
                      CLOUD
                    </>
                  ) : (
                    <>
                      <Database className="h-3 w-3 text-amber-500" />
                      LOCAL
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* Sidebar Footer User Section */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3 font-mono">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentView('profile')}
              className="flex items-center gap-2.5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded-md transition-colors min-w-0"
              title={t('menuProfile')}
            >
              {profile?.photoURL ? (
                <img 
                  referrerPolicy="no-referrer" 
                  src={profile.photoURL} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                  {profile?.displayName ? profile.displayName.substring(0, 2).toUpperCase() : 'GM'}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[110px]">
                  {profile?.displayName || (language === 'en' ? 'Guest Mode' : 'Mode Tamu')}
                </div>
                <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate max-w-[110px]">
                  {isCloud ? 'Vast Cloud Pro' : (language === 'en' ? 'Offline Account' : 'Akun Offline')}
                </div>
              </div>
            </button>
            <button
              onClick={handleResetData}
              title="Reset"
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={isCloud ? logout : () => { setIsGuestMode(false); }}
            className="w-full flex items-center justify-center gap-2 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded text-[10px] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            {isCloud ? (
              <>
                <LogOut className="h-3 w-3 text-red-500" />
                <span>{t('logoutLabel')}</span>
              </>
            ) : (
              <>
                <LogIn className="h-3 w-3 text-emerald-500" />
                <span>{t('loginLabel')}</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded flex items-center justify-center font-mono font-bold text-xs">
            VE
          </div>
          <div>
            <h1 className="text-xs font-extrabold text-slate-950 dark:text-white tracking-tight">VAST ERP</h1>
            <p className="text-[8px] font-mono tracking-widest text-slate-400 uppercase">Modern ERP</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          {/* Quick Language Toggle */}
          <button
            onClick={handleToggleLanguage}
            title={language === 'id' ? 'Ganti ke English' : 'Switch to Bahasa Indonesia'}
            className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
          >
            <Languages className="h-3.5 w-3.5 text-slate-500" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Quick Theme Toggle */}
          <button
            onClick={handleToggleTheme}
            title={theme === 'dark' ? t('lightMode') : t('darkMode')}
            className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
          </button>

          {/* Print button */}
          <button
            onClick={() => setIsExportReportModalOpen(true)}
            title="Print / Export PDF"
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
          </button>

          {/* Reset button */}
          <button
            onClick={handleResetData}
            title="Reset"
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Hamburger Menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 focus:outline-hidden cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 space-y-3 z-30"
          >
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setMobileMenuOpen(false);
                      if (item.id !== 'ledger') {
                        setSelectedLedgerAccount(undefined);
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-mono cursor-pointer ${
                      isActive 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] font-mono">
              <span className="text-slate-400">{profile?.displayName || 'Guest User'}</span>
              <button
                onClick={isCloud ? logout : () => setIsGuestMode(false)}
                className="text-red-600 dark:text-red-400 font-bold cursor-pointer"
              >
                {isCloud ? t('logoutLabel') : t('loginLabel')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 h-screen overflow-hidden">
        
        {/* Desktop Header */}
        <header className="hidden md:flex h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {navItems.find(item => item.id === currentView)?.name || 'Dashboard'}
            </h2>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              {isCloud ? (
                <>
                  <Cloud className="h-3 w-3 text-emerald-500" />
                  {t('statusCloudSession')}
                </>
              ) : (
                <>
                  <Database className="h-3 w-3 text-amber-500" />
                  {t('statusOfflineSession')}
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            {/* Equation balance pill */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded text-[10px]">
              <span className="text-slate-400 dark:text-slate-400">{t('dashEquationStatus').toUpperCase()}:</span>
              <span className={`font-bold flex items-center gap-1 ${summary.isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${summary.isBalanced ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-amber-500'}`}></span>
                {summary.isBalanced ? t('dashBalanced') : t('statusSelisih')}
              </span>
            </div>

            {/* Clearly visible Print / Export PDF button */}
            <button
              onClick={() => setIsExportReportModalOpen(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-md font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Generate accounting reports and export to PDF"
              id="btn-print-export-pdf"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{t('printExportPdf') || 'Print / Export PDF'}</span>
            </button>

            <span className="text-slate-200 dark:text-slate-700">|</span>

            {/* Quick Language Switcher Button in Header */}
            <button
              type="button"
              onClick={handleToggleLanguage}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md font-mono font-bold text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title={language === 'id' ? 'Ganti ke Bahasa Inggris (Switch to English)' : 'Switch to Bahasa Indonesia'}
              id="btn-language-toggle"
            >
              <Languages className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span>{language.toUpperCase()}</span>
            </button>

            {/* Quick Dark / Light Mode Toggle Button in Header */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
              title={theme === 'dark' ? t('lightMode') : t('darkMode')}
              id="btn-theme-toggle"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </button>
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 md:p-8 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {currentView === 'dashboard' && (
                <DashboardView 
                  accounts={accounts} 
                  entries={entries} 
                  onNavigate={setCurrentView}
                  onSelectAccount={handleSelectAccountFromDashboard}
                  isDarkMode={isDark}
                />
              )}
              
              {currentView === 'journal' && (
                <JournalView 
                  accounts={accounts} 
                  entries={entries} 
                  onAddEntry={addEntry}
                  onRemoveEntry={deleteEntry}
                  onResetData={handleResetData}
                />
              )}
              
              {currentView === 'ledger' && (
                <LedgerView 
                  accounts={accounts} 
                  entries={entries} 
                  selectedAccountCode={selectedLedgerAccount}
                  onSelectAccount={setSelectedLedgerAccount}
                  onAddAccount={addAccount}
                  onDeleteAccount={deleteAccount}
                  onUpdateAccount={updateAccount}
                />
              )}
              
              {currentView === 'statements' && (
                <FinancialStatements 
                  accounts={accounts} 
                  entries={entries} 
                  onOpenExportModal={() => setIsExportReportModalOpen(true)}
                />
              )}

              {currentView === 'profile' && (
                <ProfileView 
                  profile={profile} 
                  isCloud={isCloud} 
                  onUpdateBio={updateBio} 
                />
              )}

              {currentView === 'settings' && (
                <SettingsView 
                  profile={profile} 
                  isCloud={isCloud} 
                  onUpdateSettings={updateSettings} 
                  onResetCloudAccount={handleResetCloudAccount}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Modern Compact Footer inside main content area */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3 text-center font-mono text-[10px] text-slate-400 dark:text-slate-500 print:hidden shrink-0 transition-colors">
          <div className="px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Vast ERP — Core Ledger Engine: v1.2.0</span>
            <span>© 2026 Vast ERP. High-Density Aesthetic.</span>
          </div>
        </footer>
      </main>

      {/* Modern Custom Multi-Option Reset Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs" id="reset-data-modal-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4"
              id="reset-data-modal-content"
            >
              <div className="flex gap-3 items-start text-red-600 dark:text-red-400">
                <div className="p-2.5 bg-red-50 dark:bg-red-950/20 rounded-full border border-red-200/50">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    {t('resetTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t('resetSubtitle')}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {/* Option 1: Reset to template/demo data */}
                <button
                  onClick={() => executeResetData(false)}
                  className="w-full text-left p-3.5 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 hover:bg-blue-50/10 dark:bg-slate-950 rounded-lg transition-all group cursor-pointer"
                >
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5 font-sans">
                    <Database className="h-3.5 w-3.5" />
                    {t('resetToDemoTitle')}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal font-mono">
                    {t('resetToDemoDesc')}
                  </div>
                </button>

                {/* Option 2: Reset everything to zero */}
                <button
                  onClick={() => executeResetData(true)}
                  className="w-full text-left p-3.5 border border-slate-200 dark:border-slate-800 hover:border-red-500 dark:hover:border-red-500 bg-slate-50 hover:bg-red-50/10 dark:bg-slate-950 rounded-lg transition-all group cursor-pointer"
                >
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400 flex items-center gap-1.5 font-sans">
                    <RefreshCw className="h-3.5 w-3.5 text-red-500 animate-spin" style={{ animationDuration: '3s' }} />
                    {t('resetToZeroTitle')}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal font-mono">
                    {t('resetToZeroDesc')}
                  </div>
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded text-xs font-semibold cursor-pointer font-sans"
                >
                  {t('resetCancel')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Comprehensive Accounting Report & PDF Export Studio Modal */}
      <ExportReportModal
        isOpen={isExportReportModalOpen}
        onClose={() => setIsExportReportModalOpen(false)}
        accounts={accounts}
        entries={entries}
        defaultCompanyName={profile?.displayName ? `${profile.displayName.toUpperCase()} ENTERPRISE` : 'PT VAST ERP INDONESIA'}
      />

    </div>
  );
}
