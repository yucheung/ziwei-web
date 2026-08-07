# B5b Rule Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add deterministic fortune-period rule evaluation, a 10+ case rule golden suite, and evidence-based comparison of model claims against matched rules.

**Architecture:** Keep `src/lib/rules/` as the deterministic boundary. Fortune evaluation will create a period-scoped chart view, reuse the existing four-transformation and pattern evaluators, and add period context to each matched result. Golden tests will use the existing `getChart`/`analyzeChart` pipeline with explicit iztro configuration. Faithfulness comparison will parse only supported star/palace/four-transformation claim forms and link faithful claims back to rule evidence.

**Tech Stack:** TypeScript, iztro 2.5.8, Vitest, ESLint.

## Global Constraints

- Rules are static JSON predicates, not LLM-generated.
- School: `sanhe` (三合派) only for v1; `feixing` (飛星派) deferred.
- Public evaluators return only results where `matched === true`.
- Every returned evidence item includes `knowledgeId`, `field`, `source`, `value`, and `reasoning`.
- i18n canonical keys remain zh-TW; comparison accepts zh-TW and zh-CN display spellings without hard-coding a locale as the caller's locale.
- Golden chart calls pass complete `config` including `yearDivide` and `dayDivide`; no test relies on iztro global fallback state.
- Use `npm test` (not global `vitest`), `npm run build`, and `npx eslint src/lib/rules/`.
- Do not introduce LLM or AI interpretation into the deterministic rule layer.

---

### Task 4: 運限推論 v1

**Files:**
- Create: `src/lib/rules/fortune.ts`
- Test: `src/lib/rules/fortune.test.ts`

**Interfaces:**
- Consumes: `AnalyzedChart`, `RuleResult`, `Evidence`, `evaluateFourTransformations`, and `evaluatePatterns` from the existing B5a rule engine.
- Produces: exported `FortunePeriod`, `FortuneResult`, and `evaluateFortune(chart: AnalyzedChart, period: FortunePeriod): FortuneResult[]`.

`FortunePeriod` keeps the required fields `type`, `palace`, `stars`, `mutagens`, and `themes`. It may also carry deterministic selectors used to construct labels and locate the context: `ageRange?: [number, number]`, `year?: number`, `month?: string | number`, `heavenlyStem?: string`, and `earthlyBranch?: string`. `FortuneResult.periodLabel` must be generated as `大限 <start>-<end>`, `流年 <year>`, or `流月 <branch/月>月`; do not require callers to duplicate a label.

- [ ] **Step 1: Write a failing period-evaluation test.** Build a complete minimal `AnalyzedChart` fixture with 12 palaces and direct mutagen markers. Assert a decadal period targeting 命宮 returns matched `FortuneResult` objects with `periodType: 'decadal'`, `periodLabel: '大限 44-53'`, the target palace, period stars/mutagens/themes, and a four-transformation rule ID.
- [ ] **Step 2: Run the focused test and confirm RED.** Run `npm test -- src/lib/rules/fortune.test.ts`; it must fail because `fortune.ts` does not exist.
- [ ] **Step 3: Implement the smallest scoped evaluator.** Resolve the context palace by canonical palace name, then by earthly branch/heavenly stem when supplied. Construct a non-mutating period view containing the base chart facts plus the period's active stars and mutagen markers. Reuse the existing transformation and pattern evaluators, map every matched result to `FortuneResult`, and add deterministic context evidence. Keep only matched results and stable-sort by confidence then `ruleId`.
- [ ] **Step 4: Add annual and monthly boundary assertions.** Verify annual earthly-branch targeting emits `流年 2026`, monthly heavenly-stem targeting emits `流月 辰月`, and an empty period returns no matched results without changing the source chart.
- [ ] **Step 5: Run the focused GREEN test and lint.** Run `npm test -- src/lib/rules/fortune.test.ts` and `npx eslint src/lib/rules/fortune.ts src/lib/rules/fortune.test.ts`.
- [ ] **Step 6: Commit Task 4.** Commit the focused changes with `feat: add fortune period rule evaluation`.

