import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JsonLineError, loadJsonLines } from './load-jsonl.mjs';
import { compareDiagnostics, validatePolicies } from './policy-validator.mjs';
import { validateRecord } from './schema-validator.mjs';

const COLLECTIONS = [
  { name: 'sources', recordType: 'source' },
  { name: 'claims', recordType: 'claim' },
  { name: 'rules', recordType: 'rule' },
  { name: 'reviews', recordType: 'review' },
];

async function listJsonLineFiles(repositoryPath, collection) {
  const directory = path.join(repositoryPath, collection);
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
      .map((entry) => path.join(directory, entry.name))
      .sort();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const flatFile = path.join(repositoryPath, `${collection}.jsonl`);
    await stat(flatFile);
    return [flatFile];
  }
}

async function loadRepository(repositoryPath) {
  const repository = {
    sources: [],
    claims: [],
    rules: [],
    reviews: [],
  };
  const diagnostics = [];

  for (const { name } of COLLECTIONS) {
    for (const filePath of await listJsonLineFiles(repositoryPath, name)) {
      try {
        repository[name].push(...await loadJsonLines(filePath));
      } catch (error) {
        if (!(error instanceof JsonLineError)) throw error;
        diagnostics.push({
          code: error.code,
          filePath: error.filePath,
          line: error.line,
          message: error.message,
        });
      }
    }
  }

  return { diagnostics, repository };
}

function validateSchemas(repository) {
  const diagnostics = [];
  const validRepository = {
    sources: [],
    claims: [],
    rules: [],
    reviews: [],
  };

  for (const { name, recordType } of COLLECTIONS) {
    for (const entry of repository[name]) {
      const schemaDiagnostics = validateRecord(recordType, entry.value);
      if (schemaDiagnostics.length === 0) {
        validRepository[name].push(entry);
        continue;
      }

      diagnostics.push(...schemaDiagnostics.map((diagnostic) => ({
        code: diagnostic.code,
        filePath: entry.filePath,
        line: entry.line,
        message: `${diagnostic.path} ${diagnostic.message}`,
      })));
    }
  }

  return { diagnostics, validRepository };
}

export async function validateRepository(repositoryPath) {
  const absolutePath = path.resolve(repositoryPath);
  const loaded = await loadRepository(absolutePath);
  const schemaResult = validateSchemas(loaded.repository);
  const diagnostics = [
    ...loaded.diagnostics,
    ...schemaResult.diagnostics,
    ...validatePolicies(schemaResult.validRepository),
  ].sort(compareDiagnostics);

  return {
    counts: Object.fromEntries(COLLECTIONS.map(({ name }) => [
      name,
      loaded.repository[name].length,
    ])),
    diagnostics,
  };
}

function formatDiagnostic(diagnostic) {
  return `${diagnostic.code} ${diagnostic.filePath}:${diagnostic.line} ${diagnostic.message}`;
}

async function main() {
  const repositoryPath = process.argv[2] ?? 'knowledge/v1';
  const { counts, diagnostics } = await validateRepository(repositoryPath);

  if (diagnostics.length > 0) {
    process.stderr.write(`${diagnostics.map(formatDiagnostic).join('\n')}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `Knowledge validation passed: ${counts.sources} sources, ${counts.claims} claims, `
      + `${counts.rules} rules, ${counts.reviews} reviews\n`,
  );
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (import.meta.url === invokedUrl) {
  await main();
}
