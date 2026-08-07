import { describe, expect, it } from 'vitest';
import type { AnalyzedChart } from '../chartAnalyzer';
import { evaluatePatterns, PATTERN_RULES } from './patterns';

function makeEmptyChart(locale: 'zh-TW' | 'zh-CN' = 'zh-TW'): AnalyzedChart {
  const names = locale === 'zh-CN'
    ? ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母']
    : ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  return {
    schemaVersion: '1.0',
    generatedAt: '2026-08-07T00:00:00.000Z',
    outputLocale: locale,
    birthData: { date: '', timeIndex: 0, gender: 'male' },
    palaces: names.map((name, index) => ({
      index,
      name,
      heavenlyStem: '甲',
      earthlyBranch: branches[index],
      isBodyPalace: false,
      isOriginalPalace: false,
      majorStars: [],
      minorStars: [],
      adjectiveStars: [],
    })),
    mutagens: { entries: [] },
    patterns: { patterns: [] },
  };
}

describe('sanhe-v1 pattern catalog', () => {
  it('contains at least 25 typed patterns with provenance metadata', () => {
    expect(PATTERN_RULES.length).toBeGreaterThanOrEqual(25);
    expect(PATTERN_RULES.every((rule) => rule.source === 'iztro-sanhe-v1')).toBe(true);
    expect(PATTERN_RULES.every((rule) => rule.school === 'sanhe')).toBe(true);
    expect(PATTERN_RULES.every((rule) => rule.ruleSetVersion === 'sanhe-v1')).toBe(true);
    expect(new Set(PATTERN_RULES.map((rule) => rule.ruleId)).size).toBe(PATTERN_RULES.length);
  });

  it('matches a 紫微 branch-position rule and returns no result for an empty chart', () => {
    const chart = makeEmptyChart();
    chart.palaces[0].majorStars = [{ starName: '紫微' }];

    expect(evaluatePatterns(chart).map((rule) => rule.ruleName)).toContain('紫微在子格');
    expect(evaluatePatterns(makeEmptyChart())).toEqual([]);
  });

  it('canonicalizes zh-CN stars and palace names before matching', () => {
    const chart = makeEmptyChart('zh-CN');
    chart.palaces[0].majorStars = [{ starName: '紫微' }, { starName: '天府' }];

    const result = evaluatePatterns(chart);

    expect(result.map((rule) => rule.ruleName)).toEqual(expect.arrayContaining(['紫微在子格', '紫府同宮格']));
    expect(result.flatMap((rule) => rule.evidence)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ knowledgeId: 'star-ziwei' }),
        expect.objectContaining({ knowledgeId: 'palace-ming' }),
      ])
    );
  });
});
