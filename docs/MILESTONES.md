# ziwei-web 里程碑追蹤

> 建立：2026-08-12
> 基線：B8 封板（567 tests、lint 0 warnings、CI 全綠、GH Pages + CF Workers）

---

## B1–B8 封板紀錄

| 批次 | 日期 | 主要交付 | Tests | Review | 狀態 |
|---|---|---|---|---|---|
| **B1** | 2026-08-04 | P0 排盤透明化：RuleInfoPanel、JSON 匯出、Debug Panel、Golden 框架 | 302 | Opus 9.0/10 | ✅ 封板 |
| **B2** | 2026-08-05 | V1+V2 技術驗證：四化疊盤、iztro API Adapter、三方四正 canonical | — | — | ✅ 封板 |
| **B3** | 2026-08-05 | ChartAnalyzer v1：管線第一次閉合（iztro → 結構化 → prompt → LLM）| — | — | ✅ 封板 |
| **B4** | 2026-08-05 | 星曜知識庫 v1 + 證據追溯 + V3 評估框架 | — | — | ✅ 封板 |
| **B5** | 2026-08-06 | Phase 2 規則引擎：四化/格局/運限規則庫 + 規則 Golden | 477 | Opus 8.5/10 | ✅ 封板 |
| **B6** | 2026-08-06 | Phase 3 功能：收藏/分享/歷史/列印（不破隱私資料模型）| — | — | ✅ 封板 |
| **B7** | 2026-08-07 | Phase 4 合盤與專題：matchRules 5 大規則集 + 專題解讀 + 流分析圖 | — | Opus 8.3/10 | ✅ 封板 |
| **B8** | 2026-08-08 | 知識整合：主解讀接規則引擎、Citation 結構化、chartId 決定性、真太陽時修復、Knowledge Contracts v1 | 567 | — | ✅ 封板 |

---

## Phase 完成狀態

| Phase | 內容 | 狀態 | 備註 |
|---|---|---|---|
| **Phase 0** | 排盤透明化 | ✅ 完成 | B1 |
| **Phase 1** | 結構化分析層 | ✅ 完成 | B2-B3 |
| **Phase 2** | 規則引擎 | ✅ 完成 | B4-B5 |
| **Phase 3** | 進階功能 | ✅ 完成 | B6（對話式追問/RAG 待做）|
| **Phase 4** | 合盤與專題 | ✅ 完成 | B7-B8 |
| **Phase 5** | 大眾化 | ⏳ 待啟動 | D5 條件已部分滿足 |

---

## Knowledge Contracts v1

| 項目 | 狀態 | 備註 |
|---|---|---|
| Source/Claim/Rule/Review Schema | ✅ | JSON Schema Draft 2020-12 |
| JSONL loader | ✩✅ | 穩定檔名、行號、錯誤碼 |
| Policy validator | ✅ | 來源可達性、古籍誤標、Tier promotion、衝突互引 |
| Pilot v2 三主星落庫 | ✅ | 紫微/天機/七殺・命宮（附古籍頁碼）|
| 接入產品層 | ⏳ | 尚未直接接入 prompt/規則引擎 |

---

## 技術驗證（V1-V4）

| 驗證 | 內容 | 狀態 | 封板於 |
|---|---|---|---|
| **V1** | 四化疊盤驗證 | ✅ | B2 |
| **V2** | 三方四正 Adapter | ✅ | B2 |
| **V3** | A/B/C 摘要效益測試 | ✅ 框架完成（15 案例）| B4（待擴充）|
| **V4** | 格局偵測覆蓋率 80% | ✅ | B5 |

---

## 最新 Commit

```
3c080d9 fix(knowledge): add textual variant note for claim-qisha-life-005
edc921e feat(knowledge): add facsimile page locators for pilot-3stars
cc136c8 feat(knowledge): Pilot v2 三主星候選落庫（紫微/天機/七殺・命宮）
```
