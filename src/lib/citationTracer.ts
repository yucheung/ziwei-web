import type { AnalyzedChart } from './chartAnalyzer';
import { getPalaceKnowledge } from './palaceKnowledge';
import { getStarKnowledge, type KnowledgeSource } from './starKnowledge';
import type { Locale } from '../i18n/locale';

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

const STATUS_LABELS: Record<Locale, Record<KnowledgeSource['status'], string>> = {
  'zh-TW': {
    collected: '未核實（未審核）',
    source_checked: '來源已查核',
    cross_supported: '交叉支持',
    human_approved: '已審核',
    disputed: '有爭議',
  },
  'zh-CN': {
    collected: '未核实',
    source_checked: '来源已查核',
    cross_supported: '交叉支持',
    human_approved: '已审核',
    disputed: '有争议',
  },
};

const REVIEWER_LABELS: Record<Locale, Record<NonNullable<KnowledgeSource['reviewedBy']>, string>> = {
  'zh-TW': { human: '人類', opus: 'Opus' },
  'zh-CN': { human: '人类', opus: 'Opus' },
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

export function formatKnowledgeSource(
  source: KnowledgeSource | string | null | undefined,
  locale: Locale = 'zh-TW',
): string {
  const normalized = normalizeKnowledgeSource(source);
  const reference = [normalized.reference, normalized.page].filter(Boolean).join(' ');
  const reviewer = normalized.reviewedBy ? ` / ${REVIEWER_LABELS[locale][normalized.reviewedBy]}` : '';
  const status = `${STATUS_LABELS[locale][normalized.status]} / ${normalized.status}${reviewer}`;
  if (normalized.reference) {
    const school = normalized.school ? `${normalized.school}, ` : '';
    const reviewerLabel = normalized.reviewedBy ? `/${REVIEWER_LABELS[locale][normalized.reviewedBy]}` : '';
    return `${reference} (${school}${STATUS_LABELS[locale][normalized.status]}${reviewerLabel}) — via ${normalized.library}`;
  }
  return `${normalized.library}${reference ? `, ${reference}` : ''} [${status}]`;
}

function addCitation(
  citations: Citation[],
  knowledgeId: string,
  source: KnowledgeSource | string | null | undefined,
  field: string,
  confidenceCap = 1,
): void {
  const normalizedSource = normalizeKnowledgeSource(source);
  citations.push({
    knowledgeId,
    field,
    source: normalizedSource,
    confidence: Math.min(getKnowledgeSourceConfidence(normalizedSource), confidenceCap ?? 1),
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
          `palaces[${palaceIndex}].majorStars[${starIndex}]`,
          starKnowledge.attributes.confidence,
        );
      }
    });
  });

  summary.mutagens.entries.forEach((entry, entryIndex) => {
    const starKnowledge = getStarKnowledge(entry.starName);
    if (starKnowledge) {
      addCitation(
        citations,
        starKnowledge.knowledgeId,
        starKnowledge.source,
        `mutagens.entries[${entryIndex}]`,
        starKnowledge.attributes.confidence,
      );
    }
  });

  return citations;
}
