# ziwei-web 里程碑：B1–B7 全數封板

> **日期**：2026-08-08
> **HEAD**：`f3fdd4e`（B7 review fix 二審 8.5/10 PASS）
> **Tests**：477/477 全綠 · Build exit 0 · ESLint 0 errors

---

## 總覽

| 批次 | 內容 | 封板 Commit | 二審評分 |
|---|---|---|---|
| **B1** | P0 排盤透明化（規則面板/JSON 匯出/LLM 輸入檢視/Golden 框架） | `7ccd9c9` | 8.5 ✅ |
| **B2** | 四化疊盤 + 三方四正 adapter | `979dcbf` | PASS ✅ |
| **B3** | ChartAnalyzer v1 管線閉合（iztro → AnalyzedChart → prompt） | `1feea63` | PASS ✅ |
| **B4** | 星曜知識庫 v1 + 證據追溯 + V3 評估 | `e9e155d` | PASS ✅ |
| **B5** | 規則引擎（56 四化規則 + 41 格局 + 運限 + Golden 26 cases） | `d987023` | 8.5 ✅ |
| **B6** | 收藏 / URL 分享 / 歷史 / 列印（+ B5 設計債修復） | `b0f1f67` | 8.5 ✅ |
| **B7** | 合盤規則庫 / 專題解讀 / 流分析圖（+ 敏感議題邊界） | `f3fdd4e` | 8.5 ✅ |

**審查紀律**：每一批次皆經 Opus 獨立複審（門檻 8.5/10），FAIL 則派 worker 修復後二審，全部達標才封板。

---

## 各批次詳情

### B1：P0 排盤透明化

- 確定性命盤 JSON 匯出（不帶時間戳、固定鍵順序）
- 排盤規則資訊面板 + LLM 輸入檢視 + 請求 meta（debug）
- Golden 測試框架（13 案例，立春年界 F3 依實測）
- 根治 iztro 全域 config 污染（DEFAULT_CONFIG 補齊 3 欄位）
- **三審**：N-1（凍結排盤參數）+ H-2（summaryLength 渲染）後達標

### B2：四化疊盤

- 本命 + 大限 + 流年四化疊加顯示
- 三方四正 adapter
- Opus 複審 3 blocker 修正後封板

### B3：ChartAnalyzer v1（管線閉合）

- `iztro → AnalyzedChart → StructuredSummary → prompt → LLM` 管線第一次閉合
- Schema v1.0 凍結（`outputLocale` 取代 `locale`）
- `generatedAt` 移出 prompt（消除 cache miss）
- Golden snapshot + spec sync

### B4：星曜知識庫 + 證據追溯

- `starKnowledge.ts`：27 星曜知識條目（14 主星 + 6 吉星 + 6 煞星 + 祿存）
- `palaceKnowledge.ts`：12 宮位知識 + alias
- `citationTracer.ts`：證據追溯
- `v3Evaluation.ts`：54 test cases（A/B/C）
- Citations 接入 system prompt（zh-TW/zh-CN）

### B5：規則引擎（Phase 2）

- **56 條四化規則**（14 星 × 4 化，含天干 fallback）
- **41 條三合派格局規則**
- Engine：合併、去重、信心排序，只回傳 `matched: true`
- 運限推論（大限/流年/流月）接 `getHoroscopeSummary`
- Golden：26 fixtures，pattern coverage **85.4%**（目標 80%）
- 模型忠於規則比較（faithful/contradictory/unsupported）
- **初審 5 FAIL** → 根因修復（接 `getHoroscopeSummary`）→ 二審 8.5 ✅

### B6：Phase 3 功能

- IndexedDB storage（charts + readings）
- 多盤收藏 CollectionPanel
- URL 分享（lz-string 壓縮 + `?s=` 偵測 + 隱私警告）
- 解讀歷史（列表/還原/並排比較/匯出 JSON/刪除）
- Print Mode（@media print A4 排版）
- B5 設計債：`palaceNames` 必填 + fortune star overlay
- **初審 FAIL**（分享未接線/print 反效果）→ 修復 → 二審 8.5 ✅

### B7：Phase 4 合盤與專題

- `matchRules/`：starCompatibility / palaceOverlap / mutagenInteraction / branchRelation
- 敏感議題斷言邊界（婚姻/財富/健康/壽命 + disclaimers）
- MatchPanel 重構：規則引擎驅動，消費 evidence
- 專題解讀：career/wealth/relationship/health/education（含 citations + 敏感度接 prompt）
- 流分析圖：大限 timeline + 互動選取
- **初審 FAIL**（未接 App/mutagen 恆真/敏感度空轉）→ 修復 → 二審 8.5 ✅

---

## 設計債（B7 二審 minor，待清理）

1. `MUTAGEN_INTERACTION_DEFINITIONS` 以陣列索引綁定規則 → 改 ruleId 查表
2. `samePalace: true` 裝飾性參數 → 補註解說明 conditions 為對外描述
3. App 首屏多算（2 次 analyzeChart + 1 次 evaluateRules）→ 依 activeTab 延後
4. MatchPanel 測試 fixture 生辰耦合 → 加註解「刻意觸發 mutagen-double-lu」
5. samePalace 語意（同宮名 vs 同地支）未載明 → 補註
6. `boundaryFor` 的 `?? GENERIC_HIGH_SENSITIVITY_BOUNDARY` 死碼 → 可簡化

---

## 後續方向（未定優先序）

| 方向 | 內容 |
|---|---|
| 知識庫補強 | 修正 agy 搜集方法後擴充 14 星 × 12 宮（pilot 通過率僅 1/18，需治本） |
| 設計債清理 | 上表 6 項 minor |
| 飛星派支援 | `school: "feixing"` 規則庫 |
| 帳號/雲端同步 | B6 明確排除的低優先 |
| skill-tracker 複用 | starKnowledge/palaceKnowledge/citationTracer 架構可跨專案 |

---

## 里程碑意義

- **可驗證解讀核心閉合**：B3 管線 + B4 知識庫 + B5 規則引擎，LLM 不再自由發揮
- **每批皆經 Opus 獨立審查**：8.5/10 門檻、FAIL 修復循環，無未審代碼進版
- **477 tests 守護**：Golden 確定性 + 規則覆蓋 + 整合測試
