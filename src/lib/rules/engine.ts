import type { AnalyzedChart } from '../chartAnalyzer';
import { evaluateFourTransformations } from './fourTransformations';
import { evaluatePatterns } from './patterns';
import type { PatternResult, RuleResult } from './types';

export type { Evidence, PatternResult, RuleCondition, RuleConclusion, RuleResult } from './types';

function mergeResults(results: RuleResult[]): RuleResult[] {
  const byRuleId = new Map<string, RuleResult>();
  for (const result of results) {
    if (!result.matched || byRuleId.has(result.ruleId)) continue;
    byRuleId.set(result.ruleId, result);
  }

  return [...byRuleId.values()].sort((left, right) =>
    right.confidence - left.confidence || left.ruleId.localeCompare(right.ruleId)
  );
}

/** Evaluate all B5a rule families, retaining matched results only. */
export function evaluateRules(chart: AnalyzedChart): RuleResult[] {
  const transformationResults = evaluateFourTransformations(chart);
  const patternResults: PatternResult[] = evaluatePatterns(chart);
  return mergeResults([...transformationResults, ...patternResults]);
}

/** Stable public alias for consumers that do not need the internal name. */
export function getRuleResults(chart: AnalyzedChart): RuleResult[] {
  return evaluateRules(chart);
}
