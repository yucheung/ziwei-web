# B8：知識庫上線阻塞 + 品質債修復

> **來源**：使用者 human review of `103c12b`（2026-08-08）
> **結論**：工程可運作，但 P0×2 阻塞知識擴充（250 筆），P1×4 為品質債
> **驗證基準**：477 tests green · build exit 0 · eslint 0 errors/32 warnings

---

## P0：知識庫上線阻塞

### Task 1: 主解讀接入規則引擎（P0-1）

**現況**：App.tsx:143 計算 `ruleResults`，只傳 SpecialTopicPanel（:487）；ReadingPanel（:479）無 rules prop，LLM 自行判斷格局/四化。

**要求**：
1. `<ReadingPanel>` 新增 `rules?: RuleResult[]` prop
2. `buildReadingPrompt` 新增規則子集參數：系統 prompt 加入已匹配規則摘要（規則名稱 + evidence 關鍵字），LLM 必須以規則為依據，超出規則的主張需標明不確定
3. ReadingPanel 保存 reading 時 `rules` 欄位存入實際 ruleResults（取代 `[]`）
4. zh-TW/zh-CN 一致
5. Tests：App integration 驗證 ReadingPanel 收到 rules；prompt 內容含 matched rule

### Task 2: Citation 來源 schema 升級（P0-2）

**現況**：`starKnowledge.ts:17` source 硬編 `'iztro-sanhe-v1'`，無書名/章節/頁碼/審核狀態。

**目標**：升級 KnowledgeEntry source 欄位為可核驗結構：

```ts
interface KnowledgeSource {
  library: string;          // 'iztro-sanhe-v1' → iztro 內建三合派資料
  reference?: string;       // 可定位參考（書籍/章節/URL）
  excerpt?: string;         // 原文摘錄
  page?: string;            // 頁碼/章節
  reviewedBy: 'human' | 'opus' | null;   // 審核狀態
  reviewedAt?: string;
  status: 'collected' | 'source_checked' | 'cross_supported' | 'human_approved' | 'disputed';
}
```

- 舊 `iztro-sanhe-v1` 條目標 `reviewed: null, status: 'collected'`（未審核禁入規則）
- 審核狀態 na 默認 `collected` 的規則 engine 不納入高信度輸出
- 測試：至少1 條確認為 `human_approved` 的範例（可先用 WIKI 紫微斗數書目佐證）
- zh-TW/zh-CN 一致

## P1 品質債

### Task 3: chartId 完整化 + 歷史可重現（P1-1）

**現況**：App.tsx:481-485 chartId = `${calendarType}-${solarDate|lunarDate}-${hour}-${gender}`，缺閏月/算法/年界/longitude/astroType；ReadingPanel:211 固定 `rules: []`。

**目標**：
- chartId 改用完整 `ChartConfig` 的確定性 hash（含 isLeapMonth/algorithm/yearDivide/dayDivide/astroType/longitude）
- reading 保存時把當時的完整 ChartConfig 一併存入（StoredReading 增加 `chartConfig` 欄位），還原時可重建
- `rules` 存入真實 ruleResults
- migration：DB version bump（chartConfig 欄位 nullable 相容舊資料）

### Task 4: Canonical JSON 完整性（P1-2）

**現況**：export.ts 缺原始農曆日期/閏月/astroType；切語系 bytes 不同。

**目標**：
- ExportAstrolabe 增加：`calendarType`, `isLeapMonth`, `astroType`, `algorithm`, `yearDivide`, `dayDivide`, `longitude`, 原始輸入 date
- 語系決定性：export 固定用 zh-TW bytes（與輸入 locale 無關），或明確標記 locale 欄位
- test：相同 ChartConfig + 不同 locale → 結構性相同 bytes（或含 locale 標記）

### Task 5: UI 一致性（P1-3）

**現況**：Rule Info Panel 用即時表單值而非凍結排盤參數；MatchPanel Person A 未繼承完整設定。

**目標**：
- Rule Info Panel 改用凍結的 `lastChartOptions`（同 handleExportJson）
- MatchPanel Person A 選用「繼承當前命盤設定」時用完整 ChartConfig

### Task 6: 功能缺口（P1-4）

- 閏月輸入 UI（isLeapMonth 已存在於 ChartConfig，加 checkbox/select）
- SpecialTopicPanel 繼承主解讀 LLM 設定（或明確 split 按鈕）

---

## 派工拆分

| 批 | 內容 | worker |
|---|---|---|
| B8a | Task 1 + 2（P0 雙 fix） | Codex luna-MAX |
| B8b | Task 3 + 4（chartId/JSON） | Codex luna-MAX |
| B8c | Task 5 + 6（UI 一致性/缺口） | agy（UI 實作） |

## 驗收

- npm test 全綠（477 baseline + 新增）
- build exit 0 · eslint 0 errors
- Opus 複審 ≥8.5/10（P0 兩項為強制重點）