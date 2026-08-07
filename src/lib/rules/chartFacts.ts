import type { Locale } from '../../i18n/locale';
import { getPalaceKnowledge } from '../palaceKnowledge';
import type { AnalyzedChart, AnalyzedPalace, AnalyzedStar } from '../chartAnalyzer';
import { getStarKnowledge } from '../starKnowledge';
import { getSurroundedIndices, toCanonicalKey } from '../chartModel';
import { MUTAGEN_TABLE, type MutagenType } from '../flying';
import type { Evidence, TransformationKey } from './types';

export const TRANSFORMATION_TO_MUTAGEN: Record<TransformationKey, MutagenType> = {
  huaLu: '祿',
  huaQuan: '權',
  huaKe: '科',
  huaJi: '忌',
};

export const MUTAGEN_TO_TRANSFORMATION: Record<MutagenType, TransformationKey> = {
  '祿': 'huaLu',
  '權': 'huaQuan',
  '科': 'huaKe',
  '忌': 'huaJi',
};

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

const STAR_KNOWLEDGE_FALLBACK_KEYS: Record<string, string> = {
  '祿存': 'lucun',
};

export interface StarLocation {
  palace: AnalyzedPalace;
  palacePosition: number;
  star: AnalyzedStar;
  starPosition: number;
  starGroup: 'majorStars' | 'minorStars' | 'adjectiveStars';
  starName: string;
  field: string;
}

export interface PalaceLocation {
  palace: AnalyzedPalace;
  palacePosition: number;
}

function canonical(value: string, category: 'star' | 'palace' | 'mutagen' | 'branch', locale: Locale): string {
  return toCanonicalKey(value, category, locale);
}

export function canonicalStarName(chart: AnalyzedChart, value: string): string {
  return canonical(value, 'star', chart.outputLocale);
}

export function canonicalPalaceName(chart: AnalyzedChart, value: string): string {
  return canonical(value, 'palace', chart.outputLocale);
}

export function canonicalMutagen(chart: AnalyzedChart, value: string): MutagenType | undefined {
  const result = canonical(value, 'mutagen', chart.outputLocale);
  return result === '祿' || result === '權' || result === '科' || result === '忌' ? result : undefined;
}

export function canonicalBranch(chart: AnalyzedChart, value: string): string {
  return canonical(value, 'branch', chart.outputLocale);
}

export function getStarLocations(chart: AnalyzedChart): StarLocation[] {
  const locations: StarLocation[] = [];
  const groups = ['majorStars', 'minorStars', 'adjectiveStars'] as const;

  chart.palaces.forEach((palace, palacePosition) => {
    for (const starGroup of groups) {
      palace[starGroup].forEach((star, starPosition) => {
        locations.push({
          palace,
          palacePosition,
          star,
          starPosition,
          starGroup,
          starName: canonicalStarName(chart, star.starName),
          field: star.evidenceField ?? `palaces[${palacePosition}].${starGroup}[${starPosition}]`,
        });
      });
    }
  });

  return locations;
}

export function findStarLocations(chart: AnalyzedChart, starName: string): StarLocation[] {
  const canonicalName = canonicalStarName(chart, starName);
  return getStarLocations(chart).filter((location) => location.starName === canonicalName);
}

export function getPalaceLocations(chart: AnalyzedChart): PalaceLocation[] {
  return chart.palaces.map((palace, palacePosition) => ({ palace, palacePosition }));
}

export function findPalaceLocations(chart: AnalyzedChart, palaceName: string): PalaceLocation[] {
  const canonicalName = canonicalPalaceName(chart, palaceName);
  return getPalaceLocations(chart).filter(
    (location) => canonicalPalaceName(chart, location.palace.name) === canonicalName
  );
}

export function findPalaceByIndex(chart: AnalyzedChart, index: number): PalaceLocation | undefined {
  return getPalaceLocations(chart).find((location) => location.palace.index === index);
}

export function getSoulPalace(chart: AnalyzedChart): PalaceLocation | undefined {
  return findPalaceLocations(chart, '命宮')[0] ?? getPalaceLocations(chart)[0];
}

export function getSurroundedPalaceLocations(chart: AnalyzedChart, target: PalaceLocation): PalaceLocation[] {
  const indices = getSurroundedIndices(target.palace.index);
  const indexSet = new Set([indices.targetIndex, indices.oppositeIndex, indices.wealthIndex, indices.careerIndex]);
  return getPalaceLocations(chart).filter((location) => indexSet.has(location.palace.index));
}

export function getAdjacentPalaceLocations(chart: AnalyzedChart, target: PalaceLocation): PalaceLocation[] {
  const indexSet = new Set([
    ((target.palace.index - 1) % 12 + 12) % 12,
    (target.palace.index + 1) % 12,
  ]);
  return getPalaceLocations(chart).filter((location) => indexSet.has(location.palace.index));
}

export function getStarKnowledgeId(starName: string): string {
  return getStarKnowledge(starName)?.knowledgeId ?? `star-${STAR_KNOWLEDGE_FALLBACK_KEYS[starName] ?? starName}`;
}

export function getPalaceKnowledgeId(palaceName: string): string {
  return getPalaceKnowledge(palaceName)?.knowledgeId ?? `palace-${palaceName}`;
}

