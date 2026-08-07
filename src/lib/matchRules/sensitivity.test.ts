import { describe, expect, it } from 'vitest';
import type { MatchRuleResult } from './types';
import {
  HEALTH_BOUNDARY,
  LONGEVITY_BOUNDARY,
  MARRIAGE_BOUNDARY,
  WEALTH_BOUNDARY,
  applySensitivityBoundaries,
} from './sensitivity';

const HIGH_SENSITIVITY_BOUNDARIES = [
  MARRIAGE_BOUNDARY,
  WEALTH_BOUNDARY,
  HEALTH_BOUNDARY,
  LONGEVITY_BOUNDARY,
];

function resultWithConclusion(
  conclusion: MatchRuleResult['conclusions'][number],
  ruleId = 'rule-sensitivity'
): MatchRuleResult {
  return {
    ruleId,
    ruleName: '敏感議題測試規則',
    matched: true,
    evidence: [{
      knowledgeId: 'palace.ming',
      field: 'chartA.palaces[0].name',
      source: 'iztro-sanhe-v1',
      value: '命宮',
      reasoning: '測試證據',
    }],
    confidence: conclusion.confidence,
    conclusions: [conclusion],
  };
}

describe('sensitivity assertion boundaries', () => {
  it('exports high-sensitivity boundaries for the four required topics', () => {
    expect(HIGH_SENSITIVITY_BOUNDARIES.map((boundary) => boundary.topic)).toEqual(
      expect.arrayContaining(['婚姻', '財富', '健康', '壽命'])
    );
    expect(HIGH_SENSITIVITY_BOUNDARIES).toHaveLength(4);

    for (const boundary of HIGH_SENSITIVITY_BOUNDARIES) {
      expect(boundary.level).toBe('high');
      expect(boundary.allowedPhrasing.length).toBeGreaterThan(0);
      expect(boundary.forbiddenPhrasing.length).toBeGreaterThan(0);
      expect(boundary.disclaimer.trim()).not.toBe('');
    }

    expect(MARRIAGE_BOUNDARY.allowedPhrasing).toContain('互動傾向');
    expect(MARRIAGE_BOUNDARY.forbiddenPhrasing).toContain('保證婚姻結果');
    expect(WEALTH_BOUNDARY.allowedPhrasing).toContain('財務傾向');
    expect(WEALTH_BOUNDARY.forbiddenPhrasing).toContain('保證獲利');
    expect(HEALTH_BOUNDARY.allowedPhrasing).toContain('健康關注');
    expect(HEALTH_BOUNDARY.forbiddenPhrasing).toContain('診斷疾病');
    expect(LONGEVITY_BOUNDARY.allowedPhrasing).toContain('生活照護');
    expect(LONGEVITY_BOUNDARY.forbiddenPhrasing).toContain('預測壽命');
  });

  it('leaves low- and medium-sensitivity conclusions unchanged', () => {
    const results = [
      resultWithConclusion({
        type: 'compatibility',
        description: '低敏感結論',
        confidence: 0.7,
        sensitivity: 'low',
      }, 'rule-low'),
      resultWithConclusion({
        type: 'dynamic',
        description: '中敏感結論',
        confidence: 0.8,
        sensitivity: 'medium',
        topic: '婚姻',
      }, 'rule-medium'),
    ];

    expect(applySensitivityBoundaries(results)).toEqual(results);
  });

  it('adds a topic-specific disclaimer to every high-sensitivity conclusion', () => {
    const results = [
      resultWithConclusion({
        type: 'challenge',
        description: '婚姻高敏感結論',
        confidence: 0.9,
        sensitivity: 'high',
        topic: '婚姻',
      }, 'rule-marriage'),
      resultWithConclusion({
        type: 'challenge',
        description: '未知主題高敏感結論',
        confidence: 0.9,
        sensitivity: 'high',
        topic: '未知主題',
      }, 'rule-generic'),
    ];

    const [marriage, generic] = applySensitivityBoundaries(results).flatMap((result) => result.conclusions);

    expect(marriage?.disclaimer).toBe(MARRIAGE_BOUNDARY.disclaimer);
    expect(generic?.disclaimer).toBeTruthy();
    expect(generic?.disclaimer).not.toBe(MARRIAGE_BOUNDARY.disclaimer);
  });

  it('preserves an existing high-sensitivity disclaimer', () => {
    const result = resultWithConclusion({
      type: 'challenge',
      description: '已有免責聲明',
      confidence: 0.95,
      sensitivity: 'high',
      topic: '健康',
      disclaimer: '既有免責聲明',
    });

    expect(applySensitivityBoundaries([result])[0]?.conclusions[0]?.disclaimer).toBe('既有免責聲明');
  });

  it('does not mutate input results or their conclusions', () => {
    const results = [resultWithConclusion({
      type: 'challenge',
      description: '不可變更結論',
      confidence: 0.9,
      sensitivity: 'high',
      topic: '壽命',
    })];
    const before = structuredClone(results);

    const transformed = applySensitivityBoundaries(results);

    expect(results).toEqual(before);
    expect(transformed).not.toBe(results);
    expect(transformed[0]).not.toBe(results[0]);
    expect(transformed[0]?.conclusions[0]).not.toBe(results[0]?.conclusions[0]);
    expect(transformed[0]?.evidence).toEqual(results[0]?.evidence);
  });

  it('is idempotent when applied more than once', () => {
    const results = [resultWithConclusion({
      type: 'challenge',
      description: '重複套用結論',
      confidence: 0.9,
      sensitivity: 'high',
      topic: '財富',
    })];

    const once = applySensitivityBoundaries(results);

    expect(applySensitivityBoundaries(once)).toEqual(once);
  });
});
