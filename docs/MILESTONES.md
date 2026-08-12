# ziwei-web 里程碑追蹤

> 建立：2026-08-12
> 最後更新：2026-08-12
> 基線：B8 封板（575 tests、lint 0 warnings、CI 通過）
> 稽核原始紀錄：docs/MILESTONES-B1-B7.md（B1-B7 封板紀錄，477 tests 基線）

---

## B1–B8 封板紀錄

| 批次 | 日期 | 主要交付 | Tests | Review | 狀態 |
|---|---|---|---|---|---|
| **B1** | 2026-08-04 | P0 排盤透明化：RuleInfoPanel、JSON 匯出、Debug Panel、Golden 框架 | 302 | 8.5 ✅ | ✅ 封板 |
| **B2** | 2026-08-05 | V1+V2 技術驗證：四化疊盤、iztro API Adapter、三方四正 canonical | — | PASS ✅ | ✅ 封板 |
| **B3** | 2026-08-05 | ChartAnalyzer v1：管線第一次閉合（iztro → 結構化 → prompt → LLM）| — | PASS ✅ | ✅ 封板 |
| **B4** | 2026-08-05 | 星曜知識庫 v1 + 證據追溯 + V3 評估框架 | — | PASS ✅ | ✅ 封板 |
| **B5** | 2026-08-06 | Phase 2 規則引擎：四化/格局/運限規則庫 + 規則 Golden | 477 | 8.5 ✅ | ✅ 封板 |
| **B6** | 2026-08-06 | Phase 3 功能：收藏/分享/歷史/列印（不破隱私資料模型）| — | 8.5 ✅ | ✅ 封板 |
| **B7** | 2026-08-07 | Phase 4 合盤與專題：matchRules 5 大規則集 + 專題解讀 + 流分析圖 | — | 8.5 ✅ | ✅ 封板 |
| **B8** | 2026-08-08 | 知識整合：主解讀接規則引擎、Citation 結構化、chartId 決定性、真太陽時修復、Knowledge Contracts v1 | 575 | — | ✅ 封板 |

**審查紀律**：B1-B7 每批皆經 Opus 獨立複審（門檻 8.5/10），FAIL 則派 worker 修復後二審，全部達標才封板。B8 為功能整合批次，未獨立 review。

---

## Phase 完成狀態

| Phase | 內容 | 狀態 | 備註 |
|---|---|---|---|
| **Phase 0** | 排盤透明化 | ✅ 完成 | B1 |
| **Phase 1** | 結構化分析層 | ✅ 完成 | B2-B3 |
| **Phase 2** | 規則引擎 | ✅ 完成 | B4-B5 |
| **Phase 3** | 進階功能 | ⚠️ 核心子集完成 | B6：收藏/分享/歷史/列印完成；對話式追問/RAG 未實作 |
| **Phase 4** | 合盤與專題 | ✅ 完成 | B7-B8 |
| **Phase 5** | 大眾化 | ⏳ 待啟動 | D5 條件已部分滿足 |

---

## Knowledge Contracts v1

| 項目 | 狀態 | 備註 |
|---|---|---|
| Source/Claim/Rule/Review Schema | ✅ | JSON Schema Draft 2020-12 |
| JSONL loader | ✅ | 穩定檔名、行號、錯誤碼 |
| Policy validator | ✅ | 來源可達性、古籍誤標、Tier promotion、衝突互引 |
| Pilot v2 三主星落庫 | ⚠️ 受阻 | 15 claims 全 draft/promptEligible=false；15 reviews 全 needs_work |
| 知識庫內容成熟度 | ⚠️ 受阻 | 27 星曜中僅紫微 1 筆 human_approved，其餘 collected；12 宮全部 collected |
| Rules 檔 | ❌ 空白 | 尚未填入 |
| 接入產品層 | ⏳ 未實作 | Schema + validator 已就位，尚未接入 prompt/規則引擎 |

---

## 技術驗證（V1-V4）

| 驗證 | 內容 | 狀態 | 封板於 |
|---|---|---|---|
| **V1** | 四化疊盤驗證 | ✅ | B2 |
| **V2** | 三方四正 Adapter | ✅ | B2 |
| **V3** | A/B/C 摘要效益測試 | ✅ 框架完成（15 案例）| B4（待擴充）|
| **V4** | 格局偵測覆蓋率 80% | ✅ 85.4% | B5 |

---

## 知識庫 Pilot 狀態

> Pilot v2 三主星（紫微/天機/七殺・命宮）15 claims + 15 reviews。
> 全部處於 draft/needs_work 狀態，**不具備 promptEligible**。
> 通過率：0/18（v1 Pilot）→ v2 待人工審核。

---

## 設計債（B7 二審 minor，待清理）

1. `MUTAGEN_INTERACTION_DEFINITIONS` 以陣列索引綁定規則 → 改 ruleId 查表
2. `samePalace: true` 裝飾性參數 → 補註解說明 conditions 為對外描述
3. App 首屏多算（2 次 analyzeChart + 1 次 evaluateRules）→ 依 activeTab 延後
4. MatchPanel 測試 fixture 生辰耦合 → 加註解「刻意觸發 mutagen-double-lu」
5. samePalace 語意（同宮名 vs 同地支）未載明 → 補註
6. `boundaryFor` 的 `?? GENERIC_HIGH_SENSITIVITY_BOUNDARY` 死碼 → 可簡化

---

## 最新 Commit

```
f3ff2db feat: add facsimile editions and OCR script
929128f docs: 更新進度文件 — B1-B8 全數封板、Phase 0-4 完成、功能盤點
3c080d9 fix(knowledge): add textual variant note for claim-qisha-life-005
```
