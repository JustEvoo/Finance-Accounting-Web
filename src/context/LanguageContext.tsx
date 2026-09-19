import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, getTranslation, LanguageCode } from '../translations';

export type TranslationKey = keyof typeof translations['id'];

interface LanguageContextProps {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey | string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'vast_erp_language';
const GUEST_LANGUAGE_KEY = 'vast_erp_guest_language';

function getInitialLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'id';
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) || localStorage.getItem(GUEST_LANGUAGE_KEY);
    if (saved === 'id' || saved === 'en') {
      return saved;
    }
  } catch (e) {
    // fallback
  }
  return 'id';
}

function applyLangToDOM(lang: LanguageCode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('lang', lang);
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const initial = getInitialLanguage();
    applyLangToDOM(initial);
    return initial;
  });

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    applyLangToDOM(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      localStorage.setItem(GUEST_LANGUAGE_KEY, lang);
    } catch (e) {
      console.warn('Could not persist language to localStorage:', e);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'id' ? 'en' : 'id');
  }, [language, setLanguage]);

  useEffect(() => {
    applyLangToDOM(language);
  }, [language]);

  // Sync across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LANGUAGE_STORAGE_KEY && (e.newValue === 'id' || e.newValue === 'en')) {
        setLanguageState(e.newValue);
        applyLangToDOM(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const t = useCallback((key: TranslationKey | string, fallback?: string): string => {
    return getTranslation(language, key, fallback);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextProps => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

