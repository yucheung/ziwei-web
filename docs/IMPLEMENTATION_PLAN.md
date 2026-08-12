# ziwei-web 後續功能執行規畫（Implementation Plan）

> ⚠️ **本文件為歷史執行計畫（B1-B7），已執行完畢。** 當前狀態請見 docs/MILESTONES.md。
>
> 建立：2026-08-07
> 執行期間：2026-08-04 ~ 2026-08-08（B1-B8）
> 基線（執行時）：C 組完成（zh-TW/zh-CN、302 tests、Opus 9.0/10、已部署 GH Pages + CF Workers）
> 上游決策：docs/ROADMAP.md（D1-D5 已確認）
> 執行模式：Hermes 發派 → claude（Sonnet 寫 / Opus 審）+ agy（掃描/審查）→ Hermes 監督 review
> 驗收門檻（每批共用）：`npm run build` exit 0、vitest 全綠、eslint 0 error、Opus review ≥ 8.5（放行門檻）

---

## 0. 正式執行基線（2026-08-07 使用者確認）

本 B1–B7 作為執行基線，依賴順序合理。已簽入三個邊界補強，避免範圍膨脹：

1. **Golden 分批啟用**
   - B1：只建立**框架 + 排盤 Golden**
   - 規則 Golden → **B5** 才完整啟用
   - 解讀案例集 → **B4 / V3** 開始投入評測

2. **明確界定 B3 vs B4**
   - **B3**：只負責確定性盤面事實、adapter 結果、StructuredSummary schema、接入 Prompt
   - **B4**：加入星曜知識、來源、流派、版本、證據引用
   - 因此 **B3 是「管線第一次閉合」**；真正擺脫 LLM 自由推理要到 **B5**

3. **V3 / V4 放入批次驗收**
   - **V3**（A/B/C 摘要測試）：**B4 結束前完成**
   - **V4**（格局偵測覆蓋率 80%）：作為 **B5 完成門檻**

### 批次退出條件（正式）

| 批次 | 主要退出條件 |
|---|---|
| **B1** | 相同輸入可重現相同 JSON；排盤 Golden 可執行；可查看實際 LLM 輸入 |
| **B2** | iztro 四化資料逐層驗證；三方四正 adapter 與 canonical model 一致 |
| **B3** | iztro → ChartAnalyzer → StructuredSummary → prompt → LLM 全線運作；schema 有版本且結果具確定性 |
| **B4** | 每項知識具 knowledgeId / source / school / ruleSetVersion；完成 V3 |
| **B5** | 規則命中有完整證據；規則 Golden 通過；完成 V4 80% 目標 |
| **B6** | 收藏、歷史、追問、列印、分享不破壞隱私資料模型；暫不導入帳號系統 |
| **B7** | 合盤與專題只引用已驗證規則；敏感議題套用明確斷言邊界 |

---

## 1. 橫向工作：LLM Provider 測試（非獨立批次）

先前討論的 Provider 測試**不另立 B8**，內嵌於各批：

| 批次 | Provider 橫向任務 |
|---|---|
| **B1** | 記錄 provider/model/promptVersion/ruleSetVersion/usage/latency/status |
| **B3** | 建立 Provider capability 與串流錯誤處理 |
| **B4** | 用固定模型執行 V3，不使用隨機 free router |
| **B5** | 比較模型是否忠於規則證據，而非比較文筆 |

> 完成定義：**B3 閉合結構化管線，B4 建立可信知識來源，B5 才真正閉合可驗證的命理解讀核心。**

---

## 2. 原則（承接 D1-D5）

1. **D1** 先三合派，飛星獨立版本化（`school: "sanhe"` + `ruleSetVersion: "sanhe-v1"`）
2. **D2** JSON Knowledge + Typed Rule Predicates + Structured Evidence；不導入 RAG（Phase 3+ 才考慮）
3. **D3** Golden Set 拆三套（排盤 / 規則 / 解讀案例）
4. **D4** 八字擱置（只留四柱顯示 + 博士十二神，標「無解讀」）
5. **D5** 隱私資料模型預留（localStorage schema 為未來帳號系統留擴充點）

---

## 3. 對應

| 批次 | 內容 | 依賴 | 工作量 | 主要價值 |
|---|---|---|---|---|
| **B1** | P0 排盤透明化（面板/JSON 匯出/LLM 輸入檢視/排盤 Golden 框架）| 無 | 小 | 可驗證盤面正確性 |
| **B2** | V1+V2 驗證（四化疊盤、三方四正 adapter）| 無 | 中 | 消除 ChartAnalyzer 風險 |
| **B3** | ChartAnalyzer v1 + summarize 結構化重構（管線第一次閉合）| B2 | 大 | 消除「LLM 祈禱機」核心缺口 |
| **B4** | 星曜知識庫 v1 + 證據追溯（可信來源）+ V3 | B3 | 中 | 解讀可控、可回溯 |
| **B5** | Phase 2 規則引擎（四化/格局 v1 + 規則 Golden + V4）| B3+B4 | 大 | 規則驅動取代 LLM 自由推理 |
| **B6** | Phase 3 功能（收藏/歷史/追問/列印/URL 分享）| B3 | 中 | 日常使用 |
| **B7** | Phase 4 合盤規則庫 + 專題解讀 | B5 | 大 | 深度解讀 |

