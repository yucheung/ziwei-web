import { describe, expect, it } from 'vitest';
import type { AnalyzedChart } from './chartAnalyzer';
import { WEALTH_BOUNDARY } from './matchRules/sensitivity';
import type { RuleResult } from './rules/types';
import {
  SPECIAL_TOPIC_CONFIGS,
  buildSpecialTopicPrompt,
  filterRulesForTopic,
  generateSpecialTopicReading,
  type TopicType,
} from './specialTopics';

function makeChart(): AnalyzedChart {
  return {
    schemaVersion: '1.0',
    generatedAt: '2026-08-08T00:00:00.000Z',
    outputLocale: 'zh-TW',
    birthData: { date: '2000-08-16', timeIndex: 2, gender: 'male' },
    palaces: [
      {
        index: 0,
        name: '命宮',
        heavenlyStem: '甲',
        earthlyBranch: '子',
        isBodyPalace: false,
        isOriginalPalace: false,
        majorStars: [{ starName: '紫微' }],
        minorStars: [],
        adjectiveStars: [],
      },
    ],
    mutagens: { entries: [] },
    patterns: { patterns: [] },
  };
}

function makeRule(ruleId: string, ruleName = ruleId, matched = true): RuleResult {
  return {
    ruleId,
    ruleName,
    matched,
    evidence: [
      {
        knowledgeId: 'star-ziwei',
        field: 'palaces[0].majorStars[0]',
        source: 'iztro-sanhe-v1',
        value: '紫微',
        reasoning: '測試證據',
      },
    ],
    confidence: 0.9,
  };
}

describe('specialTopics deterministic prompt planning', () => {
  const topics: TopicType[] = ['career', 'wealth', 'relationship', 'health', 'education'];

  it('defines a typed configuration for every supported topic', () => {
    expect(Object.keys(SPECIAL_TOPIC_CONFIGS)).toEqual(topics);

    const promptTemplates = topics.map((topic) => SPECIAL_TOPIC_CONFIGS[topic].promptTemplate);
    expect(new Set(promptTemplates).size).toBe(topics.length);

    for (const topic of topics) {
      const config = SPECIAL_TOPIC_CONFIGS[topic];
      expect(config.type).toBe(topic);
      expect(config.promptTemplate).toBeTruthy();
      expect(config.ruleSubset.length).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(config.sensitivity);
    }
  });

  it('filters matched rules by the selected topic rule subset', () => {
    const selectedPrefix = SPECIAL_TOPIC_CONFIGS.career.ruleSubset[0];
    const rules = [
      makeRule(`${selectedPrefix}test`, '事業規則'),
      makeRule('four-transformation-taiyin-huaLu', '財帛規則'),
      makeRule(`${selectedPrefix}unmatched`, '未命中規則', false),
    ];

    expect(filterRulesForTopic(rules, 'career')).toEqual([rules[0]]);
  });

  it('builds a deterministic prompt with only selected rules and traceable citations', () => {
    const selectedPrefix = SPECIAL_TOPIC_CONFIGS.career.ruleSubset[0];
    const selectedRule = makeRule(`${selectedPrefix}test`, '事業規則');
    const excludedRule = makeRule('four-transformation-taiyin-huaLu', '財帛規則');

    const first = generateSpecialTopicReading(makeChart(), 'career', [selectedRule, excludedRule]);
    const second = generateSpecialTopicReading(makeChart(), 'career', [selectedRule, excludedRule]);
    const plan = buildSpecialTopicPrompt(makeChart(), 'career', [selectedRule, excludedRule]);

    expect(first).toBe(second);
    expect(first).toContain(SPECIAL_TOPIC_CONFIGS.career.promptTemplate);
    expect(first).toContain('事業規則');
    expect(first).not.toContain('財帛規則');
    expect(first).toContain('star-ziwei');
    expect(first).toContain('未審核');
    expect(plan.topic).toBe('career');
    expect(plan.rules).toEqual([selectedRule]);
    expect(plan.citations).toContainEqual(expect.objectContaining({ knowledgeId: 'star-ziwei' }));
  });

  it('omits generatedAt so the same chart data produces a stable prompt', () => {
    expect(generateSpecialTopicReading(makeChart(), 'education')).not.toContain('2026-08-08T00:00:00.000Z');
  });

  it('adds the wealth assertion boundary to the deterministic prompt plan', () => {
    const plan = buildSpecialTopicPrompt(makeChart(), 'wealth');

    expect(plan.boundary).toBe(WEALTH_BOUNDARY);
    expect(plan.userPrompt).toContain('保證獲利');
    expect(plan.userPrompt).toContain(WEALTH_BOUNDARY.disclaimer);
    expect(plan.sensitivityInstruction).toContain('禁止');
    expect(plan.sensitivityInstruction).not.toBe('');
  });
});
