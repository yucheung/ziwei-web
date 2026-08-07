# B3 ChartAnalyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic v1 structured chart analyzer, preserve the existing Markdown summary API, and include the structured JSON summary in reading system prompts.

**Architecture:** `src/lib/chartAnalyzer.ts` is a pure adapter over iztro-shaped astrolabe data. It projects source-order palaces/stars, collects only existing star mutagen markers, recovers iztro's time index from exposed time fields, and emits a versioned `AnalyzedChart`; prompt formatting consumes that result without adding rule inference. `summarizeAstrolabe()` keeps its current localized Markdown output by formatting analyzed palace data alongside the original basic astrolabe fields.

**Tech Stack:** TypeScript, iztro 2.5.8, React/Vite project types, Vitest, ESLint.

## Global Constraints

- `MutagenSummary` only aggregates mutagen markers already present on palace stars; it must not infer rules.
- `PatternSummary.patterns` is always `[]`; pattern rules are deferred to B5.
- `birthData.gender` is normalized to `'male' | 'female'` through `src/lib/astro.ts`.
- `birthData.date` comes from iztro `solarDate`; `birthData.timeIndex` comes from iztro-exposed `timeRange`/`time` and distinguishes early/late Zi.
- New prompt labels must have both `zh-TW` and `zh-CN` variants; no locale is hardcoded as the only output language.
- Existing Markdown summary wording and layout remain backward compatible.
- Do not modify `.hermes/` or the pre-existing unrelated working-tree edit in `src/lib/chartModel.ts`.
- Use `npm test` (not global `vitest`) for tests, `npm run build` for build, and ESLint for lint verification.

---

### Task 1: Add the v1 analyzer contract and implementation

**Files:**
- Create: `src/lib/chartAnalyzer.test.ts`
- Create: `src/lib/chartAnalyzer.ts`
- Read: `src/lib/astro.ts`, `src/lib/chartModel.ts`, `node_modules/iztro/lib/data/types/astro.d.ts`

**Interfaces:**
- Consumes: an iztro-compatible astrolabe with `solarDate`, `time`, `timeRange`, `gender`, `palaces`, and categorized stars.
- Produces: `analyzeChart(astrolabe, locale?, options?)`, `AnalyzedChart`, `AnalyzedPalace`, `AnalyzedStar`, `MutagenSummary`, `PatternSummary`, and `StructuredSummary`.

- [ ] **Step 1: Write the failing analyzer tests**

Create real chart fixtures and fix `generatedAt` so the tests do not depend on wall-clock time:

```ts
import { describe, expect, it } from 'vitest';
import { getChart } from './astro';
import { analyzeChart } from './chartAnalyzer';

const generatedAt = '2026-08-07T00:00:00.000Z';

describe('chartAnalyzer.ts', () => {
  it('emits the v1 schema with twelve analyzed palaces and non-empty starName values', () => {
    const chart = getChart({ date: '2000-08-16', timeIndex: 2, gender: 'male' });
    const result = analyzeChart(chart, 'zh-TW', { generatedAt });

    expect(result.schemaVersion).toBe('1.0');
    expect(result.generatedAt).toBe(generatedAt);
    expect(result.locale).toBe('zh-TW');
    expect(result.birthData).toEqual({ date: '2000-8-16', timeIndex: 2, gender: 'male' });
    expect(result.palaces).toHaveLength(12);

    const stars = result.palaces.flatMap((palace) => [
      ...palace.majorStars,
      ...palace.minorStars,
      ...palace.adjectiveStars,
    ]);
    expect(stars.length).toBeGreaterThan(0);
    expect(stars.every((star) => star.starName.length > 0)).toBe(true);
  });

  it('collects only source star mutagens and leaves pattern rules empty', () => {
    const chart = getChart({ date: '2000-08-16', timeIndex: 2, gender: 'male' });
    const result = analyzeChart(chart, 'zh-TW', { generatedAt });
    const sourceMarkers = chart.palaces.flatMap((palace) =>
      [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars]
        .filter((star) => star.mutagen)
        .map((star) => ({
          palaceIndex: palace.index,
          palaceName: palace.name,
          starName: star.name,
          mutagen: star.mutagen,
        }))
    );

    expect(result.mutagens.entries).toEqual(sourceMarkers);
    expect(result.patterns).toEqual({ patterns: [] });
  });

  it.each([
    ['zh-TW' as const, 'male' as const],
    ['zh-CN' as const, 'female' as const],
  ])('supports locale %s and normalized gender %s', (locale, gender) => {
    const chart = getChart({ date: '1995-03-21', timeIndex: 6, gender, language: locale });
    const result = analyzeChart(chart, locale, { generatedAt });

    expect(result.locale).toBe(locale);
    expect(result.birthData.gender).toBe(gender);
    expect(result.palaces).toHaveLength(12);
  });

  it('recovers iztro early and late Zi time indexes', () => {
    const early = analyzeChart(
      getChart({ date: '2000-08-16', timeIndex: 0, gender: 'male' }),
      'zh-TW',
      { generatedAt }
    );
    const late = analyzeChart(
      getChart({ date: '2000-08-16', timeIndex: 12, gender: 'male' }),
      'zh-TW',
      { generatedAt }
    );

    expect(early.birthData.timeIndex).toBe(0);
    expect(late.birthData.timeIndex).toBe(12);
  });

  it('is snapshot-stable when generation time is fixed', () => {
    const chart = getChart({ date: '2000-08-16', timeIndex: 2, gender: 'male' });
    const result = analyzeChart(chart, 'zh-TW', { generatedAt });

    expect(result).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run the analyzer tests and verify the expected RED failure**

Run:

```bash
npm test -- src/lib/chartAnalyzer.test.ts
```

Expected: Vitest fails because `src/lib/chartAnalyzer.ts` and `analyzeChart` do not exist yet. Fix only test/setup errors if they occur; do not implement production behavior before seeing the missing-module failure.

- [ ] **Step 3: Implement the minimal analyzer contract**

Create the public types and function with these exact core shapes:

```ts
export interface AnalyzedStar {
  starName: string;
  brightness?: string;
  mutagen?: string;
}