---

## 5. 各批詳細任務

### B1：P0 排盤透明化
| 任務 | 內容 | 退出條件掛鉤 |
|---|---|---|
| 1.1 排盤規則面板 | Settings 或 ChartGrid 旁顯示：流派（三合派 v1）、年界、節氣、閏月、時區、真太陽時設定、iztro 版本 | B1 全線 |
| 1.2 完整命盤 JSON 匯出 | 設定 + 計算結果 + 運限五層 + 版本；**相同輸入可重現相同 JSON**（確定性）| B1 退出條件① |
| 1.3 LLM 輸入檢視 | ReadingPanel 顯示實際送出的摘要 + prompt（可摺疊，含 provider/model/promptVersion 等 B1 橫向記錄）| B1 退出條件③ |
| 1.4 排盤 Golden 框架 | **只建框架 + 排盤 Golden**：測試雛形（子時/晚子時、立春年界、閏月、真太陽時跨時辰、空宮、男女順逆行）；**規則 Golden 與解讀案例集不在此批啟用** | B1 退出條件② |

**B1 退出條件**：① 相同輸入重現相同 JSON；② 排盤 Golden 可執行；③ 可查看實際 LLM 輸入

### B2：V1+V2 技術驗證
- 2.1 V1 四化疊盤驗證：各層（本命/大限/流年/流月/流時）四化 vs 手算
- 2.2 V2 iztro API Adapter：`surroundedPalaces()` / `surroundPalaces()` → canonical normalization
- 2.3 疊盤合併設計：定義「本命+大限+流年」四化合併邏輯

### B3：ChartAnalyzer v1（管線第一次閉合）
- 3.1 ChartAnalyzer：astrolabe → 結構化 JSON
- 3.2 summarizeAstrolabe 重構：純文字 → 結構化 JSON（backward compat）
- 3.3 StructuredSummary schema（帶 schemaVersion，結果具有確定性）
- 3.4 buildReadingPrompt 接線：結構化摘要 + 規則引用
- 3.5 Provider capability 與串流錯誤處理（橫向）

> **B3 只負責確定性盤面事實、adapter 結果、schema 版本、接入 Prompt**；星曜知識/來源/流派/版本/證據 → B4

### B4：星曜知識庫 v1 + 證據追溯 + V3
- 4.1 星曜知識庫 v1：十四主星 + 六吉六長（每項有 knowledgeId / source / school / ruleVersion）
- 4.2 宮位主題知識 v1
- 4.3 解讀證據追溯：StructuredSummary 帶 rule citations → CitationTracer
- 4.4 **V3 三組 A/B/C 測試**：固定模型、固定問題集、量 input tokens / 事實正確率 / 證據引用率 / 無依據率 / 矛盾率

> **B4 退出**：每項知識具 knowledgeId/source/ruleVersion；完成 V3（用固定模型，不用隨機 free router）

### B5：Phase 2 規則引擎（V4 完成門檻）
- 5.1 四化規則庫 v1
- 5.2 格局規則庫 v1（20-30 個，**V4：覆蓋率 80% 作為完成門檻**）
- 5.3 運限推論 v1
- 5.4 規則 Golden v2（**此批才完整啟用規則 Golden**）
- 5.5 模型忠於規則證據比較（橫向，不比文筆）

> **B5 退出條件**：規則生命中有完整證據；規則 Golden 通過；完成 V4 80%

### B6：Phase 3 功能（不破隱私資料模型）
- 6.1 多盤收藏、6.2 URL 分享、6.3 解讀歷史、6.4 對話式追問、6.5 列印模式
- 退出：以上功能不破隱私資料模型；**不導入帳號系統**

### B7：Phase 4 合盤與專題
- 7.1 合盤規則庫（取代 MatchPanel 硬編碼模板）、7.2 專題解讀、7.3 流分析圖
- 退出：只引用已驗證規則；敏感議題明確斷言邊界

---

## 6. 發派節奏

1. 每批獨立 run（claude Sonnet 寫 / Opus 審），拆小避開 1b max-turns 教訓
2. 每批先出 Issue 級規格 + 驗收測試，使用者 review 後發派
3. B1 / B2 可並行；B3 主線；B5「LOGO 清單」可提前收集
4. ~~下一步：將 B1 拆成 Issue 級規格與驗收測試~~ → **已執行完畢（2026-08-04 ~ 08-08）**

---

## 7. 風險與應對

| 風險 | 風險 |
|---|---|
| ChartAnalyzer 過大重蹈 1b max-turns | 拆 3.1/3.2/3.3 獨立 run |
| iztro 四化疊盤資料不完整 | B2 先驗證，不足則調整設計 |
| 結構化重構破壞既有行為 | backward compat + 302→562 tests 守護 |
| 規則庫內容品質 | D3 Golden Set 三套 + 使用者領域審查 |
| 範圍膨脹 | 三個邊界補強已簽入基線，退出條件明確 |