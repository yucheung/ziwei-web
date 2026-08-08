import { getPalaceKnowledgeById } from '../palaceKnowledge';
import { getStarKnowledgeById } from '../starKnowledge';
import type { Evidence, RuleResult } from './types';
import type { KnowledgeSource } from '../starKnowledge';

export type RuleSourceStatus = KnowledgeSource['status'];

const STATUS_TRUST_ORDER: Record<RuleSourceStatus, number> = {
  disputed: 0,
  collected: 1,
  source_checked: 2,
  cross_supported: 3,
  human_approved: 3,
};

export const APPROVED_RULE_SOURCE_STATUSES: ReadonlySet<RuleSourceStatus> = new Set([
  'human_approved',
  'cross_supported',
]);

function getEvidenceSourceStatus(knowledgeId: string): RuleSourceStatus {
  const star = getStarKnowledgeById(knowledgeId);
  if (star) return star.source.status;

  const palace = getPalaceKnowledgeById(knowledgeId);
  if (palace) {
    return typeof palace.source === 'string'
      ? 'collected'
      : palace.source.status ?? 'collected';
  }

  return 'disputed';
}

/** Resolve the least trusted source status used by a rule. */
export function resolveRuleSourceStatus(
  evidence: readonly Evidence[],
  explicitStatus?: RuleSourceStatus,
): RuleSourceStatus {
  const statuses = [
    ...(explicitStatus ? [explicitStatus] : []),
    ...evidence.map((item) => getEvidenceSourceStatus(item.knowledgeId)),
  ];

  if (statuses.length === 0) return 'disputed';
  return statuses.reduce((leastTrusted, status) =>
    STATUS_TRUST_ORDER[status] < STATUS_TRUST_ORDER[leastTrusted] ? status : leastTrusted
  );
}

export function isApprovedRuleSourceStatus(status: RuleSourceStatus): boolean {
  return APPROVED_RULE_SOURCE_STATUSES.has(status);
}

export function capRuleConfidence(confidence: number, status: RuleSourceStatus): number {
  return isApprovedRuleSourceStatus(status) ? confidence : Math.min(confidence, 0.5);
}

export function applyRuleSourceConfidence<T extends Pick<RuleResult, 'evidence' | 'confidence'> & {
  sourceStatus?: RuleSourceStatus;
}>(result: T): T {
  const sourceStatus = resolveRuleSourceStatus(result.evidence, result.sourceStatus);
  return {
    ...result,
    sourceStatus,
    confidence: capRuleConfidence(result.confidence, sourceStatus),
  };
}
