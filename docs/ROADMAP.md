# ziwei-web 功能與知識結構 Roadmap

> 建立日期：2026-08-06
> 最後更新：2026-08-12（B8 封板 + Knowledge Contracts v1 + 功能盤點）
> 狀態：**B1-B8 全數封板；Phase 0-4 核心功能完成；待結案確認**
> 基線：B8 封板（575 tests、lint 0 warnings、CI 通過、GH Pages + CF Workers 部署）

---

## 一、現狀評估

> 更新：2026-08-12（B8 封板後全面盤點）

### 已建好的基礎

| 層次 | 已有 | 狀態 |
|---|---|---|
| **排盤核心** | iztro 排盤（12宮、星曜、亮度、四化、運限五層）| ✅ 完整 |
| **資料正規化** | chartModel canonicalize + translateKey（繁簡雙向對映）| ✅ 完整 |
| **三方四正** | iztro `surroundedPalaces()` API（本命 + 運限）| ✅ 完整（B2 V2 驗證）|
| **LLM 管線** | prompts.ts 參數化 + 三合派限定 + 串流 + idle-timeout + prompt-injection 防護 | ✅ 完整 |
| **運限展示** | FortunePanel（大限/流年/流月/流日/流時 13 期）| ✅ 完整 |
| **合盤** | MatchPanel + matchRules 規則引擎（branchRelation / starCompatibility / palaceOverlap / mutagenInteraction / sensitivity）| ✅ 規則化（B7a） |
| **四柱八字** | FourPillars 顯示 + 博士十二神 | ⚠️ 資料顯示，無解讀（D4 決策）|
| **匯出** | CSV / 文字摘要 / JSON（確定性）/ 分享卡片 / URL 分享 | ✅ 完整 |
| **收藏/歷史** | IndexedDB 儲存、歷史記錄、收藏管理 | ✅ 完整（B6） |
| **專題解讀** | 財/官/情/健/學五大專題 + 規則篩選 + LLM 整合 | ✅ 完整（B7b） |
| **規則引擎** | chartFacts / faithfulness / fortune / patterns / fourTransformations / provenance | ✅ 完整（B5） |
| **規則資訊面板** | RuleInfoPanel：查看命盤適用規則細節 | ✅ 完整（B1） |
| **真太陽時** | Spencer 均時差公式 + 100+ 城市經度表 + UI 輸入 + 合盤相容 | ✅ 完整（B8 F1 修復） |
| **知識庫** | Knowledge Contracts v1（Source/Claim/Rule/Review Schema）+ Pilot v2 三主星 + citationTracer | ✅ v1 封板（B8） |
| **LLM 解讀** | ReadingPanel（876行）：串流 + idle-timeout + 繼續生成 + Debug Panel + Provider 選擇 | ✅ 完整 |
| **品質** | i18n zh-TW/zh-CN、light/dark、a11y、CI（build+test+lint）、575 測試 | ✅ 完整 |
| **部署** | GH Pages + CF Workers 雙平台 | ✅ 完整 |

### iztro 提供 vs 不提供的資料

**iztro 已提供**（資料層完備）：
- 12 宮：name, majorStars, heavenlyStem, earthlyBranch, changsheng12, boshi12
- 運限五層：decadal/yearly/monthly/daily/hourly，各含 stars[], mutagen, heavenlyStem, palaceNames
- 命主、身主、命宮、身宮
- 五行局、性別
- 四化（祿權科忌）：生年四化、大限四化、流年四化
- **三方四正**：`astrolabe.surroundedPalaces("命宮")`（本命）、`horoscope.surroundPalaces("夫妻", "yearly")`（運限）

**iztro 不提供**（需自建）：
- ❌ 格局判定（grep iztro lib 無 pattern/格局相關 export）
- ❌ 星曜解釋規則
- ❌ 宮位主題解讀
- ❌ 運限疊盤推論邏輯（各層四化已計算，但「疊加後的綜合推論」需自建）
- ❌ 合盤規則
- ❌ 任何命理知識庫

### 核心缺口（部分修補）

