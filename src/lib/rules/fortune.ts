import type { Locale } from '../../i18n/locale';
import { toCanonicalKey } from '../chartModel';
import type { AnalyzedChart, AnalyzedPalace, AnalyzedStar } from '../chartAnalyzer';
import { MUTAGEN_TABLE, type MutagenType } from '../flying';
import {
  canonicalMutagen,
  canonicalPalaceName,
  canonicalStarName,
  createPalaceEvidence,
  dedupeEvidence,
  getStarKnowledgeId,
  type PalaceLocation,
} from './chartFacts';
import { evaluateFourTransformations } from './fourTransformations';
import { evaluatePatterns } from './patterns';
import type { Evidence, RuleResult } from './types';

export interface FortunePeriod {
  type: 'decadal' | 'annual' | 'monthly';
  palace: string;
  stars: string[];
  mutagens: string[];
  themes: string[];
  ageRange?: [number, number];
  year?: number;
  month?: string | number;
  heavenlyStem?: string;
  earthlyBranch?: string;
}

export interface FortuneResult extends RuleResult {
  periodType: FortunePeriod['type'];
  periodLabel: string;
  palace: string;
  stars: string[];
  mutagens: string[];
  themes: string[];
}

interface ParsedMutagen {
  starName?: string;
  mutagen: string;
}

const MUTAGEN_SUFFIXES = ['祿', '禄', '權', '权', '科', '忌'] as const;
const TRANSFORMATION_ORDER: MutagenType[] = ['祿', '權', '科', '忌'];
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

function canonicalBranch(chart: AnalyzedChart, value: string): string {
  return toCanonicalKey(value, 'branch', chart.outputLocale as Locale);
}

function canonicalStem(chart: AnalyzedChart, value: string): string {
  return toCanonicalKey(value, 'stem', chart.outputLocale as Locale);
}

function parseMutagen(chart: AnalyzedChart, value: string): ParsedMutagen | undefined {
  const text = value.trim();
  const suffix = MUTAGEN_SUFFIXES.find((candidate) => text.endsWith(candidate));
  if (!suffix) return undefined;

  const mutagen = canonicalMutagen(chart, suffix);
  if (!mutagen) return undefined;

  const prefix = text.slice(0, -suffix.length).replace(/化$/u, '').trim();
  return {
    starName: prefix ? canonicalStarName(chart, prefix) : undefined,
    mutagen,
  };
}

function cloneStar(star: AnalyzedStar, mutagen?: string): AnalyzedStar {
  return { ...star, ...(mutagen ? { mutagen } : {}) };
}

function findPalaceByName(chart: AnalyzedChart, name: string): PalaceLocation | undefined {
  const canonicalName = canonicalPalaceName(chart, name);
  const palacePosition = chart.palaces.findIndex(
    (palace) => canonicalPalaceName(chart, palace.name) === canonicalName
  );
  return palacePosition >= 0
    ? { palace: chart.palaces[palacePosition], palacePosition }
    : undefined;
}

function findPalaceByBranch(chart: AnalyzedChart, branch: string): PalaceLocation | undefined {
  const canonicalValue = canonicalBranch(chart, branch);
  const palacePosition = chart.palaces.findIndex(
    (palace) => canonicalBranch(chart, palace.earthlyBranch) === canonicalValue
  );
  return palacePosition >= 0
    ? { palace: chart.palaces[palacePosition], palacePosition }
    : undefined;
}

function findPalaceByStem(chart: AnalyzedChart, stem: string): PalaceLocation | undefined {
  const canonicalValue = canonicalStem(chart, stem);
  const palacePosition = chart.palaces.findIndex(
    (palace) => canonicalStem(chart, palace.heavenlyStem) === canonicalValue
  );
  return palacePosition >= 0
    ? { palace: chart.palaces[palacePosition], palacePosition }
    : undefined;
}

function sameRange(left: [number, number], right: [number, number]): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function findPalaceByDecadalRange(chart: AnalyzedChart, range: [number, number]): PalaceLocation | undefined {
  const palacePosition = chart.palaces.findIndex(
    (palace) => palace.decadal && sameRange(palace.decadal.range, range)
  );
  return palacePosition >= 0
    ? { palace: chart.palaces[palacePosition], palacePosition }
    : undefined;
}

