# Knowledge Contracts 接入產品層評估報告

- **日期**：2026-09-19
- **評估者**：Antigravity Agent
- **背景任務**：ROADMAP 待辦第 4 項——評估 B8 建立之 Knowledge Contracts v1（Schema + Validator + Claims/Rules/Sources）何時及如何接入產品層（Prompt 組裝與規則引擎）
- **約束條件**：產品程式碼唯讀（`src/` 不修改）、維持 D4 邊界（八字不送 LLM、不納入規則推論）、不刪除任何現有檔案

---

## 摘要與核心結論

| 評估維度 | 結論 |
|---|---|
| **推薦接入深度** | **現階段維持 Depth (a)「只驗證（CI 跑 Validator，不進 Runtime）」** |
| **一句話理由** | 目前知識庫內容處於受阻 Pilot 狀態（可用於 Prompt 之 Claims 與 Rules 皆為 0 筆），現階段 runtime 接入只會造成 100% 降級空轉與架構過度工程，應待古籍文獻完成 Tier A/B 校對及人工審核解阻後，再推進 Build-time 半接入 (b)。 |
| **推薦演進順序** | **Depth (a) 現行維持** ➔ **（達成解阻門檻後）Depth (b) Build-time 靜態編譯半接入** ➔ **（規模化後）Depth (c) 規則引擎全接入** |
| **D4 邊界** | 嚴格維持現狀：四柱八字僅於前端 `FourPillars.tsx` 顯示與 `bazi.ts` 換算，永不進入 Prompt，不送入 LLM，不列入規則推論。 |

---

## 一、盤點 knowledge/v1 全貌

### 1. Schemas 結構與規格（4 式）

`knowledge/v1/schemas/` 採用 JSON Schema Draft 2020-12 規格，共定義 4 類資料合約：

1. **`source.schema.json`（SourceRecord）**：
   - 目的：記錄每一份文獻底本或版本載體。
   - 核心欄位：`sourceId`、`title`、`attributedAuthor`、`tradition`（如 `classical_ziwei`）、`school`、`schoolAttribution`、`sourceTier`（A/B/C/D/E 五級）、`edition`（版本細節）、`access`（電子/實體存取方式）、`verificationStatus`（`candidate` / `facsimile_verified` / `disputed`）。
2. **`claim.schema.json`（KnowledgeClaim）**：
   - 目的：最小原子化命理主張斷言。
   - 核心欄位：`claimId`、`subject`（論述主體：星曜、宮位、四化、格局等）、`assertionType`、`assertionText`、`modernParaphrase`、`interpretationLevel`、`tradition`、`school`、`scope`、`evidence`（陣列，包含 `sourceId`、`locator` 頁碼/章節、`quotation` 引文、`verification`）、`conflictRefs`（衝突主張互引）、`sensitivity`（`promptEligible`、`sensitivityLevel`、`contentType`）、`lifecycle`（`status`: `draft` / `candidate` / `human_approved` / `deprecated`）。
3. **`rule.schema.json`（RuleDefinition）**：
   - 目的：形式化、確定性的判定邏輯述詞。
   - 核心欄位：`ruleId`、`name`、`tradition`、`school`、`ruleSetVersion`、`predicate`、`conclusionClaimIds`（嚴格關聯至 KnowledgeClaim 之 claimId）、`promptEligible`、`lifecycleStatus`。
4. **`review.schema.json`（ReviewRecord）**：
   - 目的：記錄人工或模型審核歷程之 append-only 記錄。
   - 核心欄位：`reviewId`、`targetType`（`source` / `claim` / `rule`）、`targetId`、`reviewerType`（`human` / `model`）、`decision`（`pass` / `needs_work` / `rejected`）、`checklist`（8 大驗證項目，如 `quotationMatches`、`sourceIdentity`、`conditionsPreserved` 等）、`findingCodes`。

### 2. Tools / Validator 驗證工具鏈

知識庫具備嚴格的離線政策驗證器，不發送外部網路請求，檢查依賴拓撲、來源等級、流派標註與人工簽核時序。

- **執行指令**：
  ```bash
  npm run knowledge:validate
  ```
  *(底層呼叫 `node knowledge/v1/tools/validate.mjs`)*
- **實際執行輸出**：
  ```text
  Knowledge validation passed: 2 sources, 15 claims, 0 rules, 15 reviews
  ```
- **測試套件執行**：
  ```bash
  npx vitest run knowledge/v1/
  ```
  - 結果：6 個測試檔案全數通過（41 passed），涵蓋 schema 驗證、policy 政策檢查、JSONL 解析及 pilot 驗收斷言。
