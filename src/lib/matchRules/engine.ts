import type { AnalyzedChart } from '../chartAnalyzer';
import { evaluateBranchRelation } from './branchRelation';
import { evaluateMutagenInteraction } from './mutagenInteraction';
import { evaluatePalaceOverlap } from './palaceOverlap';
import { evaluateStarCompatibility } from './starCompatibility';
import type { MatchRuleResult } from './types';

function mergeMatchedResults(results: MatchRuleResult[]): MatchRuleResult[] {
  const byRuleId = new Map<string, MatchRuleResult>();
  for (const result of results) {
    if (!result.matched || byRuleId.has(result.ruleId)) continue;
    byRuleId.set(result.ruleId, result);
  }
  return [...byRuleId.values()].sort(
    (left, right) => right.confidence - left.confidence || left.ruleId.localeCompare(right.ruleId)
  );
}

/** Strict deterministic public API: raw iztro astrolabes must be analyzed before evaluation. */
export function evaluateMatch(chartA: AnalyzedChart, chartB: AnalyzedChart): MatchRuleResult[] {
  return mergeMatchedResults([
    ...evaluateStarCompatibility(chartA, chartB),
    ...evaluatePalaceOverlap(chartA, chartB),
    ...evaluateMutagenInteraction(chartA, chartB),
    ...evaluateBranchRelation(chartA, chartB),
  ]);
}
