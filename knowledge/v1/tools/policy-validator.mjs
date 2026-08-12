const ID_FIELDS = {
  sources: 'sourceId',
  claims: 'claimId',
  rules: 'ruleId',
  reviews: 'reviewId',
};

const APPROVAL_CHECKS = {
  source: ['sourceIdentity', 'locatorResolves', 'schoolAttribution'],
  claim: [
    'atomicAssertion',
    'sourceIdentity',
    'locatorResolves',
    'quotationMatches',
    'assertionSupported',
    'conditionsPreserved',
    'schoolAttribution',
    'sensitivityPolicy',
  ],
  rule: ['conditionsPreserved', 'schoolAttribution', 'sensitivityPolicy'],
};

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function compareDiagnostics(left, right) {
  return compareText(left.code, right.code)
    || compareText(left.filePath, right.filePath)
    || left.line - right.line
    || compareText(left.message, right.message);
}

function addDiagnostic(diagnostics, code, entry, message) {
  diagnostics.push({
    code,
    filePath: entry.filePath,
    line: entry.line,
    message,
  });
}

function indexRecords(repository, diagnostics) {
  const indexes = {};

  for (const [collection, idField] of Object.entries(ID_FIELDS)) {
    const index = new Map();
    for (const entry of repository[collection] ?? []) {
      const id = entry.value[idField];
      if (index.has(id)) {
        addDiagnostic(
          diagnostics,
          'DUPLICATE_ID',
          entry,
          `Duplicate ${idField} ${id}`,
        );
        continue;
      }
      index.set(id, entry);
    }
    indexes[collection] = index;
  }

  return indexes;
}

function latestHumanReview(reviews, targetType, targetId) {
  const candidates = reviews
    .filter(({ value }) => value.targetType === targetType
      && value.targetId === targetId
      && value.reviewerType === 'human')
    .sort((left, right) => compareText(left.value.reviewDate, right.value.reviewDate)
      || compareText(left.value.reviewId, right.value.reviewId));

  return candidates.at(-1);
}

function checklistPasses(review, targetType) {
  return APPROVAL_CHECKS[targetType]
    .every((field) => review.value.checklist[field] === 'pass');
}

function validateHumanApproval({
  diagnostics,
  entry,
  reviews,
  targetType,
  targetId,
}) {
  const latest = latestHumanReview(reviews, targetType, targetId);
  if (!latest || latest.value.decision !== 'pass') {
    addDiagnostic(
      diagnostics,
      'HUMAN_APPROVAL_MISSING',
      entry,
      `${targetId} is approved without a current passing human review`,
    );
    return false;
  }

  if (!checklistPasses(latest, targetType)) {
    addDiagnostic(
      diagnostics,
      'HUMAN_REVIEW_CHECKLIST_FAILED',
      entry,
      `${targetId} has a passing decision with an incomplete or failed checklist`,
    );
    return false;
  }

  return true;
}

function hasApprovedSchoolAttribution(sourceEntry, reviews) {
  const source = sourceEntry.value;
  if (source.schoolAttribution !== 'approved_editorial_classification') return false;
  const latest = latestHumanReview(reviews, 'source', source.sourceId);
  return Boolean(latest
    && latest.value.decision === 'pass'
    && checklistPasses(latest, 'source'));
}

function validateReviewTargets(repository, indexes, diagnostics) {
  const targetCollections = {
    source: indexes.sources,
    claim: indexes.claims,
    rule: indexes.rules,
  };

  for (const entry of repository.reviews ?? []) {
    const targets = targetCollections[entry.value.targetType];
    if (!targets?.has(entry.value.targetId)) {
      addDiagnostic(
        diagnostics,
        'REVIEW_TARGET_NOT_FOUND',
        entry,
        `Review target ${entry.value.targetType}:${entry.value.targetId} was not found`,
      );
    }
  }
}