- **CI 現況**：
  - `.github/workflows/ci.yml` 第 17 行已在建置流程中執行 `npm run knowledge:validate`，作為 merge 與 release 的 mandatory quality gate。

### 3. Claims / Rules / Sources 資料規模與現狀

| 資料集 | 實體檔案 | 記錄數 | 關鍵狀態分析 |
|---|---|---|---|
| **Sources** | `sources/sources.jsonl` | **2** | 1 筆 Wikisource 轉錄（Tier C candidate，底本未識別）、1 筆未知來源 PDF（Tier E candidate）。**0 筆** Tier A/B，**0 筆** `facsimile_verified`。 |
| **Claims** | `claims/pilot-3stars.jsonl` | **15** | 紫微 5 筆、天機 5 筆、七殺 5 筆（均為命宮主星論斷）。**15 筆全部為 `status: "draft"`，全部 `promptEligible: false`**。 |
| **Rules** | `rules/pilot-3stars.jsonl` | **0** | 檔案大小 1 byte（僅 1 空行），有效規則為 **0 筆**。 |
| **Reviews** | `reviews/pilot-3stars.jsonl` | **15** | 15 筆全為 `reviewerType: "model"`、`decision: "needs_work"`。其中 `sourceIdentity: "blocked"`、`quotationMatches: "fail"`。**0 筆** 人工審核通過。 |

> **現狀定位**：`knowledge/v1` 的治理合約與驗證工具鏈（L12 治理層）高度完備且健全；然而實質命理內容目前處於 **「受阻 Pilot（Blocked Pilot）」** 狀態。依據政策驗證器規定，未獲 Tier A/B 來源支撐且無 `human_approved` 審核通過之主張，`promptEligible` 強制為 `false`，不可用於產品 Prompt。

---

## 二、盤點產品層現況

### 1. `src/lib/prompts.ts` 的知識引用現況

`prompts.ts` 目前由兩大管線組裝知識並注入 System Prompt：

1. **命盤結構分析與知識來源清單（`serializeStructuredSummary`）**：
   - 呼叫 `analyzeChart(chart, locale)` 產出結構化命盤資料。
   - 透過 `citationTracer.ts` 的 `traceCitations(summary)` 生成 `## 知識來源` 區塊，輸出格式如：
     `- [star-ziwei] https://zh.wikisource.org/... 卷一·諸星問答論 (classical_ziwei, 已審核/人類) — via iztro-sanhe-v1 — palaces[0].majorStars[0] (0.7)`
   - **底層來源**：直接引用 `src/lib/starKnowledge.ts` 與 `src/lib/palaceKnowledge.ts`。
     - `starKnowledge.ts`：以 TypeScript 常數硬編碼 27 顆星曜。全站僅「紫微」1 筆標記為 `human_approved`（指向 Wikisource 轉錄），其餘 26 顆星曜全為 `collected`。
     - `palaceKnowledge.ts`：以 TypeScript 常數硬編碼 12 宮位主題，12 宮全數標記為 `collected`。
2. **確定性規則匹配輸出（`serializeMatchedRules`）**：
   - 接收 `options.rules`（由規則引擎輸出的 `RuleResult[]`），篩選 `matched: true` 的項目。
   - 將規則名稱（`ruleName`）、推論依據（`evidenceHighlights`）、可信度（`confidence`）、來源狀態（`sourceStatus`）格式化注入 System Prompt，引導 LLM 依證據推論。

### 2. `src/lib/rules/` 規則引擎輸出與 Claims 關聯

- **輸出型別**：`RuleResult`（定義於 `src/lib/rules/types.ts`）：
  - `ruleId: string`（例如 `four-transformation-ziwei-huaLu`、`pattern-zi-fu-tong-gong`）
  - `ruleName: string`
  - `matched: boolean`
  - `evidence: Evidence[]`（每個 Evidence 含 `knowledgeId` 如 `star-ziwei`、`field`、`source`、`value`、`reasoning`）
  - `confidence: number`
  - `sourceStatus?: KnowledgeSourceStatus`
- **現況結論**：
  1. **完全無 Knowledge Contract Claim 引用**：`RuleResult` 與 `Evidence` 均未帶有任何 `claimId`。
  2. **內部自建規則定義**：生年四化（`fourTransformations.ts`）與格局規則（`patterns.ts`）皆為手寫 TypeScript 邏輯，其結論 `RuleConclusion`（如「生年化祿使該星所代表的主題較容易獲得資源與順勢發展」）直接硬編碼在程式中，未對齊 `knowledge/v1/schemas/rule.schema.json`。
  3. **名詞辨析**：`src/lib/rules/faithfulness.ts` 中的 `Claim` / `parseClaims` 是指「從 LLM 輸出文字中抽取的宣稱語句」，用以與確定性事實比對以偵測幻覺，並非 Knowledge Contracts 的命理知識斷言。

