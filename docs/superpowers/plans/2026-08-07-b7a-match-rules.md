# B7a Match Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded match presentation with deterministic, evidence-backed compatibility rules while preserving the existing `match.ts` API and adding explicit sensitivity boundaries.

**Architecture:** Each raw iztro astrolabe is converted once with `analyzeChart()` into `AnalyzedChart`. `src/lib/matchRules/` consumes only those analyzed charts and the existing B5 `Evidence` shape; its public engine is exactly `evaluateMatch(chartA, chartB): MatchRuleResult[]`. `MatchPanel` creates the analyzed inputs and renders only the returned rule results and evidence, while `match.ts` remains an untouched compatibility layer for existing callers.

**Tech Stack:** TypeScript, React, Vitest, ESLint, iztro 2.5.8, existing B3/B5 chart analyzer and evidence helpers.

## Global Constraints

- `AnalyzeChart` conversion is raw iztro astrolabe → `AnalyzedChart` before match-rule evaluation.
- `evaluateMatch(chartA: AnalyzedChart, chartB: AnalyzedChart): MatchRuleResult[]` is the strict public match-rule interface.
- `match.ts` existing exports and behavior remain API-compatible; new rules never inspect iztro raw structures.
- Every returned rule is matched, deterministic, sorted by descending confidence, and carries B5 evidence fields `knowledgeId`, `field`, `source`, `value`, and `reasoning`.
- Every `MatchConclusion` carries `sensitivity`; high-sensitivity conclusions receive a disclaimer through `applySensitivityBoundaries()`.
- New UI labels are present in both `src/i18n/zh-TW.ts` and `src/i18n/zh-CN.ts`; no hardcoded locale strings are added to components.
- Verification uses `npm test`, `npm run build`, and ESLint; do not use global `vitest` or `npx vitest` for the test suite.

---

### Task 1: Evidence-backed match rule engine

**Files:**
- Create: `src/lib/matchRules/types.ts`
- Create: `src/lib/matchRules/evidence.ts`
- Create: `src/lib/matchRules/starCompatibility.ts`
- Create: `src/lib/matchRules/palaceOverlap.ts`
- Create: `src/lib/matchRules/mutagenInteraction.ts`
- Create: `src/lib/matchRules/branchRelation.ts`
- Create: `src/lib/matchRules/engine.ts`
- Create: `src/lib/matchRules/index.ts`
- Test: `src/lib/matchRules/matchRules.test.ts`

**Interfaces:**
- Consumes: `AnalyzedChart` from `src/lib/chartAnalyzer.ts` and B5 helpers/types from `src/lib/rules/chartFacts.ts` and `src/lib/rules/types.ts`.
- Produces: `MatchRule`, `MatchCondition`, `MatchConclusion`, `MatchRuleResult`, the four family evaluators, and `evaluateMatch(chartA, chartB)`.

- [ ] **Step 1: Write failing tests for the public contract and representative rules.**

  Build complete twelve-palace `AnalyzedChart` fixtures with direct star/mutagen markers. Assert that the public evaluator accepts two analyzed charts, returns only `matched: true` results, exposes conclusions and B5 evidence fields, finds representative 紫微+天府 and 太陽+太陰 cross-chart pairs, detects same 命宮 branch and a 三方四正 overlap, detects 雙祿 and 祿忌 interaction, detects 六合/三合/六沖/三刑/六害, is deterministic, does not mutate either chart, and sorts by confidence then `ruleId`.

- [ ] **Step 2: Run the focused test and verify the expected RED failure.**

  Run `npm test -- src/lib/matchRules/matchRules.test.ts`. It must fail because the new match-rule module and `evaluateMatch` do not yet exist; fix only test setup errors before implementation.

- [ ] **Step 3: Define the typed rule/result contract and evidence adapter.**

  Reuse `Evidence` from B5 rather than introducing a second evidence shape. `MatchRuleResult` contains `ruleId`, `ruleName`, `matched`, `evidence`, `confidence`, and `conclusions`; a conclusion also has an optional `topic` and optional `disclaimer` in addition to the required type, description, confidence, and sensitivity fields. The evidence adapter prefixes source fields with `chartA.` or `chartB.` while retaining B5 provenance and uses palace knowledge IDs for branch facts.

- [ ] **Step 4: Implement the four minimal deterministic rule families.**

  Use only `AnalyzedChart` palace/star/mutagen facts and B5 canonicalization/location helpers. Star rules inspect the two 命宮 major-star sets; palace rules compare 命宮/夫妻宮 positions and the B5 surrounding-palace indices; mutagen rules compare chart mutagen entries; branch rules compare the two 命宮 earthly branches using explicit 六合、三合、六沖、三刑、六害 tables. Each match emits evidence for both sides and copies its static conclusion metadata into the result.

