import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadJsonLines } from './load-jsonl.mjs';

const CLAIMS_PATH = path.resolve('knowledge/v1/claims/pilot-3stars.jsonl');
const REVIEWS_PATH = path.resolve('knowledge/v1/reviews/pilot-3stars.jsonl');
const RULES_DIR = path.resolve('knowledge/v1/rules');

describe('pilot acceptance', () => {
  let claims;
  let reviews;

  beforeAll(async () => {
    claims = await loadJsonLines(CLAIMS_PATH);
    reviews = await loadJsonLines(REVIEWS_PATH);
  });

  it('has exactly 15 claims and 15 reviews, one-to-one', () => {
    expect(claims).toHaveLength(15);
    expect(new Set(claims.map(({ value }) => value.claimId)).size).toBe(15);
    expect(reviews).toHaveLength(15);

    for (const { value: claim } of claims) {
      const matching = reviews.filter(({ value }) => value.targetId === claim.claimId);
      expect(matching).toHaveLength(1);
      // reviewId matches the claimId pattern: review-<claimId without claim->-<reviewer>
      expect(matching[0].value.reviewId).toBe(
        `review-${claim.claimId.slice('claim-'.length)}-model-01`,
      );
    }
  });

  it('keeps every claim in draft, not prompt eligible, not human approved', () => {
    for (const { value: claim } of claims) {
      expect(claim.lifecycle.status).toBe('draft');
      expect(claim.sensitivity.promptEligible).toBe(false);
      // No humanApproved field in the v1 claim schema; approval is derived
      // from lifecycle status, so 'draft' means humanApproved: false.
      expect(claim.lifecycle.humanApproved).toBeUndefined();
      expect(claim.lifecycle.status).not.toBe('human_approved');
    }
  });

  it('keeps every review as needs_work with unverified quotation and conditions', () => {
    for (const { value: review } of reviews) {
      expect(review.decision).toBe('needs_work');
      expect(review.decision).not.toBe('pass');
      // Checklist results are pass/fail/not_applicable; "false" == "fail".
      expect(review.checklist.conditionsPreserved).toBe('fail');
      expect(review.checklist.conditionsPreserved).not.toBe('pass');
      expect(review.checklist.quotationMatches).toBe('fail');
      expect(review.checklist.quotationMatches).not.toBe('pass');
    }
  });

  it('has zero rules in the rules collection', async () => {
    const ruleFiles = (await readdir(RULES_DIR, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
      .map((entry) => path.join(RULES_DIR, entry.name));

    const ruleRecords = (await Promise.all(ruleFiles.map((file) => loadJsonLines(file)))).flat();
    expect(ruleRecords).toHaveLength(0);
  });

  it('blocks source identity on every review', () => {
    for (const { value: review } of reviews) {
      expect(review.checklist.sourceIdentity).toBe('blocked');
    }
  });
});
