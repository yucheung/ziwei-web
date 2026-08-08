import { useCallback, useState, type ReactNode } from 'react';
import { getInitialLocale, saveLocale, type Locale } from './locale';
import { I18nContext, translate } from './setup';
import type { TranslationKey } from './zh-TW';

interface I18nProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

export function I18nProvider({ children, defaultLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(
    defaultLocale || getInitialLocale()
  );

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    saveLocale(newLocale);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string>): string => translate(locale, key, params),
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}
