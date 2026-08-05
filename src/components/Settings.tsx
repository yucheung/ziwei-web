import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { Config, AstroType } from '../lib/astro';

export interface SettingsProps {
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
  astroType: AstroType;
  setAstroType: (type: AstroType) => void;
}

export function Settings({ config, setConfig, astroType, setAstroType }: SettingsProps) {
  const { t } = useTranslation();

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
      <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-3">
        <SettingsIcon className="w-3.5 h-3.5" aria-hidden="true" />
        {t('settings.title')}
      </h3>

      {/* 流派切換 */}
      <div className="mb-3">
        <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('settings.school')}</span>
        <div role="radiogroup" aria-label={t('settings.school')} className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            aria-checked={config.algorithm === 'default'}
            onClick={() => setConfig((c) => ({ ...c, algorithm: 'default' }))}
            className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              config.algorithm === 'default'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('settings.default')}
          </button>
          <button
            type="button"
            aria-checked={config.algorithm === 'zhongzhou'}
            onClick={() => setConfig((c) => ({ ...c, algorithm: 'zhongzhou' }))}
            className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              config.algorithm === 'zhongzhou'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('settings.zhongzhou')}
          </button>
        </div>
      </div>

      {/* 三盤切換 */}
      <div className="mb-3">
        <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('settings.astroType')}</span>
        <div role="radiogroup" aria-label={t('settings.astroType')} className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          {(['heaven', 'earth', 'human'] as AstroType[]).map((tType) => (
            <button
              key={tType}
              type="button"
              aria-checked={astroType === tType}
              onClick={() => setAstroType(tType)}
              className={`py-1 px-1 text-xs font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                astroType === tType
                  ? 'bg-purple-600 dark:bg-purple-500 text-white font-semibold shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tType === 'heaven' ? t('settings.heaven') : tType === 'earth' ? t('settings.earth') : t('settings.human')}
            </button>
          ))}
        </div>
      </div>

      {/* 晚子時 / 年界 */}
      <div className="mb-3">
        <label htmlFor="setting-late-zi-select" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('settings.lateZi')}</label>
        <select
          id="setting-late-zi-select"
          value={config.dayDivide ?? 'current'}
          onChange={(e) => setConfig((c) => ({ ...c, dayDivide: e.target.value as 'current' | 'forward' }))}
          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <option value="current">{t('settings.lateZi.current')}</option>
          <option value="forward">{t('settings.lateZi.forward')}</option>
        </select>
      </div>

      <div>
        <label htmlFor="setting-year-boundary-select" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('settings.yearBoundary')}</label>
        <select
          id="setting-year-boundary-select"
          value={config.yearDivide ?? 'normal'}
          onChange={(e) => setConfig((c) => ({ ...c, yearDivide: e.target.value as 'normal' | 'exact' }))}
          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <option value="normal">{t('settings.yearBoundary.normal')}</option>
          <option value="exact">{t('settings.yearBoundary.exact')}</option>
        </select>
      </div>
    </div>
  );
}
