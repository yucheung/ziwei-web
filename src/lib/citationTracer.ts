import type { AnalyzedChart } from './chartAnalyzer';
import { getPalaceKnowledge } from './palaceKnowledge';
import { getStarKnowledge } from './starKnowledge';

export type CitationConfidence = 'high' | 'medium' | 'low';

export interface Citation {
  knowledgeId: string;
  field: string;
  source: string;
  confidence: CitationConfidence;
}

export type CitationSummary = Pick<AnalyzedChart, 'palaces' | 'mutagens'>;

function addCitation(citations: Citation[], knowledgeId: string, source: string, field: string): void {
  citations.push({ knowledgeId, field, source, confidence: 'high' });
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