> 更新：2026-08-12
>
> B1-B8 已建立規則引擎管線基礎設施：iztro → ChartAnalyzer → 規則引擎（6 大規則庫）→ StructuredSummary → Citation → LLM prompt。
>
> **但知識庫內容仍處於受阻 Pilot 狀態**：
> - 27 星曜中僅紫微 1 筆具 human_approved 來源，其餘 26 筆為 collected
> - 12 宮知識全部為 collected
> - Pilot 15 claims 全為 draft、promptEligible=false
> - 15 reviews 全為 needs_work，quotationMatches 全部失敗、conditionsPreserved 全部 pass
> - Rules 檔仍為空白
> - Knowledge Contracts 尚未接入產品層
>
> **準確狀態**：「知識治理基礎設施 v1 完成；內容仍處於受阻 Pilot。」

### 剩餘非阻塞項目

| 項目 | 狀態 | 建議 |
|---|---|---|
| V3 評估框架 | 代碼完成（54 測試案例、metrics），無 UI 整合 | 低優先：QA 工具，瓶頸在 test case 數量 |
| 真太陽時 UI 打磨 | 核心功能已完成，無城市下拉選單 | 已可結案：非功能缺口 |
| LLM citation 顯示 | ReadingPanel 無內建 citation 顯示 | 優化項：規則引擎 provenance 已處理 |
| en i18n | 未實作 | 用戶決定跳過 |
| 八字解讀 | 保留顯示，無解讀（D4 決策） | 維持現狀：紫微完整後再考慮 |
| 對話式追問 | Phase 3 遺留項 | 需決定是否重新納入 |
| Vector RAG | Phase 3 遺留項 | 日後（Phase 5+）|

---

## 二、12 層知識結構 Gap 分析

| 層 | 內容 | iztro 資料 | 需自建 | 實施難度 | 備註 |
|---|---|---|---|---|---|
| **1. 命盤基本結構** | 陰陽五行、十二宮定義、命身宮、五行局 | ✅ 全有 | 知識庫（prompt 或 JSON）| 低 | 可直接嵌入 prompt |
| **2. 單一星曜知識** | 十四主星、吉煞、廟旺利陷、宮位含義 | ⚠️ 有亮度，無解釋 | 星曜知識庫 | 中 | 最大單一知識塊 |
| **3. 星曜組合** | 同宮、對宮、三方四正、夾宮、空宮借星 | ⚠️ 三方四正有 API，組合規則無 | iztro adapter + 知識庫 | **高** | 解盤核心 |
| **4. 十二宮主題** | 每宮核心意義、可解讀範圍、推論邊界 | ❌ | 宮位知識庫 | 中 | 需與第 3 層配合 |
| **5. 四化系統** | 生年/宮干飛化、祿權科忌差異、疊加 | ⚠️ 各層四化有資料，疊加推論無 | 四化規則引擎 | **高** | 須先定流派（D1） |
| **6. 格局判定** | 成立條件、加吉加煞變化、成格破格 | ❌ | 格局規則庫 | 高 | v1 目標：80% 覆蓋率 |
| **7. 宮位整體關係** | 命財官遷結構、六親、宮位強弱 | ❌ | 計算層 + 知識庫 | 高 | 第 3 層的上層 |
| **8. 運限疊盤** | 大限/流年/流月觸發、四化疊加、事件窗口 | ⚠️ 各層有資料，疊加推論無 | 運限推論引擎 | **高** | 最複雜 |
| **9. 專題解讀** | 性格/財運/感情/健康等分項規則 | ❌ | 專題知識庫 | 中 | 依賴 1-8 |
| **10. 合盤知識** | 雙方互動、運限同步、關係模型 | ❌ | 合盤規則庫 | 高 | 現有模板太簡 |
| **11. 八字知識** | 十神、藏干、格局、喜忌、紫微交叉 | ❌ | 八字規則庫 | **高** | D4 決策：先擱置 |
| **12. 解讀治理** | 規則來源、流派、可信度、版本 | ❌ | 治理層 | 中 | LLM 品質控制 |

---

## 三、已確認決策（D1-D5）

