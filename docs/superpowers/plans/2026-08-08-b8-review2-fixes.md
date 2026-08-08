# B8 Review 2 Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce source-aware rule confidence, expose verifiable citation provenance, preserve raw chart inputs in canonical JSON, mark legacy history, and make history export safe in Node-compatible tests.

**Architecture:** Keep the existing rule catalogs and evidence string shape. Add one shared provenance boundary that resolves evidence knowledge IDs to source status and caps final consumer results; render structured `KnowledgeSource` objects at citation consumers with locale-aware labels. App owns the frozen raw `ChartConfig` export snapshot, while HistoryPanel recognizes both prefixed and pre-migration legacy IDs.

**Tech Stack:** TypeScript, React 19, Vitest 4, Testing Library, Vite, iztro 2.5.8, idb.

## Global Constraints

- i18n 雙語一致：任何新增 UI 文案必須同時進 zh-TW 與 zh-CN；canonical key 一律 zh-TW。
- Golden 測試的完整 `config`（含 `yearDivide`/`dayDivide`）不可省略或改寫。
- JSON 匯出不可加入 timestamp/randomness，並維持固定鍵順序。
- 未審核/未知 rule source 的 final confidence 必須 `<= 0.5`；只有 `human_approved`/`cross_supported` 可保留高於 `0.5`。
- 使用 `npm test`，不可使用 `npx vitest`；完成前跑 `npm test`、`npm run build`、修改檔案 eslint。
- 不改 `.hermes/`，不引入 LLM/AI 到確定性排盤層；不建立 commit（目前 `.git/index` 為唯讀）。

---

### Task 1: Source-aware rule confidence and prompt wording

**Files:**
- Create: `src/lib/rules/provenance.ts`
- Modify: `src/lib/rules/types.ts`
- Modify: `src/lib/rules/engine.ts`
- Modify: `src/lib/rules/fortune.ts`
- Modify: `src/lib/matchRules/types.ts`
- Modify: `src/lib/matchRules/engine.ts`
- Modify: `src/lib/prompts.ts`
- Test: `src/lib/rules/rules.test.ts`
- Test: `src/lib/prompts.test.ts`

**Interfaces:**
- `RuleMetadata.sourceStatus?: KnowledgeSource['status']`
- `RuleResult.sourceStatus?: KnowledgeSource['status']`
- `MatchRuleResult.sourceStatus?: KnowledgeSource['status']`
- `resolveRuleSourceStatus(evidence, explicitStatus?)`
- `applyRuleSourceConfidence<T extends { evidence: Evidence[]; confidence: number; sourceStatus?: KnowledgeSource['status'] }>(result: T): T`

- [ ] **Step 1: Add failing engine and prompt regression tests.**

  In `src/lib/rules/rules.test.ts`, run the existing deterministic `makeChart()` through `evaluateRules`, select a matched result whose evidence includes `star-lianzhen` or `palace-ming`, and assert its final confidence is `<= 0.5` and its `sourceStatus` is present and not an approved status. Also assert no result with `confidence > 0.5` has an unapproved `sourceStatus`.

  In `src/lib/prompts.test.ts`, add a matched `RuleResult` with `confidence: 0.5`, `sourceStatus: 'collected'`, and no evidence; assert the zh-TW prompt contains `初步參考，非確定結論`. Add the equivalent zh-CN assertion for `初步参考，非确定结论`, while retaining a high-confidence rule assertion that uses the higher-confidence wording.

- [ ] **Step 2: Run the focused tests and verify they fail for the missing cap/wording.**

  Run:

  ```bash
  npm test -- src/lib/rules/rules.test.ts src/lib/prompts.test.ts
  ```

  Expected failure: rules still expose `0.9`/`0.85` without `sourceStatus`, and matched-rule prompt has only the blanket certain-conclusion instruction.

- [ ] **Step 3: Implement the shared provenance resolver.**

  Add `sourceStatus` as optional metadata in `src/lib/rules/types.ts`. In `src/lib/rules/provenance.ts`, resolve `star-*` IDs through `getStarKnowledgeById` and `palace-*` IDs through `getPalaceKnowledgeById`; unresolved IDs and missing evidence use the conservative `disputed` status. Rank statuses from least trusted to most trusted, select the least trusted status across explicit status and evidence, and cap confidence to `0.5` unless every source is `human_approved` or `cross_supported`.

  Apply the helper to every result before dedupe/sort in `rules/engine.ts`. Apply it to the final `FortuneResult` after context evidence is added, and to results in `matchRules/engine.ts`; cap match conclusion confidence to `0.5` whenever the result is capped. Do not change `evaluatePatterns` or `evaluateFourTransformations` raw catalog output, so their existing unit contracts remain intact while engine consumers are protected.

- [ ] **Step 4: Implement confidence-aware bilingual matched-rule prompt text.**

  Extend `RuleGroundingLabels` with source-status and high/low-confidence labels. Replace the unconditional “all matched rules are certain” instruction with a localized priority rule: approved/cross-supported sources may be used as higher-confidence evidence; `confidence <= 0.5` is only preliminary reference and not a certain conclusion; claims outside the supplied rules remain uncertain. Add one per-rule status line and keep the numeric confidence.

