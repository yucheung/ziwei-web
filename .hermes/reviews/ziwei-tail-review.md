# 評分：8.5 / 10 — 通過

> **Commit** `836ac8a` `fix(i18n): 殘留小尾巴收尾`（相對 `1303a84`，11 檔 +91 −21）
> **審查日期** 2026-09-19　**審查者** Antigravity Code Review

---

## 驗證結果

| 項目 | 結果 |
|------|------|
| `npx vitest run`（4 受影響檔案，63 tests） | ✅ 全數通過 |
| `npm run build` | ✅ exit 0，產出正常 |
| 範圍外檔案修改 | ⚠️ 見 S1 |
| TW/CN 鍵對稱 | ✅ `reading.continuePrompt` 雙語齊全 |

---

## 逐項審查

### B2 — fortunes.ts 運限面板繁簡混排

**改法正確。** `getDecadalTable()` 新增 `normalizeText()` 包裝函式，對 `palaceName` 及 `majorStars` 走 `toCanonicalKey → translateKey` 二段轉換，確保簡體語系下宮位與星名輸出簡體。`rangeText` 歲數單位改由 `ageUnit` 依 locale 選取「歲/岁」。`getHoroscopeSummary()` 中 `hourly.name` fallback 由硬編碼繁體 `'流時'` 改為按 locale 條件輸出。

**測試加固充分：** `fortunes.test.ts` 新增 5 個斷言——`hourly.name`、`decadalTable[0].rangeText` 含「岁」且不含「歲」、`palaceName` 含「命宫」且不含「命宮」。覆蓋完整。

### B5 — 夜子時 fallback 對齊 dayDivide

**改法正確。** `boundaryCases.test.ts` 新增 `dayDivide "current" vs "forward"` 測試：驗證 timeIndex=12（晚子時）在兩種模式下日柱、時柱結果不同（丙午/戊子 vs 丁未/庚子），附中文註解。`FortunePanel.tsx` 註解更新為含 12=夜子時。`FortunePanel.test.tsx` 補 index=12 選項驗證。

### R1 — ReadingPanel 續寫提示語改 t()

**改法正確。** 原本硬編碼的 locale 三元判斷改為 `t('reading.continuePrompt')`，zh-TW/zh-CN 鍵均已新增且語義正確。

**微瑕 (N1)：** TW 版為「不要重複已經輸出**過**的內容」，CN 版為「不要重复已经输出的内容」（無「过」字）。語義無差異，但措辭細微不對稱。極低優先，不影響通過。

### R2 — prompts.test.ts 補 zh-CN 守衛

**改法正確且有增強。** 原本只測 zh-TW 的 `mutagens`/`patterns` prompt 與 `null astrolabe` 三個 case，現全部擴展為雙語系斷言。新增 `zh-CN` 端的 `toContain` 檢查簡體措辭（「化禄宫位」「特殊格局与吉凶组合」「无命盘数据」）。**沒有刪除原有 zh-TW 斷言，非改弱測試。**

### R3 — 未知宮 fallback 雙語守衛

**改法正確。**
- `match.ts`：`未知宮位` 改為 locale 條件判斷（`未知宫位` / `未知宮位`）。
- `prompts.test.ts`：新增 `falls back to localized unknownPalace` 測試，用 `name: ''` 的 mock palace 分別驗證 TW `### 未知宮 [甲子]` 和 CN `### 未知宫 [甲子]`。
- `prompts.ts` 中對應的 `L.unknownPalace` 查表（`未知宮`/`未知宫`）已在先前 commit 就位。

**注意：** `match.ts` 中 `unknownPalaceLabel` 的 fallback 缺少對應的直接單元測試（`match.test.ts` 的 zh-CN 測試驗證了正常路徑但未觸發 `targetPalace === null` 分支）。低風險，因為 prompts.ts 同功能已有覆蓋。

---

## 發現事項

### S1 — Settings.tsx dayDivide 預設值變更（範圍邊界）⚠️

`Settings.tsx` 將 `config.dayDivide ?? 'current'` 改為 `?? 'forward'`，使 UI 元件的 fallback 與 `DEFAULT_CONFIG.dayDivide = 'forward'`（`astro.ts:21`）對齊。**邏輯上是正確的 bug fix**——原本 UI 預設與引擎預設不一致會導致下拉選單初始顯示值與實際運算行為不符。

但此修改不在規格六項之中，屬於範圍外修改。影響為行為改善（非破壞），且僅一行，可接受但應在 commit message 中提及。

### N1 — continuePrompt TW/CN 措辭微差

如上述，TW 多一個「過」字。不影響功能。

---

## 總結

六項規格全數交付，雙語鍵齊全、fallback 語義與規格一致、測試只有增強無改弱。唯一扣分點為 S1 範圍外修改（-0.5）與 match.ts unknownPalace 分支缺直接單測（-0.5）、continuePrompt 措辭微差（-0.5）。整體品質良好。
