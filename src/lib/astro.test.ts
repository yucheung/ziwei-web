import { describe, it, expect } from 'vitest';
import {
  getChart,
  parseAndValidateDate,
  normalizeGender,
  getTrueSolarTimeCorrection,
  normalizeTimeIndex,
  CITY_LONGITUDES,
} from './astro';

describe('src/lib/astro.ts', () => {
  describe('Known birth chart verification: 2000-8-16 2時 (丑時) 男', () => {
    it('calculates the exact astrolabe for 2000-8-16 2時 男 using positional arguments', () => {
      const astrolabe = getChart('2000-8-16', 1, 'male');

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

    it('throws error for invalid month or day out of bounds', () => {
      expect(() => parseAndValidateDate('2000-13-01')).toThrowError('月份超出範圍');
      expect(() => parseAndValidateDate('2000-02-30')).toThrowError('該月只有 29 天');
      expect(() => parseAndValidateDate('1899-05-10')).toThrowError('年份超出範圍');
      expect(() => parseAndValidateDate('')).toThrowError('日期不可為空');
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

  describe('True Solar Time Correction (getTrueSolarTimeCorrection)', () => {
    it('looks up city coordinates from CITY_LONGITUDES', () => {
      expect(CITY_LONGITUDES['台北']).toBe(121.56);
      const corr = getTrueSolarTimeCorrection('台北', 8);
      expect(corr).toBeDefined();
      expect(corr?.longitude).toBe(121.56);
      // (121.56 - 120) * 4 = 6.24 minutes
      expect(corr?.offsetMinutes).toBeCloseTo(6.24);
    });

    it('handles numeric longitude inputs', () => {
      const corr = getTrueSolarTimeCorrection(121.5, 8);
      // (121.5 - 120) * 4 = 6 minutes
      expect(corr?.offsetMinutes).toBe(6);
    });

    it('adjusts clock time and date when true solar time crosses midnight', () => {
      // 香港: 114.17°E. 時區 UTC+8 (標準經線 120°). 時差 = (114.17 - 120) * 4 = -23.32 分鐘
      // 如果標準時間 00:10，減去 23.32 分鐘 -> 真太陽時 23:46.68 (前一日 晚子時 timeIndex 12)
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
});
