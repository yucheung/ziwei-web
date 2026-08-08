# B8 Review 2 治理、匯出與歷史相容性設計

> 日期：2026-08-08  
> 基線：`61c8112`，`npm test` 524/524

## Goal

讓未審核知識無法以高信心進入 LLM，讓引用在 prompt/UI 中可核驗，並保留可回播的原始排盤輸入與可辨識的舊歷史資料。

## Design

### 1. Rule provenance 與 confidence cap

`RuleMetadata` 與 `RuleResult` 各加入可選的 `sourceStatus`。規則定義維持現有 97 條資料與 hard-coded 基準 confidence；不逐條重寫定義。

新增集中 provenance helper：依 `Evidence.knowledgeId` 查詢星曜或宮位 knowledge entry 的 `KnowledgeSource.status`，未知 knowledge 視為保守狀態。engine 在去重、排序前對每個 matched result 計算最保守的來源狀態：只有所有來源都是 `human_approved` 或 `cross_supported` 才保留原始 confidence，其他狀態一律 `Math.min(confidence, 0.5)`，並將狀態回填到 `RuleResult.sourceStatus`。直接的 pattern/four-transformation evaluator 保持原始資料 API；主 engine 是 LLM 消費邊界。fortune 與 match 的結果若直接供消費端使用，也呼叫同一 cap helper。

### 2. Structured citation 與知識學派

`KnowledgeSource` 保持既有五種 status，`formatKnowledgeSource` 改為輸出：

```text
iztro-sanhe-v1 (未審核 / collected)
iztro-sanhe-v1, <reference> <page> [人類審核 / human_approved]
```

函式接受 locale，zh-TW/zh-CN 分別輸出 status/reviewer 標籤；reference、page 永遠保留。palace knowledge 的 legacy string source 全部正規化為 collected `KnowledgeSource` object。新增/擴充 `UnitSchool` 為 `sanhe | classical_ziwei`；Wikisource 紫微條目使用 `classical_ziwei`。該條目的古籍摘錄只部分支持 attributes，因此在 attributes 上放低於 1 的 field confidence，trace citation 使用該值作為額外上限；不偽造完整古籍支持。

主 reading prompt、special-topic prompt 與 `SpecialTopicPanel` 都傳入 locale 來渲染完整 citation。matched rules prompt 會標示來源審核優先級；`confidence <= 0.5` 的逐條規則明確輸出「初步參考，非確定結論」（zh-CN 對應簡體文案），不再以全域「確定結論」描述所有規則。

### 3. Canonical JSON raw input

`ExportAstrolabe` 增加 typed `rawInput`，App 從 frozen `activeBirthData` 建立它，並在 `generateChartJson` 的 input options 同時傳入原始欄位。JSON input 固定鍵順序，優先順序為 options raw input → `astrolabe.rawInput` → derived astrolabe fallback。輸出保留 `solarDate`、`lunarDate`、`calendarType`、`isLeapMonth`、`hour`、`gender`、`timeIndex` 等可直接重建 `ChartConfig` 的資料；農曆輸入使用使用者原始字串，不使用 iztro 格式化中文日期覆蓋。

### 4. Legacy history IDs

`createLegacyChartId` 回傳 `legacy:<old-id>`；`isLegacyChartId` 同時辨識 prefixed 與歷史上已存的 unprefixed old-id。HistoryPanel 查詢兩種 ID，並在任何 legacy reading 上顯示雙語「舊格式／命盤設定不完整」警示。新的 `chart-<hash>` 不顯示警示，且既有 hash 查詢行為不變。

### 5. URL test/runtime boundary

History JSON download 只透過 `globalThis.URL` 取得 `createObjectURL`/`revokeObjectURL`，在 Node/jsdom 沒有 object URL API 時安全返回並顯示既有錯誤狀態，不直接假設 `URL` 是可建構的 DOM constructor。測試以可還原的 `globalThis.URL` mock 驗證下載流程，並保證 full suite 無 unhandled error。

## Testing strategy

- Rule engine regression：實際命中引用 collected knowledge 的規則，確認 final confidence `<= 0.5` 且 sourceStatus 被保留；prompt 同時測 high/low confidence 與 zh-TW/zh-CN 文案。
- Citation regression：檢查 status/reference/page、Wikisource school、partial attributes citation confidence；prompt/UI 不得出現 `[object Object]`。
- Export regression：App spy 驗證 raw lunar input 被傳遞；JSON 保留原始 `2000-07-17`，由解析結果組成 `ChartConfig` 後可重新呼叫排盤。
- History regression：prefixed/unprefixed legacy ID 都被標示，新 hash 不被標示；URL mock test 驗證 create/revoke 呼叫。
- Gate：`npm test`、`npm run build`、`npx eslint <modified files>`。

## Scope guard

不引入 LLM/AI 到確定性排盤層，不改 iztro golden fixture 的排盤設定，不新增未要求的 knowledge content；所有新增 UI 文案同步 zh-TW/zh-CN。
