import { describe, it, expect } from 'vitest';
import {
  analyzeMatch,
  calculateEarthlyBranchRelation,
  calculateFlyingMutagens,
  getPalaceContainingStar,
  normalizeStarName,
  normalizeStem,
} from './match';
import { getChart } from './astro';

describe('Ziwei Match Engine (src/lib/match.ts)', () => {
  it('correctly normalizes star names and heavenly stems', () => {
    expect(normalizeStarName('廉贞')).toBe('廉貞');
    expect(normalizeStarName('紫微')).toBe('紫微');
    expect(normalizeStarName('破军')).toBe('破軍');

    expect(normalizeStem('甲干')).toBe('甲');
    expect(normalizeStem('bing')).toBe('丙');
    expect(normalizeStem('庚')).toBe('庚');
  });

  it('correctly calculates Earthly Branch relationship', () => {
    expect(calculateEarthlyBranchRelation('子宮', '丑宮')).toContain('六合');
    expect(calculateEarthlyBranchRelation('申', '子')).toContain('三合');
    expect(calculateEarthlyBranchRelation('子', '午')).toContain('六沖');
    expect(calculateEarthlyBranchRelation('寅', '寅')).toContain('比和');
  });

  it('finds palace containing specific star in astrolabe', () => {
    const chart = getChart('2000-08-16', 2, 'male');
    const ziweiPalace = getPalaceContainingStar(chart, '紫微');
    expect(ziweiPalace).toBeDefined();
    if (ziweiPalace) {
      const hasZiwei = ziweiPalace.majorStars.some((s) => normalizeStarName(s.name) === '紫微');
      expect(hasZiwei).toBe(true);
    }
  });

  it('calculates cross flying mutagens between two charts', () => {
    const chartB = getChart('1998-11-12', 6, 'female');

    const result = calculateFlyingMutagens('庚', chartB, '張三', '李四', '生年天干');

    expect(result.sourcePerson).toBe('張三');
    expect(result.targetPerson).toBe('李四');
    expect(result.stem).toBe('庚');
    expect(result.details).toHaveLength(4);

    const luDetail = result.details.find((d) => d.mutagen === '祿');
    expect(luDetail).toBeDefined();
    expect(luDetail?.starName).toBe('太陽');
    expect(luDetail?.targetPalaceName).not.toBe('');
  });

  it('executes full analyzeMatch and returns complete MatchResult structure', () => {
    const result = analyzeMatch({
      personA: {
        name: '男方 (甲)',
        date: '2000-08-16',
        timeIndex: 2,
        gender: 'male',
      },
      personB: {
        name: '女方 (乙)',
        date: '2002-05-20',
        timeIndex: 6,
        gender: 'female',
      },
    });

    // Verify Person Info
    expect(result.personA.name).toBe('男方 (甲)');
    expect(result.personB.name).toBe('女方 (乙)');
    expect(result.personA.gender).toBe('male');
    expect(result.personB.gender).toBe('female');
    expect(result.personA.mingMajorStars.length).toBeGreaterThan(0);
    expect(result.personB.mingMajorStars.length).toBeGreaterThan(0);

    // Verify Compatibility
    expect(result.compatibility.overallScore).toBeGreaterThanOrEqual(50);
    expect(result.compatibility.overallScore).toBeLessThanOrEqual(100);
    expect(result.compatibility.ratingLabel).not.toBe('');

    // Verify Cross Mutagens
    expect(result.crossMutagens).toHaveLength(4);
    expect(result.crossMutagens[0].stemType).toBe('生年天干');
    expect(result.crossMutagens[2].stemType).toBe('命宮天干');

    // Verify Relationship Key Points
    expect(result.relationshipPoints.mingVsMingText).toContain('男方 (甲)');
    expect(result.relationshipPoints.strengths.length).toBeGreaterThan(0);
    expect(result.relationshipPoints.risks.length).toBeGreaterThan(0);
    expect(result.relationshipPoints.advice.length).toBeGreaterThan(0);

    // Verify Astrolabe instances attached
    expect(result.chartA).toBeDefined();
    expect(result.chartB).toBeDefined();
  });

  it('defaults to zh-TW ratingLabel and relationshipPoints prose when locale is omitted', () => {
    const result = analyzeMatch({
      personA: { name: '男方 (甲)', date: '2000-08-16', timeIndex: 2, gender: 'male' },
      personB: { name: '女方 (乙)', date: '2002-05-20', timeIndex: 6, gender: 'female' },
    });

    expect(result.compatibility.ratingLabel).toMatch(/[琴瑟鳴輔陳緣]/);
    expect(result.relationshipPoints.mingVsMingText).toContain('命宮');
    expect(result.relationshipPoints.mingVsMingText).toContain('兩位命宮地支關係為');
  });

  it('outputs zh-CN ratingLabel and relationshipPoints prose when locale is zh-CN', () => {
    const result = analyzeMatch({
      personA: { name: '男方 (甲)', date: '2000-08-16', timeIndex: 2, gender: 'male' },
      personB: { name: '女方 (乙)', date: '2002-05-20', timeIndex: 6, gender: 'female' },
      locale: 'zh-CN',
    });

    // 簡體措辭 (鸣/辅/陈/缘 為簡體字形，繁體版對應為 鳴/輔/陳/緣)
    expect(result.compatibility.ratingLabel).toMatch(/[鸣辅陈缘]/);
    expect(result.relationshipPoints.mingVsMingText).toContain('两位命宫地支关系为');
    expect(result.relationshipPoints.mingVsFuQiText).toContain('对照');
    expect(result.relationshipPoints.strengths.some((s) => s.includes('稳固'))).toBe(true);
    expect(result.relationshipPoints.risks.some((s) => s.includes('沟通'))).toBe(true);
    expect(result.relationshipPoints.advice.some((s) => s.includes('倾听'))).toBe(true);

    // match.ts 為顯示層（使用者看到的報告），zh-CN 下散文中「命宫坐」等措辭與簡體 UI 一致
    expect(result.relationshipPoints.mingVsMingText).toContain('命宫坐');
    expect(result.relationshipPoints.mingVsMingText).not.toContain('命宮坐');
  });

  it('keeps zh-TW relationshipPoints prose unaffected when locale is explicitly zh-TW', () => {
    const result = analyzeMatch({
      personA: { name: '男方 (甲)', date: '2000-08-16', timeIndex: 2, gender: 'male' },
      personB: { name: '女方 (乙)', date: '2002-05-20', timeIndex: 6, gender: 'female' },
      locale: 'zh-TW',
    });

    expect(result.relationshipPoints.mingVsMingText).toContain('兩位命宮地支關係為');
    expect(result.relationshipPoints.advice.some((s) => s.includes('傾聽'))).toBe(true);
  });
});
