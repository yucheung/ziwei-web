import type { AnalyzedChart, MutagenEntry } from '../chartAnalyzer';
import {
  canonicalBranch,
  canonicalPalaceName,
  canonicalMutagen,
  canonicalStarName,
  createMutagenEvidence,
  createPalaceEvidence,
  createStarEvidence,
  findStarLocations,
  getPalaceKnowledgeId,
  getSoulPalace,
  getStarKnowledgeId,
  type PalaceLocation,
  type StarLocation,
} from '../rules/chartFacts';
import type { Evidence } from '../rules/types';
import type { ChartSide } from './types';

/** Preserve B5 provenance while identifying which analyzed chart supplied the fact. */
export function prefixEvidence(side: ChartSide, evidence: Evidence): Evidence {
  return { ...evidence, field: `${side}.${evidence.field}` };
}

export function createMatchStarEvidence(
  chart: AnalyzedChart,
  side: ChartSide,
  location: StarLocation,
  reasoning: string
): Evidence {
  return prefixEvidence(side, createStarEvidence(chart, location, reasoning));
}

export function createMatchPalaceEvidence(
  chart: AnalyzedChart,
  side: ChartSide,
  location: PalaceLocation,
  reasoning: string
): Evidence {
  return prefixEvidence(side, createPalaceEvidence(chart, location, reasoning));
}

/** Branch facts deliberately use palace knowledge, because the branch belongs to a palace position. */
export function createMatchBranchEvidence(chart: AnalyzedChart, side: ChartSide, reasoning: string): Evidence | undefined {
  const soulPalace = getSoulPalace(chart);
  if (!soulPalace) return undefined;

  const palaceName = canonicalPalaceName(chart, soulPalace.palace.name);
  const branch = canonicalBranch(chart, soulPalace.palace.earthlyBranch);
  return prefixEvidence(side, {
    knowledgeId: getPalaceKnowledgeId(palaceName),
    field: `palaces[${soulPalace.palacePosition}].earthlyBranch`,
    source: 'iztro-sanhe-v1',
    value: branch,
    reasoning,
  });
}

export function createMatchMutagenEvidence(
  chart: AnalyzedChart,
  side: ChartSide,
  entry: MutagenEntry,
  entryIndex: number,
  reasoning: string
): Evidence | undefined {
  const mutagen = canonicalMutagen(chart, entry.mutagen);
  if (!mutagen) return undefined;

  const starName = canonicalStarName(chart, entry.starName);
  const location = findStarLocations(chart, entry.starName).find((candidate) =>
    candidate.palace.index === entry.palaceIndex
  );
  if (location) return prefixEvidence(side, createMutagenEvidence(chart, location, mutagen, reasoning));

  return prefixEvidence(side, {
    knowledgeId: getStarKnowledgeId(starName),
    field: `mutagens.entries[${entryIndex}]`,
    source: 'iztro-sanhe-v1',
    value: `${starName}化${mutagen}`,
    reasoning,
  });
}
