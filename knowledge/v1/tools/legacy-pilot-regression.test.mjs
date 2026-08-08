import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateRecord } from './schema-validator.mjs';

describe('legacy pilot boundary', () => {
  it('does not accept or rewrite an unchanged legacy claim as knowledge v1', async () => {
    const pilotPath = path.resolve('docs/research/pilot-3stars.json');
    const before = await readFile(pilotPath);
    const legacyPilot = JSON.parse(before.toString('utf8'));
    const legacyClaim = legacyPilot[0].claims[0];

    expect(validateRecord('claim', legacyClaim)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'SCHEMA_INVALID' }),
      ]),
    );

    const after = await readFile(pilotPath);
    const digest = (content) => createHash('sha256').update(content).digest('hex');
    expect(digest(after)).toBe(digest(before));
  });
});
