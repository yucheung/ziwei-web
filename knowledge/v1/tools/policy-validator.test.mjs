import { describe, expect, it } from 'vitest';
import { validatePolicies } from './policy-validator.mjs';

const source = {
  schemaVersion: 'knowledge-v1',
  sourceId: 'src-classical-facsimile',
  title: '紫微斗數全書',
  attributedAuthor: null,
  tradition: 'classical_ziwei',
  school: 'unclassified',
  schoolAttribution: 'not_explicit_in_source',
  sourceTier: 'A',
  edition: {
    editionStatement: 'institutional scan',
    publisher: null,
    publicationYear: null,
    repositoryName: 'Example Library',
  },
  access: {
    kind: 'facsimile',
    landingUrl: 'https://example.invalid/catalog',
    transcriptionUrl: null,
    facsimileUrl: 'https://example.invalid/page/12',
    accessedDate: '2026-08-08',
  },
  rights: { status: 'public_domain', redistributionAllowed: false },
  verificationStatus: 'facsimile_verified',
  notes: [],
};

const claim = {
  schemaVersion: 'knowledge-v1',
  claimId: 'claim-ziwei-life-001',
  subject: {
    kind: 'star_in_palace',
    star: '紫微',
    palace: '命宮',
    transformation: null,
    patternName: null,
  },
  assertionType: 'personality_tendency',
  assertionText: '紫微坐命的古典描述包含忠厚老成。',
  modernParaphrase: '文獻將其描述為較穩重。',
  interpretationLevel: 'close_paraphrase',
  tradition: 'classical_ziwei',
  school: 'unclassified',
  scope: { op: 'star_in_palace', star: '紫微', palace: '命宮' },
  evidence: [{
    sourceId: source.sourceId,
    locator: {
      volume: '卷二',
      chapter: '論命宮訣',
      section: null,
      page: null,
      imagePage: '12',
      urlFragment: null,
    },
    quotation: '為人忠厚老成，謙恭耿直。',
    support: 'direct',
    verification: 'facsimile_checked',
  }],
  conflictRefs: [],
  sensitivity: {
    contentType: 'neutral_claim',
    sensitivityLevel: 'none',
    categories: [],
    promptEligible: false,
  },
  lifecycle: { status: 'source_verified', supersedes: null },
};

const rule = {
  schemaVersion: 'knowledge-v1',
  ruleId: 'rule-ziwei-life-001',
  name: '紫微坐命',
  tradition: 'classical_ziwei',
  school: 'unclassified',
  ruleSetVersion: 'classical-pilot-v1',
  predicate: { op: 'star_in_palace', star: '紫微', palace: '命宮' },
  conclusionClaimIds: [claim.claimId],
  promptEligible: false,
  lifecycleStatus: 'draft',
};

const passingChecklist = {
  atomicAssertion: 'pass',
  sourceIdentity: 'pass',
  locatorResolves: 'pass',
  quotationMatches: 'pass',
  assertionSupported: 'pass',
  conditionsPreserved: 'pass',
  schoolAttribution: 'pass',
  sensitivityPolicy: 'pass',
};

function humanReview(targetType, targetId, overrides = {}) {
  return {
    schemaVersion: 'knowledge-v1',
    reviewId: `review-${targetId.replace(/^(src|claim|rule)-/u, '')}-human-01`,
    targetType,
    targetId,
    reviewerType: 'human',
    reviewerName: 'project-owner',
    reviewDate: '2026-08-08',
    decision: 'pass',
    checklist: passingChecklist,
    findingCodes: [],
    notes: 'Reviewed against the cited evidence.',
    ...overrides,
  };
}

function entry(value, line = 1, filePath) {
  const id = value.sourceId ?? value.claimId ?? value.ruleId ?? value.reviewId;
  return {
    filePath: filePath ?? `/knowledge/${id}.jsonl`,
    line,
    value,
  };
}

function repository({ sources = [source], claims = [claim], rules = [], reviews = [] } = {}) {
  return {
    sources: sources.map((value, index) => entry(value, index + 1)),
    claims: claims.map((value, index) => entry(value, index + 1)),
    rules: rules.map((value, index) => entry(value, index + 1)),
    reviews: reviews.map((value, index) => entry(value, index + 1)),
  };
}

function codes(diagnostics) {
  return diagnostics.map(({ code }) => code);
}

