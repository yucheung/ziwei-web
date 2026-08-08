import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadJsonLines } from './load-jsonl.mjs';

describe('loadJsonLines', () => {
  it('ignores blank lines and preserves one-based line numbers', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'knowledge-jsonl-'));
    const file = path.join(dir, 'records.jsonl');
    await writeFile(file, '\n{"sourceId":"src-one"}\n\n{"sourceId":"src-two"}\n', 'utf8');

    await expect(loadJsonLines(file)).resolves.toEqual([
      { filePath: file, line: 2, value: { sourceId: 'src-one' } },
      { filePath: file, line: 4, value: { sourceId: 'src-two' } },
    ]);
  });

  it('reports malformed JSON with a stable code, file, and line', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'knowledge-jsonl-'));
    const file = path.join(dir, 'records.jsonl');
    await writeFile(file, '{"sourceId":}\n', 'utf8');

    await expect(loadJsonLines(file)).rejects.toMatchObject({
      name: 'JsonLineError',
      code: 'JSON_PARSE_ERROR',
      filePath: file,
      line: 1,
    });
  });
});
