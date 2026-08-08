import { describe, expect, it } from 'vitest';
import { getChart } from '../astro';
import type { AnalyzedChart, AnalyzedPalace, AnalyzedStar } from '../chartAnalyzer';
import { analyzeChart } from '../chartAnalyzer';
import { evaluateFourTransformations, FOUR_TRANSFORMATION_RULES } from './fourTransformations';
import { evaluatePatterns } from './patterns';
import { evaluateRules, getRuleResults } from './engine';
import type { RuleResult } from './types';

const PALACE_NAMES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

function star(starName: string, mutagen?: string): AnalyzedStar {
  return mutagen ? { starName, mutagen } : { starName };
}

function palace(index: number, majorStars: AnalyzedStar[] = []): AnalyzedPalace {
  return {
    index,
    name: PALACE_NAMES[index],
    heavenlyStem: STEMS[index % STEMS.length],
    earthlyBranch: BRANCHES[index],
    isBodyPalace: false,
    isOriginalPalace: false,
    majorStars,
    minorStars: [],
    adjectiveStars: [],
  };
}

function makeChart(overrides: Partial<AnalyzedChart> = {}): AnalyzedChart {
  const palaces = Array.from({ length: 12 }, (_, index) => palace(index));
  palaces[0].majorStars = [star('廉貞', '祿')];
  palaces[4].majorStars = [star('破軍', '權')];
  palaces[8].majorStars = [star('武曲', '科')];
  palaces[7].majorStars = [star('太陽', '忌')];

  return {
    schemaVersion: '1.0',
    generatedAt: '2026-08-07T00:00:00.000Z',
    outputLocale: 'zh-TW',
    birthData: { date: '2024-05-15', timeIndex: 6, gender: 'male' },
    palaces,
    mutagens: {
      entries: [
        { palaceIndex: 0, palaceName: '命宮', starName: '廉貞', mutagen: '祿' },
        { palaceIndex: 4, palaceName: '財帛', starName: '破軍', mutagen: '權' },
        { palaceIndex: 8, palaceName: '官祿', starName: '武曲', mutagen: '科' },
        { palaceIndex: 7, palaceName: '僕役', starName: '太陽', mutagen: '忌' },
      ],
    },
    patterns: { patterns: [] },
    ...overrides,
  };
}

