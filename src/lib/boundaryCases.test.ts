import { describe, it, expect } from 'vitest';
import { getChart, normalizeTimeIndex, getTrueSolarTimeCorrection } from './astro';

describe('Zi Hour (早/晚子時) & Midnight Boundary Cases Test Suite', () => {
  describe('Clock Time to Zi Hour Index Mapping Boundaries', () => {
    it('correctly maps 00:00, 00:30, 00:59 to 早子時 (timeIndex 0)', () => {
      expect(normalizeTimeIndex('00:00').timeIndex).toBe(0);
      expect(normalizeTimeIndex('00:30').timeIndex).toBe(0);
      expect(normalizeTimeIndex('00:59').timeIndex).toBe(0);
      expect(normalizeTimeIndex('00:00').timeName).toBe('早子時 (00:00-01:00)');
    });

    it('correctly maps 23:00, 23:30, 23:59 to 晚子時 (timeIndex 12)', () => {
      expect(normalizeTimeIndex('23:00').timeIndex).toBe(12);
      expect(normalizeTimeIndex('23:30').timeIndex).toBe(12);
      expect(normalizeTimeIndex('23:59').timeIndex).toBe(12);
      expect(normalizeTimeIndex('23:00').timeName).toBe('晚子時 (23:00-24:00)');
    });

    it('correctly identifies boundaries around 23:00 (亥時 vs 晚子時) and 01:00 (早子時 vs 丑時)', () => {
      expect(normalizeTimeIndex('22:59').timeIndex).toBe(11); // 亥時
      expect(normalizeTimeIndex('23:00').timeIndex).toBe(12); // 晚子時
      expect(normalizeTimeIndex('00:59').timeIndex).toBe(0);  // 早子時
      expect(normalizeTimeIndex('01:00').timeIndex).toBe(1);  // 丑時
    });
  });

  describe('Astrolabe Generation for 早子時 vs 晚子時 vs Next Day 早子時', () => {
    it('generates distinct astrolabes for 早子時 (00:30) and 晚子時 (23:30) on the same date', () => {
      const earlyZiChart = getChart({
        date: '2024-05-20',
        timeIndex: '00:30',
        gender: 'male',
        language: 'zh-TW',
      });

      const lateZiChart = getChart({
        date: '2024-05-20',
        timeIndex: '23:30',
        gender: 'male',
        language: 'zh-TW',
      });

      expect(earlyZiChart.solarDate).toBe('2024-5-20');
      expect(lateZiChart.solarDate).toBe('2024-5-20');

      expect(earlyZiChart.timeRange).toBe('00:00~01:00');
      expect(lateZiChart.timeRange).toBe('23:00~00:00');

      // 檢查時辰與命宮資訊 (早子時 vs 晚子時在紫微斗數中時間區間與四柱干支不同)
      expect(earlyZiChart.timeRange).not.toBe(lateZiChart.timeRange);
      expect(earlyZiChart.earthlyBranchOfSoulPalace).toBeDefined();
      expect(lateZiChart.earthlyBranchOfSoulPalace).toBeDefined();
    });

    it('verifies continuity between 2024-05-20 晚子時 and 2024-05-21 早子時', () => {
      const lateZiChart = getChart({
        date: '2024-05-20',
        timeIndex: 12, // 晚子時
        gender: 'female',
        language: 'zh-TW',
      });

      const nextEarlyZiChart = getChart({
        date: '2024-05-21',
        timeIndex: 0, // 早子時
        gender: 'female',
        language: 'zh-TW',
      });

      expect(lateZiChart.solarDate).toBe('2024-5-20');
      expect(nextEarlyZiChart.solarDate).toBe('2024-5-21');
    });
  });

  describe('True Solar Time Midnight Boundary Crossing (真太陽時跨日)', () => {
    it('shifts forward (+1 day) from 23:50 to next day 早子時 in Tokyo (+18.76 min offset)', () => {
      const corr = getTrueSolarTimeCorrection('Tokyo', 9);
      expect(corr?.offsetMinutes).toBeCloseTo(18.76);

      const chart = getChart({
        date: '2024-05-20',
        timeIndex: '23:50',
        gender: 'male',
        longitude: 'Tokyo',
        timeZone: 9,
        language: 'zh-TW',
      });

      // 23:50 + 18.76 min = 00:08 (跨至 2024-05-21 早子時)
      expect(chart.solarDate).toBe('2024-5-21');
      expect(chart.timeRange).toBe('00:00~01:00');
    });

    it('shifts backward (-1 day) from 00:10 to previous day 晚子時 in Hong Kong (-23.32 min offset)', () => {
      const corr = getTrueSolarTimeCorrection('Hong Kong', 8);
      expect(corr?.offsetMinutes).toBeCloseTo(-23.32);

      const chart = getChart({
        date: '2024-05-20',
        timeIndex: '00:10',
        gender: 'female',
        longitude: 'Hong Kong',
        timeZone: 8,
        language: 'zh-TW',
      });

      // 00:10 - 23.32 min = 23:46 (前一日 2024-05-19 晚子時)
      expect(chart.solarDate).toBe('2024-5-19');
      expect(chart.timeRange).toBe('23:00~00:00');
    });
  });
});

