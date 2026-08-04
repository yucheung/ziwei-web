import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { zhTW, type TranslationKey } from './zh-TW';
import { en } from './en';
import { Locale, LOCALES, getInitialLocale, saveLocale } from './locale';

const translations: Record<Locale, Record<string, string>> = {
  'zh-TW': zhTW,
  en,
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    saveLocale(newLocale);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string>): string => {
      let text = translations[locale]?.[key] ?? translations['zh-TW'][key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, v);
        }
      }
      return text;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

const defaultT = (key: TranslationKey, params?: Record<string, string>): string => {
  let text = translations['zh-TW']?.[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
};

const defaultContext: I18nContextValue = {
  locale: 'zh-TW',
  setLocale: () => {},
  t: defaultT,
};

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) return defaultContext;
  return ctx;
}

export { LOCALES, type Locale, type TranslationKey };
