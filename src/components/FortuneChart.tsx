import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Flame, TrendingUp } from 'lucide-react';
import { useTranslation, type TranslationKey } from '../i18n';
import type { AnalyzedChart } from '../lib/chartAnalyzer';
import { canonicalPalaceName } from '../lib/rules/chartFacts';
import { getPalaceKnowledge } from '../lib/palaceKnowledge';
import type { DecadalItem, HoroscopeSummary } from '../lib/fortunes';

export interface FortuneChartProps {
  chart: AnalyzedChart;
  horoscope: HoroscopeSummary;
}

export interface FortuneTimelinePeriod {
  index: number;
  range: [number, number];
  rangeText: string;
  palace: string;
  stemBranch: string;
  stars: string[];
  mutagens: DecadalItem['mutagen'];
  themes: string[];
  isCurrent: boolean;
}

const MUTAGEN_FIELDS: Array<{
  key: keyof DecadalItem['mutagen'];
  labelKey: TranslationKey;
  className: string;
}> = [
  {
    key: 'lu',
    labelKey: 'fortune.lu',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  },
  {
    key: 'quan',
    labelKey: 'fortune.quan',
    className: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
  },
  {
    key: 'ke',
    labelKey: 'fortune.ke',
    className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
  },
  {
    key: 'ji',
    labelKey: 'fortune.ji',
    className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  },
];

function getKnowledgeThemes(chart: AnalyzedChart, palaceName: string): string[] {
  const canonicalName = canonicalPalaceName(chart, palaceName);
  const knowledge = getPalaceKnowledge(canonicalName)
    ?? getPalaceKnowledge(canonicalName.replace(/宮$/u, ''));
  return knowledge ? [...knowledge.themes] : [];
}

/** Project the authoritative HoroscopeSummary decadal table into timeline data. */
export function buildFortuneTimeline(
  chart: AnalyzedChart,
  horoscope: HoroscopeSummary,
): FortuneTimelinePeriod[] {
  return horoscope.decadalTable.map((item) => {
    const palaceName = item.palaceName
      || chart.palaces.find((palace) => palace.index === item.index)?.name
      || '';

    return {
      index: item.index,
      range: [item.range[0], item.range[1]],
      rangeText: item.rangeText,
      palace: palaceName,
      stemBranch: item.stemBranch,
      stars: [...item.majorStars],
      mutagens: { ...item.mutagen },
      themes: getKnowledgeThemes(chart, palaceName),
      isCurrent: item.isCurrent,
    };
  });
}

function PeriodMutagens({ mutagens }: { mutagens: DecadalItem['mutagen'] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1.5" aria-label={t('fortune.decadalMutagenCol')}>
      {MUTAGEN_FIELDS.map(({ key, labelKey, className }) => (
        <span key={key} className={`rounded-md border px-2 py-1 text-[11px] ${className}`}>
          {t(labelKey)}：{mutagens[key] || '-'}
        </span>
      ))}
    </div>
  );
}

function PeriodThemes({ themes }: { themes: string[] }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t('fortune.theme')}
      </h4>
      {themes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {themes.map((theme) => (
            <span
              key={theme}
              className="rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-800 dark:text-amber-200"
            >
              {theme}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('fortune.noThemes')}</p>
      )}
    </div>
  );
}

function PeriodCard({
  period,
  selected,
  onSelect,
}: {
  period: FortuneTimelinePeriod;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const starText = period.stars.length > 0 ? period.stars.join('、') : t('fortune.noStars');

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${period.rangeText} ${period.palace}${t('fortune.gong')}`}
      onClick={onSelect}
      className={`group relative min-w-[15rem] flex-1 rounded-2xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
        selected
          ? 'border-amber-500/70 bg-amber-500/10 shadow-lg shadow-amber-500/10'
          : 'border-slate-200 bg-white/70 hover:border-amber-400/60 hover:bg-amber-500/5 dark:border-slate-800 dark:bg-slate-900/60'
      }`}
    >
      <span
        className={`absolute bottom-0 left-5 top-0 w-px transition-colors ${
          selected ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
        }`}
        aria-hidden="true"
      />
      <span className="relative block space-y-3 pl-4">
        <span className="flex items-start justify-between gap-3">
          <span>
            <span className="block font-mono text-xs text-slate-500 dark:text-slate-400">{period.rangeText}</span>
            <span className="mt-1 block text-sm font-bold text-slate-900 dark:text-slate-100">
              {period.palace}{t('fortune.gong')}
            </span>
          </span>
          {period.isCurrent && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-[10px] font-bold text-slate-950">
              <Flame className="h-3 w-3" aria-hidden="true" />
              {t('fortune.currentDecadal')}
            </span>
          )}
        </span>
        <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          {t('fortune.mainStars')}：{starText}
        </span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">
          {t('fortune.stemBranch')}：{period.stemBranch}
        </span>
        <span className="block text-left">
          <span className="mb-1.5 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {t('fortune.decadalMutagenCol')}
          </span>
          <PeriodMutagens mutagens={period.mutagens} />
        </span>
        <span className="block text-left">
          <PeriodThemes themes={period.themes} />
        </span>
        <span className="flex items-center justify-end gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
          {t('fortune.selectPeriod')}
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}

export function FortuneChart({ chart, horoscope }: FortuneChartProps) {
  const { t } = useTranslation();
  const periods = useMemo(() => buildFortuneTimeline(chart, horoscope), [chart, horoscope]);
  const initialSelectedIndex = periods.find((period) => period.isCurrent)?.index ?? periods[0]?.index ?? null;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(initialSelectedIndex);
  const activeSelectedIndex = periods.some((period) => period.index === selectedIndex)
    ? selectedIndex
    : initialSelectedIndex;
  const selected = periods.find((period) => period.index === activeSelectedIndex) ?? periods[0];

  if (periods.length === 0) {
    return (
      <section className="glass-panel rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {t('fortune.noDecadalPeriods')}
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-label={t('fortune.timeline')}>
      <div className="glass-panel rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-amber-600 dark:text-amber-300">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('fortune.timeline')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('fortune.timelineHint')}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {horoscope.solarDate}
          </span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {periods.map((period) => (
              <PeriodCard
                key={`${period.index}-${period.rangeText}`}
                period={period}
                selected={period.index === activeSelectedIndex}
                onSelect={() => setSelectedIndex(period.index)}
              />
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <section
          className="glass-panel rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 dark:bg-amber-950/10"
          aria-label={t('fortune.selectedDecadal')}
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-amber-500/20 pb-3">
            <div>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{selected.rangeText}</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                {selected.palace}{t('fortune.gong')}
              </h3>
            </div>
            {selected.isCurrent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                {t('fortune.currentDecadal')}
              </span>
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t('fortune.mainStars')}：{selected.stars.length > 0 ? selected.stars.join('、') : t('fortune.noStars')}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {t('fortune.stemBranch')}：{selected.stemBranch}
              </p>
              <PeriodThemes themes={selected.themes} />
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t('fortune.decadalMutagenCol')}
              </h4>
              <PeriodMutagens mutagens={selected.mutagens} />
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