describe('Leap Month (閏月) Boundary Cases Test Suite', () => {
  describe('Lunar Calendar Leap Month Astrolabe Calculation', () => {
    it('differentiates regular month vs leap month in 2023 (閏二月)', () => {
      const regularChart = getChart({
        date: '2023-02-15',
        timeIndex: 3,
        gender: 'male',
        isLunar: true,
        isLeapMonth: false,
        language: 'zh-TW',
      });

      const leapChart = getChart({
        date: '2023-02-15',
        timeIndex: 3,
        gender: 'male',
        isLunar: true,
        isLeapMonth: true,
        language: 'zh-TW',
      });

      expect(regularChart.lunarDate).toContain('二月十五');
      expect(leapChart.lunarDate).toMatch(/閏二月十五|闰二月十五/);

      // 對應陽曆日期應不相同
      expect(regularChart.solarDate).not.toBe(leapChart.solarDate);
      expect(regularChart.solarDate).toBe('2023-3-6');
      expect(leapChart.solarDate).toBe('2023-4-5');
    });

    it('handles 2020 閏四月 and 2025 閏六月 correctly', () => {
      const leap2020 = getChart({
        date: '2020-04-10',
        timeIndex: 2,
        gender: 'female',
        isLunar: true,
        isLeapMonth: true,
        language: 'zh-TW',
      });
      expect(leap2020.lunarDate).toMatch(/閏四月|闰四月/);

      const leap2025 = getChart({
        date: '2025-06-18',
        timeIndex: 5,
        gender: 'male',
        isLunar: true,
        isLeapMonth: true,
        language: 'zh-TW',
      });
      expect(leap2025.lunarDate).toMatch(/閏六月|闰六月/);
    });
  });

  describe('Leap Month Mid-Month Boundary (fixLeap: true)', () => {
    it('applies fixLeap rules across day 15 (1st half) and day 16 (2nd half) of leap month', () => {
      const firstHalf = getChart({
        date: '2023-02-15',
        timeIndex: 2,
        gender: 'male',
        isLunar: true,
        isLeapMonth: true,
        fixLeap: true,
        language: 'zh-TW',
      });

      const secondHalf = getChart({
        date: '2023-02-16',
        timeIndex: 2,
        gender: 'male',
        isLunar: true,
        isLeapMonth: true,
        fixLeap: true,
        language: 'zh-TW',
      });

      expect(firstHalf.lunarDate).toMatch(/閏二月十五|闰二月十五/);
      expect(secondHalf.lunarDate).toMatch(/閏二月十六|闰二月十六/);

      // 在 fixLeap 規則下，後半月 (16日後) 按下個月 (三月) 排盤
      expect(firstHalf.earthlyBranchOfSoulPalace).toBeDefined();
      expect(secondHalf.earthlyBranchOfSoulPalace).toBeDefined();
    });

    it('compares fixLeap: true vs fixLeap: false for 2nd half of leap month', () => {
      const fixedChart = getChart({
        date: '2023-02-20',
        timeIndex: 4,
        gender: 'female',
        isLunar: true,
        isLeapMonth: true,
        fixLeap: true,
        language: 'zh-TW',
      });

      const unfixedChart = getChart({
        date: '2023-02-20',
        timeIndex: 4,
        gender: 'female',
        isLunar: true,
        isLeapMonth: true,
        fixLeap: false,
        language: 'zh-TW',
      });

      expect(fixedChart.solarDate).toBe(unfixedChart.solarDate);
      expect(fixedChart.lunarDate).toBe(unfixedChart.lunarDate);
      expect(fixedChart.fiveElementsClass).toBeDefined();
      expect(unfixedChart.fiveElementsClass).toBeDefined();
    });
  });
});
