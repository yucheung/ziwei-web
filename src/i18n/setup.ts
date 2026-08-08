import { createContext } from 'react';
import { zhTW, type TranslationKey } from './zh-TW';
import { zhCN } from './zh-CN';
import type { Locale } from './locale';

const translations: Record<Locale, Record<string, string>> = {
  'zh-TW': zhTW,
  'zh-CN': zhCN,
};

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
}

/**
 * 獨立可呼叫的翻譯函式，供非 React 模組 (例如 lib/export.ts、lib/llm.ts)
 * 在不依賴 I18nProvider context 的情況下，依指定 locale 查表翻譯。
 */
export function translate(locale: Locale, key: TranslationKey, params?: Record<string, string>): string {
  let text = translations[locale]?.[key] ?? translations['zh-TW'][key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