describe('B5a rule evaluators', () => {
  it('defines 56 four-transformation rules and returns only matched rules', () => {
    const result = evaluateFourTransformations(makeChart());

    expect(FOUR_TRANSFORMATION_RULES).toHaveLength(56);
    expect(result.map((rule) => rule.ruleId)).toEqual([
      'four-transformation-lianzhen-huaLu',
      'four-transformation-pojun-huaQuan',
      'four-transformation-wuqu-huaKe',
      'four-transformation-taiyang-huaJi',
    ]);
    expect(result.every((rule) => rule.matched)).toBe(true);
    expect(result.flatMap((rule) => rule.evidence)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ knowledgeId: 'star-lianzhen', field: 'palaces[0].majorStars[0]' }),
        expect.objectContaining({ knowledgeId: 'palace-ming', field: 'palaces[0].name' }),
        expect.objectContaining({ knowledgeId: 'star-lianzhen', field: 'mutagens.entries[0]' }),
      ])
    );
    expect(result.every((rule) => rule.evidence.every((item) => item.reasoning.length > 0))).toBe(true);
  });

  it('does not return a four-transformation rule when its star is absent', () => {
    const chart = makeChart({ palaces: Array.from({ length: 12 }, (_, index) => palace(index)) });
    const result = evaluateFourTransformations(chart);

    expect(result).toEqual([]);
  });

  it('detects representative sanhe patterns and omits absent patterns', () => {
    const chart = makeChart();
    chart.palaces[0].majorStars = [star('紫微'), star('天府'), star('天同')];
    chart.palaces[4].majorStars = [star('七殺'), star('天機')];
    chart.palaces[8].majorStars = [star('破軍'), star('天梁')];
    chart.palaces[6].majorStars = [star('貪狼'), star('太陰')];

    const result = evaluatePatterns(chart);
    const names = result.map((rule) => rule.ruleName);

    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(names).toEqual(expect.arrayContaining(['紫府同宮格', '殺破狼格', '機月同梁格', '紫微在子格']));
    expect(names).not.toContain('陽梁昌祿格');
    expect(result.every((rule) => rule.matched)).toBe(true);
    expect(result.flatMap((rule) => rule.evidence)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ knowledgeId: 'star-ziwei' }),
        expect.objectContaining({ knowledgeId: 'palace-ming' }),
      ])
    );
  });

  it('combines matched rules, removes duplicate ids, and sorts by confidence', () => {
    const result = evaluateRules(makeChart());
    const aliasResult = getRuleResults(makeChart());
    const ids = result.map((rule) => rule.ruleId);

    expect(result).toEqual(aliasResult);
    expect(result.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.every((rule) => rule.matched)).toBe(true);
    expect(result.every((rule, index) => index === 0 || result[index - 1].confidence >= rule.confidence)).toBe(true);
  });

  it('caps final confidence when matched evidence comes from unreviewed knowledge', () => {
    const result = evaluateRules(makeChart());
    const unreviewedRule = result.find((rule) =>
      rule.evidence.some((evidence) => evidence.knowledgeId === 'star-lianzhen' || evidence.knowledgeId === 'palace-ming')
    );
    const rulesWithStatus = result as Array<RuleResult & { sourceStatus?: string }>;

    expect(unreviewedRule).toBeDefined();
    expect(unreviewedRule?.confidence).toBeLessThanOrEqual(0.5);
    expect(rulesWithStatus
      .filter((rule) => rule.confidence > 0.5)
      .every((rule) => rule.sourceStatus === 'human_approved' || rule.sourceStatus === 'cross_supported'))
      .toBe(true);
  });

  it('uses birthData.date when source mutagen markers are unavailable', () => {
    const chart = makeChart({
      palaces: Array.from({ length: 12 }, (_, index) => palace(index)),
      mutagens: { entries: [] },
      birthData: { date: '2024-05-15', timeIndex: 6, gender: 'male' },
    });
    chart.palaces[0].majorStars = [star('廉貞')];

    expect(evaluateFourTransformations(chart).map((rule) => rule.ruleId)).toContain(
      'four-transformation-lianzhen-huaLu'
    );
  });

  it('falls back to palaces[0].heavenlyStem when date and markers are absent', () => {
    const chart = makeChart({
      palaces: Array.from({ length: 12 }, (_, index) => palace(index)),
      mutagens: { entries: [] },
      birthData: { date: '', timeIndex: 6, gender: 'male' },
    });
    chart.palaces[0].heavenlyStem = '乙';
    chart.palaces[0].majorStars = [star('天機')];

    expect(evaluateFourTransformations(chart).map((rule) => rule.ruleId)).toContain(
      'four-transformation-tianji-huaLu'
    );
  });

  it('keeps a direct source mutagen authoritative over a conflicting birth date', () => {
    const chart = makeChart({
      palaces: Array.from({ length: 12 }, (_, index) => palace(index)),
      mutagens: { entries: [] },
      birthData: { date: '2024-05-15', timeIndex: 6, gender: 'male' },
    });
    chart.palaces[0].majorStars = [star('天機', '祿')];

    expect(evaluateFourTransformations(chart).map((rule) => rule.ruleId)).toEqual([
      'four-transformation-tianji-huaLu',
    ]);
  });

  it('runs a real chart through analyzeChart and preserves the input chart', () => {
    const source = getChart({ date: '2024-05-15', timeIndex: 6, gender: 'male', language: 'zh-TW' });
    const analyzed = analyzeChart(source, 'zh-TW', { generatedAt: '2026-08-07T00:00:00.000Z' });
    const before = JSON.stringify(analyzed);
    const results = getRuleResults(analyzed);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((rule) => rule.matched)).toBe(true);
    expect(results.every((rule) => rule.evidence.length > 0)).toBe(true);
    expect(JSON.stringify(analyzed)).toBe(before);
  });
});
