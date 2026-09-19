import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../hooks/useAccountingData';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Mail, 
  Clock, 
  FileText, 
  Save, 
  CheckCircle, 
  Cloud, 
  Database, 
  Lock,
  Sun,
  Moon,
  Languages,
  Printer
} from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile | null;
  isCloud: boolean;
  onUpdateBio: (bio: string) => Promise<void>;
  onOpenExportModal?: () => void;
  onNavigate?: (view: any) => void;
}

export default function ProfileView({ profile, isCloud, onUpdateBio, onOpenExportModal, onNavigate }: ProfileViewProps) {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [bioInput, setBioInput] = useState(profile?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!profile) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 text-center font-mono text-xs text-slate-400">
        {language === 'en' ? 'User profile could not be found.' : 'Profil pengguna tidak dapat ditemukan.'}
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage('');

    try {
      if (bioInput.length > 500) {
        throw new Error(language === 'en' ? "Bio cannot exceed 500 characters." : "Bio tidak boleh melebihi 500 karakter.");
      }
      await onUpdateBio(bioInput);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || (language === 'en' ? "Failed to save biography. Please try again." : "Gagal menyimpan biografi. Silakan coba lagi."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleToggleLanguage = () => {
    setLanguage(language === 'id' ? 'en' : 'id');
  };

  // Format date correctly
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const locale = language === 'en' ? 'en-US' : 'id-ID';
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="profile-container">
      {/* Upper Profile Header card */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 font-mono text-[9px] tracking-widest text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5 select-none">
          {isCloud ? (
            <>
              <Cloud className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">{language === 'en' ? 'Cloud Account' : 'Akun Cloud'}</span>
            </>
          ) : (
            <>
              <Database className="h-3 w-3 text-amber-500" />
              <span className="text-amber-600 dark:text-amber-400">{language === 'en' ? 'Offline Session' : 'Sesi Offline'}</span>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {profile.photoURL ? (
            <img 
              referrerPolicy="no-referrer" 
              src={profile.photoURL} 
              alt={profile.displayName} 
              className="w-20 h-20 rounded-full border-2 border-slate-200 dark:border-white/20 shadow-xs object-cover" 
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-white/10 flex items-center justify-center font-mono font-black text-2xl text-slate-700 dark:white shadow-xs">
              {profile.displayName.substring(0, 2).toUpperCase()}
            </div>
          )}

          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-2xl font-black font-sans tracking-tight text-slate-900 dark:text-white">{profile.displayName}</h2>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                {profile.email}
              </span>
              <span className="hidden sm:inline text-slate-200 dark:text-slate-700">|</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                {language === 'en' ? 'Registered' : 'Terdaftar'}: {formatDate(profile.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Profile Editing Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs"
          >
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                {t('profileBioTitle')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                {t('profileBioDesc')}
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase">
                  {t('profileBioLabel')} ({bioInput.length}/500)
                </label>
                <textarea
                  id="bio-textarea"
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value.substring(0, 500))}
                  placeholder={t('profilePlaceholder')}
                  rows={5}
                  className="w-full text-xs font-sans border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-slate-900 dark:focus:border-slate-400 focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 rounded-lg p-3.5 transition-all outline-hidden resize-none leading-relaxed bg-slate-50/30 dark:bg-slate-950/20 text-slate-900 dark:text-white"
                />
              </div>

              {errorMessage && (
                <div className="text-[11px] font-mono text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/50 p-3 rounded-lg">
                  ⚠️ {errorMessage}
                </div>
              )}

              {saveSuccess && (
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50 p-3 rounded-lg flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {language === 'en' ? 'Biography successfully updated and synced to cloud database!' : 'Biografi berhasil diperbarui dan disinkronkan ke cloud database!'}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 select-none">
                  <Lock className="h-3 w-3" />
                  {t('profileOnlyYou')}
                </span>

                <button
                  id="save-bio-btn"
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg transition-all text-xs font-bold cursor-pointer shadow-xs focus:outline-hidden focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white dark:text-slate-900" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{t('profileSaving')}</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>{t('profileSaveBtn')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Sidebar Info & Controls Panel */}
        <div className="space-y-6">
          {/* Quick Preferences Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs"
          >
            <h4 className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {language === 'en' ? 'Preferences & Actions' : 'Preferensi & Aksi'}
            </h4>

            <div className="space-y-2.5">
              {/* Color Scheme */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? <Moon className="h-4 w-4 text-blue-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                    {language === 'en' ? 'Color Scheme' : 'Skema Warna'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleTheme}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
                >
                  {theme === 'dark' ? t('darkMode') : t('lightMode')}
                </button>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                    {language === 'en' ? 'Language' : 'Bahasa'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleLanguage}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
                >
                  {language === 'en' ? 'English (EN)' : 'Indonesia (ID)'}
                </button>
              </div>

              {/* Print / Export PDF */}
              <button
                type="button"
                onClick={() => onOpenExportModal?.()}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-mono font-bold shadow-xs transition-all cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{language === 'en' ? 'Print / Export PDF' : 'Cetak / Ekspor PDF'}</span>
              </button>
            </div>
          </motion.div>

          {/* System Info Panel */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
          >
            <h4 className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {t('profileSysInfo')}
            </h4>

            <div className="space-y-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <div className="border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">{t('profileUID')}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 break-all select-all">{profile.uid}</span>
              </div>

              <div className="border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">{t('profileSecMethod')}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {isCloud 
                    ? (language === 'en' ? 'Firebase Authentication & Firestore Security Rules' : 'Firebase Authentication & Aturan Keamanan Firestore') 
                    : (language === 'en' ? 'Browser LocalStorage Sandbox' : 'Sandbox LocalStorage Browser')
                  }
                </span>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">{t('profileLastLogin')}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(profile.lastLoginAt)}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