### Task 5: 規則 Golden v2

**Files:**
- Create: `src/lib/rules/golden.test.ts`

**Interfaces:**
- Consumes: `getChart`, `analyzeChart`, `getRuleResults`, and `PATTERN_RULES`.
- Produces: deterministic 10+ case regression coverage and an explicit pattern detection coverage assertion/report.

- [ ] **Step 1: Write the failing golden matrix.** Define at least 10 cases covering standard, early/late Zi hour, lunar new year/除夕, leap month, true-solar-time boundary, male/female direction, empty palace, and a chart with known four transformations. Every call includes `language: 'zh-TW'` and complete `config: { algorithm: 'zhongzhou', yearDivide: 'normal' | 'exact', dayDivide: 'forward' }`. Each case asserts expected matched rule IDs and explicitly records expected pattern IDs where applicable.
- [ ] **Step 2: Run the new matrix and confirm RED.** Run `npm test -- src/lib/rules/golden.test.ts`; confirm the missing golden module/test failure or a deliberately unmet expected rule assertion before implementation changes.
- [ ] **Step 3: Implement the golden cases as data-driven tests.** Use the already-known fixtures in `docs/Golden/ziwei-fixtures.md`, derive `AnalyzedChart` through `analyzeChart`, and compare actual matched IDs to expected IDs without timestamps or random data. Do not change production rules merely to make an unsupported pattern pass.
- [ ] **Step 4: Add the V4 coverage calculation.** Calculate `detectedPatternIds / PATTERN_RULES.length` across the case matrix, assert it is at least `0.8`, and include the numerator/denominator in the test failure message so coverage regressions are actionable.
- [ ] **Step 5: Run GREEN and lint.** Run `npm test -- src/lib/rules/golden.test.ts` and `npx eslint src/lib/rules/golden.test.ts`.
- [ ] **Step 6: Commit Task 5.** Commit the golden suite with `test: add rule engine golden coverage`.

### Task 6: 模型忠於規則證據比較

**Files:**
- Create: `src/lib/rules/faithfulness.ts`
- Test: `src/lib/rules/faithfulness.test.ts`

**Interfaces:**
- Consumes: `llmOutput: string` and `ruleResults: RuleResult[]`.
- Produces: exported `FaithfulnessResult` and `compareFaithfulness(llmOutput: string, ruleResults: RuleResult[]): FaithfulnessResult[]`.

- [ ] **Step 1: Write failing faithful/contradictory/unsupported tests.** Use real-shaped rule results with star and palace evidence. Assert a claim matching `廉貞化祿` is faithful and carries the rule's evidence; `廉貞化忌` is contradictory when only `廉貞化祿` is supported; and an unsupported `天府化祿` claim is flagged with no fabricated evidence.
- [ ] **Step 2: Run focused tests and confirm RED.** Run `npm test -- src/lib/rules/faithfulness.test.ts`; confirm module-resolution failure before adding implementation.
- [ ] **Step 3: Implement a deterministic claim parser and matcher.** Parse explicit claims about known stars, palaces, four transformations, and fortune labels. Canonicalize zh-CN spellings to zh-TW keys, match exact rule/evidence facts, flag same-subject contradictions, and emit deterministic unsupported claim IDs. Preserve the original claim in `llmClaim`, describe the matched or contradictory rule in `ruleConclusion`, and never infer support from prose alone.
- [ ] **Step 4: Cover multiple claims and noise.** Add tests for multiple claims in one output, faithful palace placement, a claim with no supported rule, and unrelated prose that produces no false-positive result. Ensure results are stable and evidence-backed.
- [ ] **Step 5: Run GREEN and lint.** Run `npm test -- src/lib/rules/faithfulness.test.ts` and `npx eslint src/lib/rules/faithfulness.ts src/lib/rules/faithfulness.test.ts`.
- [ ] **Step 6: Commit Task 6.** Commit the comparison helper and tests with `feat: compare model claims with rule evidence`.
