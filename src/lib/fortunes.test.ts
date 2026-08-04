import { describe, it, expect } from 'vitest';
import { getChart } from './astro';
import {
  getMutagensByStem,
  getDecadalTable,
  getHoroscopeSummary,
  STEM_MUTAGENS,
} from './fortunes';

describe('fortunes.ts - 紫微斗數運限與四化計算', () => {
  it('should return correct heavenly stem mutagens for all 10 stems', () => {
    expect(getMutagensByStem('甲')).toEqual({
      lu: '廉貞',
      quan: '破軍',
      ke: '武曲',
      ji: '太陽',
    });
    expect(getMutagensByStem('丙')).toEqual({
      lu: '天同',
      quan: '天機',
      ke: '文昌',
      ji: '廉貞',
    });
    expect(getMutagensByStem('癸')).toEqual({
      lu: '破軍',
      quan: '巨門',
      ke: '太陰',
      ji: '貪狼',
    });
    expect(getMutagensByStem('未知')).toEqual({
      lu: '-',
      quan: '-',
      ke: '-',
      ji: '-',
    });
    expect(Object.keys(STEM_MUTAGENS)).toHaveLength(10);
  });

  it('should generate a sorted 12 decadal table for 2000-8-16 2時 男 (zh-TW)', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    const decadalTable = getDecadalTable(astrolabe, 27);
    expect(decadalTable).toHaveLength(12);

    // Verify sorted by age range ascending
    for (let i = 0; i < decadalTable.length - 1; i++) {
      expect(decadalTable[i].range[0]).toBeLessThan(decadalTable[i + 1].range[0]);
    }

    // Verify first decadal (3-12 歲, 命宮 壬午)
    const firstDecadal = decadalTable[0];
    expect(firstDecadal.range).toEqual([3, 12]);
    expect(firstDecadal.palaceName).toBe('命宮');
    expect(firstDecadal.stemBranch).toBe('壬午');
    expect(firstDecadal.mutagen.lu).toBe('天梁');
    expect(firstDecadal.mutagen.ji).toBe('武曲');
    expect(firstDecadal.isCurrent).toBe(false);

    // Verify current decadal (23-32 歲, 福德宮 甲申) for age 27
    const currentDecadal = decadalTable.find((item) => item.isCurrent);
    expect(currentDecadal).toBeDefined();
    expect(currentDecadal?.range).toEqual([23, 32]);
    expect(currentDecadal?.palaceName).toBe('福德');
    expect(currentDecadal?.stemBranch).toBe('甲申');
  });

  it('should generate accurate HoroscopeSummary for 2026-08-04 (zh-TW)', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    const summary = getHoroscopeSummary(astrolabe, '2026-08-04');

    expect(summary.solarDate).toBe('2026-8-4');
    expect(summary.nominalAge).toBe(27);

    // Decadal check: 甲申大限
    expect(summary.decadal.stemBranch).toBe('甲申');
    expect(summary.decadal.name).toBe('福德');
    expect(summary.decadal.mutagen.lu).toBe('廉貞'); // 廉貞化祿
    expect(summary.decadal.mutagen.ji).toBe('太陽'); // 太陽化忌

    // Yearly check: 2026 丙午流年
    expect(summary.yearly.stemBranch).toBe('丙午');
    expect(summary.yearly.name).toBe('命宮');
    expect(summary.yearly.mutagen.lu).toBe('天同'); // 天同化祿
    expect(summary.yearly.mutagen.ji).toBe('廉貞'); // 廉貞化忌

    // Scope Stars check: palaces should have decadal and yearly stars
    expect(summary.palaceScopeStars).toBeDefined();
    expect(Object.keys(summary.palaceScopeStars)).toHaveLength(12);

    // Verify some flow stars exist (e.g. 運祿, 運羊, 流祿, 流羊, 歲前十二神...)
    const allDecadalStars = Object.values(summary.palaceScopeStars).flatMap((p) => p.decadalStars);
    const allYearlyStars = Object.values(summary.palaceScopeStars).flatMap((p) => p.yearlyStars);

    expect(allDecadalStars.some((s) => s.includes('祿') || s.includes('羊') || s.includes('馬'))).toBe(true);
    expect(allYearlyStars.some((s) => s.includes('祿') || s.includes('羊') || s.includes('馬'))).toBe(true);
  });

  it('should throw error when invalid astrolabe is provided', () => {
    expect(() => getHoroscopeSummary(null as any)).toThrow('無效的 Astrolabe 物件');
    expect(() => getHoroscopeSummary({} as any)).toThrow('無效的 Astrolabe 物件');
  });
});
