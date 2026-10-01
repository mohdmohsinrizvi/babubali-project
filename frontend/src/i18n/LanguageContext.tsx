import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LanguageCode, LanguageDirection, LanguageInfo, TranslationSchema } from './types';
import { SUPPORTED_LANGUAGES } from './types';
import { translations } from './translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  dir: LanguageDirection;
  languages: LanguageInfo[];
  t: (path: string, paramsOrFallback?: Record<string, string | number> | string, fallback?: string) => string;
  strings: TranslationSchema;
}

const STORAGE_KEY = 'smartbuild_language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (saved && ['en', 'hi', 'ur', 'ta', 'te'].includes(saved)) {
      return saved;
    }
    return 'en';
  });

  const currentLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  const dir = currentLangInfo.dir;

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    if (dir === 'rtl') {
      document.body.classList.add('rtl-layout');
    } else {
      document.body.classList.remove('rtl-layout');
    }
  }, [language, dir]);

  const strings = translations[language] || translations.en;
  const fallbackStrings = translations.en;

  const t = (
    path: string,
    paramsOrFallback?: Record<string, string | number> | string,
    optionalFallback?: string
  ): string => {
    let params: Record<string, string | number> | undefined;
    let fallbackText: string | undefined;

    if (typeof paramsOrFallback === 'string') {
      fallbackText = paramsOrFallback;
    } else if (paramsOrFallback && typeof paramsOrFallback === 'object') {
      params = paramsOrFallback;
      fallbackText = optionalFallback;
    }

    // Try current language dictionary
    let value = getNestedValue(strings, path);

    // Fallback to English dictionary if missing in current language
    if (value === undefined || typeof value !== 'string') {
      value = getNestedValue(fallbackStrings, path);
    }

    // If still missing, use provided fallback or key path itself
    let result = typeof value === 'string' ? value : (fallbackText ?? path);

    // Interpolate parameters like {n}
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }

    return result;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        dir,
        languages: SUPPORTED_LANGUAGES,
        t,
        strings,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
