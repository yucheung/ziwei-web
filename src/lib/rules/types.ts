import type { AnalyzedChart } from '../chartAnalyzer';
import type { AppLocale } from '../chartModel';

export type TransformationKey = 'huaLu' | 'huaQuan' | 'huaKe' | 'huaJi';

export type RuleConditionType = 'starInPalace' | 'palaceRelationship' | 'mutagenPresent';

export interface RuleCondition {
  type: RuleConditionType;
  params: Record<string, unknown>;
}

export type RuleConclusionType = 'fortuneEffect' | 'personalityTrait' | 'relationshipDynamic';

export interface RuleConclusion {
  type: RuleConclusionType;
  description: string;
  confidence: number;
}

export interface RuleMetadata {
  source: 'iztro-sanhe-v1';
  school: 'sanhe';
  ruleSetVersion: 'sanhe-v1';
  conditions: RuleCondition[];
  conclusions: RuleConclusion[];
}

export interface FourTransformationRule extends RuleMetadata {
  ruleId: string;
  starName: string;
  transformation: TransformationKey;
}

export interface PatternRule extends RuleMetadata {
  ruleId: string;
  patternName: string;
}

export interface Evidence {
  knowledgeId: string;
  field: string;
  source: string;
  value: string;
  reasoning: string;
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  evidence: Evidence[];
  confidence: number;
}

export type PatternResult = RuleResult;

export type ChartRuleEvaluator = (chart: AnalyzedChart) => RuleResult[];

export type FortunePeriodType = 'decadal' | 'annual' | 'monthly';

export interface FortunePeriodOptions {
  themes?: string[];
  targetDate?: string | Date;
  locale?: AppLocale;
  timeIndex?: number;
}

export interface FortunePeriod {
  type: FortunePeriodType;
  palace: string;
  stars: string[];
  mutagens: string[];
  themes: string[];
  /** Original `astrolabe.palaces` index supplied by HoroscopeSummary. */
  palaceIndex: number;
  /** Scope-renamed palace names supplied by HoroscopeSummary. */
  palaceNames: string[];
  ageRange?: [number, number];
  year?: number;
  month?: string | number;
  heavenlyStem?: string;
  earthlyBranch?: string;
}