- [ ] **Step 5: Run the focused red-green suite.**

  Run the two focused test files again, then:

  ```bash
  npm test -- src/lib/rules/rules.test.ts src/lib/rules/fortune.test.ts src/lib/matchRules/matchRules.test.ts src/lib/prompts.test.ts
  ```

  Update only assertions/snapshots whose expected confidence or prompt wording changed. Confirm the actual `evaluateRules` result, not a hand-built fixture, proves an unreviewed rule cannot remain above `0.5`.

### Task 2: Structured source formatting, school typing, and citation consumers

**Files:**
- Modify: `src/lib/starKnowledge.ts`
- Modify: `src/lib/palaceKnowledge.ts`
- Modify: `src/lib/citationTracer.ts`
- Modify: `src/lib/prompts.ts`
- Modify: `src/lib/specialTopics.ts`
- Modify: `src/components/SpecialTopicPanel.tsx`
- Modify: `src/lib/__snapshots__/prompts.test.ts.snap`
- Test: `src/lib/starKnowledge.test.ts`
- Test: `src/lib/palaceKnowledge.test.ts`
- Test: `src/lib/citationTracer.test.ts`
- Test: `src/lib/b4Integration.test.ts`
- Test: `src/lib/specialTopics.test.ts`
- Test: `src/components/SpecialTopicPanel.test.tsx`

**Interfaces:**
- `UnitSchool = 'sanhe' | 'classical_ziwei'`
- `formatKnowledgeSource(source, locale?: Locale): string`
- `getStarKnowledgeById(knowledgeId: string)`
- `getPalaceKnowledgeById(knowledgeId: string)`

- [ ] **Step 1: Add failing structured provenance and school tests.**

  Assert palace entries expose object sources with `status: 'collected'`. Assert the Wikisource-backed 紫微 entry has `school: 'classical_ziwei'`, keeps its reference/page/reviewer data, and its attributes confidence is below `1`. Assert `traceCitations()` gives a 紫微 citation below `1` while unreviewed entries remain capped at `0.5`.

  Add direct `formatKnowledgeSource` assertions for collected zh-TW/zh-CN text and a reviewed source containing both `reference` and `page`. Update B4/prompt tests to expect the formatted complete source and update the component test to assert status text/reference appears and `[object Object]` does not.

- [ ] **Step 2: Run the focused provenance tests and verify the expected failures.**

  Run:

  ```bash
  npm test -- src/lib/starKnowledge.test.ts src/lib/palaceKnowledge.test.ts src/lib/citationTracer.test.ts src/lib/b4Integration.test.ts src/lib/prompts.test.ts src/lib/specialTopics.test.ts src/components/SpecialTopicPanel.test.tsx
  ```

- [ ] **Step 3: Implement typed knowledge sources and field confidence.**

  Export `UnitSchool` from the knowledge modules. Keep all non-classical collected entries on `sanhe`; change only the Wikisource-backed entry to `classical_ziwei`. Add an optional attributes confidence marker to `StarKnowledgeAttributes`, set the partial 紫微 excerpt below `1`, and make citation tracing apply that marker as an additional cap. Convert palace string sources to normalized `KnowledgeSource` objects and expose ID lookups for the rule provenance resolver.

- [ ] **Step 4: Implement locale-aware complete source formatting and wire every consumer.**

  Format `library`, optional `reference`, optional `page`, localized status label, raw status, and reviewer label. Pass the prompt locale through structured-summary and special-topic formatting; pass the UI locale to `SpecialTopicPanel`. Keep canonical knowledge IDs and rule/evidence names in zh-TW.

- [ ] **Step 5: Run the focused citation/UI suite and refresh deterministic expectations.**

  Run the command from Step 2, update the prompt snapshot for complete provenance lines, and rerun it until green. Verify both locale dictionaries have every new label used by the UI.

### Task 3: Raw lunar input in canonical JSON

**Files:**
- Modify: `src/lib/export.ts`
- Modify: `src/App.tsx`
- Modify: `src/lib/export.test.ts`
- Modify: `src/App.integration.test.tsx`

**Interfaces:**
- `ExportRawInput` with `calendarType`, optional `solarDate`/`lunarDate`, `isLeapMonth`, `hour`, and `gender`
- `ExportAstrolabe.rawInput?: ExportRawInput`
- `ExportChartInput` accepts raw dates/config plus `hour`/`gender`

- [ ] **Step 1: Add failing export and App wiring tests.**

  Extend an export fixture with `rawInput: { calendarType: 'lunar', lunarDate: '2000-07-17', isLeapMonth: true, hour: 6, gender: 'male' }` and pass the same fields through `generateChartJson` options. Assert parsed `input.lunarDate` is exactly `2000-07-17`, `input.hour` is `6`, and the complete input can be mapped to a `ChartConfig` and passed to `chartConfigToGetChartOptions`/`getChart`.

  Update the App JSON spy test to expect `input.calendarType`, raw `lunarDate`/`solarDate` when present, `isLeapMonth`, `hour`, and `gender` in addition to frozen time/longitude fields. Add a lunar App case if the existing integration helper can submit the lunar form without changing golden fixtures.

