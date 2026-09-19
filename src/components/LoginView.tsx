import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Cloud, 
  LayoutDashboard, 
  BookOpen, 
  Layers, 
  FileSpreadsheet,
  Sun,
  Moon,
  Languages
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface LoginViewProps {
  onLogin: () => void;
  onContinueOffline: () => void;
  loading: boolean;
  resetSuccessMessage?: string | null;
}

export default function LoginView({ onLogin, onContinueOffline, loading, resetSuccessMessage }: LoginViewProps) {
  const { language, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 md:p-8 font-sans relative transition-colors">
      {/* Top right quick controls: Language Switcher and Dark/Light Mode toggle */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Language switcher */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-xs text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 transition-all cursor-pointer"
          title={language === 'id' ? 'Ganti ke English' : 'Switch to Bahasa Indonesia'}
        >
          <Languages className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          <span>{language.toUpperCase()}</span>
        </button>

        {/* Theme switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-xs text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 transition-all cursor-pointer"
          title={theme === 'dark' ? t('lightMode') : t('darkMode')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
        </button>
      </div>

      <div className="absolute inset-0 bg-grid-pattern bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-8 md:p-10 space-y-8 z-10"
        id="login-card"
      >
        {resetSuccessMessage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-[11px] font-mono leading-relaxed flex items-start gap-2.5 shadow-sm"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px] text-emerald-900 dark:text-emerald-200">
                {t('resetCloudAccount') || 'Reset Succeeded'}
              </p>
              <p className="mt-0.5 text-emerald-700 dark:text-emerald-300">{resetSuccessMessage}</p>
            </div>
          </motion.div>
        )}

        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <Cloud className="h-3 w-3 animate-pulse text-emerald-500" />
            <span>Firestore Cloud Sync Enabled</span>
          </div>
          
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded flex items-center justify-center font-mono font-black text-xl tracking-tighter shadow-md">
              VE
            </div>
          </div>
          
          <div>
            <h1 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight font-sans">
              VAST ERP
            </h1>
            <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase mt-1">
              Cloud-Powered Accounting Suite
            </p>
          </div>
          
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {language === 'id' 
              ? 'Sistem akuntansi modern untuk pencatatan Jurnal Umum (Jurnal Buku) dan Laporan Keuangan real-time yang tersinkronisasi di Cloud.'
              : 'Modern accounting system for General Journal entries and real-time Financial Statements synchronized in Cloud.'
            }
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-lg space-y-1">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <LayoutDashboard className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              <span className="text-[10px] font-bold font-mono uppercase">{t('menuDashboard')}</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-normal">
              {language === 'id' 
                ? 'Visualisasi kesehatan finansial, rasio kas, dan neraca interaktif.'
                : 'Interactive financial health visualization, cash ratio, and balance.'
              }
            </p>
          </div>

          <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-lg space-y-1">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <BookOpen className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              <span className="text-[10px] font-bold font-mono uppercase">{t('menuJournal')}</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-normal">
              {language === 'id'
                ? 'Pencatatan transaksi double-entry yang presisi dan balance.'
                : 'Precise balanced double-entry accounting transactions.'
              }
            </p>
          </div>

          <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-lg space-y-1">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Layers className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              <span className="text-[10px] font-bold font-mono uppercase">{t('menuLedger')}</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-normal">
              {language === 'id'
                ? 'Klasifikasi otomatis transaksi per rekening akun akuntansi.'
                : 'Automatic transaction classification per chart of accounts.'
              }
            </p>
          </div>

          <div className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-lg space-y-1">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              <span className="text-[10px] font-bold font-mono uppercase">{t('menuStatements')}</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-normal">
              {language === 'id'
                ? 'Neraca Saldo, Laba Rugi, dan Laporan Neraca siap cetak.'
                : 'Trial Balance, Profit & Loss, and Balance Sheet ready to print.'
              }
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            id="google-signin-btn"
            onClick={onLogin}
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-3 px-4 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('connecting')}
              </span>
            ) : (
              <>
                {/* Google Clean Minimal Icon */}
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{t('signInGoogle')}</span>
              </>
            )}
          </button>

          <button
            id="continue-guest-btn"
            onClick={onContinueOffline}
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-2 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:scale-[0.98] transition-all text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            <span>{t('offlineGuestDemo')}</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-2 pt-2 text-[10px] text-slate-400 font-mono text-center">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
          <span>Keamanan Data Terverifikasi oleh Firebase Auth</span>
        </div>
      </motion.div>
    </div>
  );
}
