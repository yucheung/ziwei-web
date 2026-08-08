import { useContext } from 'react';
import { I18nContext, translate, type I18nContextValue } from './setup';
import type { TranslationKey } from './zh-TW';

const defaultT = (key: TranslationKey, params?: Record<string, string>): string => translate('zh-TW', key, params);

const defaultContext: I18nContextValue = {
  locale: 'zh-TW',
  setLocale: () => {},
  t: defaultT,
};

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) return defaultContext;
  return ctx;
}
