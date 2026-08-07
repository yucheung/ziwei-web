# B6a Chart Config, Collection, and Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement B6 Tasks 0–3 with a locale-independent `ChartConfig`, local chart collection, and privacy-explicit compressed URL sharing.

**Architecture:** `ChartConfig` is the serializable birth-data boundary. It contains only the inputs required to reproduce a chart (including the active calendar and optional true-solar-time inputs); the current UI locale is supplied only when converting it to `GetChartOptions`. IndexedDB stores `StoredChart` and `StoredReading`, while URL sharing serializes `{ birthData, reading }` through `lz-string` and re-generates the chart after decoding.

**Tech Stack:** TypeScript, React, Vitest, IndexedDB through `idb`, and `lz-string`.

## Global Constraints

- **ChartConfig 應包含**出生日期（solarDate / lunarDate）、時辰（hour）、性別（gender）、農曆/真太陽時設定（yearDivide / dayDivide）、astroType；必要的曆法、閏月與真太陽時輸入可一併保存以確保可重算。
- **ChartConfig 不應包含** UI 語言、API Key、LLM 設定；`outputLocale` 由當前使用者決定。
- 收藏資料使用 `StoredChart { id, name, birthData, createdAt }`；不得把 API key 或 LLM 設定寫入收藏或分享 payload。
- 分享 payload 只包含 `birthData` 與 `reading`，URL 格式為 `?s=<compressed>`，使用 `lz-string`。
- 收到分享 URL 後解壓縮、驗證 payload，依當前 locale 重新計算 chart，再顯示 reading。
- B5 design debt：`FortunePeriod.palaceIndex` / `palaceNames` 必填；`buildPeriodChart` 不把運限星 push 到 `majorStars`，只在既有星曜上標記運限 mutagen。
- 所有新增 UI 文案必須同時加入 zh-TW 與 zh-CN；canonical key 使用 zh-TW；不得硬編碼 locale。
- 使用 `npm test`、`npm run build` 與 ESLint；不得使用全域 `vitest`。

---

### Task 0: B5 fortune overlay design debt

**Files:**
- Modify: `src/lib/rules/fortune.ts`
- Modify: `src/lib/rules/fortune.test.ts` and every `FortunePeriod` literal under `src/`

**Interfaces:**
- `FortunePeriod` keeps `type`, `palace`, `stars`, `mutagens`, and `themes`, and now requires `palaceIndex: number` and `palaceNames: string[]`.
- `buildPeriodChart` remains an internal helper. It must clone the chart, preserve every existing star array, and apply period mutagen markers to matching existing stars without adding synthetic stars.

- [ ] **Step 1: Write the failing regression tests.** Add required `palaceIndex`/`palaceNames` to fixtures and add a case whose target palace has an existing `廉貞` star. Assert that evaluation finds `廉貞化祿`, the copied chart has the same number of stars, and the input chart is unchanged. Add a case where a period star is absent from the chart and assert it does not appear as a synthetic `majorStars` entry.

- [ ] **Step 2: Run the focused test before implementation.**

  Run: `npm test -- src/lib/rules/fortune.test.ts`

  Expected: FAIL because the current overlay pushes a synthetic period star and the required fields are not present in all fixtures.

- [ ] **Step 3: Implement the minimal overlay fix.** Make `palaceIndex` and `palaceNames` required, update all callers, clone palace/star arrays, and for each existing major/minor/adjective star whose canonical name is in the period mutagen map, copy the star with the marker. Do not call `.push()` on any star array. Keep the existing evidence fields in the `fortune.<type>.stars[...]` namespace and do not recreate the removed `本命命宮` alias.

- [ ] **Step 4: Run the focused test and the full suite.**

  Run: `npm test -- src/lib/rules/fortune.test.ts` then `npm test`

  Expected: all tests pass; no `FortunePeriod` call site is left without both required fields.

- [ ] **Step 5: Commit the focused B5 fix.**

  Run: `npx eslint src/lib/rules/fortune.ts src/lib/rules/fortune.test.ts` and commit with `fix: correct fortune period overlay markers`.

---

### Task 1: ChartConfig and IndexedDB storage

**Files:**
- Create: `src/lib/chartConfig.ts`, `src/lib/chartConfig.test.ts`
- Create: `src/lib/storage.ts`, `src/lib/storage.test.ts`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**

