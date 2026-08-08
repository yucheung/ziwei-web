import type { AnalyzedChart } from '../chartAnalyzer';
import type { Evidence } from '../rules/types';
import type { KnowledgeSource } from '../starKnowledge';

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
  sourceStatus?: KnowledgeSource['status'];
}

export interface MatchRuleResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  evidence: Evidence[];
  confidence: number;
  conclusions: MatchConclusion[];
  sourceStatus?: KnowledgeSource['status'];
}

export type MatchRuleEvaluator = (chartA: AnalyzedChart, chartB: AnalyzedChart) => MatchRuleResult[];

export type ChartSide = 'chartA' | 'chartB';
