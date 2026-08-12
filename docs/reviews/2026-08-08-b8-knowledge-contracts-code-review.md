# B8 Code Review、修正與 Knowledge Contracts 合併紀錄

日期：2026-08-08
狀態：B8 已封板；Knowledge Contracts v1 已合併；既有 lint warnings 待另案清理

## 1. 範圍與基線

本紀錄涵蓋兩段工作：

1. B8 功能與修正：`103c12b..72f6674`
2. Knowledge Contracts／Quality Gate：`72f6674..a7138b9`

本次本地合併採 fast-forward，`main` 合併後指向 `a7138b9`。Knowledge Contracts 階段未修改 `src/`，避免研究資料契約與產品執行層互相干擾。

## 2. B8 Code Review 結論

B8 第一輪實作完成主解讀規則接線、Citation 結構化、決定性 `chartId`、Canonical JSON 回播、UI 參數一致性、閏月輸入及專題 LLM 設定同步。第二輪 code review 在 `61c8112` 基線發現五項殘留問題；後續由 `1117eb1` 與 `72f6674` 關閉。

| 等級 | Review finding | 修正結果 | Commit |
| --- | --- | --- | --- |
| P0 | 未審核來源雖有 Citation confidence cap，但規則仍可能以高於 0.5 的 confidence 進入 LLM，且 prompt 將其描述為確定依據 | 規則結果綁定來源審核狀態；`collected`／未審核來源統一 cap 至 0.5；prompt 改為「初步參考，非確定結論」 | `1117eb1` |
| P0 | 結構化 Citation 在 prompt／UI formatter 退化為單一 `library` 字串，遺失 `reference`、`page`、`status`、`reviewedBy`；古籍亦被誤標為 `sanhe` | formatter 完整輸出可核驗欄位；古籍分流為 `classical_ziwei`；reference 優先顯示，library 降為 `via` 補充 | `1117eb1`, `72f6674` |
| P1 | Canonical JSON 未保留原始農曆輸入，回播時可能只剩 iztro 格式化日期 | 匯出保留原始 `lunarDate`、`calendarType`、`isLeapMonth` 及相關 ChartConfig 欄位 | `1117eb1` |
| P1 | Legacy history ID 缺少算法、年界、閏月、經度等設定，可能和新命盤碰撞 | 舊紀錄仍可查看，但明確標示「舊格式／命盤設定不完整」，不再冒充完整可驗證的現行命盤紀錄 | `1117eb1` |
| P2 | History JSON 測試用物件覆蓋全域 `URL` constructor，造成 `URL is not a constructor` unhandled error | 產品端防守 `globalThis.URL`；測試 stub 保留 constructor 能力，消除 unhandled error | `1117eb1`, `72f6674` |

### Review 後保留的設計決定

- 未審核知識的 confidence 塌陷至 0.5 是刻意的安全設計，不是資料遺失；未來加入 `human_approved` review 後，可信度會依來源狀態自然恢復。
- 古籍原文屬 `classical_ziwei`，來源未明示現代流派時不得標成 `sanhe`。
- Legacy history 缺少足夠資訊，不能可靠自動遷移；採「保留可見＋明確警告」而非猜測歸屬。
- 敏感、宿命式及歷史性斷語不得因存在引文就自動進入 prompt。

### B8 封板能力

- Matched rules 已進入主解讀 prompt，LLM 必須以規則證據為依據。
- Citation 可輸出 `library`、`reference`、`page`、`status`、`reviewedBy` 與 school 分流。
- `chartId` 納入完整設定並採決定性 hash；Canonical JSON 可跨語系產生相同 bytes 並回播 ChartConfig。
- Rule Info Panel 使用凍結參數；MatchPanel、專題解讀與主命盤設定保持一致。
- 真太陽時與經度合盤的崩潰路徑已有直接迴歸斷言。
- 閏月輸入、歷史紀錄相容提示及測試 URL stub 均已接線。

## 3. Knowledge Contracts／Quality Gate 修正內容

Knowledge Contracts v1 以隔離研究層實作，正式資料檔目前維持 0 筆，等待三星 Pilot v2 通過來源與人工審核後再加入。

### 已實作項目

- 建立 Source、Claim、Rule、Review 四類 JSON Schema Draft 2020-12 契約。
- 建立 JSONL loader，提供穩定的檔名、行號與錯誤碼診斷。
- 建立跨紀錄 policy validator，檢查來源可達性、古籍流派誤標、Tier C-E promotion、人工覆核時序、claim atomicity、衝突互引、敏感內容與 prompt eligibility。
- 加入 `MODERN_INTERPRETATION_SOURCE_MISSING`：現代詮釋必須有自己的現代來源，不能只以古籍加人工勾選就通過。
- 建立 6 類 invalid fixtures 與 valid fixtures，讓每類政策失敗都有可重現案例。
- 新增 `npm run knowledge:validate` 並接入 CI。
- 將舊 `docs/research/pilot-3stars.*` 保留為失敗 Pilot 證據；legacy regression 驗證其不能被誤當作 v1 claim，且測試前後檔案雜湊不變。
- 未修改 `src/`，尚未把研究層直接接入產品 prompt 或規則引擎。

### 合併時驗證狀態

| Gate | 結果 |
| --- | --- |
| Test files | 53 passed |
| Tests | 575/575 passed |
| Knowledge tests | 6 files / 40 tests |
| Build | exit 0 |
| ESLint | 0 errors、0 warnings |
| Unhandled test error | 0 |
| 舊 Pilot 內容 | 無修改 |

## 4. 既有 ESLint Warnings 已清零

這些 warnings 已在後續 commit 清零。

所有 warnings 已清零，--max-warnings 0 通過。

### 風險判斷

- 27 個 `no-explicit-any` 全在測試檔，不會直接造成正式執行期錯誤，但會降低 fixture、mock 與 assertion 的型別保護。
- 5 個 Fast Refresh warnings 不影響 production build；其中 4 個位於產品模組，可能讓開發期間的熱更新退回完整 reload 或產生不一致狀態，優先度高於測試 `any`。
- warnings 已清零，--max-warnings 0 通過。

### 建議後續修正順序

1. 將 `FortuneChart.tsx` 與 `i18n/index.tsx` 的非 React component export 移到獨立模組，先清除 4 個產品 Fast Refresh warnings。
2. 調整 `src/test-utils.tsx` export 邊界，清除剩餘 1 個 Fast Refresh warning。
3. 以具名型別、`satisfies`、`ReturnType<>`、`Parameters<>` 或窄化後的 fixture 型別，逐步取代 27 個測試 `any`；不要以關閉 ESLint rule 代替型別修正。
4. CI lint 命令已提升為 `eslint --max-warnings 0`，防止新增 warning。

### 後續任務驗收條件

- `npm test` 全綠且沒有 unhandled error。
- `npm run build` exit 0。
- `npm run lint -- --max-warnings 0` exit 0。
- 不改變 i18n canonical key、命盤 JSON bytes、規則輸出或測試語意。
- lint cleanup 使用獨立 commit／PR，不與 Pilot v2 知識內容混合。

## 5. 最終判定

B8 的 code review findings 已由 `1117eb1` 與 `72f6674` 關閉，B8 可維持正式封板。Knowledge Contracts v1 已在 `a7138b9` 建立可執行的資料契約與 CI 品質閘門，可進入三星 Pilot v2 的內容建置。

32 個 lint warnings 應另案修正，但不阻擋本次 Knowledge Contracts 合併；清理完成後再將 CI 提升為零 warning gate。