```ts
export type CalendarType = 'solar' | 'lunar';

export interface ChartConfig {
  solarDate?: string;
  lunarDate?: string;
  calendarType: CalendarType;
  isLeapMonth: boolean;
  /** Shichen index for ordinary input, or HH:mm when true-solar correction is active. */
  hour: number | string;
  gender: 'male' | 'female';
  algorithm: NonNullable<Config['algorithm']>;
  yearDivide: NonNullable<Config['yearDivide']>;
  dayDivide: NonNullable<Config['dayDivide']>;
  astroType: AstroType;
  longitude?: number;
}

export function chartConfigToGetChartOptions(
  birthData: ChartConfig,
  outputLocale: 'zh-TW' | 'zh-CN',
): GetChartOptions;
```

`ChartConfig` must have no `outputLocale`, `language`, `apiKey`, or LLM fields. `hour` is the canonical engine time input: a numeric shichen index for ordinary charts and an `HH:mm` string when true-solar correction is active. `chartConfigToGetChartOptions` selects `solarDate`/`lunarDate` according to `calendarType`, maps `hour` directly to `timeIndex`, and injects the caller's locale only into the returned engine options.

```ts
export interface StoredChart {
  id: string;
  name: string;
  birthData: ChartConfig;
  createdAt: string;
}

export interface StoredReading {
  id: string;
  chartId: string;
  reading: string;
  rules: unknown[];
  createdAt: string;
}

export function saveChart(chart: StoredChart): Promise<StoredChart>;
export function getChart(id: string): Promise<StoredChart | undefined>;
export function listCharts(): Promise<StoredChart[]>;
export function deleteChart(id: string): Promise<void>;
export function saveReading(reading: StoredReading): Promise<StoredReading>;
export function getReading(id: string): Promise<StoredReading | undefined>;
export function listReadings(chartId?: string): Promise<StoredReading[]>;
export function deleteReading(id: string): Promise<void>;
export function clearAll(): Promise<void>;
```

- [ ] **Step 1: Add the failing ChartConfig tests.** Assert conversion for solar and lunar input, preservation of `hour`, `gender`, `yearDivide`, `dayDivide`, `astroType`, optional true-solar-time fields, locale injection, and absence of locale/LLM/API fields from serialized `ChartConfig`.

- [ ] **Step 2: Run the ChartConfig test and verify the expected RED failure.**

  Run: `npm test -- src/lib/chartConfig.test.ts`

  Expected: FAIL because the module and conversion function do not exist.

- [ ] **Step 3: Implement `ChartConfig` and conversion.** Keep the serializable type separate from `GetChartOptions`; use the existing `DEFAULT_CONFIG` values when constructing defaults and retain `algorithm` because it changes deterministic chart output.

- [ ] **Step 4: Add the failing storage CRUD tests.** Cover save/get, descending `createdAt` list ordering, update-by-id, both reading list modes, deletes, `clearAll`, and missing-key reads returning `undefined`.

- [ ] **Step 5: Run the storage test to verify RED, then implement storage.**

  Run: `npm test -- src/lib/storage.test.ts`

  Expected before implementation: FAIL because the storage module does not exist.

  Use an IndexedDB database named `ziwei-web` with `charts` and `readings` stores. Keep the wrapper lazy and add a small in-memory adapter only for environments without IndexedDB so Node/DOM unit tests remain deterministic; production browsers use IndexedDB. Sort lists by `createdAt` descending and return cloned records so callers cannot mutate stored state accidentally.

- [ ] **Step 6: Run focused GREEN tests and lint.**

  Run: `npm test -- src/lib/chartConfig.test.ts src/lib/storage.test.ts` and `npx eslint src/lib/chartConfig.ts src/lib/chartConfig.test.ts src/lib/storage.ts src/lib/storage.test.ts`.

- [ ] **Step 7: Commit Task 1.** Add direct runtime dependencies `idb` and `lz-string` (the lockfile must be updated) and commit with `feat: add chart config and local storage`.

---

### Task 2: Chart collection panel

**Files:**
- Create: `src/components/CollectionPanel.tsx`, `src/components/CollectionPanel.test.tsx`
- Modify: `src/App.tsx`, `src/i18n/zh-TW.ts`, `src/i18n/zh-CN.ts`

**Interfaces:**

```ts
export interface CollectionPanelProps {
  currentBirthData: ChartConfig | null;
  onLoad: (birthData: ChartConfig) => void;
}
```

