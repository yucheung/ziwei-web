import { Compass, ShieldCheck, User, Users } from 'lucide-react';
import { useTranslation } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import type { Theme } from '../hooks/useTheme';

export interface HeaderProps {
  viewMode: 'single' | 'match';
  setViewMode: (mode: 'single' | 'match') => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ viewMode, setViewMode, theme, onToggleTheme }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-purple-500/20 border border-amber-500/30 text-amber-500 dark:text-amber-400">
            <Compass className="w-6 h-6 animate-pulse" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-600 via-amber-500 to-purple-600 dark:from-amber-200 dark:via-amber-400 dark:to-purple-300 bg-clip-text text-transparent">
              {t('app.title')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{t('app.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div role="tablist" aria-label={t('a11y.viewMode')} className="flex items-center p-1 bg-slate-100 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
            <button
              type="button"
              aria-selected={viewMode === 'single'}
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                viewMode === 'single'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" aria-hidden="true" />
              {t('app.single')}
            </button>
            <button
              type="button"
              aria-selected={viewMode === 'match'}
              onClick={() => setViewMode('match')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                viewMode === 'match'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              {t('app.match')}
            </button>
          </div>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <LanguageSwitcher />

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            {t('app.engine')}
          </span>
        </div>
      </div>
    </header>
  );
}
