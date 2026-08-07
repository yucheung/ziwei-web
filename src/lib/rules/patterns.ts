import type { AnalyzedChart } from '../chartAnalyzer';
import {
  canonicalBranch,
  createPalaceEvidence,
  createStarEvidence,
  dedupeEvidence,
  findStarLocations,
  getAdjacentPalaceLocations,
  getSoulPalace,
  getSurroundedPalaceLocations,
  hasMutagen,
  type PalaceLocation,
  type StarLocation,
} from './chartFacts';
import type { Evidence, PatternResult, PatternRule, RuleConclusion, RuleCondition } from './types';

export type { Evidence, PatternResult, PatternRule } from './types';

const BRANCHES = [
  ['子', 'zi'],
  ['丑', 'chou'],
  ['寅', 'yin'],
  ['卯', 'mao'],
  ['辰', 'chen'],
  ['巳', 'si'],
  ['午', 'wu'],
  ['未', 'wei'],
  ['申', 'shen'],
  ['酉', 'you'],
  ['戌', 'xu'],
  ['亥', 'hai'],
] as const;

const RULE_SOURCE = {
  source: 'iztro-sanhe-v1' as const,
  school: 'sanhe' as const,
  ruleSetVersion: 'sanhe-v1' as const,
};

const ZIWEI_SYSTEM_STARS = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞'];
const TIANFU_SYSTEM_STARS = ['天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'];

function conclusion(type: RuleConclusion['type'], description: string, confidence = 0.85): RuleConclusion {
  return { type, description, confidence };
}

function condition(type: RuleCondition['type'], params: Record<string, unknown>): RuleCondition {
  return { type, params };
}

function branchRule(starName: string, branch: string, branchKey: string, system: string): PatternRule {
  const systemKey = starName === '紫微' ? 'ziwei' : 'tianfu';
  return {
    ruleId: `pattern-${systemKey}-${branchKey}`,
    patternName: `${starName}在${branch}格`,
    conditions: [condition('starInPalace', { starName, earthlyBranch: branch })],
    conclusions: [
      conclusion(
        'personalityTrait',
        `${starName}落${branch}，形成${system}星系的定位條件，需結合命宮三方四正觀察。`
      ),
    ],
    ...RULE_SOURCE,
  };
}

const ZIWEI_BRANCH_RULES = BRANCHES.map(([branch, branchKey]) => branchRule('紫微', branch, branchKey, '紫微'));
const TIANFU_BRANCH_RULES = BRANCHES.map(([branch, branchKey]) => branchRule('天府', branch, branchKey, '天府'));

function samePalaceRule(ruleId: string, patternName: string, stars: string[]): PatternRule {
  return {
    ruleId,
    patternName,
    conditions: [condition('palaceRelationship', { relationship: 'samePalace', stars })],
    conclusions: [conclusion('personalityTrait', `${stars.join('、')}同宮，形成${patternName.replace(/格$/u, '')}的結構條件.`, 0.9)],
    ...RULE_SOURCE,
  };
}

function sanheRule(ruleId: string, patternName: string, stars: string[]): PatternRule {
  return {
    ruleId,
    patternName,
    conditions: [condition('palaceRelationship', { relationship: 'sanhe', palace: '命宮', stars })],
    conclusions: [conclusion('fortuneEffect', `${stars.join('、')}分布於命宮三方四正，形成${patternName.replace(/格$/u, '')}的結構條件.`, 0.9)],
    ...RULE_SOURCE,
  };
}

function adjacentRule(ruleId: string, patternName: string, stars: string[]): PatternRule {
  return {
    ruleId,
    patternName,
    conditions: [condition('palaceRelationship', { relationship: 'adjacentTo', palace: '命宮', stars })],
    conclusions: [conclusion('relationshipDynamic', `${stars.join('、')}夾命，形成${patternName.replace(/格$/u, '')}的結構條件.`, 0.85)],
    ...RULE_SOURCE,
  };
}

