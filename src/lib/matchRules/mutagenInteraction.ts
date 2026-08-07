import type { AnalyzedChart, MutagenEntry } from '../chartAnalyzer';
import { canonicalMutagen } from '../rules/chartFacts';
import { createMatchMutagenEvidence } from './evidence';
import type { MatchRule, MatchRuleEvaluator, MatchRuleResult } from './types';

const RULE_SOURCE = {
  source: 'iztro-sanhe-v1' as const,
  school: 'sanhe' as const,
  ruleSetVersion: 'sanhe-v1' as const,
};

export const MUTAGEN_INTERACTION_RULES: MatchRule[] = [
  {
    ruleId: 'mutagen-double-lu',
    ruleName: '雙祿互動',
    conditions: [{ type: 'mutagenInteraction', params: { chartA: '祿', chartB: '祿' } }],
    conclusions: [{
      type: 'compatibility',
      description: '兩張命盤皆有化祿，形成資源互動可被觀察的條件。',
      confidence: 0.84,
      sensitivity: 'high',
      topic: '財富',
    }],
    ...RULE_SOURCE,
  },
  {
    ruleId: 'mutagen-lu-ji',
    ruleName: '祿忌互動',
    conditions: [{ type: 'mutagenInteraction', params: { mutagens: ['祿', '忌'], reversible: true } }],
    conclusions: [{
      type: 'challenge',
      description: '一方化祿與另一方化忌同時出現，形成資源與課題並存的互動條件。',
      confidence: 0.8,
      sensitivity: 'medium',
      topic: '婚姻',
    }],
    ...RULE_SOURCE,
  },
];

interface LocatedMutagen {
  entry: MutagenEntry;
  index: number;
}

function findMutagen(chart: AnalyzedChart, mutagen: '祿' | '忌'): LocatedMutagen | undefined {
  const index = chart.mutagens.entries.findIndex((entry) => canonicalMutagen(chart, entry.mutagen) === mutagen);
  return index < 0 ? undefined : { entry: chart.mutagens.entries[index] as MutagenEntry, index };
}

function buildResult(
  rule: MatchRule,
  chartA: AnalyzedChart,
  chartB: AnalyzedChart,
  mutagenA: '祿' | '忌',
  mutagenB: '祿' | '忌'
): MatchRuleResult | undefined {
  const entryA = findMutagen(chartA, mutagenA);
  const entryB = findMutagen(chartB, mutagenB);
  if (!entryA || !entryB) return undefined;

  const evidenceA = createMatchMutagenEvidence(chartA, 'chartA', entryA.entry, entryA.index, `${rule.ruleName}的化${mutagenA}條件成立。`);
  const evidenceB = createMatchMutagenEvidence(chartB, 'chartB', entryB.entry, entryB.index, `${rule.ruleName}的化${mutagenB}條件成立。`);
  if (!evidenceA || !evidenceB) return undefined;
  return {
    ruleId: rule.ruleId,
    ruleName: rule.ruleName,
    matched: true,
    evidence: [evidenceA, evidenceB],
    confidence: rule.conclusions[0]?.confidence ?? 0,
    conclusions: rule.conclusions.map((conclusion) => ({ ...conclusion })),
  };
}

/** Evaluate direct analyzed-chart mutagen entries without inferring raw astrolabe state. */
export const evaluateMutagenInteraction: MatchRuleEvaluator = (chartA, chartB) =>
  MUTAGEN_INTERACTION_RULES
    .map((rule) => {
      if (rule.ruleId === 'mutagen-double-lu') return buildResult(rule, chartA, chartB, '祿', '祿');
      return buildResult(rule, chartA, chartB, '祿', '忌') ?? buildResult(rule, chartA, chartB, '忌', '祿');
    })
    .filter((result): result is MatchRuleResult => result !== undefined);
