import { describe, expect, it } from 'vitest';
import { validateRecord } from './schema-validator.mjs';

const validSource = {
  schemaVersion: 'knowledge-v1',
  sourceId: 'src-ziwei-quanshu-facsimile-v1',
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
    facsimileUrl: 'https://example.invalid/page/1',
    accessedDate: '2026-08-08',
  },
  rights: { status: 'public_domain', redistributionAllowed: false },
  verificationStatus: 'facsimile_verified',
  notes: [],
};

const validClaim = {
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
    sourceId: validSource.sourceId,
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

describe('source and claim schemas', () => {
  it('accepts complete source and atomic claim records', () => {
    expect(validateRecord('source', validSource)).toEqual([]);
    expect(validateRecord('claim', validClaim)).toEqual([]);
  });

  it('rejects free-text scope and unprefixed IDs', () => {
    const diagnostics = validateRecord('claim', {
      ...validClaim,
      claimId: 'ziwei-1',
      scope: '紫微坐命',
    });

    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SCHEMA_INVALID' }),
    ]));
  });

  it('rejects incomplete tier A provenance and undeclared fields', () => {
    const diagnostics = validateRecord('source', {
      ...validSource,
      access: { ...validSource.access, facsimileUrl: null },
      undocumentedStatus: 'verified',
    });

    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SCHEMA_INVALID' }),
    ]));
  });
});

export { validClaim, validSource };
