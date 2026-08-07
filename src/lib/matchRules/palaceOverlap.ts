import type { AnalyzedChart } from '../chartAnalyzer';
import {
  canonicalBranch,
  findPalaceLocations,
  getSoulPalace,
  getSurroundedPalaceLocations,
} from '../rules/chartFacts';
import { createMatchBranchEvidence, createMatchPalaceEvidence } from './evidence';
import type { MatchRule, MatchRuleEvaluator, MatchRuleResult } from './types';

const RULE_SOURCE = {
  source: 'iztro-sanhe-v1' as const,
  school: 'sanhe' as const,
  ruleSetVersion: 'sanhe-v1' as const,
};

export const PALACE_OVERLAP_RULES: MatchRule[] = [
  {
    ruleId: 'palace-same-ming-branch',
    ruleName: '命宮同支',
    conditions: [{ type: 'palaceOverlap', params: { palace: '命宮', relationship: 'sameBranch' } }],
    conclusions: [{
      type: 'dynamic',
      description: '兩張命盤命宮地支相同，形成相近的互動節奏條件。',
      confidence: 0.88,
      sensitivity: 'medium',
      topic: '婚姻',
    }],
    ...RULE_SOURCE,
  },
  {
    ruleId: 'palace-surrounded-overlap',
    ruleName: '命宮三方四正交會夫妻宮',
    conditions: [{ type: 'palaceOverlap', params: { palace: '命宮', relationship: 'surroundedSpouse' } }],
    conclusions: [{
      type: 'dynamic',
      description: '一方夫妻宮落在另一方命宮三方四正，形成可交叉觀察的結構條件。',
      confidence: 0.86,
      sensitivity: 'medium',
      topic: '婚姻',
    }],
    ...RULE_SOURCE,
  },
];

function buildSameBranchResult(rule: MatchRule, chartA: AnalyzedChart, chartB: AnalyzedChart): MatchRuleResult | undefined {
  const soulA = getSoulPalace(chartA);
  const soulB = getSoulPalace(chartB);
  if (!soulA || !soulB || canonicalBranch(chartA, soulA.palace.earthlyBranch) !== canonicalBranch(chartB, soulB.palace.earthlyBranch)) {
    return undefined;
  }
  const evidence = [
    createMatchBranchEvidence(chartA, 'chartA', '命宮地支與另一張命盤相同。'),
    createMatchBranchEvidence(chartB, 'chartB', '命宮地支與另一張命盤相同。'),
  ].filter((item): item is NonNullable<typeof item> => item !== undefined);
  return {
    ruleId: rule.ruleId,
    ruleName: rule.ruleName,
    matched: true,
    evidence,
    confidence: rule.conclusions[0]?.confidence ?? 0,
    conclusions: rule.conclusions.map((conclusion) => ({ ...conclusion })),
  };
}

function buildSurroundedOverlapResult(
  rule: MatchRule,
  chartA: AnalyzedChart,
  chartB: AnalyzedChart
): MatchRuleResult | undefined {
  const soulA = getSoulPalace(chartA);
  const soulB = getSoulPalace(chartB);
  const spouseA = findPalaceLocations(chartA, '夫妻')[0];
  const spouseB = findPalaceLocations(chartB, '夫妻')[0];
  if (!soulA || !soulB || !spouseA || !spouseB) return undefined;

  const aInB = getSurroundedPalaceLocations(chartB, soulB).some((palace) => palace.palace.index === spouseA.palace.index);
  const bInA = getSurroundedPalaceLocations(chartA, soulA).some((palace) => palace.palace.index === spouseB.palace.index);
  if (!aInB && !bInA) return undefined;

  const sourceSide = aInB ? 'chartA' : 'chartB';
  const sourceChart = aInB ? chartA : chartB;
  const sourceSpouse = aInB ? spouseA : spouseB;
  const targetSide = aInB ? 'chartB' : 'chartA';
  const targetChart = aInB ? chartB : chartA;
  const targetSoul = aInB ? soulB : soulA;
  return {
    ruleId: rule.ruleId,
    ruleName: rule.ruleName,
    matched: true,
    evidence: [
      createMatchPalaceEvidence(sourceChart, sourceSide, sourceSpouse, '此夫妻宮落在另一張命盤的命宮三方四正。'),
      createMatchPalaceEvidence(targetChart, targetSide, targetSoul, '此命宮三方四正包含另一張命盤的夫妻宮位置。'),
    ],
    confidence: rule.conclusions[0]?.confidence ?? 0,
    conclusions: rule.conclusions.map((conclusion) => ({ ...conclusion })),
  };
}

/** Evaluate 命宮 and 夫妻宮 position relationships from analyzed palace facts. */
export const evaluatePalaceOverlap: MatchRuleEvaluator = (chartA, chartB) =>
  PALACE_OVERLAP_RULES
    .map((rule) => rule.ruleId === 'palace-same-ming-branch'
      ? buildSameBranchResult(rule, chartA, chartB)
      : buildSurroundedOverlapResult(rule, chartA, chartB))
    .filter((result): result is MatchRuleResult => result !== undefined);
