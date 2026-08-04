# 紫微斗數專業級 Web 應用 開發計畫

> **For Hermes:** Use subagent-driven-development to implement this plan task-by-task.
> **執行者:** agy (antigravity CLI) — 每個 kanban 任務由 worker 透過 `agy -p` 執行。

**Goal:** 一套比照專業級（文墨天機/紫微派層級）的 web 版紫微斗數軟體：精準排盤 + 命盤解讀 + 運限 + 合盤。

**Architecture:**
- **排盤 = 確定性計算**（iztro 引擎，不靠 LLM——保證星盤準確）
- **解讀 = LLM 層**（OpenAI-compatible 多模型可切換，只負責分析與文采）
- 純前端 SPA（Vite + React + TS），無後端（靜態部署 Cloudflare Pages）

**Tech Stack:** Vite 6 + React 19 + TypeScript + Tailwind CSS 4 + [iztro](https://github.com/SylarLong/iztro)（排盤）+ Vitest（測試）+ ECharts（K線可選）

**資料模型（iztro Astrolabe 回傳）:**
- `palaces[12]`: name(命宮/兄弟/夫妻/子女/財帛/疾厄/遷移/僕役/官祿/田宅/福德/父母), majorStars(主星+亮度), minorStars, adjectiveStars, heavenlyStem/earthlyBranch, changSheng12, boYi12
- `stars`: 14 主星 + 文昌/文曲/左輔/右弼/天魁/天鉞/祿存/擎羊/陀羅/火星/鈴星/天馬 + 四化(祿權科忌)
- `horoscope`: 大限/流年/流月/流日
- `soul`(命主)/`body`(身主)

---

## Kanban 任務拆解（每個 = 一個 card，agy worker 執行）

### T1: 專案骨架
**Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/App.tsx`, `index.html`, `tailwind` 設定
- Vite + React + TS 初始化，安裝 iztro + tailwind + vitest
- 基本 layout（輸入表單 placeholder + 盤面容器）
- Verify: `npm run build` 成功、`npm test` 有 1 個 smoke test

### T2: 排盤核心（iztro 整合）
**Files:** `src/lib/astro.ts`, `src/lib/astro.test.ts`
- `getChart(solarDate, timeIndex, gender, isLunar, timeZone)`: 包裝 `iztro.astro.bySolar/byLunar`
- 輸入驗證：西元/民國年、陰陽曆、12 時辰（子 23-1 ... 亥 21-23）、閏月
- 真太陽時校正（經度 → 時差）— 簡版（城市經度表）
- Test: 已知命例對照（如 2000-8-16 2時 男 → 命宮/主星斷言）

### T3: 命盤 UI（12 宮格盤面）
**Files:** `src/components/ChartGrid.tsx`, `src/components/PalaceCell.tsx`, `src/components/StarTag.tsx`, `src/data/palace-layout.ts`
- 傳統紫微盤 12 宮佈局（寅起順時針：命宮起布）
- 每宮：宮名 + 天干地支 + 主星（亮度廟旺利陷 + 四化標記）+ 輔星
- 點擊宮位 → 詳情面板（三方四正、暗合、對宮）
- Test: palace-layout 正確性（宮位順序）

### T4: 解讀層（LLM 多模型）
**Files:** `src/lib/llm.ts`, `src/lib/prompts.ts`, `src/components/ReadingPanel.tsx`
- OpenAI-compatible 呼叫（baseURL/model/apiKey 設定 UI，localStorage 儲存）
- Prompt 模板：命盤 JSON → 結構化解讀（命格總覽/12 宮分析/四化重點/格局）
- 支援模型：Gemini / Claude / DeepSeek / Kimi（自訂 baseURL）
- Test: prompt 產生器（JSON → prompt string 快照）

### T5: 運限（大限/流年）
**Files:** `src/components/FortunePanel.tsx`, `src/lib/fortunes.ts`
- 大限切換（iztro.horoscope 大限 10 年）、流年盤、流耀顯示
- 大限表格（歲數/宮位/主星）
- Test: 大限計算對照

### T6: 雙人合盤
**Files:** `src/components/MatchPanel.tsx`, `src/lib/match.ts`
- 兩張命盤並排 + 四化互飛比對 + 關係重點（命宮/夫妻宮互動）
- Test: 合盤資料結構

### T7: 匯出/分享
**Files:** `src/lib/export.ts`
- 命盤 CSV 匯出、命盤摘要文字（純文字可貼 Telegram）、分享卡（html2canvas → PNG）
- Test: CSV 產生

### T8: 測試補齊 + 部署 [Done]
- Vitest 全綠 (npm test 12 files / 62 tests passed)
- `npm run build` 打包成功
- README.md + LICENSE (MIT, 2026 yucheung)
- 部署至 GitHub Pages

---

## 驗收標準
1. 輸入生日時辰 → 命盤 12 宮正確顯示（對照紫微派 ziwei.pub 同生日盤）
2. 點宮位 → 詳情（三方四正/星曜/四化）
3. 解讀 → 切換多模型正常
4. 大限/流年切換正確
5. 合盤功能正常
6. build 無 error，部署後手機可開
