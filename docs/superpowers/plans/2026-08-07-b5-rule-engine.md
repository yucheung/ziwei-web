# B5 Rule Engine Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a typed rule engine with 四化 (Four Transformations) rules, 格局 (Pattern) rules, fortune period inference, rule golden tests, and model faithfulness comparison.

**Architecture:** `src/lib/rules/` houses shared rule types, deterministic chart helpers, four-transformation predicates, pattern predicates, and the aggregation engine. Each rule has `ruleId`, `source`, `school`, `ruleSetVersion`, `conditions`, and `conclusions`; the engine evaluates only matching rules and preserves evidence chains. This plan covers Tasks 1–3 requested for B5a; fortune, golden expansion, and faithfulness remain later tasks.

**Tech Stack:** TypeScript, iztro 2.5.8, Vitest, ESLint.

## Global Constraints

- Rules are static JSON predicates, not LLM-generated.
- Each rule must produce traceable evidence (knowledgeId citations).
- School: `sanhe` (三合派) only for v1; `feixing` (飛星派) deferred.
- V4 target: 80%+ pattern detection coverage.
- Use `npm test` (not global `vitest`), `npm run build`, ESLint.
- Public evaluators return only results where `matched === true`.
- `RuleResult.matched` remains in the public result type for compatibility.
- Year-stem recovery must support source mutagens, `birthData.date`, and the `palaces[0].heavenlyStem` fixture fallback.
- Every returned evidence item includes `knowledgeId`, `field`, `source`, `value`, and `reasoning`.

---

### Task 1: 四化規則庫 v1 (5.1)

- [x] **Step 1: Add the shared rule contract test fixtures.** Create `src/lib/rules/rules.test.ts` with a complete minimal `AnalyzedChart` factory and assertions for the public transformation result shape.
- [x] **Step 2: Run the focused test to verify the missing module failure.** Run `npm test -- src/lib/rules/rules.test.ts`; expect module-resolution failure because `src/lib/rules/engine.ts` and the evaluator do not exist yet.
- [x] **Step 3: Add `src/lib/rules/types.ts` and `src/lib/rules/chartFacts.ts`.** Define `RuleCondition`, `RuleConclusion`, `Evidence`, `RuleResult`, `PatternResult`, the four transformation type, canonicalization helpers, star/palace locations, evidence constructors, and year-stem recovery. Keep all output fields deterministic.
- [x] **Step 4: Add `src/lib/rules/fourTransformations.ts`.** Generate exactly 56 static rules from the 14 B4 major stars and four canonical transformation keys. Use the existing `MUTAGEN_TABLE` plus source mutagen markers to evaluate a star, create star and palace evidence, and return only matched results. Re-export the shared result types needed by callers.
- [x] **Step 5: Add transformation tests and run them red-to-green.** Assert 56 definitions, a known `甲` chart returns 廉貞化祿/破軍化權/武曲化科/太陽化忌, unmatched rules are absent, `matched` is `true`, and evidence contains the expected `star-*`, `palace-*`, and `palaces[...]` fields. Run `npm test -- src/lib/rules/fourTransformations.test.ts` after the test is written (RED), then after implementation (GREEN).
- [x] **Step 6: Commit Task 1.** Run `npx eslint src/lib/rules/types.ts src/lib/rules/chartFacts.ts src/lib/rules/fourTransformations.ts src/lib/rules/fourTransformations.test.ts` and commit the focused four-transformation changes with `feat: add four transformation rule evaluation` (commit blocked by sandbox `.git` read-only policy).

### Task 2: 格局規則庫 v1 (5.2)

- [x] **Step 1: Write failing pattern tests.** Create `src/lib/rules/patterns.test.ts` covering the 25+ catalog, 紫微/天府 branch-position rules, 紫府同宮, 殺破狼, 機月同梁, and exclusion of an absent pattern.
- [x] **Step 2: Run the focused pattern test and confirm RED.** Run `npm test -- src/lib/rules/patterns.test.ts`; confirm it fails because `patterns.ts` is not present.
- [x] **Step 3: Implement the static catalog and predicates.** Add `src/lib/rules/patterns.ts` with typed conditions/conclusions, canonical palace/star lookup, same-palace, 三方四正, and 夾宮 helpers. Include at least 25 deterministic sanhe-v1 patterns and emit evidence for every observed star/palace condition.
- [x] **Step 4: Run the focused pattern tests and confirm GREEN.** Run `npm test -- src/lib/rules/patterns.test.ts`; retain only matching `PatternResult` objects with `matched: true`.
- [x] **Step 5: Commit Task 2.** Run ESLint for the pattern files and commit with `feat: add sanhe pattern rule evaluation` (commit blocked by sandbox `.git` read-only policy).

### Task 3: Rule Engine Core

- [x] **Step 1: Write the failing engine integration assertions.** Extend `src/lib/rules/rules.test.ts` to assert `evaluateRules`/`getRuleResults` merge both sources, drop duplicate IDs, exclude all unmatched values, and sort by confidence descending.
- [x] **Step 2: Run the engine assertions and confirm RED.** Run `npm test -- src/lib/rules/rules.test.ts`; confirm the engine exports are missing.
- [x] **Step 3: Implement `src/lib/rules/engine.ts`.** Re-export the public contracts, combine `evaluateFourTransformations` and `evaluatePatterns`, deduplicate by first-seen `ruleId`, filter defensively on `matched`, and sort stably by confidence descending then `ruleId`.
- [x] **Step 4: Add real-chart integration coverage.** Use `getChart()` and `analyzeChart()` with a fixed date/time and assert that `getRuleResults()` returns only matched evidence-backed results without mutating the analyzed chart.
- [x] **Step 5: Run Task 1–3 verification.** Run `npm test`, `npm run build`, and `npx eslint src/lib/rules`; record the real test count, build exit code, and lint exit code.
- [x] **Step 6: Commit Task 3.** Commit the engine and integration tests with `feat: add rule engine aggregation` after the verification gate passes (commit blocked by sandbox `.git` read-only policy).

Tasks 4–6 (fortune inference, rule goldens, and faithfulness comparison) are
deliberately out of scope for this B5a implementation plan.
