# B8b Chart Identity and Canonical JSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make chart identities and stored readings fully reproducible, and make JSON exports complete and byte-stable across the two UI locales.

**Architecture:** Add a pure `createChartId(ChartConfig)` boundary that serializes every chart-input field in a fixed order and hashes that serialization. Persist the same `ChartConfig` alongside each reading; App owns chart reconstruction when HistoryPanel returns a stored reading, while legacy readings continue restoring text only. Enrich the export boundary with chart settings and emit a zh-TW-canonical JSON snapshot with a fixed locale marker and both solar/lunar dates.

**Tech Stack:** Vite, React 19, TypeScript, Vitest, Testing Library, iztro 2.5.8, IndexedDB/memory storage.

## Global Constraints

- i18n 雙語一致：新增 UI 文案必須同時進 zh-TW 與 zh-CN；本變更不新增 UI 文案。
- ChartConfig 與 golden 排盤設定必須保留 `isLeapMonth`, `algorithm`, `yearDivide`, `dayDivide`, `astroType`, `longitude`。
- JSON 匯出不得含時間戳或隨機性，且固定鍵順序。
- Canonical JSON 的 chart 名稱固定使用 zh-TW canonical 名稱，並輸出 `locale: "zh-TW"`。
- 舊 StoredReading 缺少 `chartConfig` 時必須仍可讀取與還原文字。
- 使用 `npm test`，不得使用全域 `npx vitest`；完成前必須通過 build、test 與修改檔案 ESLint。
- git 只讀：不建立 commit、不改變 branch 或 index。

---

### Task 1: Deterministic chart identity and reading persistence

**Files:**
- Create: `src/lib/chartId.ts`
- Create: `src/lib/chartId.test.ts`
- Modify: `src/lib/storage.ts`
- Modify: `src/lib/storage.test.ts`
- Modify: `src/components/ReadingPanel.tsx`
- Modify: `src/components/ReadingPanel.test.tsx`
- Modify: `src/components/HistoryPanel.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.integration.test.tsx`

**Interfaces:**
- Produces `createChartId(config: ChartConfig): string`, returning the same `chart-<hash>` for the same complete config and changing when any config field changes.
- Extends `StoredReading` with `chartConfig?: ChartConfig | null`.
- Extends `ReadingPanelProps` with `chartConfig?: ChartConfig | null`; completed saves include it when supplied.
- App passes `activeBirthData` into ReadingPanel and handles restored readings with a config by calling the existing `handleLoadChart` path; readings without it remain compatible.

- [x] **Step 1: Write failing chart identity tests.**

  Create a literal base config containing solar/lunar date slots, hour, gender, leap-month flag, algorithm, year/day divide, astro type, and longitude. Assert repeated calls are equal, and assert changing representative identity inputs (leap month, algorithm, astro type, and longitude) changes the id.

- [x] **Step 2: Run the chart identity test and verify the expected missing-module failure.**

  Run `npm test -- src/lib/chartId.test.ts`. It must fail because `src/lib/chartId.ts` and `createChartId` do not exist yet.

- [x] **Step 3: Implement the minimal deterministic chart id function.**

  Serialize an explicitly ordered object with every `ChartConfig` field, using `null` for absent optional dates/longitude so omission cannot alias another value. Hash the resulting string with a deterministic 64-bit FNV-1a-style loop and return a stable `chart-` prefixed hexadecimal id. Do not use `crypto.randomUUID`, timestamps, locale, or object key iteration.

- [x] **Step 4: Run the chart identity test and verify it passes.**

  Run `npm test -- src/lib/chartId.test.ts`; the deterministic and changed-config assertions must pass.

- [x] **Step 5: Write failing storage and ReadingPanel persistence tests.**

  Add a storage test that saves a reading with a complete config and expects `getReading`/`listReadings` to return the same config, plus a legacy object without `chartConfig` that still returns with `chartConfig` absent. Update the ReadingPanel completion test to pass a complete config and assert `saveReading` receives it together with the supplied rules.

- [x] **Step 6: Run the focused persistence tests and verify they fail for the missing field/prop.**

  Run `npm test -- src/lib/storage.test.ts src/components/ReadingPanel.test.tsx`. The new assertions must fail because the storage type and save payload do not yet carry `chartConfig`.

- [x] **Step 7: Add the optional config field and save it.**

  Add `chartConfig?: ChartConfig | null` to `StoredReading`. Add the optional prop to ReadingPanel and include the supplied config in the saved object, while leaving it absent/nullable for callers that do not provide one. Storage normalization must continue filtering legacy rules without requiring the new field.

- [x] **Step 8: Run focused persistence tests and verify they pass.**

  Re-run `npm test -- src/lib/storage.test.ts src/components/ReadingPanel.test.tsx`; verify both round-trip and legacy cases pass.

- [x] **Step 9: Write the failing history rehydration integration test.**

  Seed a stored reading with a distinct full config, open the App reading tab, click its restore button, and assert the form date/time/gender and chart center update to that config. Also retain the existing HistoryPanel callback test so a legacy reading without `chartConfig` still calls the callback with the original record.

