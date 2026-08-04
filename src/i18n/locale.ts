export type Locale = 'zh-TW' | 'en';

export const LOCALES: { id: Locale; label: string; flag: string }[] = [
  { id: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
];

const STORAGE_KEY = 'ziwei-lang';

export function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh-TW' || saved === 'en') return saved;
  } catch {}
  // Browser language detection
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  if (nav.startsWith('zh')) return 'zh-TW';
  return 'en';
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {}
}