describe('validatePolicies provenance and approval', () => {
  it('resolves every evidence source', () => {
    expect(codes(validatePolicies(repository({ sources: [] }))))
      .toContain('REFERENCE_SOURCE_NOT_FOUND');
  });

  it('rejects unsupported named-school attribution on classical sources', () => {
    const classicalSanhe = { ...source, school: 'sanhe' };
    expect(codes(validatePolicies(repository({ sources: [classicalSanhe] }))))
      .toContain('CLASSICAL_SCHOOL_UNSUPPORTED');
  });

  it('rejects approval based only on a tier C source', () => {
    const tierCSource = {
      ...source,
      sourceTier: 'C',
      access: {
        ...source.access,
        kind: 'transcription',
        transcriptionUrl: 'https://example.invalid/text',
        facsimileUrl: null,
      },
      verificationStatus: 'metadata_verified',
    };
    const approvedClaim = {
      ...claim,
      lifecycle: { ...claim.lifecycle, status: 'human_approved' },
    };

    expect(codes(validatePolicies(repository({
      sources: [tierCSource],
      claims: [approvedClaim],
      reviews: [humanReview('claim', approvedClaim.claimId)],
    })))).toContain('APPROVED_CLAIM_SOURCE_INELIGIBLE');
  });

  it('requires a modern interpretation to have its own eligible modern source', () => {
    const unsupportedModernInterpretation = {
      ...claim,
      assertionText: '古典描述可直接推導現代職涯結論。',
      modernParaphrase: '適合科技管理職。',
      interpretationLevel: 'modern_interpretation',
      tradition: 'modern_ziwei',
      sensitivity: {
        ...claim.sensitivity,
        contentType: 'modern_interpretation',
      },
      lifecycle: { ...claim.lifecycle, status: 'human_approved' },
    };

    expect(codes(validatePolicies(repository({
      claims: [unsupportedModernInterpretation],
      reviews: [humanReview('claim', unsupportedModernInterpretation.claimId)],
    })))).toContain('MODERN_INTERPRETATION_SOURCE_MISSING');
  });

  it('requires a current passing human review for approved claims', () => {
    const approvedClaim = {
      ...claim,
      lifecycle: { ...claim.lifecycle, status: 'human_approved' },
    };
    expect(codes(validatePolicies(repository({ claims: [approvedClaim] }))))
      .toContain('HUMAN_APPROVAL_MISSING');
  });

  it('rejects a nominal pass whose atomicity checklist failed', () => {
    const approvedClaim = {
      ...claim,
      lifecycle: { ...claim.lifecycle, status: 'human_approved' },
    };
    const failedAtomicity = humanReview('claim', approvedClaim.claimId, {
      checklist: { ...passingChecklist, atomicAssertion: 'fail' },
    });

    expect(codes(validatePolicies(repository({
      claims: [approvedClaim],
      reviews: [failedAtomicity],
    })))).toContain('HUMAN_REVIEW_CHECKLIST_FAILED');
  });

  it('uses the latest human decision instead of a stale earlier pass', () => {
    const approvedClaim = {
      ...claim,
      lifecycle: { ...claim.lifecycle, status: 'human_approved' },
    };
    const earlierPass = humanReview('claim', approvedClaim.claimId, {
      reviewId: 'review-ziwei-life-human-01',
      reviewDate: '2026-08-07',
    });
    const laterNeedsWork = humanReview('claim', approvedClaim.claimId, {
      reviewId: 'review-ziwei-life-human-02',
      decision: 'needs_work',
    });

    expect(codes(validatePolicies(repository({
      claims: [approvedClaim],
      reviews: [earlierPass, laterNeedsWork],
    })))).toContain('HUMAN_APPROVAL_MISSING');
  });
});

describe('validatePolicies safety, conflicts, and rule promotion', () => {
  it('blocks restricted historical content from prompts', () => {
    const restrictedClaim = {
      ...claim,
      sensitivity: {
        contentType: 'historical_claim',
        sensitivityLevel: 'restricted',
        categories: ['fatalism'],
        promptEligible: true,
      },
      lifecycle: { ...claim.lifecycle, status: 'human_approved' },
    };

    expect(codes(validatePolicies(repository({
      claims: [restrictedClaim],
      reviews: [humanReview('claim', restrictedClaim.claimId)],
    })))).toContain('RESTRICTED_CLAIM_PROMPT_ENABLED');
  });

  it('requires conflict references to be reciprocal', () => {
    const otherClaim = {
      ...claim,
      claimId: 'claim-ziwei-life-002',
      assertionText: '另一文獻呈現相反描述。',
    };
    const oneWayConflict = { ...claim, conflictRefs: [otherClaim.claimId] };

    expect(codes(validatePolicies(repository({ claims: [oneWayConflict, otherClaim] }))))
      .toContain('CONFLICT_NOT_RECIPROCAL');
  });

  it('blocks prompt use of a draft rule', () => {
    const approvedClaim = {
      ...claim,
      sensitivity: { ...claim.sensitivity, promptEligible: true },
      lifecycle: { ...claim.lifecycle, status: 'human_approved' },
    };
    const promptDraftRule = { ...rule, promptEligible: true };

    expect(codes(validatePolicies(repository({
      claims: [approvedClaim],
      rules: [promptDraftRule],
      reviews: [humanReview('claim', approvedClaim.claimId)],
    })))).toContain('RULE_NOT_APPROVED_FOR_PROMPT');
  });

  it('blocks rules whose conclusions are not prompt eligible', () => {
    const approvedRule = {
      ...rule,
      promptEligible: true,
      lifecycleStatus: 'human_approved',
    };

    expect(codes(validatePolicies(repository({
      rules: [approvedRule],
      reviews: [humanReview('rule', approvedRule.ruleId)],
    })))).toContain('RULE_CONCLUSION_NOT_PROMPT_ELIGIBLE');
  });

  it('reports duplicate IDs and broken claim or review references', () => {
    const brokenClaim = {
      ...claim,
      conflictRefs: ['claim-missing'],
      lifecycle: { ...claim.lifecycle, supersedes: 'claim-also-missing' },
    };
    const orphanReview = humanReview('claim', 'claim-review-target-missing');
    const diagnostics = validatePolicies(repository({
      claims: [brokenClaim, { ...claim }],
      reviews: [orphanReview],
    }));

    expect(codes(diagnostics)).toEqual(expect.arrayContaining([
      'DUPLICATE_ID',
      'REFERENCE_CLAIM_NOT_FOUND',
      'REVIEW_TARGET_NOT_FOUND',
    ]));
  });
});

export { claim, humanReview, passingChecklist, repository, rule, source };
