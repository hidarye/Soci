'use client';

import * as React from 'react';
import { getMessage } from '@/lib/i18n/dictionary';
import { DEFAULT_LOCALE, LANGUAGE_STORAGE_KEY, type Locale } from '@/lib/i18n/types';

type LanguageContextValue = {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, fallback?: string) => string;
};

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

function detectLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const rootLocale = document.documentElement.getAttribute('data-locale');
  if (rootLocale === 'en' || rootLocale === 'ar') {
    return rootLocale;
  }

  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'ar') {
      return stored;
    }
  } catch {
    // ignore storage failures
  }

  return DEFAULT_LOCALE;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(() => detectLocale());

  React.useEffect(() => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dir;
    root.setAttribute('data-locale', locale);
    if (locale === 'ar') {
      document.body.style.fontFamily =
        'var(--font-arabic), var(--font-display), system-ui, sans-serif';
    } else {
      document.body.style.removeProperty('font-family');
    }
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    } catch {
      // ignore storage failures
    }
  }, [locale]);

  const setLocale = React.useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  const toggleLocale = React.useCallback(() => {
    setLocaleState((current) => (current === 'en' ? 'ar' : 'en'));
  }, []);

  const t = React.useCallback(
    (key: string, fallback?: string) => getMessage(locale, key, fallback),
    [locale]
  );

  const value = React.useMemo<LanguageContextValue>(
    () => ({
      locale,
      dir: locale === 'ar' ? 'rtl' : 'ltr',
      setLocale,
      toggleLocale,
      t,
    }),
    [locale, setLocale, toggleLocale, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
