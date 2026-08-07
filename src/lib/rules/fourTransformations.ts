import type { AnalyzedChart } from '../chartAnalyzer';
import { getAllStarKnowledge, getStarKnowledge } from '../starKnowledge';
import {
  createPalaceEvidence,
  createMutagenEvidence,
  createStarEvidence,
  dedupeEvidence,
  findStarLocations,
  matchesTransformation,
  TRANSFORMATION_TO_MUTAGEN,
} from './chartFacts';
import type {
  Evidence,
  FourTransformationRule,
  RuleConclusion,
  RuleCondition,
  RuleResult,
  TransformationKey,
} from './types';

export type { Evidence, RuleResult, TransformationKey } from './types';

const TRANSFORMATIONS: TransformationKey[] = ['huaLu', 'huaQuan', 'huaKe', 'huaJi'];

const TRANSFORMATION_LABELS: Record<TransformationKey, string> = {
  huaLu: '祿',
  huaQuan: '權',
  huaKe: '科',
  huaJi: '忌',
};

const CONCLUSION_TYPES: Record<TransformationKey, RuleConclusion['type']> = {
  huaLu: 'fortuneEffect',
  huaQuan: 'personalityTrait',
  huaKe: 'personalityTrait',
  huaJi: 'relationshipDynamic',
};

const CONCLUSION_DESCRIPTIONS: Record<TransformationKey, string> = {
  huaLu: '生年化祿使該星所代表的主題較容易獲得資源與順勢發展。',
  huaQuan: '生年化權使該星所代表的主題呈現主動、掌控與推動力量。',
  huaKe: '生年化科使該星所代表的主題較重視名聲、專業與可見度。',
  huaJi: '生年化忌使該星所代表的主題成為需要反覆面對與修正的課題。',
};

function knowledgeKey(starName: string): string {
  return getStarKnowledge(starName)?.knowledgeId.replace(/^star-/u, '') ?? starName;
}

function createConditions(starName: string, transformation: TransformationKey): RuleCondition[] {
  return [
    { type: 'starInPalace', params: { starName } },
    {
      type: 'mutagenPresent',
      params: { starName, transformation, mutagen: TRANSFORMATION_TO_MUTAGEN[transformation] },
    },
  ];
}

function createConclusion(transformation: TransformationKey): RuleConclusion {
  return {
    type: CONCLUSION_TYPES[transformation],
    description: CONCLUSION_DESCRIPTIONS[transformation],
    confidence: 0.9,
  };
}

function createRule(starName: string, transformation: TransformationKey): FourTransformationRule {
  return {
    ruleId: `four-transformation-${knowledgeKey(starName)}-${transformation}`,
    starName,
    transformation,
    conditions: createConditions(starName, transformation),
    conclusions: [createConclusion(transformation)],
    source: 'iztro-sanhe-v1',
    school: 'sanhe',
    ruleSetVersion: 'sanhe-v1',
  };
}

/** Static v1 catalog: 14 B4 major stars × 4 birth-year transformations. */
export const FOUR_TRANSFORMATION_RULES: FourTransformationRule[] = getAllStarKnowledge()
  .filter((entry) => entry.starType === 'major')
  .flatMap((entry) => TRANSFORMATIONS.map((transformation) => createRule(entry.starName, transformation)));

function buildRuleResult(chart: AnalyzedChart, rule: FourTransformationRule): RuleResult | undefined {
  const locations = findStarLocations(chart, rule.starName).filter((location) =>
    matchesTransformation(chart, location, rule.transformation)
  );
  if (locations.length === 0) return undefined;

  const mutagen = TRANSFORMATION_TO_MUTAGEN[rule.transformation];
  const mutagenLabel = TRANSFORMATION_LABELS[rule.transformation];
  const ruleName = `${rule.starName}化${mutagenLabel}`;
  const evidence: Evidence[] = [];

  for (const location of locations) {
    evidence.push(
      createStarEvidence(
        chart,
        location,
        `${location.field} 顯示${ruleName}，符合生年四化條件。`,
        `${location.starName}化${mutagenLabel}`
      )
    );
    evidence.push(
      createMutagenEvidence(
        chart,
        location,
        mutagen,
        `${ruleName}的來源四化標記可由命盤資料追溯。`
      )
    );
    evidence.push(
      createPalaceEvidence(
        chart,
        { palace: location.palace, palacePosition: location.palacePosition },
        `${location.starName}化${mutagenLabel}落在${location.palace.name}。`
      )
    );
  }

  return {
    ruleId: rule.ruleId,
    ruleName,
    matched: true,
    evidence: dedupeEvidence(evidence),
    confidence: rule.conclusions[0]?.confidence ?? 0.9,
  };
}

/** Evaluate the four-transformation catalog and return matched rules only. */
export function evaluateFourTransformations(chart: AnalyzedChart): RuleResult[] {
  return FOUR_TRANSFORMATION_RULES
    .map((rule) => buildRuleResult(chart, rule))
    .filter((result): result is RuleResult => result !== undefined)
    .sort((left, right) => {
      const leftOrder = TRANSFORMATIONS.indexOf(
        FOUR_TRANSFORMATION_RULES.find((rule) => rule.ruleId === left.ruleId)?.transformation ?? 'huaJi'
      );
      const rightOrder = TRANSFORMATIONS.indexOf(
        FOUR_TRANSFORMATION_RULES.find((rule) => rule.ruleId === right.ruleId)?.transformation ?? 'huaJi'
      );
      return leftOrder - rightOrder || left.ruleId.localeCompare(right.ruleId);
    });
}