- [x] **Step 10: Run the rehydration test and verify it fails before App wiring.**

  Run `npm test -- src/App.integration.test.tsx src/components/HistoryPanel.test.tsx`; the seeded reading should restore text but the App form/chart assertions must fail because no callback currently rebuilds the chart.

- [x] **Step 11: Wire the full config through App and history restore.**

  Replace the hand-built App chartId with `createChartId(activeBirthData)`, pass `chartConfig={activeBirthData}` to ReadingPanel, and pass an App callback that invokes `handleLoadChart(reading.chartConfig)` only when the optional config exists. Keep the current reading text restoration in ReadingPanel, so missing legacy config is a text-only restore. No new visible copy is needed.

- [x] **Step 12: Run the focused chart identity/history tests and the full test suite.**

  Run `npm test -- src/lib/chartId.test.ts src/lib/storage.test.ts src/components/ReadingPanel.test.tsx src/components/HistoryPanel.test.tsx src/App.integration.test.tsx`, then `npm test`. Confirm the baseline suite remains green before starting Task 2.

### Task 2: Complete and locale-independent canonical JSON

**Files:**
- Modify: `src/lib/export.ts`
- Modify: `src/lib/export.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.integration.test.tsx`

**Interfaces:**
- `ExportAstrolabe` accepts `calendarType`, `isLeapMonth`, `astroType`, `algorithm`, `yearDivide`, `dayDivide`, and optional `longitude` in addition to both date fields.
- `GenerateChartJsonOptions.input` can carry the original date/config fields when a caller has them; generated JSON always emits the complete deterministic input shape.
- `generateChartJson` uses the input locale only to interpret the source astrolabe and always emits zh-TW canonical values plus `locale: "zh-TW"`.

- [x] **Step 1: Write failing canonical JSON tests.**

  Add an enriched astrolabe fixture with both dates and all chart-config fields. Assert parsed JSON contains `locale`, both `input.solarDate`/`input.lunarDate`, all required config keys, and `longitude` when supplied. Build equivalent zh-TW and zh-CN charts with the same config and assert `generateChartJson` returns byte-identical strings even when called with their respective locales. Assert canonical output contains `遷移`/`巨門` and not simplified equivalents.

- [x] **Step 2: Run the focused export tests and verify the new assertions fail.**

  Run `npm test -- src/lib/export.test.ts`; it must fail because the current JSON omits config/date fields, has no fixed locale marker, and translates output according to locale.

- [x] **Step 3: Extend the export boundary and canonicalize source values.**

  Add the requested optional config fields to `ExportAstrolabe` for compatibility with raw iztro objects. Add the corresponding optional input snapshot fields. Implement a small canonical-value helper using `toCanonicalKey` followed by zh-TW output, with the caller locale as source locale. Use it for palace, star, brightness, mutagen, stem, branch, gender, and five-elements values; preserve nonlocalized star type fields.

- [x] **Step 4: Emit the complete fixed-order JSON schema.**

  Make `generateChartJson` always create the top-level order `schemaVersion`, `locale`, optional `settings`, `input`, optional `horoscope`, `chart`, `determinism`. Emit `input.solarDate`, `input.lunarDate`, `calendarType`, `isLeapMonth`, `astroType`, `algorithm`, `yearDivide`, `dayDivide`, `timeIndex`, canonical gender, `isLunar`, and optional longitude. Use explicit stable defaults only when a raw astrolabe lacks an enriched field; never add timestamps/random values. Ignore locale for output text while retaining it as source interpretation input.

- [x] **Step 5: Pass the frozen complete chart snapshot from App.**

  Build one enriched `ExportAstrolabe` from the displayed astrolabe and `activeBirthData`, preserving iztro’s derived solar/lunar dates and adding the frozen config fields. Use it for CSV/summary/JSON handlers; keep `lastChartOptions` for frozen timeIndex/isLunar/longitude and existing settings metadata. This prevents an unsubmitted form edit from changing exported chart identity or settings.

- [x] **Step 6: Run focused export and App integration tests and update only stale expectations.**

  Run `npm test -- src/lib/export.test.ts src/App.integration.test.tsx`. Update assertions that depended on locale-translated JSON or the old top-level key order to the fixed canonical contract; keep the frozen-options assertion exact.

- [x] **Step 7: Run the complete verification gate.**

  Run `npm test`, `npm run build`, and `npx eslint src/lib/chartId.ts src/lib/chartId.test.ts src/lib/storage.ts src/lib/storage.test.ts src/components/ReadingPanel.tsx src/components/ReadingPanel.test.tsx src/components/HistoryPanel.test.tsx src/App.tsx src/App.integration.test.tsx src/lib/export.ts src/lib/export.test.ts`. Record actual exit codes and test count; report that no commit was created.

## Self-review checklist

- [x] Every chart identity input is included in the ordered serialization, including both optional dates and longitude.
- [x] Stored readings with and without `chartConfig` both normalize and load safely.
- [x] Restoring a config follows the same validation/rebuild path as loading a saved chart.
- [x] JSON contains both date fields and every requested deterministic chart setting.
- [x] JSON bytes are independent of source UI locale because values are converted to zh-TW canonical keys and the fixed locale marker is explicit.
- [x] No UI strings were added, so zh-TW/zh-CN translation dictionaries remain synchronized.
