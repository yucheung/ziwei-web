import { useState, useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  Table as TableIcon,
  Flame,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { getHoroscopeSummary, HoroscopeSummary, DecadalItem } from '../lib/fortunes';
import type { AppLocale } from '../lib/chartModel';
import { useTranslation, type TranslationKey } from '../i18n';

export type FortuneLevel = 'yearly' | 'monthly' | 'daily' | 'hourly';

const FORTUNE_LEVEL_KEYS: Record<FortuneLevel, { labelKey: TranslationKey; subKey: TranslationKey }> = {
  yearly: { labelKey: 'fortune.yearly', subKey: 'fortune.yearly.sub' },
  monthly: { labelKey: 'fortune.monthly', subKey: 'fortune.monthly.sub' },
  daily: { labelKey: 'fortune.daily', subKey: 'fortune.daily.sub' },
  hourly: { labelKey: 'fortune.hourly', subKey: 'fortune.hourly.sub' },
};

interface FortuneLevelClasses {
  dot: string;
  title: string;
  badge: string;
  starBadge: string;
}

const FORTUNE_LEVEL_CLASSES: Record<FortuneLevel, FortuneLevelClasses> = {
  yearly: {
    dot: 'bg-amber-500 dark:bg-amber-400',
    title: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30',
    starBadge: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20',
  },
  monthly: {
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    title: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30',
    starBadge: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20',
  },
  daily: {
    dot: 'bg-sky-500 dark:bg-sky-400',
    title: 'text-sky-700 dark:text-sky-300',
    badge: 'bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-500/30',
    starBadge: 'bg-sky-500/10 text-sky-800 dark:text-sky-300 border border-sky-500/20',
  },
  hourly: {
    dot: 'bg-rose-500 dark:bg-rose-400',
    title: 'text-rose-700 dark:text-rose-300',
    badge: 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30',
    starBadge: 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20',
  },
};

export interface FortunePanelProps {
  astrolabe: any | null;
  initialTargetDate?: string;
  onSelectDecadal?: (decadalItem: DecadalItem) => void;
}

export function FortunePanel({
  astrolabe,
  initialTargetDate,
  onSelectDecadal,
}: FortunePanelProps) {
  const { t, locale } = useTranslation();
  const appLocale: AppLocale = locale === 'en' ? 'en' : 'zh-TW';

  // 預設查詢日期 (預設為今天 "YYYY-MM-DD")
  const defaultDateStr = useMemo(() => {
    if (initialTargetDate) return initialTargetDate;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [initialTargetDate]);

  const [targetDate, setTargetDate] = useState<string>(defaultDateStr);
  const [selectedPalaceIndex, setSelectedPalaceIndex] = useState<number | null>(null);
  const [fortuneLevel, setFortuneLevel] = useState<FortuneLevel>('yearly');
  // 流時查詢時辰 (0=子時 ... 11=亥時)，預設 0 與原本行為 (未帶時辰參數) 一致
  const [hourlyTimeIndex, setHourlyTimeIndex] = useState<number>(0);

  // 快捷切換年份
  const currentYear = new Date().getFullYear();

  // 計算運限總覽
  const summary: HoroscopeSummary | null = useMemo(() => {
    if (!astrolabe) return null;
    try {
      return getHoroscopeSummary(astrolabe, targetDate, appLocale, hourlyTimeIndex);
    } catch (e) {
      console.error('Horoscope calculation failed:', e);
      return null;
    }
  }, [astrolabe, targetDate, appLocale, hourlyTimeIndex]);

  if (!astrolabe) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-4 text-slate-500 dark:text-slate-400 min-h-[360px]">
        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-500 dark:text-amber-400">
          <TrendingUp className="w-8 h-8 opacity-80" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{t('fortune.empty')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('fortune.emptyHint')}
          </p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
        <span className="text-xs">{t('fortune.dateError')}</span>
      </div>
    );
  }

  // 大限列表
  const decadalTable = summary.decadalTable;

  // 當前選取運限層級資料
  const levelData = summary[fortuneLevel];

  return (
    <div className="space-y-6">
      {/* 1. Date Selector & Info Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400">
              <TrendingUp className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {t('fortune.overview')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {t('fortune.query')} {summary.solarDate} ({summary.lunarDate})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-semibold font-mono">
              {t('fortune.nominalAge')} {summary.nominalAge} {t('fortune.ageUnit')}
            </span>
          </div>
        </div>

        {/* Date Input & Quick Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <Calendar className="w-4 h-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />
            <label htmlFor="target-date-input" className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {t('fortune.switchDate')}：
            </label>
            <input
              id="target-date-input"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTargetDate(`${currentYear}-01-01`)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                targetDate.startsWith(String(currentYear))
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-300 font-semibold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('fortune.thisYear')} ({currentYear})
            </button>
            <button
              type="button"
              onClick={() => setTargetDate(`${currentYear + 1}-01-01`)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                targetDate.startsWith(String(currentYear + 1))
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-300 font-semibold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('fortune.nextYear')} ({currentYear + 1})
            </button>
            <button
              type="button"
              onClick={() => setTargetDate(`${currentYear + 2}-01-01`)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                targetDate.startsWith(String(currentYear + 2))
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-300 font-semibold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('fortune.yearAfter')} ({currentYear + 2})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Decadal & Yearly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Decadal Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/50 dark:from-indigo-950/30 dark:to-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse" aria-hidden="true" />
              <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{t('fortune.decadal')}</h3>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30">
              {summary.decadal.stemBranch} {t('fortune.decadalShort')}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="space-y-0.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t('fortune.decadalOverlap')}</span>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{summary.decadal.name}{t('fortune.gong')}</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  ({t('fortune.originalPalace')} {summary.decadal.index + 1} {t('fortune.gong')})
                </span>
              </div>
            </div>
          </div>

          {/* Decadal Mutagens */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              {summary.decadal.stemBranch.charAt(0)} {t('fortune.decadalMutagen')}：
            </span>
            <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-medium">
              <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                <span className="block text-[10px] text-emerald-600 dark:text-emerald-500/80">{t('fortune.lu')}</span>
                {summary.decadal.mutagen.lu}
              </div>
              <div className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-400">
                <span className="block text-[10px] text-purple-600 dark:text-purple-500/80">{t('fortune.quan')}</span>
                {summary.decadal.mutagen.quan}
              </div>
              <div className="px-2 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-400">
                <span className="block text-[10px] text-sky-600 dark:text-sky-500/80">{t('fortune.ke')}</span>
                {summary.decadal.mutagen.ke}
              </div>
              <div className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400">
                <span className="block text-[10px] text-rose-600 dark:text-rose-500/80">{t('fortune.ji')}</span>
                {summary.decadal.mutagen.ji}
              </div>
            </div>
          </div>
        </div>

        {/* Fortune Level Card (流年/流月/流日/流時 切換) */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-amber-50/50 via-white to-slate-50/50 dark:from-amber-950/20 dark:to-slate-900/60 space-y-3">
          {/* Level Tab Buttons */}
          <div role="tablist" aria-label={t('fortune.overview')} className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            {(['yearly', 'monthly', 'daily', 'hourly'] as FortuneLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                role="tab"
                aria-selected={fortuneLevel === level}
                onClick={() => setFortuneLevel(level)}
                className={`flex-1 px-2 py-1.5 text-xs rounded-md font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  fortuneLevel === level
                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                }`}
              >
                {t(FORTUNE_LEVEL_KEYS[level].labelKey)}
              </button>
            ))}
          </div>

          {/* Hourly (流時) Time Index Selector */}
          {fortuneLevel === 'hourly' && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <label htmlFor="hourly-time-index-select" className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {t('fortune.hourlySelector')}：
              </label>
              <select
                id="hourly-time-index-select"
                value={hourlyTimeIndex}
                onChange={(e) => setHourlyTimeIndex(Number(e.target.value))}
                className="flex-1 bg-transparent text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded cursor-pointer"
              >
                {Array.from({ length: 13 }, (_, i) => i).map((idx) => (
                  <option key={idx} value={idx}>
                    {t(`fortune.hourlyBranch.${idx}` as TranslationKey)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${FORTUNE_LEVEL_CLASSES[fortuneLevel].dot}`} aria-hidden="true" />
              <h3 className={`text-sm font-bold ${FORTUNE_LEVEL_CLASSES[fortuneLevel].title}`}>
                {t('fortune.current')}{t(FORTUNE_LEVEL_KEYS[fortuneLevel].labelKey)} ({t(FORTUNE_LEVEL_KEYS[fortuneLevel].subKey)})
              </h3>
            </div>
            <span className={`text-xs font-mono px-2 py-0.5 rounded ${FORTUNE_LEVEL_CLASSES[fortuneLevel].badge}`}>
              {levelData.stemBranch} {t(FORTUNE_LEVEL_KEYS[fortuneLevel].labelKey)}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="space-y-0.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t(FORTUNE_LEVEL_KEYS[fortuneLevel].labelKey)}{t('fortune.levelOverlap')}
              </span>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{levelData.name}{t('fortune.gong')}</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  ({t('fortune.originalPalace')} {levelData.index + 1} {t('fortune.gong')})
                </span>
              </div>
            </div>
          </div>

          {/* Level Mutagens */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              {t(FORTUNE_LEVEL_KEYS[fortuneLevel].labelKey)}{t('fortune.levelMutagen')} [{levelData.stemBranch.charAt(0)}] {t('fortune.decadalMutagen')}：
            </span>
            <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-medium">
              <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                <span className="block text-[10px] text-emerald-600 dark:text-emerald-500/80">{t('fortune.lu')}</span>
                {levelData.mutagen.lu}
              </div>
              <div className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-400">
                <span className="block text-[10px] text-purple-600 dark:text-purple-500/80">{t('fortune.quan')}</span>
                {levelData.mutagen.quan}
              </div>
              <div className="px-2 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-400">
                <span className="block text-[10px] text-sky-600 dark:text-sky-500/80">{t('fortune.ke')}</span>
                {levelData.mutagen.ke}
              </div>
              <div className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400">
                <span className="block text-[10px] text-rose-600 dark:text-rose-500/80">{t('fortune.ji')}</span>
                {levelData.mutagen.ji}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Decadal Table (大限表格) */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{t('fortune.decadalTable')}</h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('fortune.greenHint')}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">{t('fortune.ageRange')}</th>
                <th className="py-2.5 px-3">{t('fortune.nativePalace')}</th>
                <th className="py-2.5 px-3">{t('fortune.stemBranch')}</th>
                <th className="py-2.5 px-3">{t('fortune.mainStars')}</th>
                <th className="py-2.5 px-3">{t('fortune.decadalMutagenCol')}</th>
                <th className="py-2.5 px-3 text-right">{t('fortune.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
              {decadalTable.map((item) => {
                const isSelected = selectedPalaceIndex === item.index;

                return (
                  <tr
                    key={item.index}
                    tabIndex={0}
                    role="button"
                    aria-selected={isSelected}
                    aria-label={`${item.rangeText} ${item.palaceName}${t('fortune.gong')} ${item.stemBranch}`}
                    onClick={() => {
                      setSelectedPalaceIndex(item.index);
                      if (onSelectDecadal) onSelectDecadal(item);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPalaceIndex(item.index);
                        if (onSelectDecadal) onSelectDecadal(item);
                      }
                    }}
                    className={`transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      item.isCurrent
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200'
                        : isSelected
                        ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-900 dark:text-indigo-200'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold font-sans">
                      {item.rangeText}
                    </td>
                    <td className="py-3 px-3 font-bold font-sans">
                      {item.palaceName}{t('fortune.gong')}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-bold">
                      {item.stemBranch}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-800 dark:text-slate-200">
                      {item.majorStars.length > 0 ? item.majorStars.join('、') : t('fortune.noStars')}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          {t('fortune.lu')}:{item.mutagen.lu}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                          {t('fortune.quan')}:{item.mutagen.quan}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                          {t('fortune.ke')}:{item.mutagen.ke}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                          {t('fortune.ji')}:{item.mutagen.ji}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      {item.isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 shadow-xs shadow-amber-500/30">
                          <Flame className="w-3 h-3" aria-hidden="true" /> {t('fortune.currentDecadal')}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Flow Stars Breakdown (十二宮流曜與歲神對照) */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {t('fortune.flowStars')} ({summary.solarDate})
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('fortune.flowStarsSub')} / {t(FORTUNE_LEVEL_KEYS[fortuneLevel].labelKey)}{t('fortune.levelFlow')} / {t('fortune.suiqian')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {astrolabe.palaces.map((palace: any, idx: number) => {
            const scopeStars = summary.palaceScopeStars[idx] || {
              decadalStars: [],
              yearlyStars: [],
              monthlyStars: [],
              dailyStars: [],
              hourlyStars: [],
            };
            const decadalPalaceName = summary.decadal.palaceNames[idx] || '';
            const levelPalaceName = levelData.palaceNames[idx] || '';
            const isDecadalLife = summary.decadal.index === idx;
            const isLevelLife = levelData.index === idx;

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                  isLevelLife
                    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40 shadow-xs shadow-amber-500/10'
                    : isDecadalLife
                    ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-500/40'
                    : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between font-bold border-b border-slate-200 dark:border-slate-800/60 pb-1.5">
                  <span className="text-slate-800 dark:text-slate-200">
                    {palace.name}{t('fortune.gong')} ({palace.heavenlyStem}
                    {palace.earthlyBranch})
                  </span>
                  <div className="flex items-center gap-1 text-[10px]">
                    {isDecadalLife && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-800 dark:text-indigo-300">
                        {t('fortune.decadalLife')}
                      </span>
                    )}
                    {isLevelLife && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        {t(FORTUNE_LEVEL_KEYS[fortuneLevel].labelKey)}{t('fortune.levelLife')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Overlap Roles */}
                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-x-2 font-mono">
                  <span>限:{decadalPalaceName}</span>
                  <span>{t(FORTUNE_LEVEL_KEYS[fortuneLevel].labelKey)}:{levelPalaceName}</span>
                </div>

                {/* Flow Stars List */}
                <div className="space-y-1 pt-1">
                  {/* Decadal Stars */}
                  {scopeStars.decadalStars.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {scopeStars.decadalStars.map((star: string, sIdx: number) => (
                        <span
                          key={sIdx}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border border-indigo-500/20"
                        >
                          {star}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Level-specific Stars */}
                  {(scopeStars as any)[`${fortuneLevel}Stars`]?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(scopeStars as any)[`${fortuneLevel}Stars`].map((star: string, sIdx: number) => (
                        <span
                          key={sIdx}
                          className={`px-1.5 py-0.5 text-[10px] rounded ${FORTUNE_LEVEL_CLASSES[fortuneLevel].starBadge}`}
                        >
                          {star}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Suiqian / Jiangqian Stars */}
                  {(scopeStars.suiqianStar || scopeStars.jiangqianStar) && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                      {scopeStars.suiqianStar && (
                        <span className="text-slate-500 dark:text-slate-400">歲:{scopeStars.suiqianStar}</span>
                      )}
                      {scopeStars.jiangqianStar && (
                        <span className="text-slate-500 dark:text-slate-400">將:{scopeStars.jiangqianStar}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