function validateSources(repository, diagnostics) {
  for (const entry of repository.sources ?? []) {
    const source = entry.value;
    const namedSchool = source.school !== 'unclassified';
    if (source.tradition === 'classical_ziwei'
      && namedSchool
      && !hasApprovedSchoolAttribution(entry, repository.reviews ?? [])) {
      addDiagnostic(
        diagnostics,
        'CLASSICAL_SCHOOL_UNSUPPORTED',
        entry,
        `${source.sourceId} assigns classical material to ${source.school} without approved attribution`,
      );
    }

    if (source.sourceTier === 'C' && source.access.kind === 'unattributed_pdf') {
      addDiagnostic(
        diagnostics,
        'SOURCE_TIER_ACCESS_KIND_MISMATCH',
        entry,
        `${source.sourceId} is tier C but uses unattributed_pdf access, which is reserved for lower tiers`,
      );
    }

    if (source.sourceTier === 'E') {
      const identityPassReviews = (repository.reviews ?? []).filter(({ value }) => (
        value.targetType === 'source'
          && value.targetId === source.sourceId
          && value.checklist?.sourceIdentity === 'pass'
      ));
      for (const reviewEntry of identityPassReviews) {
        addDiagnostic(
          diagnostics,
          'TIER_E_SOURCE_IDENTITY_PASS',
          reviewEntry,
          `${reviewEntry.value.reviewId} marks sourceIdentity pass for unattributed tier E source ${source.sourceId}`,
        );
      }
    }
  }
}

function isEligibleApprovalEvidence(evidence, sourceEntry) {
  if (!sourceEntry) return false;
  const source = sourceEntry.value;
  return evidence.support === 'direct'
    && evidence.verification === 'facsimile_checked'
    && ['A', 'B'].includes(source.sourceTier)
    && source.verificationStatus === 'facsimile_verified';
}

function validateClaimSchool(entry, sourceEntries, repository, diagnostics) {
  const claim = entry.value;
  if (claim.tradition !== 'classical_ziwei' || claim.school === 'unclassified') return;

  const supported = sourceEntries.length > 0 && sourceEntries.every((sourceEntry) => (
    sourceEntry.value.school === claim.school
      && hasApprovedSchoolAttribution(sourceEntry, repository.reviews ?? [])
  ));

  if (!supported) {
    addDiagnostic(
      diagnostics,
      'CLASSICAL_SCHOOL_UNSUPPORTED',
      entry,
      `${claim.claimId} assigns a classical claim to ${claim.school} without approved source attribution`,
    );
  }
}

function validateClaims(repository, indexes, diagnostics) {
  for (const entry of repository.claims ?? []) {
    const claim = entry.value;
    const sourceEntries = [];

    for (const evidence of claim.evidence) {
      const sourceEntry = indexes.sources.get(evidence.sourceId);
      if (!sourceEntry) {
        addDiagnostic(
          diagnostics,
          'REFERENCE_SOURCE_NOT_FOUND',
          entry,
          `${claim.claimId} references missing source ${evidence.sourceId}`,
        );
      } else {
        sourceEntries.push(sourceEntry);
      }
    }

    validateClaimSchool(entry, sourceEntries, repository, diagnostics);

    for (const conflictId of claim.conflictRefs) {
      const conflictEntry = indexes.claims.get(conflictId);
      if (!conflictEntry) {
        addDiagnostic(
          diagnostics,
          'REFERENCE_CLAIM_NOT_FOUND',
          entry,
          `${claim.claimId} references missing conflicting claim ${conflictId}`,
        );
      } else if (!conflictEntry.value.conflictRefs.includes(claim.claimId)) {
        addDiagnostic(
          diagnostics,
          'CONFLICT_NOT_RECIPROCAL',
          entry,
          `${claim.claimId} references ${conflictId}, but the conflict is not reciprocal`,
        );
      }
    }

    const supersedes = claim.lifecycle.supersedes;
    if (supersedes && !indexes.claims.has(supersedes)) {
      addDiagnostic(
        diagnostics,
        'REFERENCE_CLAIM_NOT_FOUND',
        entry,
        `${claim.claimId} supersedes missing claim ${supersedes}`,
      );
    }

    if (claim.lifecycle.status === 'human_approved') {
      const hasEligibleEvidence = claim.evidence.some((evidence) => (
        isEligibleApprovalEvidence(evidence, indexes.sources.get(evidence.sourceId))
      ));
      if (!hasEligibleEvidence) {
        addDiagnostic(
          diagnostics,
          'APPROVED_CLAIM_SOURCE_INELIGIBLE',
          entry,
          `${claim.claimId} lacks direct facsimile-checked evidence from a verified tier A or B source`,
        );
      }

      if (claim.interpretationLevel === 'modern_interpretation') {
        const hasEligibleModernEvidence = claim.evidence.some((evidence) => {
          const sourceEntry = indexes.sources.get(evidence.sourceId);
          return isEligibleApprovalEvidence(evidence, sourceEntry)
            && ['modern_ziwei', 'academic'].includes(sourceEntry.value.tradition);
        });
        if (!hasEligibleModernEvidence) {
          addDiagnostic(
            diagnostics,
            'MODERN_INTERPRETATION_SOURCE_MISSING',
            entry,
            `${claim.claimId} lacks eligible modern or academic evidence for its modern interpretation`,
          );
        }
      }

      validateHumanApproval({
        diagnostics,
        entry,
        reviews: repository.reviews ?? [],
        targetType: 'claim',
        targetId: claim.claimId,
      });
    }

    if (claim.sensitivity.promptEligible) {
      if (claim.sensitivity.contentType === 'historical_claim'
        || claim.sensitivity.sensitivityLevel === 'restricted') {
        addDiagnostic(
          diagnostics,
          'RESTRICTED_CLAIM_PROMPT_ENABLED',
          entry,
          `${claim.claimId} exposes restricted or historical content to prompts`,
        );
      } else if (claim.lifecycle.status !== 'human_approved') {
        addDiagnostic(
          diagnostics,
          'CLAIM_NOT_APPROVED_FOR_PROMPT',
          entry,
          `${claim.claimId} is prompt eligible before human approval`,
        );
      }
    }
  }
}