### D1：先三合，飛星獨立版本化

**決策**：先實作三合派完整推論鏈，飛星派作為獨立規則集日後加入。

**關鍵修正**：
- 每條知識帶 `school: "sanhe"` + `ruleSetVersion: "sanhe-v1"`
- 飛星日後使用 `feixing-v1`，不直接修改三合規則
- **已完成** prompts.ts：`DEFAULT_SYSTEM_PROMPT` 與 `SYSTEM_PROMPT_ZH_CN` 均由「兼通三合派與飛星派」改為「三合派」
- **已完成**加入限制：「所有分析與規則均以三合派為準。若遇飛星派規則，不應混用。」（簡體版同步）
- 驗證結果：302/302 tests 全綠

### D2：JSON 知識 + 程式規則 + 結構化證據

**決策**：Phase 1-2 不導入 RAG。知識分兩類：

| 類型 | 內容 | 格式 |
|---|---|---|
| **知識資料 JSON** | 星曜性質、宮位含義、來源、流派、解釋文字 | JSON + metadata |
| **可執行規則** | 三方四正、格局條件、四化命中、空宮借星 | Typed Rule Predicates |

架構：**JSON Knowledge + Typed Rule Predicates + Structured Evidence**

RAG 日後適合：找古籍原文、依專題檢索案例、提供解讀背景。但格局是否成立、四化落在哪裡仍應由確定性程式判斷。

### D3：Golden Set 拆成三套

| 測試集 | 目的 | 適合來源 |
|---|---|---|
| **排盤 Golden** | 驗證命宮、主星、四化、運限結果 | 權威排盤結果、人工逐項核算、跨工具一致結果 |
| **規則 Golden** | 驗證格局與四化規則是否正確命中 | 人工設計的最小命盤 fixture、典型古籍案例 |
| **解讀案例集** | 評估推論是否合理、有依據 | 自己與親友的匿名命盤、已知人生事件 |

第一批至少刻意包含：子時與晚子時、立春/農曆年界附近、閏月、真太陽時造成時辰變更、男女順逆行、空宮、常見四化與格局、大限切換邊界。

### D4：八字先擱置

**決策**：保留四柱顯示 + 博士十二神，明確標示「無解讀」。暫停所有 LLM 八字解讀——看似成本最低，實際最容易讓使用者誤以為系統已處理月令、旺衰、十神、調候和喜用神。

八字應在紫微「本命＋大限＋流年」完整跑通後，再作為獨立子系統建設。

### D5：A → C，以品質門檻啟動 Phase 5

**決策**：先作為自己的紫微學習與研究系統（A），核心成熟後再提供一般人使用（C）。Phase 5 不必現在決定做或不做，設進入門檻：

**Phase 5 啟動條件**（需同時滿足）：
1. 排盤 Golden 全數通過
2. 核心規則都有來源、流派與版本
3. 解讀內容可追溯到盤面證據
4. 無依據敘述率低於預設門檻
5. 敏感議題有明確表達邊界
6. 出生資料具備刪除、匯出和匿名分享設計

**隱私資料模型現在就應預留**，否則未來由 localStorage 轉帳號系統時可能需大幅重構。

---

## 四、技術架構

### 現有管線

```
iztro 排盤 → summarizeAstrolabe() → 純文字摘要 → buildReadingPrompt() → LLM → 結果
```

問題：摘要文字無結構、無規則、無證據追溯。

### 目標管線（D2 確認）

```
iztro 排盤
  ↓
ChartAnalyzer（結構化分析層）
  ├── JSON Knowledge（星曜/宮位/格局知識，帶 school + ruleSetVersion）
  ├── Typed Rule Predicates（三方四正、格局條件、四化命中）
  └── iztro API Adapter（surroundedPalaces、四化查詢）
  ↓
StructuredSummary（盤面事實 + 規則命中 + 推論鏈 + 證據引用）
  ↓
buildReadingPrompt()（帶結構化摘要 + 規則引用）→ LLM → 結果
  ↓
CitationTracer（驗證：LLM 輸出是否引用了結構化摘要中的事實）
```

