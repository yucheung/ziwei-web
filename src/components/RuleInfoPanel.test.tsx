import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RuleInfoPanel } from './RuleInfoPanel';
import { I18nProvider } from '../i18n';
import { zhTW } from '../i18n/zh-TW';
import { zhCN } from '../i18n/zh-CN';
import type { Config, AstroType } from '../lib/astro';

function renderPanel(overrides: Record<string, unknown> = {}, locale: 'zh-TW' | 'zh-CN' = 'zh-TW') {
  const props = {
    astroType: 'heaven' as AstroType,
    config: { algorithm: 'zhongzhou', yearDivide: 'normal', dayDivide: 'current' } as Config,
    solarTimeActive: false,
    parsedLongitude: undefined,
    ...overrides,
  };
  return render(
    <I18nProvider defaultLocale={locale}>
      <RuleInfoPanel {...props} />
    </I18nProvider>,
  );
}

describe('RuleInfoPanel', () => {
  it('renders school, year boundary, late-zi, timezone and iztro version from actual config/state', () => {
    renderPanel({
      astroType: 'earth' as AstroType,
      config: { algorithm: 'zhongzhou', yearDivide: 'exact', dayDivide: 'forward' } as Config,
      solarTimeActive: true,
      parsedLongitude: 121.56,
    });

    expect(screen.getByText('排盤規則')).toBeInTheDocument();
    expect(screen.getByText('三合派 (sanhe-v1)')).toBeInTheDocument();
    expect(screen.getByText('地盤')).toBeInTheDocument();
    expect(screen.getByText('立春 (exact)')).toBeInTheDocument();
    expect(screen.getByText('晚子時算來日 (forward)')).toBeInTheDocument();
    expect(screen.getByText('+8 (UTC+8)')).toBeInTheDocument();
    expect(screen.getByText('啟用 / 經度 121.56')).toBeInTheDocument();
    expect(screen.getByText('2.5.8')).toBeInTheDocument();
  });

  it('shows "未啟用" when solarTimeActive is false', () => {
    renderPanel({ solarTimeActive: false, parsedLongitude: undefined });
    expect(screen.getByText('未啟用')).toBeInTheDocument();
  });

  it('renders normal/current defaults when config fields are absent', () => {
    renderPanel({ config: { algorithm: 'default' } as Config });
    expect(screen.getByText('正月初一 (normal)')).toBeInTheDocument();
    expect(screen.getByText('晚子時算當日 (current)')).toBeInTheDocument();
  });

  it('all rule info labels exist in both zh-TW and zh-CN dictionaries', () => {
    const keys = [
      'chart.rulesInfo',
      'rulesInfo.school',
      'rulesInfo.schoolValue',
      'rulesInfo.astroType',
      'rulesInfo.yearBoundary',
      'rulesInfo.lateZi',
      'rulesInfo.timezone',
      'rulesInfo.timezoneValue',
      'rulesInfo.solarTime',
      'rulesInfo.solarTimeEnabled',
      'rulesInfo.solarTimeDisabled',
      'rulesInfo.iztroVersion',
    ] as const;

    for (const key of keys) {
      expect(zhTW[key]).toBeTruthy();
      expect(zhCN[key]).toBeTruthy();
    }
  });
});
