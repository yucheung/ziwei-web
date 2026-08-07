import type { AnalyzedChart } from '../chartAnalyzer';
import { canonicalStarName, findStarLocations, getSoulPalace } from '../rules/chartFacts';
import { createMatchStarEvidence } from './evidence';
import type { MatchRule, MatchRuleEvaluator, MatchRuleResult } from './types';

const RULE_SOURCE = {
  source: 'iztro-sanhe-v1' as const,
  school: 'sanhe' as const,
  ruleSetVersion: 'sanhe-v1' as const,
};

export const STAR_COMPATIBILITY_RULES: MatchRule[] = [
  {
    ruleId: 'star-ziwei-tianfu',
    ruleName: '紫微天府命宮互補',
    conditions: [{ type: 'starRelationship', params: { chartA: '紫微', chartB: '天府', reversible: true } }],
    conclusions: [{
      type: 'compatibility',
      description: '兩張命盤的紫微與天府主星形成互補的互動條件。',
      confidence: 0.92,
      sensitivity: 'medium',
      topic: '婚姻',
    }],
    ...RULE_SOURCE,
  },
  {
    ruleId: 'star-taiyang-taiyin',
    ruleName: '太陽太陰命宮互補',
    conditions: [{ type: 'starRelationship', params: { chartA: '太陽', chartB: '太陰', reversible: true } }],
    conclusions: [{
      type: 'compatibility',
      description: '兩張命盤的太陽與太陰主星形成陰陽互補的互動條件。',
      confidence: 0.9,
      sensitivity: 'medium',
      topic: '婚姻',
    }],
    ...RULE_SOURCE,
  },
];

function findMingMajorStar(chart: AnalyzedChart, starName: string) {
  const soulPalace = getSoulPalace(chart);
  if (!soulPalace) return undefined;
  const canonicalName = canonicalStarName(chart, starName);
  return findStarLocations(chart, starName).find((location) =>
    location.palace.index === soulPalace.palace.index
    && location.starGroup === 'majorStars'
    && location.starName === canonicalName
  );
}

function buildResult(rule: MatchRule, chartA: AnalyzedChart, chartB: AnalyzedChart): MatchRuleResult | undefined {
  const params = rule.conditions[0]?.params;
  const starA = String(params?.chartA ?? '');
  const starB = String(params?.chartB ?? '');
  const reversible = params?.reversible === true;
  let matchA = findMingMajorStar(chartA, starA);
  let matchB = findMingMajorStar(chartB, starB);

  if ((!matchA || !matchB) && reversible) {
    matchA = findMingMajorStar(chartA, starB);
    matchB = findMingMajorStar(chartB, starA);
  }
  if (!matchA || !matchB) return undefined;

  return {
    ruleId: rule.ruleId,
    ruleName: rule.ruleName,
    matched: true,
    evidence: [
      createMatchStarEvidence(chartA, 'chartA', matchA, `${rule.ruleName}的命宮主星條件成立。`),
      createMatchStarEvidence(chartB, 'chartB', matchB, `${rule.ruleName}的命宮主星條件成立。`),
    ],
    confidence: rule.conclusions[0]?.confidence ?? 0,
    conclusions: rule.conclusions.map((conclusion) => ({ ...conclusion })),
  };
}

/** Evaluate cross-chart compatibility using only the two analyzed 命宮 major-star sets. */
export const evaluateStarCompatibility: MatchRuleEvaluator = (chartA, chartB) =>
  STAR_COMPATIBILITY_RULES
    .map((rule) => buildResult(rule, chartA, chartB))
    .filter((result): result is MatchRuleResult => result !== undefined);