### 3. 研究層與產品層的物理隔離

`knowledge/v1/README.md` 明確宣告架構邊界：
> *"This directory is the source-first research boundary for Zi Wei Dou Shu knowledge. It is intentionally separate from `src/`: application code must not import these JSONL files directly."*

產品層執行代碼（`src/`）目前未直接 import 任何 `knowledge/v1/*.jsonl`，保持高度解耦。

---

## 三、三種接入 Depth 評估

### Depth (a)：只驗證（CI 跑 Validator，不進 Runtime）

- **定義**：保持 `knowledge/v1` 為獨立研究與文獻審查庫。CI 持續執行 Schema 與 Policy Validator，確保文獻合約不被破壞；產品層執行期完全不打包或載入 JSONL。
- **改動成本**：
  - **檔案數**：**0**（已在 `.github/workflows/ci.yml` 第 17 行完整實作）。
  - **風險點**：**無風險**。不影響既有產品打包體積、執行效能或測試。
- **優缺點**：
  - *優點*：零運行負擔；維持嚴格的關注點分離（Separation of Concerns）；符合「文獻未審核前不污染產品層」的防禦原則。
  - *缺點*：產品層知識庫（`starKnowledge.ts`）與研究層進展脫鉤，更新星曜/宮位需人工雙寫維護。

---

### Depth (b)：半接入（Prompt 組裝時查驗，失敗降級）

- **定義**：在 Prompt 組裝時，優先採用 Knowledge Contracts 中已通過審核（`human_approved` 且 `promptEligible: true`）的主張與詮釋；若查無對應合規 Claim 或查驗失敗，自動優雅降級（Fallback）回現有的 `starKnowledge.ts` / `palaceKnowledge.ts` 備用知識。
- **架構建議**：
  - **嚴禁在 Client Runtime 跑 ajv Validator**：目前 `ajv` 僅存在於 `devDependencies`。若在前端載入 JSONL 與 ajv，會使打包體積膨脹，並增加首屏解析延遲。
  - **應採 Build-time Pre-compilation**：於建置時透過腳本（如 `scripts/compile-knowledge.mjs`）執行驗證，將合規的 claims 過濾匯出為靜態 TypeScript/JSON artifact（如 `src/generated/promptKnowledge.ts`），供 `citationTracer.ts` 同步讀取。
- **改動成本**：
  - **檔案數**：約 **4 ~ 6 個檔案**
    - 新增 `scripts/compile-knowledge.mjs`
    - 修改 `package.json`（新增 `build:knowledge` step）
    - 修改 `src/lib/citationTracer.ts`（加入 claims 索引與 fallback 分流）
    - 修改 `src/lib/prompts.ts`（支援 claim 格式化輸出）
    - 新增單元與整合測試
  - **風險點**：
    1. **當前接入為 100% 空轉**：目前 15 筆 claims 全為 draft / blocked，rules 為 0 筆。立即實作會導致 100% 觸發 fallback，投入工程成本卻無任何使用者可見價值。
    2. **函式簽章破壞風險**：`prompts.ts` 的 `buildReadingPrompt` 目前是純同步函式。若接入時採用非同步動態載入，將打破全站所有依賴該函式的元件（如 `ReadingPanel.tsx`）與數十個測試案例。
    3. **文獻詮釋轉換風險**：古籍文言斷言若直接進入 Prompt，可能誘發 LLM 產生宿命論或恐嚇性語言（如「刑剋」「夭折」），必須確保只有通過敏感度審查與現代語譯（`modernParaphrase`）的 Claim 才能注入。

---

### Depth (c)：全接入（規則引擎輸出強制帶 Claim 引用）

