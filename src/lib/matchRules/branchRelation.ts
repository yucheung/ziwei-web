import { canonicalBranch, getSoulPalace } from '../rules/chartFacts';
import { createMatchBranchEvidence } from './evidence';
import type { MatchRule, MatchRuleEvaluator } from './types';

const RULE_SOURCE = {
  source: 'iztro-sanhe-v1' as const,
  school: 'sanhe' as const,
  ruleSetVersion: 'sanhe-v1' as const,
};

const LIUHE = [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']];
const SANHE = [['申', '子', '辰'], ['巳', '酉', '丑'], ['寅', '午', '戌'], ['亥', '卯', '未']];
const LIUCHONG = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
const SANXING = [['寅', '巳', '申'], ['丑', '戌', '未'], ['子', '卯'], ['辰'], ['午'], ['酉'], ['亥']];
const LIUHAI = [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']];

export const BRANCH_RELATION_RULES: MatchRule[] = [
  {
    ruleId: 'branch-liuhe', ruleName: '命宮地支六合',
    conditions: [{ type: 'branchRelation', params: { relation: '六合', pairs: LIUHE } }],
    conclusions: [{ type: 'dynamic', description: '兩張命盤命宮地支形成六合關係。', confidence: 0.82, sensitivity: 'medium', topic: '婚姻' }],
    ...RULE_SOURCE,
  },
  {
    ruleId: 'branch-sanhe', ruleName: '命宮地支三合',
    conditions: [{ type: 'branchRelation', params: { relation: '三合', groups: SANHE } }],
    conclusions: [{ type: 'dynamic', description: '兩張命盤命宮地支形成三合關係。', confidence: 0.81, sensitivity: 'medium', topic: '婚姻' }],
    ...RULE_SOURCE,
  },
  {
    ruleId: 'branch-liuchong', ruleName: '命宮地支六沖',
    conditions: [{ type: 'branchRelation', params: { relation: '六沖', pairs: LIUCHONG } }],
    conclusions: [{ type: 'challenge', description: '兩張命盤命宮地支形成六沖關係，需觀察互動中的調整空間。', confidence: 0.78, sensitivity: 'medium', topic: '婚姻' }],
    ...RULE_SOURCE,
  },
  {
    ruleId: 'branch-sanxing', ruleName: '命宮地支三刑',
    conditions: [{ type: 'branchRelation', params: { relation: '三刑', groups: SANXING } }],
    conclusions: [{ type: 'challenge', description: '兩張命盤命宮地支形成三刑關係，需觀察互動中的調整空間。', confidence: 0.77, sensitivity: 'medium', topic: '婚姻' }],
    ...RULE_SOURCE,
  },
  {
    ruleId: 'branch-liuhai', ruleName: '命宮地支六害',
    conditions: [{ type: 'branchRelation', params: { relation: '六害', pairs: LIUHAI } }],
    conclusions: [{ type: 'challenge', description: '兩張命盤命宮地支形成六害關係，需觀察互動中的調整空間。', confidence: 0.76, sensitivity: 'medium', topic: '婚姻' }],
    ...RULE_SOURCE,
  },
];

function matchesPair(branchA: string, branchB: string, pairs: string[][]): boolean {
  return pairs.some(([first, second]) =>
    (branchA === first && branchB === second) || (branchA === second && branchB === first)
  );
}

function matchesGroup(branchA: string, branchB: string, groups: string[][]): boolean {
  return branchA !== branchB && groups.some((group) => group.includes(branchA) && group.includes(branchB));
}

function matchesSanxing(branchA: string, branchB: string): boolean {
  return SANXING.some((group) =>
    group.length === 1 ? branchA === group[0] && branchB === group[0] : matchesGroup(branchA, branchB, [group])
  );
}

function relationMatches(ruleId: string, branchA: string, branchB: string): boolean {
  if (ruleId === 'branch-liuhe') return matchesPair(branchA, branchB, LIUHE);
  if (ruleId === 'branch-sanhe') return matchesGroup(branchA, branchB, SANHE);
  if (ruleId === 'branch-liuchong') return matchesPair(branchA, branchB, LIUCHONG);
  if (ruleId === 'branch-sanxing') return matchesSanxing(branchA, branchB);
  return matchesPair(branchA, branchB, LIUHAI);
}

/** Evaluate explicit 命宮 earthly-branch relation tables. */
export const evaluateBranchRelation: MatchRuleEvaluator = (chartA, chartB) => {
  const soulA = getSoulPalace(chartA);
  const soulB = getSoulPalace(chartB);
  if (!soulA || !soulB) return [];
  const branchA = canonicalBranch(chartA, soulA.palace.earthlyBranch);
  const branchB = canonicalBranch(chartB, soulB.palace.earthlyBranch);

  return BRANCH_RELATION_RULES.flatMap((rule) => {
    if (!relationMatches(rule.ruleId, branchA, branchB)) return [];
    const evidenceA = createMatchBranchEvidence(chartA, 'chartA', `${rule.ruleName}的地支條件成立。`);
    const evidenceB = createMatchBranchEvidence(chartB, 'chartB', `${rule.ruleName}的地支條件成立。`);
    if (!evidenceA || !evidenceB) return [];
    return [{
      ruleId: rule.ruleId,
      ruleName: rule.ruleName,
      matched: true,
      evidence: [evidenceA, evidenceB],
      confidence: rule.conclusions[0]?.confidence ?? 0,
      conclusions: rule.conclusions.map((conclusion) => ({ ...conclusion })),
    }];
  });
};