function resolvePeriodPalace(chart: AnalyzedChart, period: FortunePeriod): PalaceLocation | undefined {
  if (period.type === 'decadal' && period.ageRange) {
    const byRange = findPalaceByDecadalRange(chart, period.ageRange);
    if (byRange) return byRange;
  }
  if (period.type === 'annual' && period.earthlyBranch) {
    const byBranch = findPalaceByBranch(chart, period.earthlyBranch);
    if (byBranch) return byBranch;
  }
  if (period.type === 'monthly' && period.heavenlyStem) {
    const byStem = findPalaceByStem(chart, period.heavenlyStem);
    if (byStem) return byStem;
  }
  return findPalaceByName(chart, period.palace)
    ?? findPalaceByBranch(chart, period.palace)
    ?? findPalaceByStem(chart, period.palace);
}

function periodLabel(chart: AnalyzedChart, period: FortunePeriod, target: PalaceLocation): string {
  if (period.type === 'decadal') {
    const range = period.ageRange ?? target.palace.decadal?.range;
    return range ? `大限 ${range[0]}-${range[1]}` : `大限 ${target.palace.name}`;
  }

  if (period.type === 'annual') {
    const birthYear = chart.birthData.date.match(/^(\d{4})/u)?.[1];
    return `流年 ${period.year ?? birthYear ?? target.palace.earthlyBranch}`;
  }

  const month = period.month ?? period.earthlyBranch ?? target.palace.earthlyBranch;
  return `流月 ${month}月`;
}

function inferPeriodStem(chart: AnalyzedChart, period: FortunePeriod, target: PalaceLocation): string | undefined {
  if (period.heavenlyStem) return canonicalStem(chart, period.heavenlyStem);
  if (period.type === 'decadal' && target.palace.decadal?.heavenlyStem) {
    return canonicalStem(chart, target.palace.decadal.heavenlyStem);
  }
  if (period.type === 'annual' && period.year !== undefined) {
    const index = ((period.year - 4) % HEAVENLY_STEMS.length + HEAVENLY_STEMS.length) % HEAVENLY_STEMS.length;
    return HEAVENLY_STEMS[index];
  }
  return undefined;
}

function collectMutagens(chart: AnalyzedChart, period: FortunePeriod, target: PalaceLocation): Map<string, string> {
  const mutagens = new Map<string, string>();
  const unbound: string[] = [];
  const rawStarMutagens: string[] = [];

  for (const value of period.mutagens) {
    const parsed = parseMutagen(chart, value);
    if (parsed?.starName) {
      mutagens.set(parsed.starName, parsed.mutagen);
      continue;
    }
    const plainMutagen = canonicalMutagen(chart, value);
    if (plainMutagen) {
      unbound.push(plainMutagen);
      continue;
    }
    rawStarMutagens.push(canonicalStarName(chart, value));
  }

  const stem = inferPeriodStem(chart, period, target);
  const tableEntries = stem ? MUTAGEN_TABLE[stem] ?? [] : [];
  rawStarMutagens.forEach((starName, index) => {
    const tableMutagen = tableEntries.find((entry) => entry.star === starName)?.type;
    const inferredMutagen = tableMutagen ?? TRANSFORMATION_ORDER[index];
    if (inferredMutagen) mutagens.set(starName, inferredMutagen);
  });

  period.stars.forEach((starName, index) => {
    const canonicalName = canonicalStarName(chart, starName);
    const fallback = unbound[index];
    if (fallback && !mutagens.has(canonicalName)) mutagens.set(canonicalName, fallback);
  });

  return mutagens;
}

