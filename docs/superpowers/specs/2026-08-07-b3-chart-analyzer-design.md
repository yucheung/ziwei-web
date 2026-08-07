# B3 ChartAnalyzer v1 Design

## Goal

Close the deterministic B3 pipeline from an iztro astrolabe to a versioned structured summary and the existing reading prompt, while preserving the current Markdown summary API.

## Approved v1 boundaries

- `MutagenSummary` only collects `mutagen` markers already present on palace stars. It does not calculate or infer four-transformations rules.
- `PatternSummary.patterns` is always the empty tuple/array. Pattern rules belong to B5.
- `birthData.gender` is normalized to `'male' | 'female'` through the gender normalization already defined in `src/lib/astro.ts`.
- `birthData.date` comes from iztro's `solarDate` and `birthData.timeIndex` is recovered from iztro's `timeRange`/`time` output, including the distinction between early and late Zi hour.

## Architecture

Add `src/lib/chartAnalyzer.ts` as a pure adapter around the astrolabe-shaped input. It maps each palace in source order, preserves the source palace/star display strings, and records each existing star mutagen marker as a data record. The adapter does not call flying-star tables, inspect stems to infer transformations, or evaluate pattern rules.

`AnalyzedChart` contains only the B3 contract: schema version, generation metadata, locale, birth data, analyzed palaces, mutagen records, and an empty pattern summary. `generatedAt` is injectable through an optional analyzer option so deterministic tests and callers that need reproducible JSON can provide a fixed value; normal callers receive the current ISO timestamp.

`summarizeAstrolabe()` will call the analyzer and format its analyzed palace data back into the existing Markdown labels and layout. The basic-information lines continue to read from the original astrolabe so existing output remains byte-compatible. `buildReadingPrompt()` will use the analyzer result to append a localized JSON code block to the system prompt, while retaining the current text summary and user-input delimiter behavior. `PromptOptions.generatedAt` passes through to the analyzer so a caller that reconstructs a prompt can reuse the exact generation timestamp and preserve byte-identical messages.

## Data contract

The public analyzer types are:

- `AnalyzedStar`: `starName`, optional `brightness`, and optional source `mutagen`.
- `AnalyzedPalace`: source `index`, `name`, stem/branch, body/original flags, optional decadal data, and categorized analyzed star arrays (`majorStars`, `minorStars`, `adjectiveStars`).
- `MutagenSummary`: an `entries` array; each entry identifies the source palace index/name, star name, and the marker exactly as supplied by the astrolabe.
- `PatternSummary`: `{ patterns: [] }`.
- `AnalyzedChart` and the alias `StructuredSummary`.

All object properties are constructed in a fixed order and all arrays follow astrolabe palace/star order. JSON is serialized with `JSON.stringify` for the prompt fragment; no rule-derived or random fields are added.

## Data flow

```text
iztro astrolabe
      |
      v
analyzeChart(astrolabe, locale, { generatedAt? })
      |
      +--> AnalyzedChart --> JSON fragment in systemPrompt
      |
      +--> palace projection --> existing Markdown summary
```

If a caller passes `null` to `summarizeAstrolabe`, it keeps the existing localized no-chart string and does not create an analyzer result. A real astrolabe is expected to contain the iztro date/time/gender fields; defensive fallbacks keep the analyzer total for structurally valid test doubles without introducing rule inference.

## Testing strategy

Add `src/lib/chartAnalyzer.test.ts` with real charts from `getChart()` and a fixed `generatedAt`. The tests cover schema version, locale variants, birth-data normalization, twelve palaces, non-empty `starName` values, source-marker-only mutagen aggregation, the permanently empty patterns array, and a deterministic snapshot after fixing generation time. Extend prompt tests to assert that the system prompt contains the structured JSON fragment in both locales, accepts an explicit generation timestamp, and preserves the existing Markdown summary and custom-instruction protections. The ReadingPanel byte-for-byte integration test reuses the timestamp emitted in the sent system prompt when reconstructing the expected prompt.

Verification remains the repository gate: `npm run build`, `npm test`, and ESLint with zero errors. Existing tests must remain green; the pre-existing user modification in `src/lib/chartModel.ts` and all `.hermes/` files are outside this change.