- [ ] **Step 5: Implement the engine and exports.**

  Concatenate the four evaluators, deduplicate `ruleId`, keep matched results only, and stable-sort by descending confidence then ascending `ruleId`. Export the strict two-argument `evaluateMatch` from `engine.ts` and `index.ts` without adding raw-astrolabe overloads.

- [ ] **Step 6: Run focused tests and the full suite.**

  Run `npm test -- src/lib/matchRules/matchRules.test.ts` and then `npm test`. Both must pass before the task is reviewed.

### Task 2: Sensitivity assertion boundaries

**Files:**
- Create: `src/lib/matchRules/sensitivity.ts`
- Test: `src/lib/matchRules/sensitivity.test.ts`

**Interfaces:**
- Consumes: `MatchRuleResult[]` and `MatchConclusion` from Task 1.
- Produces: `SensitivityLevel`, `AssertionBoundary`, the four high-sensitivity topic boundaries, and `applySensitivityBoundaries(results)`.

- [ ] **Step 1: Write failing boundary tests.**

  Assert that the exported boundaries cover 婚姻、財富、健康、壽命 with allowed and forbidden phrasing; low/medium conclusions are unchanged; every high conclusion receives a non-empty disclaimer; applying the function does not mutate the input result; and applying it twice is idempotent.

- [ ] **Step 2: Run the focused test and verify RED.**

  Run `npm test -- src/lib/matchRules/sensitivity.test.ts`. It must fail because the boundary module is not implemented.

- [ ] **Step 3: Implement pure boundary application.**

  Select a topic-specific boundary when a conclusion has a topic, otherwise use a generic high-sensitivity boundary. Clone results/conclusions, preserve all evidence unchanged, and add the boundary disclaimer only to high conclusions that do not already have one.

- [ ] **Step 4: Run focused tests and the full suite.**

  Run `npm test -- src/lib/matchRules/sensitivity.test.ts` and then `npm test`; both must pass.

### Task 3: Evidence-only MatchPanel integration

**Files:**
- Modify: `src/components/MatchPanel.tsx`
- Modify: `src/components/MatchPanel.test.tsx`
- Modify: `src/i18n/zh-TW.ts`
- Modify: `src/i18n/zh-CN.ts`
- Test: `src/components/MatchPanel.test.tsx`

**Interfaces:**
- Consumes: raw chart creation only through the existing canonical chart factory, `analyzeChart(rawAstrolabe)`, `evaluateMatch(chartA, chartB)`, and `applySensitivityBoundaries()`.
- Produces: a panel that renders rule names, conclusions, confidence, sensitivity disclaimers, and every evidence chain without importing `analyzeMatch`, `MatchResult`, or raw astrolabe types.

- [ ] **Step 1: Write failing component tests for the new boundary.**

  Assert that the panel renders its existing bilingual input/preset flow, displays a rule result and its evidence field/reasoning, displays a high-sensitivity disclaimer, and does not require the legacy prose/score result. Add matching assertions under zh-CN through the existing i18n provider/helper.

- [ ] **Step 2: Run the component test and verify RED.**

  Run `npm test -- src/components/MatchPanel.test.tsx`. It must fail because the current panel still consumes the legacy `match.ts` result and has no rule/evidence rendering.

- [ ] **Step 3: Refactor the panel data flow.**

  In the memoized calculation, build canonical raw charts, pass each through `analyzeChart`, call the strict two-argument `evaluateMatch`, then apply sensitivity boundaries. Keep only `MatchRuleResult[] | null` in panel state/memo output. Derive any displayed score/count solely from rule results; render evidence from the result objects and disclaimers from their conclusions.

- [ ] **Step 4: Add bilingual UI labels and update tests.**

  Add keys for rule results, confidence, conclusions, evidence, evidence field/value/reasoning, no-results state, and sensitivity disclaimer headings to both locale dictionaries. Update component tests to assert those translated labels and representative evidence text.

- [ ] **Step 5: Run the component test, full test suite, build, and lint.**

  Run `npm test -- src/components/MatchPanel.test.tsx`, `npm test`, `npm run build`, and `npx eslint src/lib/matchRules src/components/MatchPanel.tsx src/components/MatchPanel.test.tsx src/i18n/zh-TW.ts src/i18n/zh-CN.ts`. All commands must exit 0 with no test failures or lint errors.