- [ ] **Step 2: Run focused export tests and verify the old formatted-date behavior fails.**

  Run:

  ```bash
  npm test -- src/lib/export.test.ts src/App.integration.test.tsx
  ```

- [ ] **Step 3: Implement the raw input export boundary.**

  Add the typed `rawInput` field to `ExportAstrolabe`; build it from frozen `activeBirthData` in App. Pass the same data in `downloadChartJson` options. In `generateChartJson`, resolve each raw input field from options first, `astrolabe.rawInput` second, and formatted astrolabe values only as backward-compatible fallback. Emit fixed-order `input` keys without timestamps or random fields.

- [ ] **Step 4: Verify export determinism and replay.**

  Run the focused tests again, then `npm test -- src/lib/chartConfig.test.ts src/lib/export.test.ts src/App.integration.test.tsx`. Confirm the locale-independent canonical JSON tests remain byte-identical and the raw lunar string is retained.

### Task 4: Legacy history marker and URL-safe history export

**Files:**
- Modify: `src/lib/chartId.ts`
- Modify: `src/components/HistoryPanel.tsx`
- Modify: `src/i18n/zh-TW.ts`
- Modify: `src/i18n/zh-CN.ts`
- Test: `src/lib/chartId.test.ts`
- Test: `src/components/HistoryPanel.test.tsx`
- Test: `src/App.integration.test.tsx` when legacy restore fixtures need query compatibility

**Interfaces:**
- `createLegacyChartId(config): string` returns `legacy:<old-id>`
- `isLegacyChartId(id: string): boolean` recognizes prefixed and historical unprefixed IDs
- `getLegacyChartIdVariants(id: string): string[]` returns both query forms without duplicates

- [ ] **Step 1: Add failing legacy-label and URL-guard tests.**

  Assert `createLegacyChartId(baseConfig)` has the `legacy:` prefix, `isLegacyChartId` is true for both `legacy:solar-...` and `solar-...`, and false for `chart-...`. Seed an unprefixed legacy reading, render HistoryPanel with the prefixed query value, and assert it remains visible with the bilingual legacy warning. Seed a new `chart-...` reading and assert the warning is absent.

  Add a HistoryPanel export case with `vi.stubGlobal('URL', {})`; clicking export must not throw and must show the existing history error state. Keep the successful create/revoke mock test to verify the normal path.

- [ ] **Step 2: Run focused history tests and verify the expected failures.**

  Run:

  ```bash
  npm test -- src/lib/chartId.test.ts src/components/HistoryPanel.test.tsx
  ```

- [ ] **Step 3: Implement legacy ID recognition and bilingual UI marking.**

  Prefix newly generated legacy IDs, provide both query variants for old stored records, and make HistoryPanel query the hash plus both legacy forms. Render `history.legacyWarning` beside each legacy reading (including comparison cards if visible). Add the exact zh-TW/zh-CN translations `舊格式／命盤設定不完整` / `旧格式／命盘设置不完整`.

- [ ] **Step 4: Implement the Node-compatible URL boundary.**

  Obtain the API from `globalThis.URL`; if `createObjectURL` is unavailable, set `history.error` and return. Otherwise create the blob URL, click the link, and call optional `revokeObjectURL` through the same API. Do not call `new URL` in this download path.

- [ ] **Step 5: Run focused history/integration tests.**

  Run:

  ```bash
  npm test -- src/lib/chartId.test.ts src/components/HistoryPanel.test.tsx src/App.integration.test.tsx
  ```

  Confirm legacy unprefixed data remains discoverable and new hash history remains normal.

### Task 5: Full review and verification gate

**Files:**
- Review all modified files and generated snapshot only; no additional scope changes.

- [ ] **Step 1: Re-read this plan and inspect the complete diff.**

  Check every requirement: P0 rule cap at final engine boundary, low-confidence prompt wording in both locales, complete citation data/status, classical school and partial attributes confidence, raw lunar replay input, legacy warning/compatibility, and URL guard.

- [ ] **Step 2: Request an independent code review.**

  Use the requesting-code-review skill with the working tree diff and this plan as context. Address critical/important findings before the final gate.

- [ ] **Step 3: Run the required full verification commands.**

  ```bash
  npm test
  npm run build
  npx eslint src/lib/rules/provenance.ts src/lib/rules/types.ts src/lib/rules/engine.ts src/lib/rules/fortune.ts src/lib/matchRules/types.ts src/lib/matchRules/engine.ts src/lib/prompts.ts src/lib/starKnowledge.ts src/lib/palaceKnowledge.ts src/lib/citationTracer.ts src/lib/specialTopics.ts src/lib/export.ts src/lib/chartId.ts src/App.tsx src/components/SpecialTopicPanel.tsx src/components/HistoryPanel.tsx src/i18n/zh-TW.ts src/i18n/zh-CN.ts
  ```

  Record actual exit codes and the Vitest test count; do not claim completion from a partial or prior run.