### 知識庫格式

| 方案 | 適用範圍 | 狀態 |
|---|---|---|
| **JSON Knowledge + Typed Rule Predicates** | 第 1-8 層（格局、四化、運限）| ✅ D2 確認 |
| **Vector RAG** | 古籍檢索、專題案例、解讀背景 | 📋 日後（Phase 3+）|

---

## 五、技術驗證項（V1-V4）

### V1：驗證 iztro 各層四化結果，並確認 ChartAnalyzer 如何合併為疊盤證據

iztro 各運限層（decadal/yearly/monthly/daily/hourly）已提供 stars[] 和 mutagen，官方 API 可針對指定 scope 查詢某宮是否有運限四化。但「本命＋大限＋流年疊加後的綜合推論」需自建。

**驗證方法**：取一個已知生辰，比較 iztro 各層四化輸出與手算結果，確認資料完整性後設計 ChartAnalyzer 的合併邏輯。

### V2：三方四正由 iztro API adapter + canonical normalization + 回歸測試

**已確認**：iztro 提供 `astrolabe.surroundedPalaces("命宮")`（本命）和 `horoscope.surroundPalaces("夫妻", "yearly")`（運限），可取得三方四正的星曜和四化。

**修正**：不需要自建算法。需建立：
- iztro API adapter（呼叫 surroundedPalaces / surroundPalaces）
- canonical normalization（確保輸出與 chartModel 對映層一致）
- 回歸測試（驗證 adapter 輸出正確）

**重要**：4×4 UI 空間映射（ChartGrid）不應成為命理計算依據；畫面佈局與領域邏輯應保持分離。

### V3：三組 A/B/C 測試結構化摘要效益

| 組 | 輸入給 LLM | 測量指標 |
|---|---|---|
| **A** | 完整原始 JSON（~2KB） | input tokens、事實正確率、證據引用率、無依據率、矛盾率、人工評分 |
| **B** | 固定結構化摘要（~500B） | 同上 |
| **C** | 結構化摘要＋依問題選取的相關盤面證據 | 同上 |

固定模型、temperature、問題集。**byte 數不能直接代表 token 成本，須用模型 tokenizer 實際計算。**

預期 C 最佳，但必須實測；結構化摘要過度壓縮也可能漏掉關鍵星曜。

### V4：驗證「格局偵測覆蓋率」，不要驗證所有格局能否完全自動解讀

先列出 20-30 個預定支援的常見格局，分成四類：

| 類別 | 規則化可行性 | 處理方式 |
|---|---|---|
| 單宮固定條件 | 高 | 直接規則化 |
| 多宮聯動條件 | 中 | 規則化 + 測試 |
| 加吉/加煞/破格條件 | 中 | 規則化 + 條件判斷 |
| 流派分歧或需程度判斷 | 低 | 輸出「候選格局＋命中條件＋未確定因素」，不強行 true/false |

**v1 目標**：對「明確定義且已列入支援範圍」的格局，條件偵測覆蓋率達 80% 以上。解讀文字與成格程度另行處理。

---

## 六、分期實施計畫

> 更新：2026-08-12 — B1-B8 全數封板，Phase 0-4 核心功能完成

### Phase 0：排盤透明化 ✅ 已完成（B1）

| 項目 | 狀態 | Commit |
|---|---|---|
| 排盤規則面板（RuleInfoPanel）| ✅ | B1 |
| 完整命盤 JSON 匯出（確定性）| ✅ | B1 |
| 命理回歸測試框架（Golden）| ✅ | B1 + B5 |
| LLM 輸入檢視（Debug Panel）| ✅ | B1 |
| prompts.ts 三合派限定 | ✅ | 302→575 tests |

### Phase 1：結構化分析層 ✅ 已完成（B2-B3）

| 項目 | 狀態 | Commit |
|---|---|---|
| ChartAnalyzer（astrolabe → 結構化 JSON）| ✅ | B3 |
| iztro API Adapter（surroundedPalaces）| ✅ | B2 V2 |
| 星曜知識庫 v1 | ✅ | B4 |
| summarizeAstrolabe 重構 | ✅ | B3 |
| 解讀證據追溯（CitationTracer）| ✅ | B8 |
| 隱私資料模型預留（localStorage）| ✅ | B6 |

