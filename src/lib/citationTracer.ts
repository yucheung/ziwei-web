import type { AnalyzedChart } from './chartAnalyzer';
import { getPalaceKnowledge } from './palaceKnowledge';
import { getStarKnowledge, type KnowledgeSource } from './starKnowledge';

export type CitationConfidence = number;

export interface Citation {
  knowledgeId: string;
  field: string;
  source: KnowledgeSource;
  confidence: CitationConfidence;
}

export type CitationSummary = Pick<AnalyzedChart, 'palaces' | 'mutagens'>;

const STATUS_CONFIDENCE: Record<KnowledgeSource['status'], number> = {
  collected: 0.5,
  source_checked: 0.7,
  cross_supported: 0.85,
  human_approved: 1,
  disputed: 0.25,
};

export function normalizeKnowledgeSource(source: KnowledgeSource | string | null | undefined): KnowledgeSource {
  if (source && typeof source === 'object' && typeof source.library === 'string' && source.library.trim()) {
    return {
      ...source,
      library: source.library.trim(),
      reviewedBy: source.reviewedBy ?? null,
      status: source.status ?? 'collected',
    };
  }

  if (typeof source === 'string' && source.trim()) {
    return {
      library: source.trim(),
      reviewedBy: null,
      status: 'collected',
    };
  }

  return {
    library: 'unknown',
    reviewedBy: null,
    status: 'disputed',
  };
}

export function getKnowledgeSourceConfidence(source: KnowledgeSource): CitationConfidence {
  if (source.library === 'unknown') return 0.1;

  const statusConfidence = STATUS_CONFIDENCE[source.status] ?? 0.1;
  const unreviewedCap = source.reviewedBy === null || source.status === 'collected' ? 0.5 : 1;
  return Math.min(statusConfidence, unreviewedCap);
}

export function formatKnowledgeSource(source: KnowledgeSource): string {
  return source.library;
}

function addCitation(
  citations: Citation[],
  knowledgeId: string,
  source: KnowledgeSource | string | null | undefined,
  field: string,
): void {
  const normalizedSource = normalizeKnowledgeSource(source);
  citations.push({
    knowledgeId,
    field,
    source: normalizedSource,
    confidence: getKnowledgeSourceConfidence(normalizedSource),
  });
}

export function traceCitations(summary: CitationSummary): Citation[] {
  const citations: Citation[] = [];

  summary.palaces.forEach((palace, palaceIndex) => {
    const palaceKnowledge = getPalaceKnowledge(palace.name);
    if (palaceKnowledge) {
      addCitation(citations, palaceKnowledge.knowledgeId, palaceKnowledge.source, `palaces[${palaceIndex}].name`);
    }

    palace.majorStars.forEach((star, starIndex) => {
      const starKnowledge = getStarKnowledge(star.starName);
      if (starKnowledge) {
        addCitation(
          citations,
          starKnowledge.knowledgeId,
          starKnowledge.source,
          `palaces[${palaceIndex}].majorStars[${starIndex}]`
        );
      }
    });
  });

  summary.mutagens.entries.forEach((entry, entryIndex) => {
    const starKnowledge = getStarKnowledge(entry.starName);
    if (starKnowledge) {
      addCitation(citations, starKnowledge.knowledgeId, starKnowledge.source, `mutagens.entries[${entryIndex}]`);
    }
  });

  return citations;
}