function systemAtMingRule(ruleId: string, patternName: string, system: string, stars: string[]): PatternRule {
  return {
    ruleId,
    patternName,
    conditions: [condition('starInPalace', { palace: '命宮', system, stars })],
    conclusions: [conclusion('personalityTrait', `命宮坐${system}星系主星，形成${patternName.replace(/格$/u, '')}的結構條件.`, 0.85)],
    ...RULE_SOURCE,
  };
}

export const PATTERN_RULES: PatternRule[] = [
  ...ZIWEI_BRANCH_RULES,
  ...TIANFU_BRANCH_RULES,
  samePalaceRule('pattern-ziwei-tianfu-same-palace', '紫府同宮格', ['紫微', '天府']),
  samePalaceRule('pattern-ziwei-tianxiang-same-palace', '紫相同宮格', ['紫微', '天相']),
  samePalaceRule('pattern-ziwei-pojun-same-palace', '紫破同宮格', ['紫微', '破軍']),
  samePalaceRule('pattern-ziwei-tanlang-same-palace', '紫貪同宮格', ['紫微', '貪狼']),
  samePalaceRule('pattern-ri-yue-same-palace', '日月同宮格', ['太陽', '太陰']),
  samePalaceRule('pattern-chang-qu-same-palace', '昌曲同宮格', ['文昌', '文曲']),
  samePalaceRule('pattern-zuo-you-same-palace', '左右同宮格', ['左輔', '右弼']),
  sanheRule('pattern-sha-po-lang', '殺破狼格', ['七殺', '破軍', '貪狼']),
  sanheRule('pattern-ji-yue-tong-liang', '機月同梁格', ['天機', '太陰', '天同', '天梁']),
  sanheRule('pattern-yang-liang-chang-lu', '陽梁昌祿格', ['太陽', '天梁', '文昌', '祿存']),
  {
    ruleId: 'pattern-san-qi-jia-hui',
    patternName: '三奇嘉會格',
    conditions: [
      condition('palaceRelationship', { relationship: 'sanhe', palace: '命宮', transformations: ['huaLu', 'huaQuan', 'huaKe'] }),
      condition('mutagenPresent', { transformations: ['huaLu', 'huaQuan', 'huaKe'] }),
    ],
    conclusions: [conclusion('fortuneEffect', '命宮三方四正同時會聚祿、權、科三種生年四化。', 0.92)],
    ...RULE_SOURCE,
  },
  adjacentRule('pattern-kui-yue-clamp-ming', '魁鉞夾命格', ['天魁', '天鉞']),
  adjacentRule('pattern-yang-tuo-clamp-ming', '羊陀夾命格', ['擎羊', '陀羅']),
  adjacentRule('pattern-huo-ling-clamp-ming', '火鈴夾命格', ['火星', '鈴星']),
  adjacentRule('pattern-kong-jie-clamp-ming', '空劫夾命格', ['地空', '地劫']),
  systemAtMingRule('pattern-ziwei-system-ming', '命宮紫微星系格局', '紫微', ZIWEI_SYSTEM_STARS),
  systemAtMingRule('pattern-tianfu-system-ming', '命宮天府星系格局', '天府', TIANFU_SYSTEM_STARS),
];

export const PATTERN_RULES_V1 = PATTERN_RULES;

function locationsInPalaces(locations: StarLocation[], palaces: PalaceLocation[]): StarLocation[] {
  const palaceIndexes = new Set(palaces.map((location) => location.palace.index));
  return locations.filter((location) => palaceIndexes.has(location.palace.index));
}

function addLocationEvidence(
  chart: AnalyzedChart,
  evidence: Evidence[],
  locations: StarLocation[],
  reasoning: string
): void {
  for (const location of locations) {
    evidence.push(createStarEvidence(chart, location, reasoning));
  }
}

function addPalaceEvidence(
  chart: AnalyzedChart,
  evidence: Evidence[],
  palace: PalaceLocation,
  reasoning: string
): void {
  evidence.push(createPalaceEvidence(chart, palace, reasoning));
}

