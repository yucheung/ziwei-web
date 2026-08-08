import { describe, expect, it } from 'vitest';
import type { ChartConfig } from './chartConfig';
import { createChartId, createLegacyChartId } from './chartId';

const baseConfig: ChartConfig = {
  solarDate: '2000-08-16',
  lunarDate: '2000-07-17',
  calendarType: 'solar',
  isLeapMonth: false,
  hour: 6,
  gender: 'male',
  algorithm: 'zhongzhou',
  yearDivide: 'normal',
  dayDivide: 'forward',
  astroType: 'heaven',
  longitude: 121.56,
};

describe('createChartId', () => {
  it('returns a stable hash for the same complete chart config', () => {
    const first = createChartId(baseConfig);
    const second = createChartId({ ...baseConfig });

    expect(first).toBe(second);
    expect(first).toMatch(/^chart-[0-9a-f]{16}$/);
  });

  it.each([
    ['solar date', { solarDate: '2000-08-17' }],
    ['lunar date', { lunarDate: '2000-07-18' }],
    ['calendar type', { calendarType: 'lunar' as const }],
    ['hour', { hour: '12:55' }],
    ['gender', { gender: 'female' as const }],
    ['leap month', { isLeapMonth: true }],
    ['algorithm', { algorithm: 'default' as const }],
    ['year divide', { yearDivide: 'exact' as const }],
    ['day divide', { dayDivide: 'current' as const }],
    ['astro type', { astroType: 'earth' as const }],
    ['longitude', { longitude: 114.17 }],
  ])('changes when %s changes', (_field, change) => {
    expect(createChartId({ ...baseConfig, ...change })).not.toBe(createChartId(baseConfig));
  });

  it('recreates the legacy chart ID used by existing stored readings', () => {
    expect(createLegacyChartId(baseConfig)).toBe('solar-2000-08-16-6-male');
    expect(createLegacyChartId({
      ...baseConfig,
      solarDate: undefined,
      calendarType: 'lunar',
    })).toBe('lunar-2000-07-17-6-male');
  });
});
