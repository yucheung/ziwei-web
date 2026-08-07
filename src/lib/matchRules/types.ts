import type { AnalyzedChart } from '../chartAnalyzer';
import type { Evidence } from '../rules/types';

export type MatchConditionType = 'starRelationship' | 'palaceOverlap' | 'mutagenInteraction' | 'branchRelation';

export interface MatchCondition {
  type: MatchConditionType;
  params: Record<string, unknown>;
}

export type MatchSensitivity = 'low' | 'medium' | 'high';

export type MatchConclusionType = 'compatibility' | 'dynamic' | 'challenge';

export interface MatchConclusion {
  type: MatchConclusionType;
  description: string;
  confidence: number;
  sensitivity: MatchSensitivity;
  topic?: string;
  disclaimer?: string;
}

export interface MatchRule {
  ruleId: string;
  ruleName: string;
  conditions: MatchCondition[];
  conclusions: MatchConclusion[];
  source: 'iztro-sanhe-v1';
  school: 'sanhe';
  ruleSetVersion: 'sanhe-v1';
}

export interface MatchRuleResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  evidence: Evidence[];
  confidence: number;
  conclusions: MatchConclusion[];
}

export type MatchRuleEvaluator = (chartA: AnalyzedChart, chartB: AnalyzedChart) => MatchRuleResult[];

export type ChartSide = 'chartA' | 'chartB';