### Phase 2：規則引擎 ✅ 已完成（B4-B5）

| 項目 | 狀態 | Commit |
|---|---|---|
| 四化規則庫 v1 | ✅ | B5 |
| 格局規則庫 v1 | ✅ | B5 |
| 宮位主題知識 v1 | ✅ | B4 |
| 運限推論 v1 | ✅ | B5 |
| 命理回歸測試 v2（575 tests）| ✅ | B5 |

### Phase 3：進階功能 ⚠️ 核心子集完成（B6）

| 項目 | 狀態 | Commit |
|---|---|---|
| 多命盤收藏（IndexedDB）| ✅ | B6a |
| URL 分享（壓縮編碼）| ✅ | B6a |
| 解讀歷史 | ✅ | B6b |
| 對話式追問 | ⚠️ 未實作 | 原 B6 退出條件包含，需決定是否重新納入 |
| 列印模式 | ✅ | B6b |
| Vector RAG v1 | ⚠️ 未實作 | 日後（Phase 5+）|

### Phase 4：合盤與專題 ✅ 已完成（B7-B8）

| 項目 | 狀態 | Commit |
|---|---|---|
| 合盤規則庫（matchRules 5 大規則集）| ✅ | B7a |
| 專題解讀（財/官/情/健/學）| ✅ | B7b |
| 流分析圖 | ✅ | B7b |
| 敏感議題邊界 | ✅ | B7a |
| 真太陽時合盤修復 | ✅ | B8 F1 |
| Knowledge Contracts v1 | ✅ | B8 |
| Pilot v2 三主星落庫 | ✅ | B8 |

### Phase 5：大眾化 ⏳ 待啟動

> **啟動條件見 D5。** 目前核心功能已完成，待確認是否進入 Phase 5。
>
| 項目 | 內容 |
|---|---|
| 帳號系統 | 跨裝置同步、資料刪除/下載 |
| 匿名化分享 | 非 URL 加密，而是真正的匿名命盤庫 |
| LLM 成本控制 | 額度管理、失敗重試 |
| 敏感議題提示 | 健康/財務/婚姻/生死的斷言邊界 |
| 新手引導 | 範例命盤 + 教學模式 |

---

## 七、依賴關係圖

```
Phase 0（透明化）← 無依賴，可立即開始
    ↓
Phase 1（結構化分析層）← 核心基礎
    ↓
Phase 2（規則引擎）← 依賴 Phase 1 的 StructuredSummary
    ↓
Phase 3（進階功能）← 部分依賴 Phase 1-2
Phase 4（合盤+專題）← 依賴 Phase 1-2
    ↓（品質門檻達標後）
Phase 5（大眾化）← 依賴 Phase 1-4 + 品質門檻
```

---

## 八、與現有 Issue 的對照

| 現有 Issue | 對應 Roadmap |
|---|---|
| Issue #1（已關閉）| C 組品質修正，不在此 Roadmap |
| A Medium（code chip 對比度）| Phase 0 之前的小修（不阻擋）|
| B5 死常數 | 已基本完成 |

---

## 九、下一步行動

> 更新：2026-08-12

1. **Phase 5 啟動評估**：D5 條件已部分滿足（排盤 Golden ✅、規則有來源/流派/版本 ✅、解讀可追溯 ✅、無依據率待量化、敏感議題邊界 ✅、隱私資料模型 ✅）。需決定是否進入 Phase 5。
2. **V3 評估框架擴充**：test case 從 15 題擴充至 50+ 題 ✅，覆蓋更多宮位/星曜組合。
3. **對話式追問**：Phase 3 遺留項，固定引用當前命盤與運限的多輪對話。
4. **Knowledge Contracts 接入產品層**：B8 建立的 Schema + validator 尚未直接接入 prompt/規則引擎，需評估何時導入。
5. **維持 D4 邊界**：八字只保留資料顯示並標示「無解讀」，不送入 LLM。
