import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const validator = 'knowledge/v1/tools/validate.mjs';

describe('knowledge repository command', () => {
  it('passes a valid repository with deterministic counts', async () => {
    const { stderr, stdout } = await execFileAsync(process.execPath, [
      validator,
      'knowledge/v1/tools/fixtures/valid',
    ]);

    expect(stderr).toBe('');
    expect(stdout).toBe('Knowledge validation passed: 1 sources, 1 claims, 1 rules, 1 reviews\n');
  });

  it.each([
    ['inaccessible-modern-source', 'APPROVED_CLAIM_SOURCE_INELIGIBLE'],
    ['classical-sanhe', 'CLASSICAL_SCHOOL_UNSUPPORTED'],
    ['failed-atomicity', 'HUMAN_REVIEW_CHECKLIST_FAILED'],
    ['unsupported-modern-inference', 'HUMAN_REVIEW_CHECKLIST_FAILED'],
    ['restricted-prompt', 'RESTRICTED_CLAIM_PROMPT_ENABLED'],
    ['unpaired-conflict', 'CONFLICT_NOT_RECIPROCAL'],
  ])('fails the %s fixture with %s', async (fixture, expectedCode) => {
    await expect(execFileAsync(process.execPath, [
      validator,
      `knowledge/v1/tools/fixtures/invalid/${fixture}`,
    ])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining(expectedCode),
    });
  });
});
