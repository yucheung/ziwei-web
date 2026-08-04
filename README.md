# 紫微斗數 Web 應用 (Ziwei Web)

專業級紫微斗數 Web 排盤與 AI 命盤解讀系統。

## 專案簡介 (Project Overview)

本專案是一套比照專業級紫微斗數軟體（文墨天機/紫微派層級）的純前端 Web 應用程式。整合強大且確定性的 iztro 天文排盤引擎與靈活的多模型 AI 解讀層，提供精準排盤、運限切換、雙人合盤以及結構化 AI 命盤解讀功能。

## 主要功能 (Features)

1. **精準 12 宮格排盤**
   - 傳統紫微盤 12 宮佈局（宮位、天干地支、主星廟旺利陷、十四主星、吉凶輔星、長生十二神、博士十二神）。
   - 宮位點擊詳情：即時計算並標示三方四正、暗合與對宮關係。
   - 支援公曆（西元/民國）及農曆生日輸入、十二時辰選取與真太陽時經度校正。

2. **AI 多模型命盤解讀**
   - 支援自訂 OpenAI 相容 API 參數（API Key、Base URL、Model）。
   - 可自由切換 OpenAI / Claude / Gemini / DeepSeek / Kimi 等強大 LLM 模型。
   - 包含命格總覽、十二宮深度分析、四化重點及特別格局解讀。

3. **運限切換 (Fortune Analysis)**
   - 支援大限（十年運勢）與流年運限切換。
   - 動態更新大限與流年星曜及四化變化，提供歲數與宮位參照。

4. **雙人合盤 (Match Analysis)**
   - 雙人命盤資料對照與關係解析。
   - 命宮與夫妻宮互動比對，四化互飛影響分析。

5. **匯出與分享 (Export & Share)**
   - 支援命盤資料 CSV 檔案匯出。
   - 支援純文字命盤摘要複製（方便社群通訊軟體分享）。
   - 支援生成精美命盤分享卡片圖檔（PNG）。

## 技術棧 (Tech Stack)

### 現成組件 (Third-party components)

| 組件 | 用途 |
|---|---|
| **[iztro](https://github.com/SylarLong/iztro) 2.5.8** | 核心排盤引擎（確定性計算：12 宮、14 主星、四化、三方四正、大限/流年/流月） |
| **lunar-typescript 1.8** | 陰陽曆轉換、閏月、節氣（iztro 曆法底座） |
| **React 19 / React DOM** | UI 框架 |
| **html2canvas 1.4** | 命盤分享卡（DOM → PNG） |
| **Lucide React** | 圖示庫 |

### 開發工具 (Dev tooling)

- **Vite 8**（建置）· **TypeScript 7** · **Tailwind CSS v4**（樣式）
- **Vitest 4** + Testing Library + Happy-DOM / JSDOM（測試，107 tests）

### 自研核心 (In-house modules)

- **`src/lib/astro.ts`** — iztro 封裝 + 時辰/閏月驗證 + **真太陽時**（含均時差 equation-of-time 修正）
- **`src/lib/llm.ts` / `prompts.ts`** — client-side LLM 解讀層，4 個 OpenAI-compatible provider 可切換（Gemini / DeepSeek / Kimi / OpenRouter），API key 存 sessionStorage（分頁關閉即清除）
- **`src/lib/fortunes.ts`** — 大限/流年運限 · **`match.ts`** — 雙人合盤（四化互飛）· **`export.ts`** — CSV 匯出
- **UI 組件** — ChartGrid（12 宮格盤面）、ReadingPanel、MatchPanel、FortunePanel

> 設計原則：**排盤 = 確定性計算**（iztro，不依賴 LLM）→ 保證星盤準確；**解讀 = LLM 層**（使用者自帶 API key，瀏覽器直呼，無後端）。

## 本地開發與測試 (Development & Testing)

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 執行測試套件 (Vitest)
npm test

# 建置正式版本
npm run build

# 預覽建置結果
npm run preview
```

## 部署說明 (Deployment Notes)

本專案為純前端 SPA 靜態應用，可直接建置並部署至 GitHub Pages、Cloudflare Pages 或 Vercel 等靜態託管平台。

### GitHub Pages 部署步驟
1. 執行 `npm run build` 生成 `dist` 靜態檔案。
2. 將 `dist` 目錄推送到 GitHub 儲存庫的 `gh-pages` 分支。
3. 在 GitHub 儲存庫設定中開啟 Pages 服務，將來源設定為 `gh-pages` 分支的根目錄 `/`。

## 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權。
Copyright (c) 2026 yucheung.