The panel owns asynchronous `listCharts`/`saveChart`/`deleteChart` calls. It displays name, birth data, and saved date; provides save-current, load, inline rename, and confirmation-gated delete. A save is only enabled when `currentBirthData` exists. Rename overwrites the same `id` and preserves `createdAt`.

- [ ] **Step 1: Add the failing component tests.** Assert empty state, save current chart, list display, load callback, inline rename persistence, and delete confirmation. Render through `I18nProvider` and use real storage functions with `clearAll` in setup.

- [ ] **Step 2: Run the focused test to verify RED.**

  Run: `npm test -- src/components/CollectionPanel.test.tsx`

  Expected: FAIL because the panel does not exist.

- [ ] **Step 3: Implement the panel and bilingual strings.** Use translated labels for every new button, status, date label, confirmation prompt, and error; never branch on a literal `'zh-TW'`/`'zh-CN'` in the component.

- [ ] **Step 4: Integrate the panel in `App.tsx`.** Keep a frozen `activeBirthData` for the displayed chart. On load, convert the stored config with the current locale, call `getChart`, update the form fields and frozen options, and keep the current locale-driven astrolabe output. Ensure API/LLM state is not passed to or stored by the panel.

- [ ] **Step 5: Run focused component tests, existing App tests, and lint.**

  Run: `npm test -- src/components/CollectionPanel.test.tsx src/App.test.tsx src/App.integration.test.tsx` and `npx eslint src/components/CollectionPanel.tsx src/components/CollectionPanel.test.tsx src/App.tsx src/i18n/zh-TW.ts src/i18n/zh-CN.ts`.

- [ ] **Step 6: Commit Task 2** with `feat: add local chart collection panel`.

---

### Task 3: Compressed URL sharing

**Files:**
- Create: `src/lib/shareUrl.ts`, `src/lib/shareUrl.test.ts`
- Modify: `src/App.tsx`, `src/components/ReadingPanel.tsx`, `src/components/ReadingPanel.test.tsx`, `src/i18n/zh-TW.ts`, `src/i18n/zh-CN.ts`

**Interfaces:**

```ts
export interface SharePayload {
  version: 1;
  birthData: ChartConfig;
  reading: string;
}

export function createShareUrl(
  birthData: ChartConfig,
  reading: string,
  baseUrl?: string,
): string;
export function decodeShareUrl(url: string): SharePayload | null;
export function decodeSharePayload(compressed: string): SharePayload;
```

- [ ] **Step 1: Add failing codec tests.** Assert encode/decode round-trip, `?s=` output, both empty and non-empty reading text, malformed/compressed-invalid input rejection, and that decoded payload contains no output locale/API key/LLM settings. Assert existing query parameters remain intact.

- [ ] **Step 2: Run the focused test to verify RED.**

  Run: `npm test -- src/lib/shareUrl.test.ts`

  Expected: FAIL because the codec module does not exist.

- [ ] **Step 3: Implement deterministic payload validation and compression.** Serialize only `{ version: 1, birthData, reading }`, use `compressToEncodedURIComponent`, parse the `s` query parameter, validate the shape and date/hour fields, and throw a user-safe error for malformed data. Do not include UI locale, API key, or LLM config.

- [ ] **Step 4: Add the share action and restore flow.** Lift the reading text through an optional `onReadingChange` callback in `ReadingPanel`, add a share button in the chart actions, copy the generated URL, show the translated privacy warning (“This URL contains birth data. Only share with consent.”), and detect `?s=` once on page load. Offer restore with a translated confirmation; if accepted, regenerate using current locale and seed the restored reading text.

- [ ] **Step 5: Add component/integration tests.** Assert the share button uses the active chart config and current reading, and a valid URL regenerates the chart without changing the user's locale or LLM settings.

- [ ] **Step 6: Run the complete Task 0–3 gate.**

  Run: `npm test`, `npm run build`, and `npx eslint src/lib/rules/fortune.ts src/lib/rules/fortune.test.ts src/lib/chartConfig.ts src/lib/chartConfig.test.ts src/lib/storage.ts src/lib/storage.test.ts src/lib/shareUrl.ts src/lib/shareUrl.test.ts src/components/CollectionPanel.tsx src/components/CollectionPanel.test.tsx src/components/ReadingPanel.tsx src/components/ReadingPanel.test.tsx src/App.tsx src/App.test.tsx src/App.integration.test.tsx src/i18n/zh-TW.ts src/i18n/zh-CN.ts`.

- [ ] **Step 7: Commit Task 3** with `feat: add compressed chart sharing`.
