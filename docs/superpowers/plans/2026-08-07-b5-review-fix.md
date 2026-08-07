# B5 Review Fix Implementation Plan

> **For agentic workers:** Use the test-driven-development and verification-before-completion skills while executing this plan.

**Goal:** Make fortune rule evaluation consume the existing `HoroscopeSummary` scope facts, preserve original-chart evidence provenance, include scope-aware reasoning, and close the five B5 review blockers without lowering golden coverage.

**Architecture:** `fortune.ts` will expose a pure `HoroscopeSummary -> FortunePeriod` adapter plus an astrolabe convenience wrapper that calls `getHoroscopeSummary`. The adapter carries the authoritative scope index, scope-renamed `palaceNames`, scope mutagens, and period metadata; evaluation uses the index and applies `palaceNames` to its private view. Period overlay stars carry explicit `fortune.<scope>.stars[i]` evidence fields, while context evidence continues to read the original `AnalyzedChart`.

**Tech Stack:** TypeScript, iztro 2.5.8, Vitest, ESLint.

## Global Constraints

- Use `getHoroscopeSummary` as the only source for decadal/yearly/monthly period progression.
- Monthly target palace selection must use `HoroscopeSummary.monthly.index`; never compare a monthly heavenly stem to a natal palace stem.
- Every period-star evidence field must use the `fortune.<scope>.*` namespace, never a synthetic natal `majorStars` path.
- Evidence knowledge IDs must resolve to the defined star/palace catalogs; aliases are explicit catalog mappings.
- Keep golden inputs deterministic and pass complete iztro configs.
- Use `npm test`, `npm run build`, and `npx eslint src/lib/rules/` for the final gate.

---

### Task 1: Add red tests for summary adaptation and provenance

**Files:**
- Modify: `src/lib/rules/fortune.test.ts`
- Modify: `src/lib/rules/golden.test.ts`

**Interfaces:**
- Consume `getChart`, `getHoroscopeSummary`, `analyzeChart`, `createFortunePeriod`, and `evaluateFortune`.
- Assert `period.palaceIndex`, `period.palaceNames`, scope mutagens, monthly index selection, scope reasoning, and `fortune.<scope>.stars[i]` evidence fields.

- [ ] Add a real astrolabe fixture test that creates a monthly period from a fixed `getHoroscopeSummary`; assert `period.palaceIndex === summary.monthly.index` and that the period keeps the exact `summary.monthly.palaceNames` array.
- [ ] Add a regression assertion with a deliberately mismatching monthly `heavenlyStem` and assert evaluation still targets `period.palaceIndex`, not a palace sharing that stem.
- [ ] Add a provenance assertion that every evidence item for an adapted period star uses `fortune.monthly.stars[...]` or `fortune.monthly.mutagens[...]`, and never `palaces[...].majorStars[...]`.
- [ ] Add an assertion that matched evidence reasoning includes the full scope, such as `大限 44-53歲期間`.
- [ ] Remove the duplicate golden input and replace it with a distinct deterministic fixture so the matrix remains 26 unique cases.

### Task 2: Implement the HoroscopeSummary adapter and authoritative palace mapping

**Files:**
- Modify: `src/lib/rules/fortune.ts`
- Modify: `src/lib/chartAnalyzer.ts`
- Modify: `src/lib/rules/chartFacts.ts`

**Interfaces:**
- Produce `FortunePeriod.palaceIndex?: number` and `FortunePeriod.palaceNames?: string[]`.
- Produce `fortunePeriodFromHoroscopeSummary(summary, type, options?)` and `createFortunePeriod(summaryOrAstrolabe, type, options?)`.
- Use an overlay-star evidence-field property internally so chart-fact evidence can preserve `fortune.<scope>.stars[i]`.

- [ ] Write the smallest adapter that maps decadal/yearly/monthly summary records to period palace, index, exact palace-name array, stem/branch, age/year/month metadata, and explicit `星化祿/權/科/忌` markers.
- [ ] Add the astrolabe convenience path that calls `getHoroscopeSummary` and delegates to the pure summary adapter.
- [ ] Resolve an adapted target by `palaceIndex`; retain name/branch/range fallbacks only for legacy hand-built periods and remove all monthly stem matching.
- [ ] Build the private period chart with `HoroscopeSummary.palaceNames` by index and add period stars as annotated overlays instead of pretending they are natal `majorStars`.
- [ ] Remove `buildPatternContext`, manual palace renaming, and parallel period stem/mutagen inference; use adapter-provided mutagens.
- [ ] Prefix all result evidence reasoning with a deterministic scope string containing the period label and target scope palace.

### Task 3: Close knowledge ID gaps

**Files:**
- Modify: `src/lib/starKnowledge.ts`
- Modify: `src/lib/starKnowledge.test.ts`
- Modify: `src/lib/palaceKnowledge.ts`
- Modify: `src/lib/palaceKnowledge.test.ts`

- [ ] Add `祿存` as `star-lucun` in the auspicious/六吉星 catalog with complete provenance and attributes.
- [ ] Add `本命命宮` as an explicit alias of `命宮` and assert both names resolve to `palace-ming`.
- [ ] Keep unknown-name fallbacks from fabricating evidence IDs, or ensure all period aliases emitted by the adapter resolve to defined knowledge entries.

### Task 4: Update golden coverage and run the full gate

**Files:**
- Modify: `src/lib/rules/golden.test.ts`

- [ ] Re-run the 26-case matrix and assert every expected rule ID remains deterministic.
- [ ] Assert pattern coverage remains at least 80% and report numerator/denominator in the failure message.
- [ ] Run `npm test`, `npm run build`, and `npx eslint src/lib/rules/`; capture real exit codes and test counts.
- [ ] Inspect the final diff and request a focused code review before reporting completion.
