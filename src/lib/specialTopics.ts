import type { AnalyzedChart } from './chartAnalyzer';
import { formatKnowledgeSource, traceCitations, type Citation } from './citationTracer';
import {
  getSensitivityBoundary,
  HEALTH_BOUNDARY,
  MARRIAGE_BOUNDARY,
  type AssertionBoundary,
  type SensitivityLevel,
  WEALTH_BOUNDARY,
} from './matchRules/sensitivity';
import type { RuleResult } from './rules/types';

export type { SensitivityLevel } from './matchRules/sensitivity';

export type TopicType = 'career' | 'wealth' | 'relationship' | 'health' | 'education';

/** Topic-specific prompt and the verified rule-id prefixes allowed into it. */
export interface SpecialTopicConfig {
  type: TopicType;
  promptTemplate: string;
  ruleSubset: string[];
  sensitivity: SensitivityLevel;
  boundaryTopic?: string;
}

const CAREER_RULE_SUBSET = [
  'pattern-ziwei-system-ming',
  'pattern-tianfu-system-ming',
  'pattern-san-qi-jia-hui',
  'pattern-sha-po-lang',
  'pattern-ji-yue-tong-liang',
  'pattern-yang-liang-chang-lu',
  'four-transformation-ziwei-',
  'four-transformation-tianji-',
  'four-transformation-taiyang-',
  'four-transformation-wuqu-',
  'four-transformation-tianfu-',
  'four-transformation-tianxiang-',
] as const;

const WEALTH_RULE_SUBSET = [
  'pattern-ziwei-system-ming',
  'pattern-tianfu-system-ming',
  'pattern-san-qi-jia-hui',
  'pattern-yang-liang-chang-lu',
  'four-transformation-wuqu-',
  'four-transformation-tianfu-',
  'four-transformation-taiyin-',
  'four-transformation-tianxiang-',
  'four-transformation-tianliang-',
] as const;

const RELATIONSHIP_RULE_SUBSET = [
  'pattern-ziwei-tianxiang-same-palace',
  'pattern-ziwei-tanlang-same-palace',
  'pattern-ri-yue-same-palace',
  'pattern-ziwei-system-ming',
  'pattern-tianfu-system-ming',
  'four-transformation-taiyang-',
  'four-transformation-taiyin-',
  'four-transformation-tiantong-',
  'four-transformation-tianxiang-',
  'four-transformation-jumen-',
  'four-transformation-tanlang-',
] as const;

const HEALTH_RULE_SUBSET = [
  'pattern-ji-yue-tong-liang',
  'pattern-sha-po-lang',
  'pattern-yang-tuo-clamp-ming',
  'pattern-huo-ling-clamp-ming',
  'pattern-kong-jie-clamp-ming',
  'four-transformation-tianliang-',
  'four-transformation-tiantong-',
  'four-transformation-lianzhen-',
  'four-transformation-taiyin-',
  'four-transformation-jumen-',
] as const;

const EDUCATION_RULE_SUBSET = [
  'pattern-chang-qu-same-palace',
  'pattern-kui-yue-clamp-ming',
  'pattern-ziwei-system-ming',
  'pattern-tianfu-system-ming',
  'pattern-ji-yue-tong-liang',
  'four-transformation-tianji-',
  'four-transformation-wenchang-',
  'four-transformation-wenqu-',
  'four-transformation-tianliang-',
] as const;

/** Canonical deterministic configuration for each special-topic reading. */
export const SPECIAL_TOPIC_CONFIGS: Record<TopicType, SpecialTopicConfig> = {
  career: {
    type: 'career',
    promptTemplate:
      '請聚焦事業與職涯方向，結合命宮、官祿相關結構與已驗證規則，說明可發揮的能力、工作模式與可實踐的發展建議。',
    ruleSubset: [...CAREER_RULE_SUBSET],
    sensitivity: 'medium',
  },
  wealth: {
    type: 'wealth',
    promptTemplate:
      '請聚焦財務傾向與資源運用，僅根據命盤資料與已驗證規則說明收入模式、風險與規劃方向，不保證獲利或損益。',
    ruleSubset: [...WEALTH_RULE_SUBSET],
    sensitivity: 'high',
    boundaryTopic: WEALTH_BOUNDARY.topic,
  },
  relationship: {
    type: 'relationship',
    promptTemplate:
      '請聚焦感情與互動傾向，根據命盤資料與已驗證規則說明溝通、相處與關係經營方向，不斷言必然結果。',
    ruleSubset: [...RELATIONSHIP_RULE_SUBSET],
    sensitivity: 'high',
    boundaryTopic: MARRIAGE_BOUNDARY.topic,
  },
  health: {
    type: 'health',
    promptTemplate:
      '請聚焦健康關注與生活照護方向，根據命盤資料與已驗證規則提供可觀察的身心狀態提醒，不進行疾病診斷或治療建議。',
    ruleSubset: [...HEALTH_RULE_SUBSET],
    sensitivity: 'high',
    boundaryTopic: HEALTH_BOUNDARY.topic,
  },
  education: {
    type: 'education',
    promptTemplate:
      '請聚焦學習方式與教育發展，結合命盤資料與已驗證規則說明適合的學習策略、專長養成與可實踐的建議。',
    ruleSubset: [...EDUCATION_RULE_SUBSET],
    sensitivity: 'medium',
  },
};

