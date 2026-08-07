# ziwei-web — Project Instructions (紫微斗數排盤)

Vite + React + TypeScript + iztro v2.5.8. i18n zh-TW / zh-CN. Deployed GH Pages + CF Workers.

## Critical conventions
- **i18n 雙語一致**：任何新增 UI 文案必須同時進 zh-TW 與 zh-CN（及 en 若適用）。不得硬編碼 'zh-TW'/'zh-CN'。canonical key 一律 zh-TW（見 src/lib/chartModel.ts translateKey/toCanonicalKey）。
- **Golden 測試紀律**：排盤確定性測試在 src/lib/goldenChart.test.ts，每案例傳完整 `config`（含 yearDivide/dayDivide）——iztro 對省略欄位 fallback 全局，不可依賴。expected 以實測為準（見 docs/Golden/ziwi-fixtures.md）。
- **JSON 匯出確定性**：不帶時間戳/隨機性，固定鍵順序（src/lib/export.ts）。
- 不要引入 LLM / AI 解讀進確定性排盤層（那是 B3+ 的事）。

## Commands
- Test: `npm test` (vitest). DO NOT use `npx vitest`（全域 vitest v4 誤報 PASS(0) 假綠）。
- Build: `npm run build`
- Lint: `npx eslint <files>`
- Full gate: build exit 0 + npm test 全綠 + eslint 0。

## Reporting
- Report commit SHA + test count + build/eslint results with real output.