- **定義**：重構規則引擎（`src/lib/rules/`），將四化、格局、宮位推論全面遷移為依據 `knowledge/v1/schemas/rule.schema.json` 定義的宣告式規則，所有 `RuleResult` 之結論必須綁定合法且經審核的 `conclusionClaimIds`，並將引用溯源（Provenance）向下傳遞至 `RuleInfoPanel` 與 Prompt。
- **改動成本**：
  - **檔案數**：約 **12 ~ 18 個檔案**
    - 核心型別重構：`src/lib/rules/types.ts`
    - 規則引擎各模組：`engine.ts`、`fourTransformations.ts`、`patterns.ts`、`provenance.ts`、`faithfulness.ts`、`fortune.ts`
    - 專題解讀與合盤：`specialTopics.ts`、`matchRules/` 各模組
    - 前端 UI 元件：`RuleInfoPanel.tsx`、`ReadingPanel.tsx`
    - 相關數十個測試檔案全面改寫
  - **風險點**：
    1. **產品核心解讀功能直接停擺（致命風險）**：目前 `knowledge/v1/rules/` 為 **0 筆**。若強制要求所有規則輸出必須關聯通過審核的 `conclusionClaimIds`，既有生年四化與格局規則將全部因缺乏 Claim 依據而被判定為無效或可信度歸零，導致全站排盤解讀完全喪失規則依據。
    2. **架構嚴重過度工程（Over-engineering）**：在命理學古籍底本標註與專家審核尚未成規模前，提前重構複雜的動態規則引擎，只會製造大量未驗證的 stub 與抽象層，徒增維護負擔。
    3. **效能與除錯複雜度倍增**：多層級宣告式規則與 Claim 圖譜的求值邏輯遠比目前確定性代碼複雜，不利於即時排盤。

---

## 四、D4 邊界守護（四柱八字不送 LLM）

在本次評估與未來任何深度接入中，必須嚴格維持 **D4 邊界決策**：
- **現行實況**：四柱八字僅於 `src/lib/bazi.ts` 進行確定性干支計算，並於 `src/components/FourPillars.tsx` 與匯出功能中展示，明確標註「僅供排盤參考，無解讀」。
- **檢驗確認**：`src/lib/chartAnalyzer.ts` 與 `src/lib/prompts.ts` 完全未引用八字資料，八字資料從未送入 LLM。
- **未來約束**：無論未來推進至 Depth (b) 或 Depth (c)，八字相關邏輯絕不納入紫微斗數 Knowledge Claims，亦不得作為規則引擎條件輸入 LLM Prompt。

---

## 五、綜合評估與推薦順序

### 1. 三種深度成本與風險比較矩陣

| 接入深度 | 影響檔案數 | 破壞性變更 | 實施成本 | 主要風險 | 推薦順序 |
|---|---|---|---|---|---|
| **Depth (a) 只驗證** | **0** | 無 | 極低（已就緒） | 產品層知識仍需手動維護 | **第 1 順位（即刻維持）** |
| **Depth (b) 半接入** | 4 ~ 6 | 低（Build-time 靜態編譯 + 降級） | 中等 | 目前內容不足導致 100% 降級空轉 | **第 2 順位（解阻後啟動）** |
| **Depth (c) 全接入** | 12 ~ 18 | 極高（規則引擎全面重寫） | 極高 | 規則庫為空將導致產品功能直接停擺 | **第 3 順位（規模化後評估）** |

---

### 2. 演進里程碑與啟動門檻（Gating Criteria）

```
[現階段：Phase 4 結案 / 維護期]
  │
  ├─► 維持 Depth (a)：CI 守門，產品層維持唯讀隔離
  │
  ▼
[解阻觸發條件（Gating Trigger）]
  - 至少 1 部紫微斗數權威典籍完成底本識別（達到 Tier A 或 B）
  - 至少 10+ 筆主星/宮位 Claims 獲得 human_approved 且 promptEligible: true
  - 具備經審核之現代詮釋（modernParaphrase），消除宿命論斷語
  │
  ▼
[下一階段：Pilot 解阻後]
  │
  ├─► 導入 Depth (b)：Build-time 靜態編譯注入 Prompt，失敗優雅降級
  │
  ▼
[遠期架構：Phase 5+ 大眾化與知識生態成熟]
  - 核心 14 主星 + 12 宮 + 主要格局具備 >100 筆審核通過之 Claims 與 Rules
  │
  └─► 評估 Depth (c)：重構規則引擎為聲明式 Schema 驅動，輸出強制帶 Claim 溯源
```

---

## 六、結語

B8 所建立之 Knowledge Contracts v1 是極具前瞻性且設計優良的命理知識治理基礎設施；然而，**「治理基礎設施完備」不等於「知識內容可直接上線」**。

在古典文獻版本考證（Tier A/B）與人工逐筆審核尚未完成前，過早將契約硬性介接至產品執行層是典型的過度工程，甚至會癱瘓既有功能。因此，**當前最適決策是「維持 Depth (a)，嚴守 CI 邊界；待內容實質解阻後，以 Build-time 靜態編譯方式推行 Depth (b)」**。