function findSamePalaceEvidence(chart: AnalyzedChart, stars: string[]): { locations: StarLocation[]; palace: PalaceLocation } | undefined {
  const firstLocations = findStarLocations(chart, stars[0] ?? '');
  for (const first of firstLocations) {
    const samePalaceLocations = stars.flatMap((starName) =>
      findStarLocations(chart, starName).filter((location) => location.palace.index === first.palace.index)
    );
    const foundNames = new Set(samePalaceLocations.map((location) => location.starName));
    if (stars.every((starName) => foundNames.has(starName))) {
      return {
        locations: samePalaceLocations,
        palace: { palace: first.palace, palacePosition: first.palacePosition },
      };
    }
  }
  return undefined;
}

function findSanheEvidence(chart: AnalyzedChart, stars: string[]): { locations: StarLocation[]; palaces: PalaceLocation[] } | undefined {
  const soulPalace = getSoulPalace(chart);
  if (!soulPalace) return undefined;
  const sanhePalaces = getSurroundedPalaceLocations(chart, soulPalace);
  const locations = stars.flatMap((starName) =>
    locationsInPalaces(findStarLocations(chart, starName), sanhePalaces)
  );
  const foundNames = new Set(locations.map((location) => location.starName));
  return stars.every((starName) => foundNames.has(starName)) ? { locations, palaces: sanhePalaces } : undefined;
}

function findAdjacentEvidence(chart: AnalyzedChart, stars: string[]): { locations: StarLocation[]; palaces: PalaceLocation[] } | undefined {
  const soulPalace = getSoulPalace(chart);
  if (!soulPalace) return undefined;
  const adjacentPalaces = getAdjacentPalaceLocations(chart, soulPalace);
  const locations = stars.flatMap((starName) =>
    locationsInPalaces(findStarLocations(chart, starName), adjacentPalaces)
  );
  const foundNames = new Set(locations.map((location) => location.starName));
  const hasBothSides = adjacentPalaces.every((palace) => locations.some((location) => location.palace.index === palace.palace.index));
  return stars.every((starName) => foundNames.has(starName)) && hasBothSides
    ? { locations, palaces: adjacentPalaces }
    : undefined;
}

function findBranchEvidence(chart: AnalyzedChart, rule: PatternRule): { locations: StarLocation[]; palace: PalaceLocation } | undefined {
  const starName = String(rule.conditions[0]?.params.starName ?? '');
  const branch = String(rule.conditions[0]?.params.earthlyBranch ?? '');
  const locations = findStarLocations(chart, starName).filter(
    (location) => canonicalBranch(chart, location.palace.earthlyBranch) === branch
  );
  const first = locations[0];
  return first
    ? { locations, palace: { palace: first.palace, palacePosition: first.palacePosition } }
    : undefined;
}

function findSystemAtMingEvidence(chart: AnalyzedChart, rule: PatternRule): { locations: StarLocation[]; palace: PalaceLocation } | undefined {
  const soulPalace = getSoulPalace(chart);
  if (!soulPalace) return undefined;
  const stars = Array.isArray(rule.conditions[0]?.params.stars) ? rule.conditions[0].params.stars : [];
  const locations = stars.flatMap((starName) =>
    findStarLocations(chart, String(starName)).filter((location) => location.palace.index === soulPalace.palace.index)
  );
  return locations.length > 0 ? { locations, palace: soulPalace } : undefined;
}

function findSanqiEvidence(chart: AnalyzedChart): { locations: StarLocation[]; palaces: PalaceLocation[] } | undefined {
  const soulPalace = getSoulPalace(chart);
  if (!soulPalace) return undefined;
  const sanhePalaces = getSurroundedPalaceLocations(chart, soulPalace);
  const matched = ['huaLu', 'huaQuan', 'huaKe'].flatMap((transformation) =>
    locationsInPalaces(hasMutagen(chart, transformation as 'huaLu' | 'huaQuan' | 'huaKe'), sanhePalaces)
      .map((location) => ({ location, transformation }))
  );
  const locations = matched.map((entry) => entry.location);
  const transformations = new Set(matched.map((entry) => entry.transformation));
  return transformations.size === 3 ? { locations, palaces: sanhePalaces } : undefined;
}