export interface AnalyzedPalace {
  index: number;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  isBodyPalace: boolean;
  isOriginalPalace: boolean;
  decadal?: { range: [number, number]; heavenlyStem: string; earthlyBranch: string };
  majorStars: AnalyzedStar[];
  minorStars: AnalyzedStar[];
  adjectiveStars: AnalyzedStar[];
}

export interface MutagenEntry {
  palaceIndex: number;
  palaceName: string;
  starName: string;
  mutagen: string;
}

export interface MutagenSummary {
  entries: MutagenEntry[];
}

export interface PatternSummary {
  patterns: [];
}

export interface AnalyzedChart {
  schemaVersion: '1.0';
  generatedAt: string;
  locale: Locale;
  birthData: { date: string; timeIndex: number; gender: 'male' | 'female' };
  palaces: AnalyzedPalace[];
  mutagens: MutagenSummary;
  patterns: PatternSummary;
}

export type StructuredSummary = AnalyzedChart;
```

Project the three star arrays in source order. Add a mutagen entry only when the source star has a non-empty `mutagen`; do not derive markers from heavenly stems. Resolve time index from an optional numeric astrolabe field first, then normalized `timeRange`, then early/late Zi and the remaining `time` names, with `0` as the defensive fallback. Normalize gender with `normalizeGender` and pass `new Date().toISOString()` only when `options.generatedAt` is absent.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
npm test -- src/lib/chartAnalyzer.test.ts
```

Expected: all analyzer tests pass, including the generated snapshot. If the snapshot is generated, inspect it for exactly twelve palaces, non-empty star names, source-only mutagen entries, and `patterns: []`.

- [ ] **Step 5: Run the existing library tests for regression**

Run:

```bash
npm test -- src/lib/astro.test.ts src/lib/chartModel.test.ts src/lib/flying.test.ts
```

Expected: the existing astro, chart-model, and B2 flying tests remain green.

### Task 2: Refactor Markdown summary through the analyzer

**Files:**
- Modify: `src/lib/prompts.ts`
- Modify: `src/lib/prompts.test.ts`
- Read: `src/lib/chartAnalyzer.ts`, `src/lib/chartModel.ts`

**Interfaces:**
- Consumes: `analyzeChart()` and its `AnalyzedPalace`/`AnalyzedStar` output.
- Produces: the same `summarizeAstrolabe(chart, locale?)` string contract and a localized structured-summary serializer for prompt use.

- [ ] **Step 1: Add a failing regression assertion for analyzer-backed prompt data**

Add a prompt test with fixed system time:

```ts
it('includes the structured summary JSON in the system prompt', () => {
  const chart = getChart({ date: '2000-08-16', timeIndex: 2, gender: 'male' });
  const { systemPrompt } = buildReadingPrompt(chart, { type: 'overall', locale: 'zh-TW' });

  expect(systemPrompt).toContain('結構化命盤摘要 JSON');
  expect(systemPrompt).toContain('"schemaVersion": "1.0"');
  expect(systemPrompt).toContain('"palaces"');
});
```

Update the old no-nonce assertion so it checks that the prompt starts with `DEFAULT_SYSTEM_PROMPT` and contains no custom-input delimiter; the new structured chart block is intentionally part of the system prompt.

- [ ] **Step 2: Run the prompt test and verify the expected RED failure**

Run:

```bash
npm test -- src/lib/prompts.test.ts
```

Expected: the new structured-summary assertion fails because the current system prompt has no analyzer JSON, and the old exact-equality assertion identifies the intentional contract change.

- [ ] **Step 3: Route summary formatting through `analyzeChart()`**

Import `analyzeChart` and `AnalyzedChart` from `chartAnalyzer.ts`. Keep the current localized `SUMMARY_LABELS` and basic-information reads from the astrolabe. Replace direct palace star iteration in `summarizeAstrolabe()` with the analyzed palace arrays and `starName` fields so the analyzer is the internal source for palace data. Preserve current output rules: major stars always get a line, minor/adjective lines appear only when non-empty, and null charts return the existing localized no-chart label.

Add a localized system-prompt fragment helper:

```ts
const STRUCTURED_SUMMARY_LABELS: Record<Locale, string> = {
  'zh-TW': '【結構化命盤摘要 JSON】',
  'zh-CN': '【结构化命盘摘要 JSON】',
};

function serializeStructuredSummary(chart: AstrolabeSummaryLike, locale: Locale): string {
  const summary: AnalyzedChart = analyzeChart(chart, locale);
  return `\n\n${STRUCTURED_SUMMARY_LABELS[locale]}\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\``;
}
```

Append that fragment to the locale-selected base system prompt when a chart exists, before the existing custom-instruction delimiter extension. Pass `options.generatedAt` into `analyzeChart()` so callers can reconstruct a byte-identical prompt; leave it optional for normal runtime calls. Re-export `StructuredSummary` from `prompts.ts` as a type alias to `AnalyzedChart` for consumers that use the prompt module as the schema entrypoint.

- [ ] **Step 4: Run prompt tests and verify GREEN**

Run:

```bash
npm test -- src/lib/prompts.test.ts
```

Expected: all prompt tests pass in both locales, including the existing Markdown wording, canonicalization, nonce, and injection-defense assertions.

- [ ] **Step 5: Run the complete test suite**

Run:

```bash
npm test
```

Expected: all existing tests plus the new analyzer tests pass with zero failures.

### Task 3: Full verification and review handoff

**Files:**
- Verify: `src/lib/chartAnalyzer.ts`, `src/lib/chartAnalyzer.test.ts`, `src/lib/prompts.ts`, `src/lib/prompts.test.ts`
- Do not modify: `src/lib/chartModel.ts`, `.hermes/`

**Interfaces:**
- Consumes: completed B3 implementation and test suite.
- Produces: evidence-backed build/test/lint results and a review-ready diff.

- [ ] **Step 1: Run the production build**

Run:

```bash
npm run build
```

Expected: exit code `0` with TypeScript and Vite completing successfully.

- [ ] **Step 2: Run source lint on changed files**

Run:

```bash
npx eslint src/lib/chartAnalyzer.ts src/lib/chartAnalyzer.test.ts src/lib/prompts.ts src/lib/prompts.test.ts
```

Expected: exit code `0` and no errors.

- [ ] **Step 3: Inspect the final diff and scope**

Run:

```bash
git diff --check
git status --short
git diff -- src/lib/chartAnalyzer.ts src/lib/chartAnalyzer.test.ts src/lib/prompts.ts src/lib/prompts.test.ts
```

Confirm that only the requested B3 files and design/plan documents changed, that no `.hermes/` file is staged or edited, and that the pre-existing `chartModel.ts` modification remains untouched.

- [ ] **Step 4: Request code review**

Provide the reviewer the implementation summary, the B3 requirements, the base `979dcbf`, and the current working-tree diff. Address all Critical/Important findings before completion. If the sandbox still rejects git index writes, report the exact limitation and leave commit creation to the user-controlled checkout.

- [ ] **Step 5: Report verification evidence**

Report the actual test count/output, build exit code, ESLint exit code, changed files, and commit SHA only if a commit was successfully created. Do not claim completion without fresh command output.