function buildPeriodChart(chart: AnalyzedChart, period: FortunePeriod, target: PalaceLocation): AnalyzedChart {
  const periodMutagens = collectMutagens(chart, period, target);
  const activeStars = new Set(period.stars.map((starName) => canonicalStarName(chart, starName)));
  const palaces = chart.palaces.map((palace, palacePosition) => {
    if (palacePosition !== target.palacePosition) {
      return {
        ...palace,
        majorStars: palace.majorStars.map((star) => ({ ...star })),
        minorStars: palace.minorStars.map((star) => ({ ...star })),
        adjectiveStars: palace.adjectiveStars.map((star) => ({ ...star })),
      };
    }

    const groups: Array<keyof Pick<AnalyzedPalace, 'majorStars' | 'minorStars' | 'adjectiveStars'>> = [
      'majorStars',
      'minorStars',
      'adjectiveStars',
    ];
    const copied = {
      ...palace,
      majorStars: palace.majorStars.map((star) => cloneStar(star, periodMutagens.get(canonicalStarName(chart, star.starName)))),
      minorStars: palace.minorStars.map((star) => cloneStar(star, periodMutagens.get(canonicalStarName(chart, star.starName)))),
      adjectiveStars: palace.adjectiveStars.map((star) => cloneStar(star, periodMutagens.get(canonicalStarName(chart, star.starName)))),
    };

    for (const starName of activeStars) {
      const exists = groups.some((group) =>
        copied[group].some((star) => canonicalStarName(chart, star.starName) === starName)
      );
      if (exists) continue;
      copied.majorStars.push({ starName, mutagen: periodMutagens.get(starName) });
    }

    return copied;
  });

  const periodEntries = [...periodMutagens.entries()].map(([starName, mutagen]) => ({
    palaceIndex: target.palace.index,
    palaceName: target.palace.name,
    starName,
    mutagen,
  }));

  return {
    ...chart,
    palaces,
    mutagens: {
      entries: [
        ...chart.mutagens.entries.map((entry) => ({ ...entry })),
        ...periodEntries,
      ],
    },
  };
}

function buildPatternContext(chart: AnalyzedChart, target: PalaceLocation): AnalyzedChart {
  if (canonicalPalaceName(chart, target.palace.name) === canonicalPalaceName(chart, '命宮')) return chart;

  const originalMingName = '本命命宮';
  return {
    ...chart,
    palaces: chart.palaces.map((palace) => {
      if (palace.index === target.palace.index) return { ...palace, name: '命宮' };
      if (canonicalPalaceName(chart, palace.name) === canonicalPalaceName(chart, '命宮')) {
        return { ...palace, name: originalMingName };
      }
      return palace;
    }),
  };
}

function contextEvidence(chart: AnalyzedChart, period: FortunePeriod, target: PalaceLocation): Evidence[] {
  const evidence: Evidence[] = [
    createPalaceEvidence(
      chart,
      target,
      `${period.type} 運限作用於${target.palace.name}。`,
      canonicalPalaceName(chart, target.palace.name)
    ),
  ];

  period.stars.forEach((starName, index) => {
    const canonicalName = canonicalStarName(chart, starName);
    evidence.push({
      knowledgeId: getStarKnowledgeId(canonicalName),
      field: `fortune.${period.type}.stars[${index}]`,
      source: 'iztro-sanhe-v1',
      value: canonicalName,
      reasoning: `${period.type} 運限啟用${canonicalName}。`,
    });
  });

  period.mutagens.forEach((mutagen, index) => {
    const parsed = parseMutagen(chart, mutagen);
    const starName = parsed?.starName
      ?? (canonicalMutagen(chart, mutagen) ? undefined : canonicalStarName(chart, mutagen));
    if (!starName) return;
    evidence.push({
      knowledgeId: getStarKnowledgeId(starName),
      field: `fortune.${period.type}.mutagens[${index}]`,
      source: 'iztro-sanhe-v1',
      value: mutagen,
      reasoning: `${period.type} 運限包含${mutagen}作用。`,
    });
  });

  return evidence;
}

function toFortuneResult(
  result: RuleResult,
  chart: AnalyzedChart,
  period: FortunePeriod,
  target: PalaceLocation,
  label: string
): FortuneResult {
  return {
    ...result,
    periodType: period.type,
    periodLabel: label,
    palace: canonicalPalaceName(chart, target.palace.name),
    stars: [...period.stars],
    mutagens: [...period.mutagens],
    themes: [...period.themes],
    evidence: dedupeEvidence([...contextEvidence(chart, period, target), ...result.evidence]),
  };
}

/** Evaluate matched four-transformation and pattern rules in one fortune context. */
export function evaluateFortune(chart: AnalyzedChart, period: FortunePeriod): FortuneResult[] {
  const target = resolvePeriodPalace(chart, period);
  if (!target || period.stars.length === 0) return [];

  const periodChart = buildPeriodChart(chart, period, target);
  const label = periodLabel(chart, period, target);
  const ruleResults = [
    ...evaluateFourTransformations(periodChart),
    ...evaluatePatterns(buildPatternContext(periodChart, target)),
  ];

  return ruleResults
    .filter((result) => result.matched)
    .map((result) => toFortuneResult(result, chart, period, target, label))
    .sort((left, right) => right.confidence - left.confidence || left.ruleId.localeCompare(right.ruleId));
}
