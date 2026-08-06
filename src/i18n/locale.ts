export type Locale = 'zh-TW' | 'zh-CN';

export const LOCALES: { id: Locale; label: string; flag: string }[] = [
  { id: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { id: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
];

const STORAGE_KEY = 'ziwei-lang';

export function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh-TW' || saved === 'zh-CN') return saved;
  } catch {
    // localStorage unavailable, fall through to detection below
  }
  // 兩個語系皆為中文，繁體為預設；瀏覽器語言無法再分流出第三種結果，
  // 因此不做 navigator.language 偵測，一律落到繁體中文。
  return 'zh-TW';
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // localStorage unavailable, ignore
  }
}
