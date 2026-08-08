import { readFile } from 'node:fs/promises';

export class JsonLineError extends Error {
  constructor(filePath, line, cause) {
    super(`Invalid JSON at ${filePath}:${line}: ${cause.message}`, { cause });
    this.name = 'JsonLineError';
    this.code = 'JSON_PARSE_ERROR';
    this.filePath = filePath;
    this.line = line;
  }
}

export async function loadJsonLines(filePath) {
  const text = await readFile(filePath, 'utf8');
  const records = [];

  for (const [index, raw] of text.split(/\r?\n/u).entries()) {
    if (!raw.trim()) continue;

    try {
      records.push({
        filePath,
        line: index + 1,
        value: JSON.parse(raw),
      });
    } catch (error) {
      throw new JsonLineError(filePath, index + 1, error);
    }
  }

  return records;
}
