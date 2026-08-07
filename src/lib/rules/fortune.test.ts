import { describe, expect, it } from 'vitest';
import type { AnalyzedChart, AnalyzedPalace, AnalyzedStar } from '../chartAnalyzer';
import { evaluateFortune, type FortunePeriod } from './fortune';

const PALACE_NAMES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

function makeStar(starName: string, mutagen?: string): AnalyzedStar {
  return mutagen ? { starName, mutagen } : { starName };
}

function makeChart(): AnalyzedChart {
  const palaces: AnalyzedPalace[] = PALACE_NAMES.map((name, index) => ({
    index,
    name,
    heavenlyStem: STEMS[index],
    earthlyBranch: BRANCHES[index],
    isBodyPalace: false,
    isOriginalPalace: false,
    majorStars: [],
    minorStars: [],
    adjectiveStars: [],
  }));

  return {
    schemaVersion: '1.0',
    generatedAt: '2026-08-07T00:00:00.000Z',
    outputLocale: 'zh-TW',
    birthData: { date: '', timeIndex: 6, gender: 'male' },
    palaces,
    mutagens: { entries: [] },
    patterns: { patterns: [] },
  };
}

describe('fortune period rule evaluation', () => {
  it('evaluates decadal transformations and patterns in the period context', () => {
    const chart = makeChart();
    const period: FortunePeriod = {
      type: 'decadal',
      palace: '命宮',
      ageRange: [44, 53],
      stars: ['廉貞', '紫微', '天府'],
      mutagens: ['廉貞化祿'],
      themes: ['自我定位', '資源整合'],
    };

    const result = evaluateFortune(chart, period);

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'four-transformation-lianzhen-huaLu',
        periodType: 'decadal',
        periodLabel: '大限 44-53',
        palace: '命宮',
        stars: ['廉貞', '紫微', '天府'],
        mutagens: ['廉貞化祿'],
        themes: ['自我定位', '資源整合'],
        matched: true,
      }),
      expect.objectContaining({ ruleId: 'pattern-ziwei-tianfu-same-palace' }),
    ]));
    expect(result.every((item) => item.evidence.every((evidence) => evidence.reasoning.length > 0))).toBe(true);
    expect(chart.palaces.every((palace) => palace.majorStars.length === 0)).toBe(true);
  });

  it('uses an annual earthly branch and a monthly heavenly stem to label contexts', () => {
    const annualChart = makeChart();
    annualChart.palaces[6].majorStars = [makeStar('太陽')];
    const annual: FortunePeriod = {
      type: 'annual',
      palace: '遷移',
      earthlyBranch: '午',
      year: 2026,
      stars: ['太陽'],
      mutagens: ['太陽化忌'],
      themes: ['外部環境'],
    };

    const annualResult = evaluateFortune(annualChart, annual);

    expect(annualResult).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'four-transformation-taiyang-huaJi',
        periodType: 'annual',
        periodLabel: '流年 2026',
        palace: '遷移',
      }),
    ]));

    const monthlyChart = makeChart();
    const monthly: FortunePeriod = {
      type: 'monthly',
      palace: '命宮',
      heavenlyStem: '甲',
      month: '辰',
      stars: ['廉貞'],
      mutagens: ['廉貞化祿'],
      themes: ['資源'],
    };

    expect(evaluateFortune(monthlyChart, monthly)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'four-transformation-lianzhen-huaLu',
        periodType: 'monthly',
        periodLabel: '流月 辰月',
        palace: '命宮',
      }),
    ]));
  });

  it('returns no result for an empty period and does not mutate chart stars', () => {
    const chart = makeChart();
    const before = JSON.stringify(chart);
    const period: FortunePeriod = {
      type: 'annual',
      palace: '命宮',
      year: 2026,
      stars: [],
      mutagens: [],
      themes: [],
    };

    expect(evaluateFortune(chart, period)).toEqual([]);
    expect(JSON.stringify(chart)).toBe(before);
  });

  it('maps iztro-style annual mutagen star arrays to the four transformations', () => {
    const chart = makeChart();
    const period: FortunePeriod = {
      type: 'annual',
      palace: '遷移',
      earthlyBranch: '午',
      year: 2024,
      stars: ['廉貞', '破軍', '武曲', '太陽'],
      mutagens: ['廉貞', '破軍', '武曲', '太陽'],
      themes: ['年度觸發'],
    };

    expect(evaluateFortune(chart, period).map((item) => item.ruleId)).toEqual(expect.arrayContaining([
      'four-transformation-lianzhen-huaLu',
      'four-transformation-pojun-huaQuan',
      'four-transformation-wuqu-huaKe',
      'four-transformation-taiyang-huaJi',
    ]));
  });
});
