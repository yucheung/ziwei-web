import type { AppLocale, IFunctionalAstrolabe } from '../chartModel';
import {
  getHoroscopeSummary,
  type HoroscopeSummary,
} from '../fortunes';
import type { AnalyzedChart, AnalyzedPalace, AnalyzedStar } from '../chartAnalyzer';
import { getStarKnowledge } from '../starKnowledge';
import {
  canonicalBranch,
  canonicalMutagen,
  canonicalPalaceName,
  canonicalStarName,
  createPalaceEvidence,
  dedupeEvidence,
  findPalaceByIndex,
  type PalaceLocation,
} from './chartFacts';
import { evaluateFourTransformations } from './fourTransformations';
import { evaluatePatterns } from './patterns';
import type { Evidence, RuleResult } from './types';

export type FortunePeriodType = 'decadal' | 'annual' | 'monthly';

export interface FortunePeriod {
  type: FortunePeriodType;
  palace: string;
  stars: string[];
  mutagens: string[];
  themes: string[];
  /** Original `astrolabe.palaces` index supplied by HoroscopeSummary. */
  palaceIndex?: number;
  /** Scope-renamed palace names supplied by HoroscopeSummary. */
  palaceNames?: string[];
  ageRange?: [number, number];
  year?: number;
  month?: string | number;
  heavenlyStem?: string;
  earthlyBranch?: string;
}

export interface FortunePeriodOptions {
  themes?: string[];
  targetDate?: string | Date;
  locale?: AppLocale;
  timeIndex?: number;
}