function evaluatePatternEvidence(chart: AnalyzedChart, rule: PatternRule): Evidence[] | undefined {
  const evidence: Evidence[] = [];
  const firstCondition = rule.conditions[0];

  if (firstCondition?.type === 'starInPalace' && firstCondition.params.earthlyBranch !== undefined) {
    const branchMatch = findBranchEvidence(chart, rule);
    if (!branchMatch) return undefined;
    addLocationEvidence(chart, evidence, branchMatch.locations, `${rule.patternName}的星曜位置條件成立。`);
    addPalaceEvidence(chart, evidence, branchMatch.palace, `${rule.patternName}的地支位置條件成立。`);
    return evidence;
  }

  if (rule.ruleId === 'pattern-san-qi-jia-hui') {
    const sanqi = findSanqiEvidence(chart);
    if (!sanqi) return undefined;
    addLocationEvidence(chart, evidence, sanqi.locations, '祿、權、科三種四化皆在命宮三方四正出現。');
    for (const palace of sanqi.palaces) addPalaceEvidence(chart, evidence, palace, '此宮位屬於命宮三方四正範圍。');
    return evidence;
  }

  if (rule.ruleId === 'pattern-ziwei-system-ming' || rule.ruleId === 'pattern-tianfu-system-ming') {
    const systemMatch = findSystemAtMingEvidence(chart, rule);
    if (!systemMatch) return undefined;
    addLocationEvidence(chart, evidence, systemMatch.locations, `${rule.patternName}的命宮星系條件成立。`);
    addPalaceEvidence(chart, evidence, systemMatch.palace, '命宮知識條件成立。');
    return evidence;
  }

  const relationship = firstCondition?.params.relationship;
  const stars = Array.isArray(firstCondition?.params.stars)
    ? firstCondition.params.stars.map(String)
    : [];

  if (relationship === 'samePalace') {
    const samePalace = findSamePalaceEvidence(chart, stars);
    if (!samePalace) return undefined;
    addLocationEvidence(chart, evidence, samePalace.locations, `${rule.patternName}的同宮條件成立。`);
    addPalaceEvidence(chart, evidence, samePalace.palace, '指定星曜位於同一宮位。');
    return evidence;
  }

  if (relationship === 'sanhe') {
    const sanhe = findSanheEvidence(chart, stars);
    if (!sanhe) return undefined;
    addLocationEvidence(chart, evidence, sanhe.locations, `${rule.patternName}的三方四正條件成立。`);
    for (const palace of sanhe.palaces) addPalaceEvidence(chart, evidence, palace, '此宮位屬於命宮三方四正範圍。');
    return evidence;
  }

  if (relationship === 'adjacentTo') {
    const adjacent = findAdjacentEvidence(chart, stars);
    if (!adjacent) return undefined;
    addLocationEvidence(chart, evidence, adjacent.locations, `${rule.patternName}的夾宮條件成立。`);
    for (const palace of adjacent.palaces) addPalaceEvidence(chart, evidence, palace, '此宮位與命宮相鄰，構成夾宮。');
    return evidence;
  }

  return undefined;
}

/** Evaluate the sanhe-v1 pattern catalog and return matched patterns only. */
export function evaluatePatterns(chart: AnalyzedChart): PatternResult[] {
  return PATTERN_RULES
    .map((rule): PatternResult | undefined => {
      const evidence = evaluatePatternEvidence(chart, rule);
      if (!evidence) return undefined;
      return {
        ruleId: rule.ruleId,
        ruleName: rule.patternName,
        matched: true,
        evidence: dedupeEvidence(evidence),
        confidence: rule.conclusions[0]?.confidence ?? 0.85,
      };
    })
    .filter((result): result is PatternResult => result !== undefined);
}
