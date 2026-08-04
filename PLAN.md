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

## 產品 Roadmap（三階段可行性評估，2026-08-04）

> 評估基準：只看內容可行性（現成組件能力），不看進度。

### Phase 1：一般命理網站 — 完成度 **100%**（iztro 全現成）
| 功能 | 來源 | 狀態 |
|---|---|---|
| 排盤 bySolar/byLunar | iztro | ✅ 已用 |
| 十二宮 / 星曜 / 大限 / 流年 | iztro | ✅ 已用 |
| 四化（基本） | iztro mutagen | ✅ 已用 |
| 三方四正 | iztro 有 API（目前自寫 palace-layout.ts）| 🔧 改用內建 |

### Phase 2：專業命理 — 完成度 **100%**（iztro 全現成，純 UI 整合）
| 功能 | 來源 | 工作 |
|---|---|---|
| 飛星四化 API | iztro 內建（宮位→四化判斷）| 確認 API + UI |
| 星曜亮度（廟旺利陷）| iztro ConfigBrightness | UI 顯示 |
| 流派 config（中州派/自訂四化/亮度/年界/晚子時）| iztro Config（algorithm/mutagens/brightness）| UI 設定層 |
| 流月 / 流日 / 流時 | iztro horoscope 內建 | UI（現只做大限/流年）|
| 天地人三盤 | iztro astroType | UI |

### Phase 3：AI 命理 — 完成度 **60-80%**（自研知識庫是真正門檻）
| 功能 | 可行性 | 關鍵點 |
|---|---|---|
| 命理知識圖譜（星曜/宮位/四化/飛星規則）| ✅ 最大工作量 | iztro 無格局知識庫需自建；來源選項：自建 / 參考開源 patterns（ziwei-doushu，倪海夏體系）/ 古籍文本（骨髓賦/全集）|
| LLM 推理 + 引用規則 | ✅ 架構可行 | prompt 帶規則庫（<200 條可全量帶入，不需 RAG）+ structured output 強制引用規則 ID |
| 可追溯解釋 | ✅ 可行 | 輸出結構化（結論 + 推理鏈：命盤事實 + 規則 ID → 結論）+ UI 渲染 |

**Phase 3 決策點**：
1. 知識庫來源（品質決定專業度——內容工程非程式問題）
2. 引用機制：全量規則入 prompt（簡單）vs RAG（規則庫變大時）
3. 正確性驗證：golden 案例抽查（LLM 引用錯規則 = 錯誤解釋）

---

## 驗收標準
1. 輸入生日時辰 → 命盤 12 宮正確顯示（對照紫微派 ziwei.pub 同生日盤）
2. 點宮位 → 詳情（三方四正/星曜/四化）
3. 解讀 → 切換多模型正常
4. 大限/流年切換正確
5. 合盤功能正常
6. build 無 error，部署後手機可開