export interface FortuneResult extends RuleResult {
  periodType: FortunePeriodType;
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
const TRANSFORMATION_ORDER = ['祿', '權', '科', '忌'] as const;

function summaryScope(summary: HoroscopeSummary, type: FortunePeriodType): HoroscopeSummary['decadal'] {
  if (type === 'decadal') return summary.decadal;
  if (type === 'annual') return summary.yearly;
  return summary.monthly;
}

function parseStemBranch(stemBranch: string): { heavenlyStem?: string; earthlyBranch?: string } {
  if (!stemBranch) return {};
  return {
    heavenlyStem: stemBranch.slice(0, 1) || undefined,
    earthlyBranch: stemBranch.slice(1) || undefined,
  };
}

function summaryYear(summary: HoroscopeSummary): number | undefined {
  const match = summary.solarDate.match(/^(\d{4})/u);
  if (!match) return undefined;
  return Number(match[1]);
}

/** Convert one authoritative HoroscopeSummary scope into a rule-engine period. */
export function fortunePeriodFromHoroscopeSummary(
  summary: HoroscopeSummary,
  type: FortunePeriodType,
  options: Pick<FortunePeriodOptions, 'themes'> = {},
): FortunePeriod {
  const scope = summaryScope(summary, type);
  const { heavenlyStem, earthlyBranch } = parseStemBranch(scope.stemBranch);
  const mutagenEntries = [
    { star: scope.mutagen.lu, suffix: '祿' },
    { star: scope.mutagen.quan, suffix: '權' },
    { star: scope.mutagen.ke, suffix: '科' },
    { star: scope.mutagen.ji, suffix: '忌' },
  ].filter((entry) => entry.star && entry.star !== '-');
  const ageRange = type === 'decadal'
    ? summary.decadalTable.find((item) => item.index === scope.index)?.range
    : undefined;

  return {
    type,
    palace: scope.palaceNames[scope.index] ?? scope.name,
    palaceIndex: scope.index,
    palaceNames: scope.palaceNames,
    stars: mutagenEntries.map((entry) => entry.star),
    mutagens: mutagenEntries.map((entry) => `${entry.star}化${entry.suffix}`),
    themes: [...(options.themes ?? [])],
    ...(ageRange ? { ageRange: [ageRange[0], ageRange[1]] as [number, number] } : {}),
    ...(type === 'annual' ? { year: summaryYear(summary) } : {}),
    ...(type === 'monthly' ? { month: earthlyBranch } : {}),
    heavenlyStem,
    earthlyBranch,
  };
}

/** Short alias for callers that prefer a `to*` adapter name. */
export const toFortunePeriod = fortunePeriodFromHoroscopeSummary;

function isHoroscopeSummary(source: HoroscopeSummary | IFunctionalAstrolabe): source is HoroscopeSummary {
  return 'rawHoroscope' in source;
}

/**
 * Build a FortunePeriod from either an existing summary or an astrolabe.
 * The astrolabe path intentionally delegates all progression to getHoroscopeSummary.
 */
export function createFortunePeriod(
  source: HoroscopeSummary,
  type: FortunePeriodType,
  options?: FortunePeriodOptions,
): FortunePeriod;
export function createFortunePeriod(
  source: IFunctionalAstrolabe,
  type: FortunePeriodType,
  options?: FortunePeriodOptions,
): FortunePeriod;
export function createFortunePeriod(
  source: HoroscopeSummary | IFunctionalAstrolabe,
  type: FortunePeriodType,
  options: FortunePeriodOptions = {},
): FortunePeriod {
  const summary = isHoroscopeSummary(source)
    ? source
    : getHoroscopeSummary(source, options.targetDate, options.locale ?? 'zh-TW', options.timeIndex);
  return fortunePeriodFromHoroscopeSummary(summary, type, options);
}

function parseMutagen(chart: AnalyzedChart, value: string): ParsedMutagen | undefined {
  const text = value.trim();
  const suffix = MUTAGEN_SUFFIXES.find((candidate) => text.endsWith(candidate));
  if (!suffix) return undefined;

  const canonicalSuffix = suffix === '禄' ? '祿' : suffix === '权' ? '權' : suffix;
  const mutagen = canonicalMutagen(chart, canonicalSuffix);
  if (!mutagen) return undefined;

  const prefix = text.slice(0, -suffix.length).replace(/化$/u, '').trim();
  return {
    starName: prefix ? canonicalStarName(chart, prefix) : undefined,
    mutagen,
  };
}

function findPalaceByName(chart: AnalyzedChart, name: string): PalaceLocation | undefined {
  const canonicalName = canonicalPalaceName(chart, name);
  const palacePosition = chart.palaces.findIndex(
    (palace) => canonicalPalaceName(chart, palace.name) === canonicalName,
  );
  return palacePosition >= 0
    ? { palace: chart.palaces[palacePosition], palacePosition }
    : undefined;
}

function findPalaceByBranch(chart: AnalyzedChart, branch: string): PalaceLocation | undefined {
  const canonicalValue = canonicalBranch(chart, branch);
  const palacePosition = chart.palaces.findIndex(
    (palace) => canonicalBranch(chart, palace.earthlyBranch) === canonicalValue,
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
    (palace) => palace.decadal && sameRange(palace.decadal.range, range),
  );
  return palacePosition >= 0
    ? { palace: chart.palaces[palacePosition], palacePosition }
    : undefined;
}

function resolvePeriodPalace(chart: AnalyzedChart, period: FortunePeriod): PalaceLocation | undefined {
  if (period.palaceIndex !== undefined) {
    const byIndex = findPalaceByIndex(chart, period.palaceIndex);
    if (byIndex) return byIndex;
  }
  if (period.type === 'decadal' && period.ageRange) {
    const byRange = findPalaceByDecadalRange(chart, period.ageRange);
    if (byRange) return byRange;
  }
  if (period.type === 'annual' && period.earthlyBranch) {
    const byBranch = findPalaceByBranch(chart, period.earthlyBranch);
    if (byBranch) return byBranch;
  }
  return findPalaceByName(chart, period.palace) ?? findPalaceByBranch(chart, period.palace);
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

function collectMutagens(chart: AnalyzedChart, period: FortunePeriod): Map<string, string> {
  const mutagens = new Map<string, string>();
  const unbound: string[] = [];
  const rawStarMutagens: string[] = [];

  for (const value of period.mutagens) {
    const parsed = parseMutagen(chart, value);
    if (parsed?.starName) {
      mutagens.set(parsed.starName, parsed.mutagen);
      continue;
    }
    if (canonicalMutagen(chart, value)) {
      unbound.push(canonicalMutagen(chart, value)!);
      continue;
    }
    rawStarMutagens.push(canonicalStarName(chart, value));
  }

  rawStarMutagens.forEach((starName, index) => {
    const inferredMutagen = TRANSFORMATION_ORDER[index];
    if (inferredMutagen) mutagens.set(starName, inferredMutagen);
  });

  period.stars.forEach((starName, index) => {
    const canonicalName = canonicalStarName(chart, starName);
    const fallback = unbound[index];
    if (fallback && !mutagens.has(canonicalName)) mutagens.set(canonicalName, fallback);
  });

  return mutagens;
}

function scopedPalaceName(period: FortunePeriod, palace: AnalyzedPalace): string {
  return period.palaceNames?.[palace.index] ?? palace.name;
}

function buildPeriodChart(chart: AnalyzedChart, period: FortunePeriod, target: PalaceLocation): AnalyzedChart {
  const periodMutagens = collectMutagens(chart, period);
  const palaces = chart.palaces.map((palace) => {
    const copied: AnalyzedPalace = {
      ...palace,
      name: scopedPalaceName(period, palace),
      majorStars: palace.majorStars.map((star) => ({ ...star })),
      minorStars: palace.minorStars.map((star) => ({ ...star })),
      adjectiveStars: palace.adjectiveStars.map((star) => ({ ...star })),
    };

    if (palace.index !== target.palace.index) return copied;

    period.stars.forEach((starName, index) => {
      const canonicalName = canonicalStarName(chart, starName);
      const mutagen = periodMutagens.get(canonicalName);
      const overlay: AnalyzedStar = {
        starName: canonicalName,
        evidenceField: `fortune.${period.type}.stars[${index}]`,
        ...(mutagen ? { mutagen } : {}),
      };
      copied.majorStars.push(overlay);
    });

    return copied;
  });

  return { ...chart, palaces };
}

function targetScopeName(chart: AnalyzedChart, period: FortunePeriod, target: PalaceLocation): string {
  return canonicalPalaceName(chart, scopedPalaceName(period, target.palace));
}

function scopeReasoning(
  chart: AnalyzedChart,
  period: FortunePeriod,
  target: PalaceLocation,
  label: string,
): string {
  const targetName = targetScopeName(chart, period, target);
  const scope = period.type === 'decadal'
    ? `${label}歲期間`
    : period.type === 'annual'
      ? `${label}年期間`
      : `${label}期間`;
  return `${scope}，${targetName}`;
}

function contextEvidence(
  chart: AnalyzedChart,
  period: FortunePeriod,
  target: PalaceLocation,
  label: string,
): Evidence[] {
  const scope = scopeReasoning(chart, period, target, label);
  const evidence: Evidence[] = [
    createPalaceEvidence(
      chart,
      target,
      `${scope}；原始命盤宮位為${canonicalPalaceName(chart, target.palace.name)}。`,
      canonicalPalaceName(chart, target.palace.name),
    ),
  ];

  period.stars.forEach((starName, index) => {
    const canonicalName = canonicalStarName(chart, starName);
    const knowledge = getStarKnowledge(canonicalName);
    if (!knowledge) return;
    evidence.push({
      knowledgeId: knowledge.knowledgeId,
      field: `fortune.${period.type}.stars[${index}]`,
      source: 'iztro-sanhe-v1',
      value: canonicalName,
      reasoning: `${scope}；啟用${canonicalName}。`,
    });
  });

  period.mutagens.forEach((mutagen, index) => {
    const parsed = parseMutagen(chart, mutagen);
    const starName = parsed?.starName
      ?? (canonicalMutagen(chart, mutagen) ? undefined : canonicalStarName(chart, mutagen));
    if (!starName || !getStarKnowledge(starName)) return;
    evidence.push({
      knowledgeId: getStarKnowledge(starName)!.knowledgeId,
      field: `fortune.${period.type}.mutagens[${index}]`,
      source: 'iztro-sanhe-v1',
      value: mutagen,
      reasoning: `${scope}；包含${mutagen}作用。`,
    });
  });

  return evidence;
}

function toFortuneResult(
  result: RuleResult,
  chart: AnalyzedChart,
  period: FortunePeriod,
  target: PalaceLocation,
  label: string,
): FortuneResult {
  const scope = scopeReasoning(chart, period, target, label);
  const targetName = targetScopeName(chart, period, target);
  return {
    ...result,
    periodType: period.type,
    periodLabel: label,
    palace: targetName,
    stars: [...period.stars],
    mutagens: [...period.mutagens],
    themes: [...period.themes],
    evidence: dedupeEvidence([
      ...contextEvidence(chart, period, target, label),
      ...result.evidence.map((item) => ({
        ...item,
        reasoning: `${scope}；${item.reasoning}`,
      })),
    ]),
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
    ...evaluatePatterns(periodChart),
  ];

  return ruleResults
    .filter((result) => result.matched)
    .map((result) => toFortuneResult(result, chart, period, target, label))
    .sort((left, right) => right.confidence - left.confidence || left.ruleId.localeCompare(right.ruleId));
}
