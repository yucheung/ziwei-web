import { DEFAULT_CONFIG } from './astro';
import type { AstroType, Config, GetChartOptions } from './astro';

export type CalendarType = 'solar' | 'lunar';

/**
 * Serializable birth data and deterministic chart settings.
 * Presentation locale and LLM/API configuration intentionally do not belong here.
 */
export interface ChartConfig {
  solarDate?: string;
  lunarDate?: string;
  calendarType: CalendarType;
  isLeapMonth: boolean;
  /** Shichen index for ordinary input, or HH:mm when true-solar correction is active. */
  hour: number | string;
  gender: 'male' | 'female';
  algorithm: NonNullable<Config['algorithm']>;
  yearDivide: NonNullable<Config['yearDivide']>;
  dayDivide: NonNullable<Config['dayDivide']>;
  astroType: AstroType;
  longitude?: number;
}

export function chartConfigToGetChartOptions(
  birthData: ChartConfig,
  outputLocale: 'zh-TW' | 'zh-CN',
): GetChartOptions {
  const date = birthData.calendarType === 'lunar' ? birthData.lunarDate : birthData.solarDate;

  if (!date) {
    throw new Error(`Missing ${birthData.calendarType} birth date`);
  }

  return {
    date,
    timeIndex: birthData.hour,
    gender: birthData.gender,
    isLunar: birthData.calendarType === 'lunar',
    isLeapMonth: birthData.isLeapMonth,
    language: outputLocale,
    config: {
      algorithm: birthData.algorithm ?? DEFAULT_CONFIG.algorithm,
      yearDivide: birthData.yearDivide ?? DEFAULT_CONFIG.yearDivide,
      dayDivide: birthData.dayDivide ?? DEFAULT_CONFIG.dayDivide,
    },
    astroType: birthData.astroType,
    ...(birthData.longitude !== undefined ? { longitude: birthData.longitude } : {}),
  };
}