export function createStarEvidence(
  _chart: AnalyzedChart,
  location: StarLocation,
  reasoning: string,
  value = location.starName
): Evidence {
  return {
    knowledgeId: getStarKnowledgeId(location.starName),
    field: location.field,
    source: 'iztro-sanhe-v1',
    value,
    reasoning,
  };
}

export function createMutagenEvidence(
  chart: AnalyzedChart,
  location: StarLocation,
  mutagen: MutagenType,
  reasoning: string
): Evidence {
  const entryIndex = chart.mutagens.entries.findIndex((entry) =>
    canonicalStarName(chart, entry.starName) === location.starName
    && entry.palaceIndex === location.palace.index
    && canonicalMutagen(chart, entry.mutagen) === mutagen
  );
  const starMarkerField = `${location.field}.mutagen`;
  return {
    knowledgeId: getStarKnowledgeId(location.starName),
    field: entryIndex >= 0 ? `mutagens.entries[${entryIndex}]` : starMarkerField,
    source: 'iztro-sanhe-v1',
    value: `${location.starName}化${mutagen}`,
    reasoning,
  };
}

export function createPalaceEvidence(
  chart: AnalyzedChart,
  location: PalaceLocation,
  reasoning: string,
  value = canonicalPalaceName(chart, location.palace.name)
): Evidence {
  return {
    knowledgeId: getPalaceKnowledgeId(value),
    field: `palaces[${location.palacePosition}].name`,
    source: 'iztro-sanhe-v1',
    value,
    reasoning,
  };
}

export function dedupeEvidence(evidence: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    const key = `${item.knowledgeId}|${item.field}|${item.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface MutagenFact {
  starName: string;
  mutagen: MutagenType;
}

function getSourceMutagenFacts(chart: AnalyzedChart): MutagenFact[] {
  const facts: MutagenFact[] = [];
  const add = (starName: string, mutagen: string | undefined): void => {
    const canonicalName = canonicalStarName(chart, starName);
    const canonicalMutagenValue = mutagen ? canonicalMutagen(chart, mutagen) : undefined;
    if (!canonicalMutagenValue) return;
    if (!facts.some((fact) => fact.starName === canonicalName && fact.mutagen === canonicalMutagenValue)) {
      facts.push({ starName: canonicalName, mutagen: canonicalMutagenValue });
    }
  };

  for (const entry of chart.mutagens.entries) add(entry.starName, entry.mutagen);
  for (const location of getStarLocations(chart)) add(location.starName, location.star.mutagen);
  return facts;
}

function inferYearStemFromSourceMutagens(chart: AnalyzedChart): string | undefined {
  const sourceFacts = getSourceMutagenFacts(chart);
  if (sourceFacts.length < 4) return undefined;

  const candidates = Object.entries(MUTAGEN_TABLE).filter(([, entries]) =>
    entries.every((entry) => sourceFacts.some((fact) => fact.starName === entry.star && fact.mutagen === entry.type))
  );
  return candidates.length === 1 ? candidates[0][0] : undefined;
}

function inferYearStemFromBirthDate(chart: AnalyzedChart): string | undefined {
  const match = chart.birthData.date.match(/^(\d{4})/u);
  if (!match) return undefined;
  const year = Number(match[1]);
  return HEAVENLY_STEMS[((year - 4) % HEAVENLY_STEMS.length + HEAVENLY_STEMS.length) % HEAVENLY_STEMS.length];
}

export function inferYearStem(chart: AnalyzedChart): string | undefined {
  return inferYearStemFromSourceMutagens(chart)
    ?? inferYearStemFromBirthDate(chart)
    ?? chart.palaces[0]?.heavenlyStem;
}

function getDirectMutagen(chart: AnalyzedChart, location: StarLocation): MutagenType | undefined {
  const marker = canonicalMutagen(chart, location.star.mutagen || '');
  if (marker) return marker;
  return getSourceMutagenFacts(chart).find((fact) => fact.starName === location.starName)?.mutagen;
}

export function matchesTransformation(
  chart: AnalyzedChart,
  location: StarLocation,
  transformation: TransformationKey
): boolean {
  const expectedMutagen = TRANSFORMATION_TO_MUTAGEN[transformation];
  const directMutagen = getDirectMutagen(chart, location);
  if (directMutagen) return directMutagen === expectedMutagen;

  const yearStem = inferYearStem(chart);
  return MUTAGEN_TABLE[yearStem ?? '']?.some(
    (entry) => entry.star === location.starName && entry.type === expectedMutagen
  ) ?? false;
}

export function hasMutagen(chart: AnalyzedChart, transformation: TransformationKey): StarLocation[] {
  const expectedMutagen = TRANSFORMATION_TO_MUTAGEN[transformation];
  return getStarLocations(chart).filter((location) => {
    const directMutagen = getDirectMutagen(chart, location);
    if (directMutagen) return directMutagen === expectedMutagen;
    const yearStem = inferYearStem(chart);
    return MUTAGEN_TABLE[yearStem ?? '']?.some(
      (entry) => entry.star === location.starName && entry.type === expectedMutagen
    ) ?? false;
  });
}
