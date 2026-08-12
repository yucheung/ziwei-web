import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadJsonLines } from './load-jsonl.mjs';

const CLAIMS_PATH = path.resolve('knowledge/v1/claims/pilot-3stars.jsonl');
const REVIEWS_PATH = path.resolve('knowledge/v1/reviews/pilot-3stars.jsonl');
const RULES_DIR = path.resolve('knowledge/v1/rules');
const RULES_PILOT_PATH = path.resolve('knowledge/v1/rules/pilot-3stars.jsonl');
const HUMAN_REVIEW_PACKAGE_PATH = path.resolve('knowledge/v1/reviews/pilot-3stars.md');

const EXPECTED_CLAIM_IDS = [
  'claim-ziwei-life-001',
  'claim-ziwei-life-002',
  'claim-ziwei-life-003',
  'claim-ziwei-life-004',
  'claim-ziwei-life-005',
  'claim-tianji-life-001',
  'claim-tianji-life-002',
  'claim-tianji-life-003',
  'claim-tianji-life-004',
  'claim-tianji-life-005',
  'claim-qisha-life-001',
  'claim-qisha-life-002',
  'claim-qisha-life-003',
  'claim-qisha-life-004',
  'claim-qisha-life-005',
];

describe('pilot acceptance', () => {
  let claims;
  let reviews;

  beforeAll(async () => {
    claims = await loadJsonLines(CLAIMS_PATH);
    reviews = await loadJsonLines(REVIEWS_PATH);
  });

  it('has exactly the 15 expected claim IDs', () => {
    expect(claims).toHaveLength(15);
    expect(claims.map(({ value }) => value.claimId).sort()).toEqual(
      [...EXPECTED_CLAIM_IDS].sort(),
    );
  });

  it('has a 1:1 review mapping for every claim', () => {
    expect(reviews).toHaveLength(15);

    for (const { value: claim } of claims) {
      const matching = reviews.filter(({ value }) => value.targetId === claim.claimId);
      expect(matching).toHaveLength(1);
      expect(matching[0].value.reviewId).toBe(
        `review-${claim.claimId.slice('claim-'.length)}-model-01`,
      );
    }
  });

  it('keeps every claim in draft and not prompt eligible', () => {
    for (const { value: claim } of claims) {
      expect(claim.lifecycle.status).toBe('draft');
      expect(claim.sensitivity.promptEligible).toBe(false);
    }
  });

  it('keeps every review as needs_work with source identity blocked', () => {
    for (const { value: review } of reviews) {
      expect(review.decision).toBe('needs_work');
      expect(review.checklist.sourceIdentity).toBe('blocked');
    }
  });

  it('marks conditionsPreserved as pass for every review', () => {
    for (const { value: review } of reviews) {
      expect(review.checklist.conditionsPreserved).toBe('pass');
    }
  });

  it('grounds every claim in the wikisource source with direct support', () => {
    for (const { value: claim } of claims) {
      expect(claim.evidence[0].sourceId).toBe('src-ziwei-quanshu-wikisource-transcription');
      expect(claim.evidence[0].support).toBe('direct');
    }
  });

  it('gives every claim a resolvable locator', () => {
    for (const { value: claim } of claims) {
      const { page, imagePage, urlFragment } = claim.evidence[0].locator;
      const hasLocator = [page, imagePage, urlFragment].some(
        (field) => typeof field === 'string' && field.length > 0,
      );
      expect(hasLocator).toBe(true);
    }
  });

  it('has zero rules in the rules collection', async () => {
    const ruleFiles = (await readdir(RULES_DIR, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
      .map((entry) => path.join(RULES_DIR, entry.name));

    const ruleRecords = (await Promise.all(ruleFiles.map((file) => loadJsonLines(file)))).flat();
    expect(ruleRecords).toHaveLength(0);
  });

  it('keeps the rules pilot placeholder file empty', async () => {
    const stats = await stat(RULES_PILOT_PATH);
    expect(stats.size).toBe(1);
  });

  it('has a complete blocked human review package', async () => {
    const stats = await stat(HUMAN_REVIEW_PACKAGE_PATH);
    expect(stats.size).toBeGreaterThan(0);
    const reviewPackage = await readFile(HUMAN_REVIEW_PACKAGE_PATH, 'utf8');

    for (const claimId of EXPECTED_CLAIM_IDS) {
      expect(reviewPackage).toContain(claimId);
    }

    expect(reviewPackage.match(/blocked/gu)?.length ?? 0).toBeGreaterThanOrEqual(15);
    expect(reviewPackage).toContain('非產品');
    expect(reviewPackage).toContain('待查入口');
    expect(reviewPackage).toContain('Google Books 1964 竹林書局（id=if1IAAAAMAAJ）');
    expect(reviewPackage).toContain('國家圖書館古籍影像檢索 rbook.ncl.edu.tw');
  });
});
