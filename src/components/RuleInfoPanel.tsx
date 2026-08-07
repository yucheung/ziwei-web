import { Info } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { Config, AstroType } from '../lib/astro';
import { RULE_SET_VERSION } from '../lib/prompts';

export const IZTRO_VERSION = '2.5.8';

export interface RuleInfoPanelProps {
  astroType: AstroType;
  config: Config;
  solarTimeActive: boolean;
  parsedLongitude?: number;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-xs">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-slate-800 dark:text-slate-200 font-medium text-right">{value}</dd>
    </div>
  );
}

export function RuleInfoPanel({ astroType, config, solarTimeActive, parsedLongitude }: RuleInfoPanelProps) {
  const { t } = useTranslation();

  const yearBoundary = config.yearDivide ?? 'normal';
  const lateZi = config.dayDivide ?? 'current';

  const astroTypeLabel =
    astroType === 'heaven' ? t('settings.heaven') : astroType === 'earth' ? t('settings.earth') : t('settings.human');

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
      <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5" aria-hidden="true" />
        {t('chart.rulesInfo')}
      </h3>
      <dl>
        <Row
          label={t('rulesInfo.algorithm')}
          value={config.algorithm === 'zhongzhou' ? t('settings.zhongzhou') : t('settings.default')}
        />
        <Row label={t('rulesInfo.ruleSet')} value={`${t('rulesInfo.schoolValue')} (${RULE_SET_VERSION})`} />
        <Row label={t('rulesInfo.astroType')} value={astroTypeLabel} />
        <Row
          label={t('rulesInfo.yearBoundary')}
          value={yearBoundary === 'exact' ? t('settings.yearBoundary.exact') : t('settings.yearBoundary.normal')}
        />
        <Row
          label={t('rulesInfo.lateZi')}
          value={lateZi === 'forward' ? t('settings.lateZi.forward') : t('settings.lateZi.current')}
        />
        <Row label={t('rulesInfo.timezone')} value={t('rulesInfo.timezoneValue')} />
        <Row
          label={t('rulesInfo.solarTime')}
          value={
            solarTimeActive
              ? t('rulesInfo.solarTimeEnabled', { longitude: String(parsedLongitude ?? '') })
              : t('rulesInfo.solarTimeDisabled')
          }
        />
        <Row label={t('rulesInfo.iztroVersion')} value={IZTRO_VERSION} />
      </dl>
    </div>
  );
}
