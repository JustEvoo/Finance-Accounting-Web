import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../hooks/useAccountingData';
import { auth } from '../firebase';
import { updateEmail, updatePassword } from 'firebase/auth';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Shield, 
  Eye, 
  Globe, 
  Lock, 
  Mail, 
  Key, 
  CheckCircle, 
  AlertTriangle, 
  Cloud,
  Loader2,
  Database,
  Moon,
  Sun,
  Languages,
  Trash2
} from 'lucide-react';

interface SettingsViewProps {
  profile: UserProfile | null;
  isCloud: boolean;
  onUpdateSettings: (theme: string, language: string) => Promise<void>;
  onResetCloudAccount: () => Promise<void>;
}

export default function SettingsView({ profile, isCloud, onUpdateSettings, onResetCloudAccount }: SettingsViewProps) {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  
  // Tabs: 'appearance' | 'language' | 'security'
  const [activeTab, setActiveTab] = useState<'appearance' | 'language' | 'security'>(isCloud ? 'security' : 'appearance');
  
  // Selected theme and language tracked locally for explicit save if wanted
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>(theme);
  const [selectedLanguage, setSelectedLanguage] = useState<'id' | 'en'>(language);
  
  useEffect(() => {
    setSelectedTheme(theme);
  }, [theme]);

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);
  
  // Form input states for security
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [twoFaEnabled, setTwoFaEnabled] = useState(() => {
    return localStorage.getItem('vast_erp_2fa_mock') === 'true';
  });

  // Feedback states
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  const [isUpdatingPass, setIsUpdatingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState('');

  // Reset account states
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState('');

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setIsUpdatingEmail(true);
    setEmailSuccess(false);
    setEmailError('');

    try {
      if (auth.currentUser) {
        await updateEmail(auth.currentUser, newEmail);
        setEmailSuccess(true);
        setNewEmail('');
      } else {
        throw new Error("No user found");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setEmailError(t('reauthRequired'));
      } else {
        setEmailError(err.message || t('errorOccurred'));
      }
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass) return;
    setIsUpdatingPass(true);
    setPassSuccess(false);
    setPassError('');

    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPass);
        setPassSuccess(true);
        setNewPass('');
      } else {
        throw new Error("No user found");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setPassError(t('reauthRequired'));
      } else {
        setPassError(err.message || t('errorOccurred'));
      }
    } finally {
      setIsUpdatingPass(false);
    }
  };

  // Immediate theme change on selection
  const handleSelectTheme = (newTheme: 'light' | 'dark') => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);
    if (isCloud) {
      onUpdateSettings(newTheme, language).catch(console.error);
    }
  };

  // Immediate language change on selection
  const handleSelectLanguage = (newLang: 'id' | 'en') => {
    setSelectedLanguage(newLang);
    setLanguage(newLang);
    if (isCloud) {
      onUpdateSettings(theme, newLang).catch(console.error);
    }
  };

  const handleSavePreferences = async () => {
    setIsSavingSettings(true);
    setSettingsSuccess(false);
    setSettingsError('');

    try {
      setTheme(selectedTheme);
      setLanguage(selectedLanguage);
      
      if (isCloud) {
        await onUpdateSettings(selectedTheme, selectedLanguage);
      }

      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setSettingsError(err.message || t('errorOccurred'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleToggle2Fa = () => {
    const nextVal = !twoFaEnabled;
    setTwoFaEnabled(nextVal);
    localStorage.setItem('vast_erp_2fa_mock', nextVal ? 'true' : 'false');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="settings-view-container">
      {/* Settings Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold font-sans tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            {t('settingsTitle')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            {t('settingsDesc')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start text-[10px] font-mono bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded px-2.5 py-1 text-slate-500">
          {isCloud ? (
            <>
              <Cloud className="h-3 w-3 text-emerald-500" />
              <span>Cloud Session: {profile?.email || 'Active'}</span>
            </>
          ) : (
            <>
              <Database className="h-3 w-3 text-amber-500" />
              <span>{t('statusOfflineSession')}</span>
            </>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1">
        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer focus:outline-hidden ${
            activeTab === 'appearance'
              ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-white font-bold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          {t('appearanceTab')}
        </button>

        <button
          onClick={() => setActiveTab('language')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer focus:outline-hidden ${
            activeTab === 'language'
              ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-white font-bold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          {t('languageTab')}
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer focus:outline-hidden ${
            activeTab === 'security'
              ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-white font-bold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          {t('securityTab')}
        </button>
      </div>

      {/* Main Tab content card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-xs">
        <AnimatePresence mode="wait">
          {activeTab === 'appearance' && (
            <motion.div
              key="appearance"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                  {t('themeSelect')}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  {t('themeDesc')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Light Theme Card */}
                <button
                  type="button"
                  onClick={() => handleSelectTheme('light')}
                  className={`border rounded-lg p-4 text-left transition-all cursor-pointer flex items-center justify-between focus:outline-hidden ${
                    theme === 'light'
                      ? 'border-slate-950 bg-slate-100 text-slate-900 dark:border-white dark:bg-slate-800 dark:text-white ring-2 ring-slate-950 dark:ring-white shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                      <Sun className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {t('lightMode')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Clean off-whites & deep slate</div>
                    </div>
                  </div>
                  {theme === 'light' && <CheckCircle className="h-4 w-4 text-slate-900 dark:text-white" />}
                </button>

                {/* Dark Theme Card */}
                <button
                  type="button"
                  onClick={() => handleSelectTheme('dark')}
                  className={`border rounded-lg p-4 text-left transition-all cursor-pointer flex items-center justify-between focus:outline-hidden ${
                    theme === 'dark'
                      ? 'border-slate-950 bg-slate-100 text-slate-900 dark:border-white dark:bg-slate-800 dark:text-white ring-2 ring-slate-950 dark:ring-white shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                      <Moon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {t('darkMode')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Cosmic slate night theme</div>
                    </div>
                  </div>
                  {theme === 'dark' && <CheckCircle className="h-4 w-4 text-slate-900 dark:text-white" />}
                </button>
              </div>

              {/* Action buttons */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 flex flex-col gap-3">
                {settingsError && (
                  <div className="text-[10px] font-mono text-red-600 bg-red-50 dark:bg-red-950/20 p-2.5 rounded border border-red-200/50">
                    ⚠️ {settingsError}
                  </div>
                )}
                {settingsSuccess && (
                  <div className="text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded border border-emerald-200/50 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {t('themeSuccess')}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {theme === 'dark' ? '✓ ' + t('darkMode') : '✓ ' + t('lightMode')}
                  </span>
                  <button
                    onClick={handleSavePreferences}
                    disabled={isSavingSettings}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs focus:outline-hidden focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 disabled:opacity-50 transition-all"
                  >
                    {isSavingSettings && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{t('applyTheme')}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'language' && (
            <motion.div
              key="language"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                  {t('languageSelect')}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  {t('languageDesc')}
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  {/* Indonesian Option Card */}
                  <button
                    type="button"
                    onClick={() => handleSelectLanguage('id')}
                    className={`border rounded-lg p-4 text-left transition-all cursor-pointer flex items-center justify-between focus:outline-hidden ${
                      language === 'id'
                        ? 'border-slate-950 bg-slate-100 text-slate-900 dark:border-white dark:bg-slate-800 dark:text-white ring-2 ring-slate-950 dark:ring-white shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                        ID
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {t('indonesian')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">Bahasa Indonesia</div>
                      </div>
                    </div>
                    {language === 'id' && <CheckCircle className="h-4 w-4 text-slate-900 dark:text-white" />}
                  </button>

                  {/* English Option Card */}
                  <button
                    type="button"
                    onClick={() => handleSelectLanguage('en')}
                    className={`border rounded-lg p-4 text-left transition-all cursor-pointer flex items-center justify-between focus:outline-hidden ${
                      language === 'en'
                        ? 'border-slate-950 bg-slate-100 text-slate-900 dark:border-white dark:bg-slate-800 dark:text-white ring-2 ring-slate-950 dark:ring-white shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                        EN
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {t('english')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">English (US)</div>
                      </div>
                    </div>
                    {language === 'en' && <CheckCircle className="h-4 w-4 text-slate-900 dark:text-white" />}
                  </button>
                </div>

                <div className="max-w-md space-y-1.5 pt-2">
                  <label className="text-[10px] font-bold font-mono text-slate-400 uppercase flex items-center gap-1.5 select-none">
                    <Languages className="h-3.5 w-3.5 text-slate-400" />
                    {t('languageSelect')}
                  </label>
                  <select
                    id="language-select"
                    value={language}
                    onChange={(e) => handleSelectLanguage(e.target.value as 'id' | 'en')}
                    className="w-full text-xs font-sans border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white hover:border-slate-300 focus:border-slate-900 rounded-lg p-3 transition-all outline-hidden bg-slate-50/30"
                  >
                    <option value="id">{t('indonesian')} (Bahasa Indonesia)</option>
                    <option value="en">{t('english')} (English)</option>
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 flex flex-col gap-3">
                {settingsError && (
                  <div className="text-[10px] font-mono text-red-600 bg-red-50 dark:bg-red-950/20 p-2.5 rounded border border-red-200/50">
                    ⚠️ {settingsError}
                  </div>
                )}
                {settingsSuccess && (
                  <div className="text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded border border-emerald-200/50 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {t('langSuccess')}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {language === 'id' ? 'Bahasa Aktif: Indonesia' : 'Active Language: English'}
                  </span>
                  <button
                    onClick={handleSavePreferences}
                    disabled={isSavingSettings}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs focus:outline-hidden focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 disabled:opacity-50 transition-all"
                  >
                    {isSavingSettings && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{t('applyLanguage')}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              {!isCloud || !auth.currentUser ? (
                <div className="p-8 text-center space-y-3 font-mono text-xs text-slate-500">
                  <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{t('authRequired')}</h4>
                  <p className="max-w-md mx-auto text-[11px] text-slate-400">
                    {t('loginPrompt') || 'Fitur keamanan cloud dan manajemen akun memerlukan sesi Google Cloud yang aktif.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Update Email Form */}
                    <div className="space-y-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-6 md:pb-0 md:pr-6">
                      <div className="space-y-1">
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                          {t('updateEmail')}
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          Perbarui alamat email resmi Anda untuk korespondensi Vast ERP.
                        </p>
                      </div>

                      <form onSubmit={handleUpdateEmail} className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">
                            {t('newEmailLabel')}
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="email"
                              required
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              placeholder="email-baru@anda.com"
                              className="w-full text-xs border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white hover:border-slate-300 rounded-lg pl-9 pr-3 py-2.5 outline-hidden transition-all focus:border-slate-900 dark:focus:border-slate-300 focus:ring-1 focus:ring-slate-900"
                            />
                          </div>
                        </div>

                        {emailError && (
                          <div className="text-[10px] font-mono text-red-600 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40 p-2.5 rounded border border-red-200/50 flex gap-1.5 items-start">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                            <span>{emailError}</span>
                          </div>
                        )}

                        {emailSuccess && (
                          <div className="text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-2.5 rounded border border-emerald-200/50 flex gap-1.5 items-center">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            <span>{t('emailSuccess')}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isUpdatingEmail}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs focus:outline-hidden focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 disabled:opacity-50"
                        >
                          {isUpdatingEmail && <Loader2 className="h-3 w-3 animate-spin" />}
                          <span>{t('saveSecurity')}</span>
                        </button>
                      </form>
                    </div>

                    {/* Change Password Form */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                          {t('changePassword')}
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          Amankan sistem keuangan Anda dengan kata sandi baru yang kuat.
                        </p>
                      </div>

                      <form onSubmit={handleUpdatePassword} className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">
                            {t('newPasswordLabel')}
                          </label>
                          <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="password"
                              required
                              value={newPass}
                              onChange={(e) => setNewPass(e.target.value)}
                              placeholder="••••••••••••"
                              className="w-full text-xs border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white hover:border-slate-300 rounded-lg pl-9 pr-3 py-2.5 outline-hidden transition-all focus:border-slate-900 dark:focus:border-slate-300 focus:ring-1 focus:ring-slate-900"
                            />
                          </div>
                        </div>

                        {passError && (
                          <div className="text-[10px] font-mono text-red-600 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40 p-2.5 rounded border border-red-200/50 flex gap-1.5 items-start">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                            <span>{passError}</span>
                          </div>
                        )}

                        {passSuccess && (
                          <div className="text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-2.5 rounded border border-emerald-200/50 flex gap-1.5 items-center">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            <span>{t('passSuccess')}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isUpdatingPass}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs focus:outline-hidden focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 disabled:opacity-50"
                        >
                          {isUpdatingPass && <Loader2 className="h-3 w-3 animate-spin" />}
                          <span>{t('changePassword')}</span>
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* 2FA Mock Section */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 max-w-lg">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                          {t('twoFactor')}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono leading-relaxed">
                          {t('twoFactorDesc')}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggle2Fa}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 focus:ring-offset-2 ${
                          twoFaEnabled ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            twoFaEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {twoFaEnabled && (
                      <div className="text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/10 dark:border-emerald-900/20 p-3 rounded border border-emerald-100 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>{t('twoFactorEnabled')}</span>
                      </div>
                    )}
                  </div>

                  {/* Reset Account Section */}
                  <div className="border-t border-red-100 dark:border-red-950/30 pt-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-0.5 max-w-lg">
                        <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                          {t('resetAccountTitle')}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono leading-relaxed">
                          {t('resetAccountDesc')}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowResetConfirmModal(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded text-xs font-bold font-sans flex items-center gap-2 cursor-pointer transition-all shadow-xs shrink-0 self-start sm:self-center focus:outline-hidden focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500"
                        id="btn-reset-account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Reset Account</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs" id="reset-modal-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5"
              id="reset-modal-content"
            >
              <div className="flex gap-3 items-start text-red-600 dark:text-red-400">
                <div className="p-2.5 bg-red-50 dark:bg-red-950/20 rounded-full border border-red-200/50">
                  <AlertTriangle className="h-6 w-6 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    Reset Cloud Account?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    This action is <span className="font-bold text-red-600 dark:text-red-400">permanent and cannot be undone</span>. 
                    All transactions, ledgers, and journals associated with UID <code className="bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-400">{profile?.uid}</code> will be permanently deleted from the cloud server.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase select-none">
                  Type <span className="text-slate-900 dark:text-white font-black bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">RESET</span> to confirm:
                </label>
                <input
                  type="text"
                  value={typedConfirmation}
                  onChange={(e) => setTypedConfirmation(e.target.value)}
                  placeholder="RESET"
                  className="w-full text-xs border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white hover:border-slate-300 rounded-lg p-2.5 outline-hidden transition-all focus:border-red-500 font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => {
                    setShowResetConfirmModal(false);
                    setTypedConfirmation('');
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold cursor-pointer shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isResetting || typedConfirmation !== 'RESET'}
                  onClick={async () => {
                    setIsResetting(true);
                    try {
                      await onResetCloudAccount();
                    } catch (err) {
                      console.error("Reset error:", err);
                    } finally {
                      setIsResetting(false);
                      setShowResetConfirmModal(false);
                      setTypedConfirmation('');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs focus:outline-hidden focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Permanently Delete & Reset</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
