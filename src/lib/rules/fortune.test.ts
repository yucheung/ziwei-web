import { describe, expect, it } from 'vitest';
import { getChart } from '../astro';
import { analyzeChart, type AnalyzedChart, type AnalyzedPalace, type AnalyzedStar } from '../chartAnalyzer';
import { getHoroscopeSummary } from '../fortunes';
import { createFortunePeriod, evaluateFortune, type FortunePeriod } from './fortune';

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

  it('adapts HoroscopeSummary scope facts without recomputing progression', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 6,
      gender: 'male',
      language: 'zh-TW',
      config: { algorithm: 'zhongzhou', yearDivide: 'normal', dayDivide: 'forward' },
    });
    const summary = getHoroscopeSummary(astrolabe, '2026-08-07', 'zh-TW', 6);

    const period = createFortunePeriod(summary, 'monthly');

    expect(period.palaceIndex).toBe(summary.monthly.index);
    expect(period.palaceNames).toBe(summary.monthly.palaceNames);
    expect(period.palace).toBe(summary.monthly.palaceNames[summary.monthly.index]);
    expect(period.heavenlyStem).toBe(summary.monthly.stemBranch.slice(0, 1));
    expect(period.earthlyBranch).toBe(summary.monthly.stemBranch.slice(1));
    expect(period.mutagens).toEqual([
      `${summary.monthly.mutagen.lu}化祿`,
      `${summary.monthly.mutagen.quan}化權`,
      `${summary.monthly.mutagen.ke}化科`,
      `${summary.monthly.mutagen.ji}化忌`,
    ]);
  });

  it('builds and evaluates a period directly from an astrolabe through getHoroscopeSummary', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 6,
      gender: 'male',
      language: 'zh-TW',
      config: { algorithm: 'zhongzhou', yearDivide: 'normal', dayDivide: 'forward' },
    });
    const analyzed = analyzeChart(astrolabe, 'zh-TW', { generatedAt: '2026-08-07T00:00:00.000Z' });
    const period = createFortunePeriod(astrolabe, 'annual', { targetDate: '2026-08-07', timeIndex: 6 });
    const summary = getHoroscopeSummary(astrolabe, '2026-08-07', 'zh-TW', 6);

    expect(period.palaceIndex).toBe(summary.yearly.index);
    expect(evaluateFortune(analyzed, period)).toEqual(expect.arrayContaining([
      expect.objectContaining({ periodType: 'annual', periodLabel: '流年 2026' }),
    ]));
  });

  it('uses the adapted monthly index even when its heavenly stem matches another natal palace', () => {
    const chart = makeChart();
    const period: FortunePeriod = {
      type: 'monthly',
      palace: '遷移',
      palaceIndex: 6,
      palaceNames: PALACE_NAMES,
      heavenlyStem: '甲',
      stars: ['廉貞'],
      mutagens: ['廉貞化祿'],
      themes: [],
    };

    const results = evaluateFortune(chart, period);

    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'four-transformation-lianzhen-huaLu',
        palace: '遷移',
      }),
    ]));
  });

  it('keeps period-star evidence in the fortune namespace and includes scope reasoning', () => {
    const chart = makeChart();
    const period: FortunePeriod = {
      type: 'decadal',
      palace: '命宮',
      palaceIndex: 0,
      palaceNames: PALACE_NAMES,
      ageRange: [44, 53],
      stars: ['廉貞', '紫微', '天府'],
      mutagens: ['廉貞化祿'],
      themes: ['資源'],
    };

    const results = evaluateFortune(chart, period);
    const evidence = results.flatMap((result) => result.evidence);
    const periodStarEvidence = evidence.filter((item) =>
      ['廉貞', '紫微', '天府'].includes(item.value) || item.value === '廉貞化祿'
    );

    expect(periodStarEvidence.length).toBeGreaterThan(0);
    expect(periodStarEvidence.every((item) =>
      item.field.startsWith('fortune.decadal.stars[')
      || item.field.startsWith('fortune.decadal.mutagens[')
    )).toBe(true);
    expect(evidence.every((item) => item.reasoning.includes('大限 44-53歲期間'))).toBe(true);
  });
});
