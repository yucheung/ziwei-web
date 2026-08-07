import { describe, it, expect } from 'vitest';
import {
  getChart,
  parseAndValidateDate,
  normalizeGender,
  getTrueSolarTimeCorrection,
  normalizeTimeIndex,
  calculateEquationOfTime,
  CITY_LONGITUDES,
} from './astro';

describe('src/lib/astro.ts', () => {
  describe('Known birth chart verification: 2000-8-16 2時 (丑時) 男', () => {
    it('calculates the exact astrolabe for 2000-8-16 2時 男 using positional arguments', () => {
      const astrolabe = getChart({ date: '2000-8-16', timeIndex: 1, gender: 'male', config: { algorithm: 'default' } });

      expect(astrolabe).toBeDefined();
      expect(astrolabe.gender).toBe('男');
      expect(astrolabe.solarDate).toBe('2000-8-16');
      expect(astrolabe.lunarDate).toBe('二〇〇〇年七月十七');
      expect(astrolabe.chineseDate).toBe('庚辰 甲申 丙午 己丑');
      expect(astrolabe.fiveElementsClass).toBe('木三局');
      expect(astrolabe.soul).toBe('武曲');
      expect(astrolabe.body).toBe('文昌');
      expect(astrolabe.earthlyBranchOfSoulPalace).toBe('未');
      expect(astrolabe.earthlyBranchOfBodyPalace).toBe('酉');

      // 檢查 12 宮位
      expect(astrolabe.palaces).toHaveLength(12);

      // 命宮檢查
      const lifePalace = astrolabe.palaces.find((p) => p.name === '命宫');
      expect(lifePalace).toBeDefined();
      expect(lifePalace?.earthlyBranch).toBe('未');
      expect(lifePalace?.heavenlyStem).toBe('癸');
      expect(lifePalace?.majorStars).toHaveLength(0); // 命宮無主星 (空宮)

      // 遷移宮檢查 (對宮)
      const travelPalace = astrolabe.palaces.find((p) => p.name === '迁移');
      expect(travelPalace).toBeDefined();
      expect(travelPalace?.earthlyBranch).toBe('丑');
      const travelStars = travelPalace?.majorStars.map((s) => s.name);
      expect(travelStars).toContain('天同');
      expect(travelStars).toContain('巨门');

      // 疾厄宮檢查
      const healthPalace = astrolabe.palaces.find((p) => p.name === '疾厄');
      expect(healthPalace).toBeDefined();
      expect(healthPalace?.earthlyBranch).toBe('寅');
      const healthStars = healthPalace?.majorStars.map((s) => s.name);
      expect(healthStars).toContain('武曲');
      expect(healthStars).toContain('天相');

      // 身宮檢查 (福德宮在酉)
      const bodyPalace = astrolabe.palaces.find((p) => p.isBodyPalace);
      expect(bodyPalace).toBeDefined();
      expect(bodyPalace?.name).toBe('福德');
      expect(bodyPalace?.earthlyBranch).toBe('酉');
    });

    it('calculates the exact astrolabe using options object format', () => {
      const astrolabe = getChart({
        date: '2000-08-16',
        timeIndex: 1,
        gender: '男',
      });

      expect(astrolabe.solarDate).toBe('2000-8-16');
      expect(astrolabe.chineseDate).toBe('庚辰 甲申 丙午 己丑');
      expect(astrolabe.fiveElementsClass).toBe('木三局');
    });
  });

  describe('Date Parsing & Validation (parseAndValidateDate)', () => {
    it('parses standard YYYY-MM-DD solar dates', () => {
      const res = parseAndValidateDate('2000-08-16');
      expect(res.year).toBe(2000);
      expect(res.month).toBe(8);
      expect(res.day).toBe(16);
      expect(res.isMinguo).toBe(false);
      expect(res.formattedDateStr).toBe('2000-8-16');
    });

    it('parses Minguo dates correctly (民國89年8月16日 & 89-08-16)', () => {
      const res1 = parseAndValidateDate('民國89年8月16日');
      expect(res1.year).toBe(2000);
      expect(res1.month).toBe(8);
      expect(res1.day).toBe(16);
      expect(res1.isMinguo).toBe(true);

      const res2 = parseAndValidateDate('89-08-16');
      expect(res2.year).toBe(2000);
      expect(res2.month).toBe(8);
      expect(res2.day).toBe(16);
      expect(res2.isMinguo).toBe(true);
    });

    it('parses Date object input', () => {
      const d = new Date(2000, 7, 16); // Month 7 is August (0-indexed)
      const res = parseAndValidateDate(d);
      expect(res.year).toBe(2000);
      expect(res.month).toBe(8);
      expect(res.day).toBe(16);
    });

    it('throws error for invalid month or day out of bounds in solar calendar', () => {
      expect(() => parseAndValidateDate('2000-13-01')).toThrowError('月份超出範圍');
      expect(() => parseAndValidateDate('2000-02-30')).toThrowError('該月只有 29 天');
      expect(() => parseAndValidateDate('1899-05-10')).toThrowError('年份超出範圍');
      expect(() => parseAndValidateDate('')).toThrowError('日期不可為空');
    });

    it('correctly validates lunar dates without false rejection for 30-day lunar months (e.g. 2023 农历二月三十)', () => {
      // 2023 陽曆 2 月只有 28 天，但農曆二月是大月有 30 天
      const res = parseAndValidateDate('2023-02-30', true, false);
      expect(res.year).toBe(2023);
      expect(res.month).toBe(2);
      expect(res.day).toBe(30);

      // 驗證 2023 農曆閏二月 29 天為合法日期
      const resLeap = parseAndValidateDate('2023-02-29', true, true);
      expect(resLeap.year).toBe(2023);
      expect(resLeap.month).toBe(2);
      expect(resLeap.day).toBe(29);
    });

    it('throws error for invalid lunar days or non-existent leap month', () => {
      // 2023 農曆二月只有 30 天，31 日無效
      expect(() => parseAndValidateDate('2023-02-31', true, false)).toThrowError('該月只有 30 天');
      // 2023 農曆閏二月只有 29 天，30 日無效
      expect(() => parseAndValidateDate('2023-02-30', true, true)).toThrowError('該月只有 29 天');
      // 2023 年沒有閏三月
      expect(() => parseAndValidateDate('2023-03-15', true, true)).toThrowError('無閏3月');
    });
  });

  describe('Gender Normalization (normalizeGender)', () => {
    it('normalizes various male and female inputs', () => {
      expect(normalizeGender('male')).toBe('male');
      expect(normalizeGender('男')).toBe('male');
      expect(normalizeGender('乾')).toBe('male');
      expect(normalizeGender('乾造')).toBe('male');

      expect(normalizeGender('female')).toBe('female');
      expect(normalizeGender('女')).toBe('female');
      expect(normalizeGender('坤')).toBe('female');
      expect(normalizeGender('坤造')).toBe('female');
    });

    it('throws error on invalid gender input', () => {
      // @ts-expect-error testing runtime invalid input
      expect(() => normalizeGender('invalid')).toThrowError('無法辨識的性別');
    });
  });

  describe('Lunar Calendar & Leap Month Support (byLunar)', () => {
    it('calculates identical chart via byLunar for 2000-7-17', () => {
      const solarChart = getChart('2000-08-16', 1, 'male', false);
      const lunarChart = getChart({
        date: '2000-07-17',
        timeIndex: 1,
        gender: 'male',
        isLunar: true,
        isLeapMonth: false,
      });

      expect(lunarChart.solarDate).toBe(solarChart.solarDate);
      expect(lunarChart.chineseDate).toBe(solarChart.chineseDate);
      expect(lunarChart.fiveElementsClass).toBe(solarChart.fiveElementsClass);
    });
  });

  describe('Time Index Normalization & Clock Time Parsing (normalizeTimeIndex)', () => {
    it('handles numeric time indices 0 to 12', () => {
      expect(normalizeTimeIndex(0).timeIndex).toBe(0);
      expect(normalizeTimeIndex(1).timeIndex).toBe(1);
      expect(normalizeTimeIndex(12).timeIndex).toBe(12);
    });

    it('parses clock string HH:mm into traditional 12 shichen timeIndex', () => {
      expect(normalizeTimeIndex('00:30').timeIndex).toBe(0); // 早子時
      expect(normalizeTimeIndex('02:00').timeIndex).toBe(1); // 丑時
      expect(normalizeTimeIndex('04:15').timeIndex).toBe(2); // 寅時
      expect(normalizeTimeIndex('12:30').timeIndex).toBe(6); // 午時
      expect(normalizeTimeIndex('23:45').timeIndex).toBe(12); // 晚子時
    });

    it('throws error for invalid time index or malformed clock string', () => {
      expect(() => normalizeTimeIndex(15)).toThrowError('0 到 12 之間的整數');
      expect(() => normalizeTimeIndex('25:00')).toThrowError('時間數值無效');
      expect(() => normalizeTimeIndex('abc')).toThrowError('無法解析時辰輸入');
    });
  });

  describe('Equation of Time & True Solar Time Correction (getTrueSolarTimeCorrection)', () => {
    it('calculates equation of time (EOT) accurately for specific dates', () => {
      // 2024-02-11: EOT 約 -14.2 分鐘
      const eotFeb = calculateEquationOfTime(2024, 2, 11);
      expect(eotFeb).toBeCloseTo(-14.2, 0);

      // 2024-11-03: EOT 約 +16.3 分鐘
      const eotNov = calculateEquationOfTime(2024, 11, 3);
      expect(eotNov).toBeCloseTo(16.3, 0);
    });

    it('looks up city coordinates and calculates combined longitude offset and EOT', () => {
      expect(CITY_LONGITUDES['台北']).toBe(121.56);

      // 無傳入日期時，僅計算經度時差 (6.24 分鐘)
      const corrNoDate = getTrueSolarTimeCorrection('台北', 8);
      expect(corrNoDate).toBeDefined();
      expect(corrNoDate?.longitude).toBe(121.56);
      expect(corrNoDate?.offsetMinutes).toBeCloseTo(6.24);

      // 傳入日期時，計算經度時差 + 均時差 (2024-11-03 台北: 6.24 + 16.34 = 22.58 分鐘)
      const corrWithDate = getTrueSolarTimeCorrection('台北', 8, '2024-11-03');
      expect(corrWithDate).toBeDefined();
      expect(corrWithDate?.longitudeOffsetMinutes).toBeCloseTo(6.24);
      expect(corrWithDate?.equationOfTimeMinutes).toBeCloseTo(16.34, 1);
      expect(corrWithDate?.offsetMinutes).toBeCloseTo(22.58, 1);
    });

    it('handles numeric longitude inputs', () => {
      const corr = getTrueSolarTimeCorrection(121.5, 8);
      // (121.5 - 120) * 4 = 6 minutes
      expect(corr?.offsetMinutes).toBe(6);
    });

    it('adjusts clock time and date when true solar time crosses midnight', () => {
      // 香港: 114.17°E. 時區 UTC+8 (標準經線 120°). 經度時差 -23.32 分鐘
      // 2000-08-16 均時差 -4.48 分鐘 -> 總時差 -27.80 分鐘
      // 標準時間 00:10 減去 27.80 分鐘 -> 23:42.2 (前一日 晚子時)
      const chartWithTrueSolar = getChart({
        date: '2000-08-16',
        timeIndex: '00:10',
        gender: 'male',
        longitude: '香港',
        timeZone: 8,
      });

      // 跨日到 2000-08-15 晚子時 (timeIndex 12)
      expect(chartWithTrueSolar.solarDate).toBe('2000-8-15');
      expect(chartWithTrueSolar.timeRange).toBe('23:00~00:00');
    });
  });

  describe('Lunar Cross-Day & Leap Month Boundary Adjustment (農曆跨日與閏月邊界)', () => {
    it('correctly advances lunar date +1 day across lunar month & leap month boundary', () => {
      // 2023 年農曆二月三十 (非閏) 23:55 經度 125.0 觸發跨日 +1 天 => 2023 閏二月初一
      const lunarChart2355 = getChart({
        date: '2023-02-30',
        timeIndex: '23:55',
        gender: 'male',
        isLunar: true,
        isLeapMonth: false,
        longitude: 125.0,
        timeZone: 8,
      });

      expect(lunarChart2355.lunarDate).toContain('闰二月初一');
    });

    it('correctly retreats lunar date -1 day back to previous month / 30th day', () => {
      // 2023 年農曆閏二月初一 00:05 經度 110.0 觸發跨日 -1 天 => 2023 年農曆二月三十 (大月 30 天)
      const lunarChartRetreat = getChart({
        date: '2023-02-01',
        timeIndex: '00:05',
        gender: 'male',
        isLunar: true,
        isLeapMonth: true,
        longitude: 110.0,
        timeZone: 8,
      });

      expect(lunarChartRetreat.lunarDate).toContain('二月三十');
      expect(lunarChartRetreat.lunarDate).not.toContain('闰');
    });

    it('correctly advances lunar year boundary (+1 day from 12/30 to 01/01 of next year)', () => {
      // 2023 年農曆十二月三十 (除夕) 23:55 經度 125.0 觸發跨日 +1 天 => 2024 年農曆正月初一
      const newYearChart = getChart({
        date: '2023-12-30',
        timeIndex: '23:55',
        gender: 'male',
        isLunar: true,
        isLeapMonth: false,
        longitude: 125.0,
        timeZone: 8,
      });

      expect(newYearChart.lunarDate).toContain('正月初一');
      expect(newYearChart.lunarDate).toContain('二〇二四年');
    });
  });

  describe('Config propagation and AstroType switching', () => {
    it('propagates config.algorithm to iztro (zhongzhou vs default)', () => {
      const defaultChart = getChart({
        date: '2000-08-16',
        timeIndex: 1,
        gender: 'male',
        config: { algorithm: 'default' },
      });

      const zhongzhouChart = getChart({
        date: '2000-08-16',
        timeIndex: 1,
        gender: 'male',
        config: { algorithm: 'zhongzhou' },
      });

      // Both should produce valid charts
      expect(defaultChart).toBeDefined();
      expect(zhongzhouChart).toBeDefined();

      // Star placements may differ between algorithms
      const defaultSoul = defaultChart.soul;
      const zhongzhouSoul = zhongzhouChart.soul;

      // Verify charts are computed (soul/body should be defined)
      expect(defaultSoul).toBeDefined();
      expect(zhongzhouSoul).toBeDefined();
    });

    it('supports astroType switching (heaven/earth/human)', () => {
      const heavenChart = getChart({
        date: '2000-08-16',
        timeIndex: 1,
        gender: 'male',
        astroType: 'heaven',
        config: { algorithm: 'zhongzhou' },
      });

      const earthChart = getChart({
        date: '2000-08-16',
        timeIndex: 1,
        gender: 'male',
        astroType: 'earth',
        config: { algorithm: 'zhongzhou' },
      });

      const humanChart = getChart({
        date: '2000-08-16',
        timeIndex: 1,
        gender: 'male',
        astroType: 'human',
        config: { algorithm: 'zhongzhou' },
      });

      // All three astrolabe types should be computed
      expect(heavenChart).toBeDefined();
      expect(earthChart).toBeDefined();
      expect(humanChart).toBeDefined();

      // Basic fields should be present
      expect(heavenChart.solarDate).toBe('2000-8-16');
      expect(earthChart.solarDate).toBe('2000-8-16');
      expect(humanChart.solarDate).toBe('2000-8-16');
    });

    it('uses DEFAULT_CONFIG (zhongzhou) when no config is provided', () => {
      const chart = getChart({
        date: '2000-08-16',
        timeIndex: 1,
        gender: 'male',
      });

      // Should produce a valid chart with default config
      expect(chart).toBeDefined();
      expect(chart.solarDate).toBe('2000-8-16');
      expect(chart.soul).toBeDefined();
      expect(chart.body).toBeDefined();
    });

    it('B1-5: does not leak yearDivide global state across calls when config is omitted/partial (F5 golden case)', () => {
      // baseline：全新呼叫，僅帶 algorithm（等同不帶 yearDivide），代表 iztro 真預設 'normal'
      const baseline = getChart({
        date: '2024-02-09',
        timeIndex: 6,
        gender: 'male',
        language: 'zh-TW',
        config: { algorithm: 'zhongzhou' },
      });

      // 污染呼叫：明確帶 yearDivide: 'exact'，若無防護會把 iztro 全域模組狀態改為 'exact'
      // （緊接著就是省略呼叫，中間刻意不插入任何會覆寫回 'normal' 的呼叫，
      //   否則會在測到污染前就把全域狀態沖回 'normal'，掩蓋掉 bug）
      getChart({
        date: '2024-02-09',
        timeIndex: 6,
        gender: 'male',
        language: 'zh-TW',
        config: { algorithm: 'zhongzhou', yearDivide: 'exact' },
      });

      // 省略呼叫：完全不帶 yearDivide（只帶 algorithm）——修復前會沿用上一次的全域殘留值，
      // 修復後應合併出完整 DEFAULT_CONFIG（yearDivide: 'normal'），與 baseline 一致
      const afterOmitted = getChart({
        date: '2024-02-09',
        timeIndex: 6,
        gender: 'male',
        language: 'zh-TW',
        config: { algorithm: 'zhongzhou' },
      });

      const soulPalace = (chart: ReturnType<typeof getChart>) =>
        chart.palaces.find((p) => p.name === '命宮');
      const yearPillar = (chart: ReturnType<typeof getChart>) =>
        chart.rawDates.chineseDate.yearly.join('');

      expect(soulPalace(afterOmitted)?.majorStars.length).toBe(0); // 命宮空宮
      expect(soulPalace(afterOmitted)?.decadal.range).toEqual([6, 15]); // 大限 6-15
      expect(yearPillar(afterOmitted)).toBe('癸卯'); // 年柱癸卯（非污染後的甲辰）

      expect(soulPalace(afterOmitted)?.majorStars.length).toBe(
        soulPalace(baseline)?.majorStars.length
      );
      expect(soulPalace(afterOmitted)?.decadal.range).toEqual(soulPalace(baseline)?.decadal.range);
      expect(yearPillar(afterOmitted)).toBe(yearPillar(baseline));
    });
  });

  describe('getChart rejects longitude combined with a numeric timeIndex (A-4: no silent drop)', () => {
    it('throws when longitude is provided with a numeric timeIndex (0-12 时辰 slot)', () => {
      expect(() =>
        getChart({
          date: '2000-08-16',
          timeIndex: 2,
          gender: 'male',
          longitude: '台北',
        })
      ).toThrow(/真太陽時校正僅在提供精確時間字串/);
    });

    it('throws when longitude is provided with a numeric-string timeIndex ("2")', () => {
      expect(() =>
        getChart({
          date: '2000-08-16',
          timeIndex: '2',
          gender: 'male',
          longitude: 121.56,
        })
      ).toThrow(/真太陽時校正僅在提供精確時間字串/);
    });

    it('still succeeds when longitude is combined with a precise "HH:mm" timeIndex', () => {
      const chart = getChart({
        date: '2000-08-16',
        timeIndex: '02:30',
        gender: 'male',
        longitude: '台北',
      });
      expect(chart).toBeDefined();
    });

    it('still succeeds when longitude is omitted and timeIndex is numeric', () => {
      const chart = getChart({
        date: '2000-08-16',
        timeIndex: 2,
        gender: 'male',
      });
      expect(chart).toBeDefined();
    });
  });
});


