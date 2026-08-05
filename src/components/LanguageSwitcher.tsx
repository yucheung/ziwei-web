import { useTranslation, LOCALES } from '../i18n';

export function LanguageSwitcher() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <select
      value={locale}
      aria-label={t('app.language')}
      onChange={(e) => setLocale(e.target.value as 'zh-TW' | 'en')}
      className="px-3 py-1.5 text-sm rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      {LOCALES.map((loc) => (
        <option key={loc.id} value={loc.id}>
          {loc.flag} {loc.label}
        </option>
      ))}
    </select>
  );
}