export interface SpecialTopicPromptPlan {
  topic: TopicType;
  config: SpecialTopicConfig;
  rules: RuleResult[];
  citations: Citation[];
  boundary?: AssertionBoundary;
  sensitivityInstruction: string;
  userPrompt: string;
}

function matchesRuleSubset(ruleId: string, selector: string): boolean {
  const prefix = selector.endsWith('*') ? selector.slice(0, -1) : selector;
  return ruleId === prefix || ruleId.startsWith(prefix) || ruleId.startsWith(`${prefix}-`);
}

/** Keep only matched, verified rule results whose IDs belong to the topic subset. */
export function filterRulesForTopic(rules: readonly RuleResult[], topic: TopicType): RuleResult[] {
  const { ruleSubset } = SPECIAL_TOPIC_CONFIGS[topic];
  return rules.filter(
    (rule) => rule.matched && ruleSubset.some((selector) => matchesRuleSubset(rule.ruleId, selector)),
  );
}

function chartForPrompt(chart: AnalyzedChart): Omit<AnalyzedChart, 'generatedAt'> {
  const { generatedAt: _generatedAt, ...stableChart } = chart;
  return stableChart;
}

function formatCitations(citations: Citation[]): string {
  if (citations.length === 0) return '（目前沒有可追溯的知識來源。）';
  return citations
    .map((citation) => `- [${citation.knowledgeId}] ${formatKnowledgeSource(citation.source)} — ${citation.field} (${citation.confidence})`)
    .join('\n');
}

function formatSensitivityInstruction(boundary: AssertionBoundary | undefined): string {
  if (!boundary) return '';

  return [
    `可使用措辭：${boundary.allowedPhrasing.join('、')}`,
    `禁止措辭：${boundary.forbiddenPhrasing.join('、')}`,
    `必須附上免責聲明：${boundary.disclaimer}`,
  ].join('\n');
}

/** Build the complete deterministic request payload before any LLM call. */
export function buildSpecialTopicPrompt(
  chart: AnalyzedChart,
  topic: TopicType,
  rules: readonly RuleResult[] = [],
): SpecialTopicPromptPlan {
  const config = SPECIAL_TOPIC_CONFIGS[topic];
  const selectedRules = filterRulesForTopic(rules, topic);
  const citations = traceCitations(chart);
  const boundary = getSensitivityBoundary(config.boundaryTopic, config.sensitivity);
  const sensitivityInstruction = formatSensitivityInstruction(boundary);
  const userPrompt = [
    config.promptTemplate,
    '',
    `【專題】${topic}`,
    `【敏感度】${config.sensitivity}`,
    ...(sensitivityInstruction ? ['【敏感度邊界】', sensitivityInstruction] : []),
    '【結構化命盤資料】',
    '```json',
    JSON.stringify(chartForPrompt(chart), null, 2),
    '```',
    '【已驗證規則】',
    selectedRules.length > 0 ? JSON.stringify(selectedRules, null, 2) : '（目前沒有符合本專題的規則。）',
    '【知識來源】',
    formatCitations(citations),
  ].join('\n');

  return {
    topic,
    config,
    rules: selectedRules,
    citations,
    boundary,
    sensitivityInstruction,
    userPrompt,
  };
}

/**
 * Public plan API: return the deterministic user prompt for a special topic.
 * `rules` is optional so the plan's two-argument API remains useful to callers;
 * panels pass the evaluated RuleResult[] to enforce the topic subset.
 */
export function generateSpecialTopicReading(
  chart: AnalyzedChart,
  topic: TopicType,
  rules: readonly RuleResult[] = [],
): string {
  return buildSpecialTopicPrompt(chart, topic, rules).userPrompt;
}
