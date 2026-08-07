import { describe, expect, it } from 'vitest';
import type { ChartConfig } from './chartConfig';
import { chartConfigToGetChartOptions } from './chartConfig';

const solarBirthData: ChartConfig = {
  solarDate: '2000-08-16',
  calendarType: 'solar',
  isLeapMonth: false,
  hour: 6,
  gender: 'male',
  algorithm: 'zhongzhou',
  yearDivide: 'normal',
  dayDivide: 'forward',
  astroType: 'heaven',
};

describe('chartConfigToGetChartOptions', () => {
  it('converts solar birth data into locale-specific engine options', () => {
    const options = chartConfigToGetChartOptions(solarBirthData, 'zh-CN');

    expect(options).toEqual({
      date: '2000-08-16',
      timeIndex: 6,
      gender: 'male',
      isLunar: false,
      isLeapMonth: false,
      language: 'zh-CN',
      config: {
        algorithm: 'zhongzhou',
        yearDivide: 'normal',
        dayDivide: 'forward',
      },
      astroType: 'heaven',
    });
  });

  it('selects lunar data and passes true-solar-time inputs to the engine', () => {
    const birthData: ChartConfig = {
      ...solarBirthData,
      lunarDate: '2000-07-17',
      calendarType: 'lunar',
      isLeapMonth: true,
      hour: '12:55',
      gender: 'female',
      yearDivide: 'exact',
      dayDivide: 'current',
      astroType: 'human',
      longitude: 121.56,
    };

    const options = chartConfigToGetChartOptions(birthData, 'zh-TW');

    expect(options).toEqual({
      date: '2000-07-17',
      timeIndex: '12:55',
      gender: 'female',
      isLunar: true,
      isLeapMonth: true,
      language: 'zh-TW',
      config: {
        algorithm: 'zhongzhou',
        yearDivide: 'exact',
        dayDivide: 'current',
      },
      astroType: 'human',
      longitude: 121.56,
    });
    expect(birthData.hour).toBe('12:55');
  });

  it('serializes only birth and deterministic chart settings, never UI or LLM settings', () => {
    const serialized = JSON.parse(JSON.stringify(solarBirthData)) as Record<string, unknown>;

    expect(serialized).toMatchObject({
      solarDate: '2000-08-16',
      hour: 6,
      gender: 'male',
      yearDivide: 'normal',
      dayDivide: 'forward',
      astroType: 'heaven',
    });
    expect(serialized).not.toHaveProperty('outputLocale');
    expect(serialized).not.toHaveProperty('language');
    expect(serialized).not.toHaveProperty('apiKey');
    expect(serialized).not.toHaveProperty('llm');
  });
});
