import type { AnalyzedChart, MutagenEntry } from '../chartAnalyzer';
import { canonicalMutagen, canonicalPalaceName } from '../rules/chartFacts';
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
    conditions: [{ type: 'mutagenInteraction', params: { chartA: '祿', chartB: '祿', samePalace: true } }],
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
    conditions: [{ type: 'mutagenInteraction', params: { mutagens: ['祿', '忌'], reversible: true, samePalace: true } }],
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
  palaceName: string;
}

type InteractionMutagen = '祿' | '忌';

interface MutagenInteractionDefinition {
  rule: MatchRule;
  pairs: ReadonlyArray<readonly [InteractionMutagen, InteractionMutagen]>;
}

const MUTAGEN_INTERACTION_DEFINITIONS: MutagenInteractionDefinition[] = [
  { rule: MUTAGEN_INTERACTION_RULES[0] as MatchRule, pairs: [['祿', '祿']] },
  { rule: MUTAGEN_INTERACTION_RULES[1] as MatchRule, pairs: [['祿', '忌'], ['忌', '祿']] },
];

function collectMutagens(chart: AnalyzedChart, mutagen: InteractionMutagen): LocatedMutagen[] {
  return chart.mutagens.entries.flatMap((entry, index) =>
    canonicalMutagen(chart, entry.mutagen) === mutagen
      ? [{ entry, index, palaceName: canonicalPalaceName(chart, entry.palaceName) }]
      : []
  );
}

function findSamePalacePair(
  chartA: AnalyzedChart,
  chartB: AnalyzedChart,
  mutagenA: InteractionMutagen,
  mutagenB: InteractionMutagen
): readonly [LocatedMutagen, LocatedMutagen] | undefined {
  const entriesA = collectMutagens(chartA, mutagenA);
  const entriesB = collectMutagens(chartB, mutagenB);

  for (const entryA of entriesA) {
    const entryB = entriesB.find((candidate) => candidate.palaceName === entryA.palaceName);
    if (entryB) return [entryA, entryB];
  }
  return undefined;
}

function buildResult(
  rule: MatchRule,
  chartA: AnalyzedChart,
  chartB: AnalyzedChart,
  mutagenA: InteractionMutagen,
  mutagenB: InteractionMutagen,
  pair: readonly [LocatedMutagen, LocatedMutagen]
): MatchRuleResult | undefined {
  const [entryA, entryB] = pair;

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

function evaluateRule(
  definition: MutagenInteractionDefinition,
  chartA: AnalyzedChart,
  chartB: AnalyzedChart
): MatchRuleResult | undefined {
  for (const [mutagenA, mutagenB] of definition.pairs) {
    const pair = findSamePalacePair(chartA, chartB, mutagenA, mutagenB);
    if (pair) return buildResult(definition.rule, chartA, chartB, mutagenA, mutagenB, pair);
  }
  return undefined;
}

/** Evaluate direct analyzed-chart mutagen entries without inferring raw astrolabe state. */
export const evaluateMutagenInteraction: MatchRuleEvaluator = (chartA, chartB) =>
  MUTAGEN_INTERACTION_DEFINITIONS
    .map((definition) => evaluateRule(definition, chartA, chartB))
    .filter((result): result is MatchRuleResult => result !== undefined);
