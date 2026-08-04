import { describe, it, expect } from 'vitest';
import { calculateFourPillars, calculateFourPillarsFromTimeIndex, GAN_WUXING, ZHI_WUXING, WUXING_COLORS } from './bazi';

describe('src/lib/bazi.ts', () => {
  describe('calculateFourPillars', () => {
    it('calculates correct pillars for 2000-8-16 丑時 (hour=2)', () => {
      // 2000-8-16 02:00:00 男
      const fp = calculateFourPillars(2000, 8, 16, 2);

      // 驗證四柱 (對照 iztro chineseDate: "庚辰 甲申 丙午 己丑")
      expect(fp.year.gan).toBe('庚');
      expect(fp.year.zhi).toBe('辰');
      expect(fp.month.gan).toBe('甲');
      expect(fp.month.zhi).toBe('申');
      expect(fp.day.gan).toBe('丙');
      expect(fp.day.zhi).toBe('午');
      expect(fp.time.gan).toBe('己');
      expect(fp.time.zhi).toBe('丑');
    });

    it('returns correct five elements for each stem/branch', () => {
      const fp = calculateFourPillars(2000, 8, 16, 2);

      // 庚(金)辰(土)
      expect(fp.year.ganWuXing).toBe('金');
      expect(fp.year.zhiWuXing).toBe('土');
      // 甲(木)申(金)
      expect(fp.month.ganWuXing).toBe('木');
      expect(fp.month.zhiWuXing).toBe('金');
      // 丙(火)午(火)
      expect(fp.day.ganWuXing).toBe('火');
      expect(fp.day.zhiWuXing).toBe('火');
      // 己(土)丑(土)
      expect(fp.time.ganWuXing).toBe('土');
      expect(fp.time.zhiWuXing).toBe('土');
    });

    it('returns naYin for each pillar', () => {
      const fp = calculateFourPillars(2000, 8, 16, 2);

      expect(fp.yearNaYin).toBeTruthy();
      expect(fp.monthNaYin).toBeTruthy();
      expect(fp.dayNaYin).toBeTruthy();
      expect(fp.timeNaYin).toBeTruthy();
    });

    it('produces different pillars for different dates', () => {
      const fp1 = calculateFourPillars(2000, 8, 16, 2);
      const fp2 = calculateFourPillars(1990, 1, 1, 12);
      const fp3 = calculateFourPillars(1985, 3, 20, 8);

      // At least the year pillar must differ across all three
      const years = new Set([fp1.year.gan + fp1.year.zhi, fp2.year.gan + fp2.year.zhi, fp3.year.gan + fp3.year.zhi]);
      expect(years.size).toBe(3);
    });
  });

  describe('calculateFourPillarsFromTimeIndex', () => {
    it('converts timeIndex 1 (丑時) to hour 2', () => {
      const fp = calculateFourPillarsFromTimeIndex(2000, 8, 16, 1);
      const fpDirect = calculateFourPillars(2000, 8, 16, 2);

      expect(fp.time.gan).toBe(fpDirect.time.gan);
      expect(fp.time.zhi).toBe(fpDirect.time.zhi);
    });

    it('converts timeIndex 0 (早子時) to hour 0', () => {
      const fp = calculateFourPillarsFromTimeIndex(2000, 8, 16, 0);
      const fpDirect = calculateFourPillars(2000, 8, 16, 0);

      expect(fp.time.gan).toBe(fpDirect.time.gan);
      expect(fp.time.zhi).toBe(fpDirect.time.zhi);
    });

    it('converts timeIndex 12 (晚子時) to hour 23', () => {
      const fp = calculateFourPillarsFromTimeIndex(2000, 8, 16, 12);
      const fpDirect = calculateFourPillars(2000, 8, 16, 23);

      expect(fp.time.gan).toBe(fpDirect.time.gan);
      expect(fp.time.zhi).toBe(fpDirect.time.zhi);
    });
  });

  describe('WuXing lookup tables', () => {
    it('GAN_WUXING covers all 10 stems', () => {
      const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      for (const s of stems) {
        expect(GAN_WUXING[s]).toBeDefined();
        expect(['木', '火', '土', '金', '水']).toContain(GAN_WUXING[s]);
      }
    });

    it('ZHI_WUXING covers all 12 branches', () => {
      const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      for (const b of branches) {
        expect(ZHI_WUXING[b]).toBeDefined();
        expect(['木', '火', '土', '金', '水']).toContain(ZHI_WUXING[b]);
      }
    });

    it('WUXING_COLORS contains dark mode variants for WCAG AA contrast', () => {
      const wuxingKeys = ['木', '火', '土', '金', '水'];
      for (const key of wuxingKeys) {
        expect(WUXING_COLORS[key]).toContain('dark:text-');
      }
    });
  });
});
