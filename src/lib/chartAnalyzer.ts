import type { Locale } from '../i18n/locale';
import { normalizeGender, type Gender as AstroGender } from './astro';
import type { ReadingAstrolabeLike, ReadingPalaceLike, ReadingStarLike } from './chartModel';

/** Analyzer input shape shared by real iztro astrolabes and prompt test doubles. */
export interface AstrolabeAnalyzerInput extends Omit<ReadingAstrolabeLike, 'palaces'> {
  solarDate?: string;
  time?: string;
  timeRange?: string;
  timeIndex?: number;
  palaces: AnalyzerPalaceInput[];
}

interface AnalyzerPalaceInput extends ReadingPalaceLike {
  index?: number;
  isOriginalPalace?: boolean;
}

/** Normalized gender emitted by the analyzer. */
export type Gender = Extract<AstroGender, 'male' | 'female'>;

export interface AnalyzedStar {
  starName: string;
  brightness?: string;
  mutagen?: string;
}

export interface AnalyzedPalace {
  index: number;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  isBodyPalace: boolean;
  isOriginalPalace: boolean;
  decadal?: { range: [number, number]; heavenlyStem: string; earthlyBranch: string };
  majorStars: AnalyzedStar[];
  minorStars: AnalyzedStar[];
  adjectiveStars: AnalyzedStar[];
}

export interface MutagenEntry {
  palaceIndex: number;
  palaceName: string;
  starName: string;
  mutagen: string;
}

export interface MutagenSummary {
  entries: MutagenEntry[];
}

export interface PatternSummary {
  patterns: [];
}

export interface AnalyzedChart {
  schemaVersion: '1.0';
  generatedAt: string;
  locale: Locale;
  birthData: { date: string; timeIndex: number; gender: Gender };
  palaces: AnalyzedPalace[];
  mutagens: MutagenSummary;
  patterns: PatternSummary;
}

export type StructuredSummary = AnalyzedChart;

export interface AnalyzeChartOptions {
  /** Fixed generation time for deterministic callers and tests. */
  generatedAt?: string;
}

const TIME_RANGE_TO_INDEX: Record<string, number> = {
  '00:00~01:00': 0,
  '01:00~03:00': 1,
  '03:00~05:00': 2,
  '05:00~07:00': 3,
  '07:00~09:00': 4,
  '09:00~11:00': 5,
  '11:00~13:00': 6,
  '13:00~15:00': 7,
  '15:00~17:00': 8,
  '17:00~19:00': 9,
  '19:00~21:00': 10,
  '21:00~23:00': 11,
  '23:00~00:00': 12,
};

const TIME_NAME_TO_INDEX: Array<readonly [string, number]> = [
  ['晚子', 12],
  ['早子', 0],
  ['丑', 1],
  ['寅', 2],
  ['卯', 3],
  ['辰', 4],
  ['巳', 5],
  ['午', 6],
  ['未', 7],
  ['申', 8],
  ['酉', 9],
  ['戌', 10],
  ['亥', 11],
];

function normalizeTimeRange(value: string): string {
  return value
    .replace(/[～–—-]/g, '~')
    .replace(/\s/g, '')
    .replace('：', ':');
}

function getTimeIndex(astrolabe: AstrolabeAnalyzerInput): number {
  const suppliedTimeIndex = astrolabe.timeIndex;
  if (
    suppliedTimeIndex !== undefined &&
    Number.isInteger(suppliedTimeIndex) &&
    suppliedTimeIndex >= 0 &&
    suppliedTimeIndex <= 12
  ) {
    return suppliedTimeIndex;
  }

  const range = astrolabe.timeRange ? TIME_RANGE_TO_INDEX[normalizeTimeRange(astrolabe.timeRange)] : undefined;
  if (range !== undefined) return range;

  const time = astrolabe.time || '';
  const timeByName = TIME_NAME_TO_INDEX.find(([name]) => time.includes(name));
  return timeByName?.[1] ?? 0;
}

function normalizeAstrolabeGender(value: string | undefined): Gender {
  return normalizeGender((value || 'male') as AstroGender);
}

function analyzeStar(star: ReadingStarLike): AnalyzedStar {
  const analyzed: AnalyzedStar = { starName: star.name };
  if (star.brightness) analyzed.brightness = star.brightness;
  if (star.mutagen) analyzed.mutagen = star.mutagen;
  return analyzed;
}

function analyzePalace(palace: AnalyzerPalaceInput, position: number): AnalyzedPalace {
  const analyzed: AnalyzedPalace = {
    index: palace.index ?? position,
    name: palace.name,
    heavenlyStem: palace.heavenlyStem,
    earthlyBranch: palace.earthlyBranch,
    isBodyPalace: palace.isBodyPalace ?? false,
    isOriginalPalace: palace.isOriginalPalace ?? false,
    majorStars: (palace.majorStars || []).map(analyzeStar),
    minorStars: (palace.minorStars || []).map(analyzeStar),
    adjectiveStars: (palace.adjectiveStars || []).map(analyzeStar),
  };

  if (palace.decadal) {
    analyzed.decadal = {
      range: [palace.decadal.range[0], palace.decadal.range[1]],
      heavenlyStem: palace.decadal.heavenlyStem,
      earthlyBranch: palace.decadal.earthlyBranch,
    };
  }

  return analyzed;
}

function collectMutagens(palaces: AnalyzedPalace[]): MutagenEntry[] {
  const entries: MutagenEntry[] = [];
  for (const palace of palaces) {
    const stars = [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars];
    for (const star of stars) {
      if (!star.mutagen) continue;
      entries.push({
        palaceIndex: palace.index,
        palaceName: palace.name,
        starName: star.starName,
        mutagen: star.mutagen,
      });
    }
  }
  return entries;
}

/**
 * Convert an iztro astrolabe into the deterministic v1 structured chart schema.
 *
 * This function only projects facts already present on the astrolabe. It does
 * not infer four-transformations or evaluate any pattern rules.
 */
export function analyzeChart(
  astrolabe: AstrolabeAnalyzerInput,
  locale: Locale = 'zh-TW',
  options: AnalyzeChartOptions = {}
): AnalyzedChart {
  const palaces = astrolabe.palaces.map(analyzePalace);

  return {
    schemaVersion: '1.0',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    locale,
    birthData: {
      date: astrolabe.solarDate || '',
      timeIndex: getTimeIndex(astrolabe),
      gender: normalizeAstrolabeGender(astrolabe.gender),
    },
    palaces,
    mutagens: { entries: collectMutagens(palaces) },
    patterns: { patterns: [] },
  };
}