function validateRules(repository, indexes, diagnostics) {
  for (const entry of repository.rules ?? []) {
    const rule = entry.value;
    const conclusionEntries = [];

    for (const claimId of rule.conclusionClaimIds) {
      const claimEntry = indexes.claims.get(claimId);
      if (!claimEntry) {
        addDiagnostic(
          diagnostics,
          'REFERENCE_CLAIM_NOT_FOUND',
          entry,
          `${rule.ruleId} references missing conclusion claim ${claimId}`,
        );
      } else {
        conclusionEntries.push(claimEntry);
      }
    }

    if (rule.school !== 'unclassified'
      && conclusionEntries.some(({ value }) => value.school !== rule.school)) {
      addDiagnostic(
        diagnostics,
        'RULE_SCHOOL_MORE_SPECIFIC',
        entry,
        `${rule.ruleId} is more school-specific than at least one conclusion claim`,
      );
    }

    if (rule.lifecycleStatus === 'human_approved') {
      validateHumanApproval({
        diagnostics,
        entry,
        reviews: repository.reviews ?? [],
        targetType: 'rule',
        targetId: rule.ruleId,
      });
    }

    if (rule.promptEligible) {
      if (rule.lifecycleStatus !== 'human_approved') {
        addDiagnostic(
          diagnostics,
          'RULE_NOT_APPROVED_FOR_PROMPT',
          entry,
          `${rule.ruleId} is prompt eligible before human approval`,
        );
      }

      for (const claimEntry of conclusionEntries) {
        const conclusion = claimEntry.value;
        if (conclusion.lifecycle.status !== 'human_approved'
          || !conclusion.sensitivity.promptEligible
          || conclusion.sensitivity.contentType === 'historical_claim'
          || conclusion.sensitivity.sensitivityLevel === 'restricted') {
          addDiagnostic(
            diagnostics,
            'RULE_CONCLUSION_NOT_PROMPT_ELIGIBLE',
            entry,
            `${rule.ruleId} references ineligible conclusion ${conclusion.claimId}`,
          );
        }
      }
    }
  }
}

export function validatePolicies(repository) {
  const diagnostics = [];
  const indexes = indexRecords(repository, diagnostics);

  validateReviewTargets(repository, indexes, diagnostics);
  validateSources(repository, diagnostics);
  validateClaims(repository, indexes, diagnostics);
  validateRules(repository, indexes, diagnostics);

  return diagnostics.sort(compareDiagnostics);
}
